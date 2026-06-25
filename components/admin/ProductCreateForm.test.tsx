import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

const push = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}))

vi.mock('@/lib/actions/products', () => ({
  createProduct: vi.fn(),
  uploadProductImage: vi.fn(),
}))

vi.mock('@/lib/actions/variants', () => ({
  addVariantGroup: vi.fn(),
  addVariantOption: vi.fn(),
}))

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

import { createProduct, uploadProductImage } from '@/lib/actions/products'
import { addVariantGroup, addVariantOption } from '@/lib/actions/variants'
import { toast } from 'sonner'
import { ProductCreateForm } from '@/components/admin/ProductCreateForm'

const categories = [
  { id: 'c1', name: 'Dresses' },
  { id: 'c2', name: 'Shoes' },
]

beforeAll(() => {
  let n = 0
  globalThis.URL.createObjectURL = vi.fn(() => `blob:preview-${n++}`)
  globalThis.URL.revokeObjectURL = vi.fn()
})

beforeEach(() => {
  vi.clearAllMocks()
})

describe('ProductCreateForm', () => {
  it('renders the Shopify-style editor scaffold', () => {
    render(<ProductCreateForm categories={categories} />)
    expect(screen.getByText('New product')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument()
    expect(screen.getByText('Add images')).toBeInTheDocument()
    expect(screen.getByLabelText('Product title')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /add description/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /set price/i })).toBeInTheDocument()
  })

  it('does not submit without a title', async () => {
    const user = userEvent.setup()
    render(<ProductCreateForm categories={categories} />)

    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(toast.error).toHaveBeenCalledWith('Add a product title')
    expect(createProduct).not.toHaveBeenCalled()
  })

  it('captures price from the sub-screen and creates the product', async () => {
    vi.mocked(createProduct).mockResolvedValue({ error: null, id: 'new-id' })
    const user = userEvent.setup()
    render(<ProductCreateForm categories={categories} />)

    await user.type(screen.getByLabelText('Product title'), 'Floral Dress')

    await user.click(screen.getByRole('button', { name: /set price/i }))
    await user.type(await screen.findByLabelText('Price'), '21.99')
    await user.click(screen.getByRole('button', { name: 'Done' }))

    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(createProduct).toHaveBeenCalledTimes(1))
    const formData = vi.mocked(createProduct).mock.calls[0][0] as FormData
    expect(formData.get('name')).toBe('Floral Dress')
    expect(formData.get('price')).toBe('21.99')
    expect(formData.get('visible')).toBe('true')

    await waitFor(() => expect(push).toHaveBeenCalledWith('/admin/products/new-id/edit'))
  })

  it('uploads staged photos after the product is created, then redirects', async () => {
    vi.mocked(createProduct).mockResolvedValue({ error: null, id: 'new-id' })
    vi.mocked(uploadProductImage).mockResolvedValue({ error: null, url: 'http://x/p.png' })
    const user = userEvent.setup()
    const { container } = render(<ProductCreateForm categories={categories} />)

    await user.type(screen.getByLabelText('Product title'), 'Tee')

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement
    await user.upload(fileInput, new File(['x'], 'photo.png', { type: 'image/png' }))
    await waitFor(() => expect(screen.getByLabelText('Remove image')).toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(createProduct).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(uploadProductImage).toHaveBeenCalledTimes(1))
    const [productId, imageData] = vi.mocked(uploadProductImage).mock.calls[0]
    expect(productId).toBe('new-id')
    expect((imageData as FormData).get('file')).toBeInstanceOf(File)

    await waitFor(() => expect(push).toHaveBeenCalledWith('/admin/products/new-id/edit'))
  })

  it('toasts and does not upload or redirect when creation fails', async () => {
    vi.mocked(createProduct).mockResolvedValue({ error: 'Slug taken', id: null })
    const user = userEvent.setup()
    render(<ProductCreateForm categories={categories} />)

    await user.type(screen.getByLabelText('Product title'), 'Dup')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Slug taken'))
    expect(uploadProductImage).not.toHaveBeenCalled()
    expect(push).not.toHaveBeenCalled()
  })

  it('stages variants and persists them after the product is created', async () => {
    vi.mocked(createProduct).mockResolvedValue({ error: null, id: 'new-id' })
    vi.mocked(addVariantGroup).mockResolvedValue({
      error: null,
      group: { id: 'g1', productId: 'new-id', name: 'Size', position: 0, options: [] },
    })
    vi.mocked(addVariantOption).mockResolvedValue({ error: null, option: { id: 'o1', value: 'M' } })
    const user = userEvent.setup()
    render(<ProductCreateForm categories={categories} />)

    await user.type(screen.getByLabelText('Product title'), 'Tee')

    await user.click(screen.getByRole('button', { name: /add options/i }))
    await user.type(await screen.findByPlaceholderText(/new group/i), 'Size')
    await user.click(screen.getByRole('button', { name: /add group/i }))
    await user.type(screen.getByPlaceholderText(/add an option/i), 'M')
    await user.click(screen.getByRole('button', { name: /add option/i }))
    await user.click(screen.getByRole('button', { name: 'Done' }))

    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(createProduct).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(addVariantGroup).toHaveBeenCalledWith('new-id', 'Size'))
    await waitFor(() => expect(addVariantOption).toHaveBeenCalledWith('g1', 'new-id', 'M'))
  })

  it('selects a category from the sub-screen', async () => {
    vi.mocked(createProduct).mockResolvedValue({ error: null, id: 'new-id' })
    const user = userEvent.setup()
    render(<ProductCreateForm categories={categories} />)

    await user.type(screen.getByLabelText('Product title'), 'Heels')
    await user.click(screen.getByRole('button', { name: /select category/i }))
    await user.click(await screen.findByRole('button', { name: 'Shoes' }))

    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(createProduct).toHaveBeenCalledTimes(1))
    const formData = vi.mocked(createProduct).mock.calls[0][0] as FormData
    expect(formData.get('categoryId')).toBe('c2')
  })
})
