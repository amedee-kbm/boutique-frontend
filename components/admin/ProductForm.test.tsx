import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const push = vi.fn()
const refresh = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, refresh }),
}))

vi.mock('@/lib/actions/products', () => ({
  createProduct: vi.fn(),
  updateProduct: vi.fn(),
}))

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

import { createProduct, updateProduct } from '@/lib/actions/products'
import { toast } from 'sonner'
import { ProductForm } from '@/components/admin/ProductForm'

const categories = [
  { id: 'c1', name: 'Dresses' },
  { id: 'c2', name: 'Shoes' },
]

const product = {
  id: 'p1',
  name: 'Floral Dress',
  slug: 'floral-dress',
  description: 'Lovely',
  price: '29.99',
  categoryId: 'c1',
  visible: true,
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('ProductForm (create)', () => {
  it('renders the create button and lists categories', () => {
    render(<ProductForm categories={categories} />)
    expect(screen.getByRole('button', { name: /create product/i })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Dresses' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Uncategorized' })).toBeInTheDocument()
  })

  it('submits the entered values and redirects to the new edit page', async () => {
    vi.mocked(createProduct).mockResolvedValue({ error: null, id: 'new-id' })
    const user = userEvent.setup()
    render(<ProductForm categories={categories} />)

    await user.type(screen.getByLabelText('Name'), 'New Product')
    await user.type(screen.getByLabelText('Price'), '12.50')
    await user.type(screen.getByLabelText('Slug'), 'new-product')
    await user.click(screen.getByRole('button', { name: /create product/i }))

    await waitFor(() => expect(createProduct).toHaveBeenCalledTimes(1))
    const formData = vi.mocked(createProduct).mock.calls[0][0] as FormData
    expect(formData.get('name')).toBe('New Product')
    expect(formData.get('price')).toBe('12.50')
    expect(formData.get('visible')).toBe('true')

    await waitFor(() => expect(push).toHaveBeenCalledWith('/admin/products/new-id/edit'))
  })

  it('shows a toast and does not redirect when creation fails', async () => {
    vi.mocked(createProduct).mockResolvedValue({ error: 'Slug taken', id: null })
    const user = userEvent.setup()
    render(<ProductForm categories={categories} />)

    await user.type(screen.getByLabelText('Name'), 'X')
    await user.type(screen.getByLabelText('Price'), '1.00')
    await user.type(screen.getByLabelText('Slug'), 'x')
    await user.click(screen.getByRole('button', { name: /create product/i }))

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Slug taken'))
    expect(push).not.toHaveBeenCalled()
  })
})

describe('ProductForm (edit)', () => {
  it('pre-fills the fields from the existing product', () => {
    render(<ProductForm categories={categories} product={product} />)
    expect(screen.getByLabelText('Name')).toHaveValue('Floral Dress')
    expect(screen.getByLabelText('Slug')).toHaveValue('floral-dress')
    expect(screen.getByLabelText('Price')).toHaveValue('29.99')
    expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument()
  })

  it('updates the product and refreshes on success', async () => {
    vi.mocked(updateProduct).mockResolvedValue({ error: null })
    const user = userEvent.setup()
    render(<ProductForm categories={categories} product={product} />)

    await user.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() => expect(updateProduct).toHaveBeenCalledWith('p1', expect.any(FormData)))
    expect(toast.success).toHaveBeenCalledWith('Product saved')
    expect(refresh).toHaveBeenCalled()
  })

  it('navigates to the products list when cancel is clicked', async () => {
    const user = userEvent.setup()
    render(<ProductForm categories={categories} product={product} />)

    await user.click(screen.getByRole('button', { name: /cancel/i }))

    expect(push).toHaveBeenCalledWith('/admin/products')
  })
})
