// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/db', () => ({
  db: { insert: vi.fn(), update: vi.fn(), delete: vi.fn(), select: vi.fn() },
}))
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn() }))

import { revalidatePath } from 'next/cache'

import { db } from '@/lib/db'
import { createAdminClient } from '@/lib/supabase/admin'
import { productFormSchema } from '@/lib/actions/products.schema'
import {
  createProduct,
  deleteProduct,
  deleteProductImage,
  reorderProductImages,
  sendAdminMessage,
  toggleProductVisibility,
  updateProduct,
  updateProductImageAlt,
  uploadProductImage,
} from '@/lib/actions/products'

// A chainable drizzle stand-in: every query-builder method returns the chain
// itself, and the chain is awaitable, resolving to `result`. Methods are spies
// so call arguments (e.g. the inserted values) can be asserted.
function chain(result: unknown = undefined) {
  const c: Record<string, ReturnType<typeof vi.fn>> & { then?: unknown } = {}
  for (const m of [
    'values',
    'returning',
    'set',
    'where',
    'from',
    'orderBy',
    'limit',
    'select',
    'insert',
    'update',
    'delete',
  ]) {
    c[m] = vi.fn(() => c)
  }
  ;(c as { then: unknown }).then = (onF: (v: unknown) => unknown, onR: (e: unknown) => unknown) =>
    Promise.resolve(result).then(onF, onR)
  return c
}

function rejectingChain(error: unknown) {
  const c = chain()
  ;(c as unknown as { then: unknown }).then = (
    _onF: (v: unknown) => unknown,
    onR: (e: unknown) => unknown
  ) => Promise.reject(error).then(_onF, onR)
  return c
}

const mockedDb = vi.mocked(db) as unknown as {
  insert: ReturnType<typeof vi.fn>
  update: ReturnType<typeof vi.fn>
  delete: ReturnType<typeof vi.fn>
  select: ReturnType<typeof vi.fn>
}
const mockedCreateAdminClient = vi.mocked(createAdminClient)

function form(fields: Record<string, string>) {
  const fd = new FormData()
  for (const [k, v] of Object.entries(fields)) fd.set(k, v)
  return fd
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('productFormSchema', () => {
  const base = { name: 'Floral Dress', slug: 'floral-dress', price: '29.99' }

  it('accepts a full valid product', () => {
    const result = productFormSchema.safeParse({
      ...base,
      description: 'A lovely dress',
      categoryId: '550e8400-e29b-41d4-a716-446655440000',
      visible: false,
    })
    expect(result.success).toBe(true)
  })

  it('accepts a minimal product and defaults visible to true', () => {
    const result = productFormSchema.parse(base)
    expect(result.visible).toBe(true)
    expect(result.description).toBeUndefined()
  })

  it('rejects an empty name', () => {
    expect(productFormSchema.safeParse({ ...base, name: '' }).success).toBe(false)
  })

  it('rejects a slug with spaces or uppercase', () => {
    expect(productFormSchema.safeParse({ ...base, slug: 'Floral Dress' }).success).toBe(false)
    expect(productFormSchema.safeParse({ ...base, slug: 'Floral' }).success).toBe(false)
  })

  it.each(['10', '10.5', '10.50', '1299.00'])('accepts valid price %s', (price) => {
    expect(productFormSchema.safeParse({ ...base, price }).success).toBe(true)
  })

  it.each(['abc', '10.999', '$10', '10.', '-5'])('rejects invalid price %s', (price) => {
    expect(productFormSchema.safeParse({ ...base, price }).success).toBe(false)
  })

  it('accepts null or omitted categoryId', () => {
    expect(productFormSchema.safeParse({ ...base, categoryId: null }).success).toBe(true)
    expect(productFormSchema.safeParse(base).success).toBe(true)
  })

  it('rejects a non-uuid categoryId', () => {
    expect(productFormSchema.safeParse({ ...base, categoryId: 'not-a-uuid' }).success).toBe(false)
  })
})

describe('createProduct', () => {
  it('inserts a product and returns its id', async () => {
    mockedDb.insert.mockReturnValue(chain([{ id: 'new-id' }]))

    const result = await createProduct(
      form({ name: 'Floral Dress', slug: 'floral-dress', price: '29.99', visible: 'true' })
    )

    expect(result).toEqual({ error: null, id: 'new-id' })
    expect(revalidatePath).toHaveBeenCalledWith('/admin/products')
  })

  it('auto-generates a slug from the name when none is provided', async () => {
    const c = chain([{ id: 'new-id' }])
    mockedDb.insert.mockReturnValue(c)

    await createProduct(form({ name: 'Floral Summer Dress!', price: '10.00' }))

    expect(c.values).toHaveBeenCalledWith(expect.objectContaining({ slug: 'floral-summer-dress' }))
  })

  it('passes categoryId as null when blank', async () => {
    const c = chain([{ id: 'new-id' }])
    mockedDb.insert.mockReturnValue(c)

    await createProduct(form({ name: 'X', slug: 'x', price: '1.00' }))

    expect(c.values).toHaveBeenCalledWith(expect.objectContaining({ categoryId: null }))
  })

  it('returns a validation error without touching the db', async () => {
    const result = await createProduct(form({ name: '', slug: 'x', price: '1.00' }))

    expect(result.id).toBeNull()
    expect(result.error).toBeTruthy()
    expect(mockedDb.insert).not.toHaveBeenCalled()
  })

  it('returns a friendly error on a duplicate slug', async () => {
    mockedDb.insert.mockReturnValue(rejectingChain(new Error('unique violation')))

    const result = await createProduct(form({ name: 'Dress', slug: 'dress', price: '10.00' }))

    expect(result).toEqual({ error: 'A product with that slug already exists.', id: null })
  })
})

describe('updateProduct', () => {
  it('updates the product and revalidates both paths', async () => {
    const c = chain()
    mockedDb.update.mockReturnValue(c)

    const result = await updateProduct(
      'p1',
      form({ name: 'New', slug: 'new', price: '5.00', visible: 'false' })
    )

    expect(result).toEqual({ error: null })
    expect(c.set).toHaveBeenCalledWith(expect.objectContaining({ name: 'New', visible: false }))
    expect(revalidatePath).toHaveBeenCalledWith('/admin/products')
    expect(revalidatePath).toHaveBeenCalledWith('/admin/products/p1/edit')
  })

  it('returns a validation error for a bad price', async () => {
    const result = await updateProduct('p1', form({ name: 'New', slug: 'new', price: 'abc' }))

    expect(result.error).toBeTruthy()
    expect(mockedDb.update).not.toHaveBeenCalled()
  })

  it('returns a friendly error on a duplicate slug', async () => {
    mockedDb.update.mockReturnValue(rejectingChain(new Error('unique violation')))

    const result = await updateProduct('p1', form({ name: 'N', slug: 'dup', price: '1.00' }))

    expect(result).toEqual({ error: 'A product with that slug already exists.' })
  })
})

describe('toggleProductVisibility', () => {
  it('sets visibility and revalidates the list', async () => {
    const c = chain()
    mockedDb.update.mockReturnValue(c)

    await toggleProductVisibility('p1', false)

    expect(c.set).toHaveBeenCalledWith(expect.objectContaining({ visible: false }))
    expect(revalidatePath).toHaveBeenCalledWith('/admin/products')
  })
})

describe('deleteProduct', () => {
  it('deletes the product and revalidates the list', async () => {
    mockedDb.delete.mockReturnValue(chain())

    await deleteProduct('p1')

    expect(mockedDb.delete).toHaveBeenCalled()
    expect(revalidatePath).toHaveBeenCalledWith('/admin/products')
  })
})

describe('uploadProductImage', () => {
  function storageClient(overrides: Partial<{ uploadError: { message: string } | null }> = {}) {
    const upload = vi.fn().mockResolvedValue({ error: overrides.uploadError ?? null })
    const getPublicUrl = vi.fn(() => ({
      data: { publicUrl: 'https://cdn/product-images/p1/123.jpg' },
    }))
    const from = vi.fn(() => ({ upload, getPublicUrl }))
    return { client: { storage: { from } }, upload, getPublicUrl }
  }

  it('returns an error when no file is provided', async () => {
    const result = await uploadProductImage('p1', new FormData())
    expect(result).toEqual({ error: 'No file provided', url: null })
  })

  it('uploads, records the image at the next position, and returns the url', async () => {
    const { client } = storageClient()
    mockedCreateAdminClient.mockReturnValue(client as never)
    mockedDb.select.mockReturnValue(chain([{ position: 0 }, { position: 1 }]))
    const insertChain = chain()
    mockedDb.insert.mockReturnValue(insertChain)

    const file = new File(['data'], 'photo.png', { type: 'image/png' })
    const fd = new FormData()
    fd.set('file', file)

    const result = await uploadProductImage('p1', fd)

    expect(result).toEqual({ error: null, url: 'https://cdn/product-images/p1/123.jpg' })
    expect(insertChain.values).toHaveBeenCalledWith(
      expect.objectContaining({ productId: 'p1', position: 2 })
    )
  })

  it('uses a caller-supplied position without querying existing images', async () => {
    const { client } = storageClient()
    mockedCreateAdminClient.mockReturnValue(client as never)
    const insertChain = chain()
    mockedDb.insert.mockReturnValue(insertChain)

    const fd = new FormData()
    fd.set('file', new File(['d'], 'a.jpg', { type: 'image/jpeg' }))
    await uploadProductImage('p1', fd, 3)

    expect(mockedDb.select).not.toHaveBeenCalled()
    expect(insertChain.values).toHaveBeenCalledWith(expect.objectContaining({ position: 3 }))
  })

  it('starts at position 0 when there are no existing images', async () => {
    const { client } = storageClient()
    mockedCreateAdminClient.mockReturnValue(client as never)
    mockedDb.select.mockReturnValue(chain([]))
    const insertChain = chain()
    mockedDb.insert.mockReturnValue(insertChain)

    const fd = new FormData()
    fd.set('file', new File(['d'], 'a.jpg', { type: 'image/jpeg' }))
    await uploadProductImage('p1', fd)

    expect(insertChain.values).toHaveBeenCalledWith(expect.objectContaining({ position: 0 }))
  })

  it('surfaces a storage upload error and does not insert a row', async () => {
    const { client } = storageClient({ uploadError: { message: 'Bucket full' } })
    mockedCreateAdminClient.mockReturnValue(client as never)

    const fd = new FormData()
    fd.set('file', new File(['d'], 'a.jpg', { type: 'image/jpeg' }))
    const result = await uploadProductImage('p1', fd)

    expect(result).toEqual({ error: 'Bucket full', url: null })
    expect(mockedDb.insert).not.toHaveBeenCalled()
  })
})

describe('updateProductImageAlt', () => {
  it('returns an error when the image is missing', async () => {
    mockedDb.select.mockReturnValue(chain([]))

    const result = await updateProductImageAlt('img1', 'hat')

    expect(result).toEqual({ error: 'Image not found' })
    expect(mockedDb.update).not.toHaveBeenCalled()
  })

  it('trims and stores the alt text, then revalidates the edit page', async () => {
    mockedDb.select.mockReturnValue(chain([{ productId: 'p1' }]))
    const c = chain()
    mockedDb.update.mockReturnValue(c)

    const result = await updateProductImageAlt('img1', '  red hat  ')

    expect(result).toEqual({ error: null })
    expect(c.set).toHaveBeenCalledWith({ alt: 'red hat' })
    expect(revalidatePath).toHaveBeenCalledWith('/admin/products/p1/edit')
  })

  it('stores null when the alt text is blank', async () => {
    mockedDb.select.mockReturnValue(chain([{ productId: 'p1' }]))
    const c = chain()
    mockedDb.update.mockReturnValue(c)

    await updateProductImageAlt('img1', '   ')

    expect(c.set).toHaveBeenCalledWith({ alt: null })
  })
})

describe('deleteProductImage', () => {
  it('returns an error when the image is missing', async () => {
    mockedDb.select.mockReturnValue(chain([]))

    const result = await deleteProductImage('img1')

    expect(result).toEqual({ error: 'Image not found' })
  })

  it('removes the storage object and the row', async () => {
    mockedDb.select.mockReturnValue(
      chain([{ url: 'https://cdn/product-images/p1/123.jpg', productId: 'p1' }])
    )
    const remove = vi.fn().mockResolvedValue({})
    const from = vi.fn(() => ({ remove }))
    mockedCreateAdminClient.mockReturnValue({ storage: { from } } as never)
    mockedDb.delete.mockReturnValue(chain())

    const result = await deleteProductImage('img1')

    expect(remove).toHaveBeenCalledWith(['p1/123.jpg'])
    expect(mockedDb.delete).toHaveBeenCalled()
    expect(result).toEqual({ error: null })
    expect(revalidatePath).toHaveBeenCalledWith('/admin/products/p1/edit')
  })
})

describe('reorderProductImages', () => {
  it('does nothing for an empty list', async () => {
    await reorderProductImages([])
    expect(mockedDb.update).not.toHaveBeenCalled()
  })

  it('persists a new position for each id', async () => {
    const chains = [chain(), chain()]
    let i = 0
    mockedDb.update.mockImplementation(() => chains[i++])
    mockedDb.select.mockReturnValue(chain([{ productId: 'p1' }]))

    await reorderProductImages(['a', 'b'])

    expect(chains[0].set).toHaveBeenCalledWith({ position: 0 })
    expect(chains[1].set).toHaveBeenCalledWith({ position: 1 })
    expect(revalidatePath).toHaveBeenCalledWith('/admin/products/p1/edit')
  })
})

describe('sendAdminMessage', () => {
  function chatClient(insertResult: { data: unknown; error: unknown }) {
    const single = vi.fn().mockResolvedValue(insertResult)
    const select = vi.fn(() => ({ single }))
    const insert = vi.fn(() => ({ select }))
    const eq = vi.fn().mockResolvedValue({ error: null })
    const update = vi.fn(() => ({ eq }))
    const from = vi.fn(() => ({ insert, update }))
    return { client: { from }, insert, update }
  }

  it('rejects an empty message before calling supabase', async () => {
    const result = await sendAdminMessage('s1', '   ')
    expect(result).toEqual({ error: 'Message is empty', message: null })
    expect(mockedCreateAdminClient).not.toHaveBeenCalled()
  })

  it('inserts the trimmed message and returns it mapped to camelCase', async () => {
    const { client, insert } = chatClient({
      data: {
        id: 'm1',
        content: 'Hello',
        from_admin: true,
        created_at: '2026-06-18T10:00:00Z',
      },
      error: null,
    })
    mockedCreateAdminClient.mockReturnValue(client as never)

    const result = await sendAdminMessage('s1', '  Hello  ')

    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({ session_id: 's1', content: 'Hello', from_admin: true })
    )
    expect(result).toEqual({
      error: null,
      message: { id: 'm1', content: 'Hello', fromAdmin: true, createdAt: '2026-06-18T10:00:00Z' },
    })
  })

  it('returns the supabase error message on failure', async () => {
    const { client } = chatClient({ data: null, error: { message: 'insert failed' } })
    mockedCreateAdminClient.mockReturnValue(client as never)

    const result = await sendAdminMessage('s1', 'Hi')

    expect(result).toEqual({ error: 'insert failed', message: null })
  })
})
