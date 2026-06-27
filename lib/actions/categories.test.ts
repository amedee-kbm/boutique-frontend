// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/db', () => ({
  db: { insert: vi.fn(), update: vi.fn(), delete: vi.fn() },
}))

import { revalidatePath } from 'next/cache'

import { db } from '@/lib/db'
import { categoryFormSchema } from '@/lib/actions/categories.schema'
import { createCategory, deleteCategory, updateCategory } from '@/lib/actions/categories'

function chain(result: unknown = undefined) {
  const c: Record<string, ReturnType<typeof vi.fn>> = {}
  for (const m of ['values', 'set', 'where', 'returning']) c[m] = vi.fn(() => c)
  ;(c as unknown as { then: unknown }).then = (
    onF: (v: unknown) => unknown,
    onR: (e: unknown) => unknown
  ) => Promise.resolve(result).then(onF, onR)
  return c
}

function rejectingChain(error: unknown) {
  const c = chain()
  ;(c as unknown as { then: unknown }).then = (
    onF: (v: unknown) => unknown,
    onR: (e: unknown) => unknown
  ) => Promise.reject(error).then(onF, onR)
  return c
}

const mockedDb = vi.mocked(db) as unknown as {
  insert: ReturnType<typeof vi.fn>
  update: ReturnType<typeof vi.fn>
  delete: ReturnType<typeof vi.fn>
}

function form(fields: Record<string, string>) {
  const fd = new FormData()
  for (const [k, v] of Object.entries(fields)) fd.set(k, v)
  return fd
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('categoryFormSchema', () => {
  it('accepts a valid category', () => {
    expect(categoryFormSchema.safeParse({ name: 'Tops', slug: 'tops' }).success).toBe(true)
  })

  it('rejects empty name', () => {
    expect(categoryFormSchema.safeParse({ name: '', slug: 'tops' }).success).toBe(false)
  })

  it('rejects name longer than 100 chars', () => {
    expect(categoryFormSchema.safeParse({ name: 'a'.repeat(101), slug: 'tops' }).success).toBe(
      false
    )
  })

  it('rejects slug with spaces', () => {
    expect(categoryFormSchema.safeParse({ name: 'Tops', slug: 'my tops' }).success).toBe(false)
  })

  it('rejects slug with uppercase letters', () => {
    expect(categoryFormSchema.safeParse({ name: 'Tops', slug: 'Tops' }).success).toBe(false)
  })

  it('rejects slug with special chars', () => {
    expect(categoryFormSchema.safeParse({ name: 'Tops', slug: 'tops!' }).success).toBe(false)
  })

  it('accepts slug with hyphens and numbers', () => {
    expect(
      categoryFormSchema.safeParse({ name: 'T-Shirts & Tops', slug: 't-shirts-2025' }).success
    ).toBe(true)
  })
})

describe('createCategory', () => {
  it('inserts the category and revalidates the list', async () => {
    const c = chain([{ id: 'cat1' }])
    mockedDb.insert.mockReturnValue(c)

    const result = await createCategory(form({ name: 'Dresses', slug: 'dresses' }))

    expect(result).toEqual({ error: null })
    expect(c.values).toHaveBeenCalledWith({ name: 'Dresses', slug: 'dresses' })
    expect(revalidatePath).toHaveBeenCalledWith('/admin/categories')
  })

  it('auto-generates a slug from the name when blank', async () => {
    const c = chain([{ id: 'cat1' }])
    mockedDb.insert.mockReturnValue(c)

    await createCategory(form({ name: 'Summer & Sun Dresses' }))

    expect(c.values).toHaveBeenCalledWith(expect.objectContaining({ slug: 'summer-sun-dresses' }))
  })

  it('returns a validation error without touching the db', async () => {
    const result = await createCategory(form({ name: '', slug: 'x' }))

    expect(result.error).toBeTruthy()
    expect(mockedDb.insert).not.toHaveBeenCalled()
  })

  it('returns a friendly error on a duplicate slug', async () => {
    mockedDb.insert.mockReturnValue(rejectingChain(new Error('unique violation')))

    const result = await createCategory(form({ name: 'Dresses', slug: 'dresses' }))

    expect(result).toEqual({ error: 'A category with that slug already exists.' })
  })
})

describe('updateCategory', () => {
  it('updates the category and revalidates the list', async () => {
    const c = chain()
    mockedDb.update.mockReturnValue(c)

    const result = await updateCategory('c1', form({ name: 'Shoes', slug: 'shoes' }))

    expect(result).toEqual({ error: null })
    expect(c.set).toHaveBeenCalledWith({ name: 'Shoes', slug: 'shoes' })
    expect(revalidatePath).toHaveBeenCalledWith('/admin/categories')
  })

  it('returns a validation error for a bad slug', async () => {
    const result = await updateCategory('c1', form({ name: 'Shoes', slug: 'Bad Slug' }))

    expect(result.error).toBeTruthy()
    expect(mockedDb.update).not.toHaveBeenCalled()
  })

  it('returns a friendly error on a duplicate slug', async () => {
    mockedDb.update.mockReturnValue(rejectingChain(new Error('unique violation')))

    const result = await updateCategory('c1', form({ name: 'Shoes', slug: 'shoes' }))

    expect(result).toEqual({ error: 'A category with that slug already exists.' })
  })
})

describe('deleteCategory', () => {
  it('deletes the category and revalidates the list', async () => {
    mockedDb.delete.mockReturnValue(chain())

    const result = await deleteCategory('c1')

    expect(result).toEqual({ error: null })
    expect(mockedDb.delete).toHaveBeenCalled()
    expect(revalidatePath).toHaveBeenCalledWith('/admin/categories')
  })

  it('returns a friendly error when the category still has products', async () => {
    mockedDb.delete.mockReturnValue(rejectingChain(new Error('foreign key violation')))

    const result = await deleteCategory('c1')

    expect(result).toEqual({ error: 'Cannot delete — category has products.' })
  })
})
