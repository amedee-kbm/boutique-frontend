import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/actions/products', () => ({
  deleteProduct: vi.fn(),
  toggleProductVisibility: vi.fn(),
}))

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

import { deleteProduct, toggleProductVisibility } from '@/lib/actions/products'
import { ProductsList } from '@/components/admin/ProductsList'

const products = [
  {
    id: 'p1',
    name: 'Floral Dress',
    price: '5000',
    visible: true,
    categoryName: 'Dresses',
    thumbnail: null,
    variantCount: 3,
  },
  {
    id: 'p2',
    name: 'Hidden Top',
    price: '1500',
    visible: false,
    categoryName: null,
    thumbnail: null,
    variantCount: 0,
  },
]

beforeEach(() => {
  vi.clearAllMocks()
})

describe('ProductsList', () => {
  it('shows an empty state when there are no products', () => {
    render(<ProductsList products={[]} />)
    expect(screen.getByText(/no products yet/i)).toBeInTheDocument()
  })

  it('renders a row per product with title, price and category', () => {
    render(<ProductsList products={products} />)
    expect(screen.getByRole('link', { name: 'Floral Dress' })).toBeInTheDocument()
    expect(screen.getByText('RWF 5,000 · Dresses · 3 variants')).toBeInTheDocument()
    expect(screen.getByText('RWF 1,500 · Uncategorized')).toBeInTheDocument()
  })

  it('flags hidden products', () => {
    render(<ProductsList products={products} />)
    expect(screen.getByText('Hidden', { selector: 'p' })).toBeInTheDocument()
  })

  it('links each product title to its edit page', () => {
    render(<ProductsList products={products} />)
    expect(screen.getByRole('link', { name: 'Floral Dress' })).toHaveAttribute(
      'href',
      '/admin/products/p1/edit'
    )
  })

  it('filters by the search query', async () => {
    const user = userEvent.setup()
    render(<ProductsList products={products} />)

    await user.type(screen.getByLabelText('Filter products'), 'floral')

    expect(screen.getByRole('link', { name: 'Floral Dress' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Hidden Top' })).not.toBeInTheDocument()
  })

  it('filters by visibility chips', async () => {
    const user = userEvent.setup()
    render(<ProductsList products={products} />)

    await user.click(screen.getByRole('button', { name: 'Hidden' }))

    expect(screen.queryByRole('link', { name: 'Floral Dress' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Hidden Top' })).toBeInTheDocument()
  })

  it('shows a no-match message when filters exclude everything', async () => {
    const user = userEvent.setup()
    render(<ProductsList products={products} />)

    await user.type(screen.getByLabelText('Filter products'), 'zzz')
    expect(screen.getByText(/no products match/i)).toBeInTheDocument()
  })

  it('reflects and toggles visibility', async () => {
    vi.mocked(toggleProductVisibility).mockResolvedValue(undefined)
    const user = userEvent.setup()
    render(<ProductsList products={products} />)

    const toggles = screen.getAllByRole('switch', { name: /toggle visibility/i })
    expect(toggles[0]).toBeChecked()
    expect(toggles[1]).not.toBeChecked()

    await user.click(toggles[0])
    await waitFor(() => expect(toggleProductVisibility).toHaveBeenCalledWith('p1', false))
  })

  it('deletes a product after confirming in the dialog', async () => {
    vi.mocked(deleteProduct).mockResolvedValue(undefined)
    const user = userEvent.setup()
    render(<ProductsList products={products} />)

    await user.click(screen.getAllByRole('button', { name: /delete product/i })[0])
    const confirm = await screen.findByRole('button', { name: 'Delete' })
    await user.click(confirm)

    await waitFor(() => expect(deleteProduct).toHaveBeenCalledWith('p1'))
  })
})
