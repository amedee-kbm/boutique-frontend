import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/actions/products', () => ({
  deleteProduct: vi.fn(),
  toggleProductVisibility: vi.fn(),
}))

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

import { deleteProduct, toggleProductVisibility } from '@/lib/actions/products'
import { ProductsTable } from '@/components/admin/ProductsTable'

const products = [
  {
    id: 'p1',
    name: 'Floral Dress',
    price: '29.99',
    visible: true,
    categoryName: 'Dresses',
    thumbnail: null,
  },
  {
    id: 'p2',
    name: 'Hidden Top',
    price: '9.50',
    visible: false,
    categoryName: null,
    thumbnail: null,
  },
]

beforeEach(() => {
  vi.clearAllMocks()
})

describe('ProductsTable', () => {
  it('shows an empty state when there are no products', () => {
    render(<ProductsTable products={[]} />)
    expect(screen.getByText(/no products yet/i)).toBeInTheDocument()
  })

  it('renders a row per product with name, price and category', () => {
    render(<ProductsTable products={products} />)
    expect(screen.getByText('Floral Dress')).toBeInTheDocument()
    expect(screen.getByText('$29.99')).toBeInTheDocument()
    expect(screen.getByText('Dresses')).toBeInTheDocument()
    expect(screen.getByText('Uncategorized')).toBeInTheDocument()
  })

  it('reflects visibility state in the toggle', () => {
    render(<ProductsTable products={products} />)
    const toggles = screen.getAllByRole('switch', { name: /toggle visibility/i })
    expect(toggles).toHaveLength(2)
    expect(toggles[0]).toBeChecked()
    expect(toggles[1]).not.toBeChecked()
  })

  it('links each product name and edit button to its edit page', () => {
    render(<ProductsTable products={products} />)
    const nameLink = screen.getByRole('link', { name: 'Floral Dress' })
    expect(nameLink).toHaveAttribute('href', '/admin/products/p1/edit')
  })

  it('calls toggleProductVisibility when the switch is flipped', async () => {
    vi.mocked(toggleProductVisibility).mockResolvedValue(undefined)
    const user = userEvent.setup()
    render(<ProductsTable products={products} />)

    const toggles = screen.getAllByRole('switch', { name: /toggle visibility/i })
    await user.click(toggles[0])

    await waitFor(() => expect(toggleProductVisibility).toHaveBeenCalledWith('p1', false))
  })

  it('deletes a product after confirming in the dialog', async () => {
    vi.mocked(deleteProduct).mockResolvedValue(undefined)
    const user = userEvent.setup()
    render(<ProductsTable products={products} />)

    await user.click(screen.getAllByRole('button', { name: /delete product/i })[0])

    const confirm = await screen.findByRole('button', { name: 'Delete' })
    await user.click(confirm)

    await waitFor(() => expect(deleteProduct).toHaveBeenCalledWith('p1'))
  })
})
