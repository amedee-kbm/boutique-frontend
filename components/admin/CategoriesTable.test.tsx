import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/actions/categories', () => ({
  createCategory: vi.fn(),
  updateCategory: vi.fn(),
  deleteCategory: vi.fn(),
}))

import { CategoriesTable } from '@/components/admin/CategoriesTable'

const categories = [
  { id: 'a', name: 'Dresses', slug: 'dresses', productCount: 3, filters: [] },
  { id: 'b', name: 'Shoes', slug: 'shoes', productCount: 0, filters: [] },
]

describe('CategoriesTable', () => {
  it('shows an empty state when there are no categories', () => {
    render(<CategoriesTable categories={[]} />)
    expect(screen.getByText(/no categories yet/i)).toBeInTheDocument()
  })

  it('renders a row per category with its product count', () => {
    render(<CategoriesTable categories={categories} />)
    expect(screen.getByText('Dresses')).toBeInTheDocument()
    expect(screen.getByText('Shoes')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('exposes edit and delete actions for each category', () => {
    render(<CategoriesTable categories={categories} />)
    expect(screen.getAllByRole('button', { name: /edit category/i })).toHaveLength(2)
    expect(screen.getAllByRole('button', { name: /delete category/i })).toHaveLength(2)
  })
})
