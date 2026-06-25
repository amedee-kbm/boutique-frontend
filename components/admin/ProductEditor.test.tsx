import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

const push = vi.fn()
const refresh = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, refresh }),
}))

vi.mock('@/lib/actions/products', () => ({
  createProduct: vi.fn(),
  updateProduct: vi.fn(),
  uploadProductImage: vi.fn(),
}))

vi.mock('@/lib/actions/variants', () => ({
  addVariantGroup: vi.fn(),
  addVariantOption: vi.fn(),
}))

// The persisted (edit-mode) managers have their own tests; stub them here.
vi.mock('@/components/admin/ProductImageManager', () => ({
  ProductImageManager: () => <div>image-manager</div>,
}))
vi.mock('@/components/admin/VariantManager', () => ({
  VariantManager: () => <div>variant-manager</div>,
}))

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

import { createProduct, updateProduct, uploadProductImage } from '@/lib/actions/products'
import { addVariantGroup, addVariantOption } from '@/lib/actions/variants'
import { toast } from 'sonner'
import { ProductEditor } from '@/components/admin/ProductEditor'

const categories = [
  { id: 'c1', name: 'Dresses' },
  { id: 'c2', name: 'Shoes' },
]

const product = {
  id: 'p1',
  name: 'Floral Dress',
  slug: 'floral-dress',
  description: 'Lovely',
  price: '5000',
  categoryId: 'c1',
  visible: true,
  images: [],
  variantGroups: [],
}

beforeAll(() => {
  let n = 0
  globalThis.URL.createObjectURL = vi.fn(() => `blob:preview-${n++}`)
  globalThis.URL.revokeObjectURL = vi.fn()
})

beforeEach(() => {
  vi.clearAllMocks()
})

describe('ProductEditor (create)', () => {
  it('renders the Shopify-style editor scaffold', () => {
    render(<ProductEditor categories={categories} />)
    expect(screen.getByRole('button', { name: /visible/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument()
    expect(screen.getByText('Add images')).toBeInTheDocument()
    expect(screen.getByLabelText('Product title')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /add description/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /set price/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /add options/i })).toBeInTheDocument()
  })

  it('does not submit without a title', async () => {
    const user = userEvent.setup()
    render(<ProductEditor categories={categories} />)

    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(toast.error).toHaveBeenCalledWith('Add a product title')
    expect(createProduct).not.toHaveBeenCalled()
  })

  it('captures price from the sub-screen and creates the product', async () => {
    vi.mocked(createProduct).mockResolvedValue({ error: null, id: 'new-id' })
    const user = userEvent.setup()
    render(<ProductEditor categories={categories} />)

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
    const { container } = render(<ProductEditor categories={categories} />)

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
    render(<ProductEditor categories={categories} />)

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
    render(<ProductEditor categories={categories} />)

    await user.type(screen.getByLabelText('Product title'), 'Tee')

    await user.click(screen.getByRole('button', { name: /add options/i }))
    await user.type(await screen.findByPlaceholderText(/new group/i), 'Size')
    await user.click(screen.getByRole('button', { name: /add group/i }))
    await user.type(screen.getByPlaceholderText(/add an option/i), 'M')
    await user.click(screen.getByRole('button', { name: /add option/i }))
    await user.click(screen.getByRole('button', { name: /close/i }))

    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(createProduct).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(addVariantGroup).toHaveBeenCalledWith('new-id', 'Size'))
    await waitFor(() => expect(addVariantOption).toHaveBeenCalledWith('g1', 'new-id', 'M'))
  })

  it('selects a category from the sub-screen', async () => {
    vi.mocked(createProduct).mockResolvedValue({ error: null, id: 'new-id' })
    const user = userEvent.setup()
    render(<ProductEditor categories={categories} />)

    await user.type(screen.getByLabelText('Product title'), 'Heels')
    await user.click(screen.getByRole('button', { name: /select category/i }))
    await user.click(await screen.findByRole('button', { name: 'Shoes' }))

    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(createProduct).toHaveBeenCalledTimes(1))
    const formData = vi.mocked(createProduct).mock.calls[0][0] as FormData
    expect(formData.get('categoryId')).toBe('c2')
  })
})

describe('ProductEditor (edit)', () => {
  it('prefills fields from the product and uses the persisted managers', () => {
    render(<ProductEditor categories={categories} product={product} />)
    expect(screen.getByLabelText('Product title')).toHaveValue('Floral Dress')
    expect(screen.getByText('RWF 5,000')).toBeInTheDocument()
    expect(screen.getByText('Dresses')).toBeInTheDocument()
    // Edit mode shows the persisted image manager, not the staging dropzone.
    expect(screen.getByText('image-manager')).toBeInTheDocument()
    expect(screen.queryByText('Add images')).not.toBeInTheDocument()
  })

  it('updates the product (keeping the slug) and refreshes on save', async () => {
    vi.mocked(updateProduct).mockResolvedValue({ error: null })
    const user = userEvent.setup()
    render(<ProductEditor categories={categories} product={product} />)

    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(updateProduct).toHaveBeenCalledWith('p1', expect.any(FormData)))
    const formData = vi.mocked(updateProduct).mock.calls[0][1] as FormData
    expect(formData.get('slug')).toBe('floral-dress')
    expect(formData.get('name')).toBe('Floral Dress')
    expect(toast.success).toHaveBeenCalledWith('Product saved')
    expect(refresh).toHaveBeenCalled()
    expect(createProduct).not.toHaveBeenCalled()
  })
})
