import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/actions/products', () => ({
  deleteProduct: vi.fn(),
  toggleProductVisibility: vi.fn(),
}))

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
})
