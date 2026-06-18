import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { PageHeader } from '@/components/admin/PageHeader'

describe('PageHeader', () => {
  it('renders the title', () => {
    render(<PageHeader title="Products" />)
    expect(screen.getByRole('heading', { name: 'Products' })).toBeInTheDocument()
  })

  it('renders the description when provided', () => {
    render(<PageHeader title="Products" description="Everything you sell." />)
    expect(screen.getByText('Everything you sell.')).toBeInTheDocument()
  })

  it('renders the action node', () => {
    render(<PageHeader title="Products" action={<button>Add</button>} />)
    expect(screen.getByRole('button', { name: 'Add' })).toBeInTheDocument()
  })
})
