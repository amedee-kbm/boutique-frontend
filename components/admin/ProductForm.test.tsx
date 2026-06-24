import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const push = vi.fn()
const refresh = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, refresh }),
}))

vi.mock('@/lib/actions/products', () => ({
  updateProduct: vi.fn(),
}))

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

import { updateProduct } from '@/lib/actions/products'
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
