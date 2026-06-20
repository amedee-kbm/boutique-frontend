import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

const usePathname = vi.fn()
vi.mock('next/navigation', () => ({
  usePathname: () => usePathname(),
  useRouter: () => ({ push: vi.fn() }),
}))

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({ auth: { signOut: vi.fn() } }),
}))

import { AdminSidebar } from '@/components/admin/AdminSidebar'

describe('AdminSidebar', () => {
  it('renders the nav, the brand, and the sign-out button', () => {
    usePathname.mockReturnValue('/admin')
    render(<AdminSidebar userEmail="seller@example.com" />)

    expect(screen.getByText('Zita Boutique')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /products/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign out/i })).toBeInTheDocument()
  })

  it('shows the user email and its initials', () => {
    usePathname.mockReturnValue('/admin')
    render(<AdminSidebar userEmail="seller@example.com" />)

    expect(screen.getByText('seller@example.com')).toBeInTheDocument()
    expect(screen.getByText('SE')).toBeInTheDocument()
  })

  it('highlights the active section based on the pathname', () => {
    usePathname.mockReturnValue('/admin/categories')
    render(<AdminSidebar userEmail="seller@example.com" />)

    expect(screen.getByRole('link', { name: /categories/i })).toHaveClass('bg-primary')
    expect(screen.getByRole('link', { name: /dashboard/i })).not.toHaveClass('bg-primary')
  })
})
