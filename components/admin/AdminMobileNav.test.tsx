import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

const usePathname = vi.fn()
vi.mock('next/navigation', () => ({ usePathname: () => usePathname() }))

import { AdminMobileNav } from '@/components/admin/AdminMobileNav'

describe('AdminMobileNav', () => {
  it('renders a link for every nav item', () => {
    usePathname.mockReturnValue('/admin')
    render(<AdminMobileNav />)

    for (const label of ['Dashboard', 'Products', 'Categories', 'Chat']) {
      expect(screen.getByRole('link', { name: new RegExp(label) })).toBeInTheDocument()
    }
  })

  it('marks Dashboard active only on an exact match', () => {
    usePathname.mockReturnValue('/admin')
    render(<AdminMobileNav />)

    expect(screen.getByRole('link', { name: /dashboard/i })).toHaveClass('text-primary')
    expect(screen.getByRole('link', { name: /products/i })).not.toHaveClass('text-primary')
  })

  it('marks Products active on nested product routes', () => {
    usePathname.mockReturnValue('/admin/products/p1/edit')
    render(<AdminMobileNav />)

    expect(screen.getByRole('link', { name: /products/i })).toHaveClass('text-primary')
    expect(screen.getByRole('link', { name: /dashboard/i })).not.toHaveClass('text-primary')
  })
})
