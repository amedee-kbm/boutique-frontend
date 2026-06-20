import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/actions/categories', () => ({
  createCategory: vi.fn(),
  updateCategory: vi.fn(),
}))

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

import { createCategory, updateCategory } from '@/lib/actions/categories'
import { toast } from 'sonner'
import { CategoryDialog } from '@/components/admin/CategoryDialog'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('CategoryDialog (create)', () => {
  it('opens from the default trigger and shows the create title', async () => {
    const user = userEvent.setup()
    render(<CategoryDialog />)

    await user.click(screen.getByRole('button', { name: /new category/i }))

    expect(await screen.findByRole('heading', { name: /new category/i })).toBeInTheDocument()
  })

  it('creates a category and closes on success', async () => {
    vi.mocked(createCategory).mockResolvedValue({ error: null })
    const user = userEvent.setup()
    render(<CategoryDialog />)

    await user.click(screen.getByRole('button', { name: /new category/i }))
    await user.type(await screen.findByLabelText('Name'), 'Accessories')
    await user.type(screen.getByLabelText('Slug'), 'accessories')
    await user.click(screen.getByRole('button', { name: /^create$/i }))

    await waitFor(() => expect(createCategory).toHaveBeenCalledTimes(1))
    const formData = vi.mocked(createCategory).mock.calls[0][0] as FormData
    expect(formData.get('name')).toBe('Accessories')
    expect(formData.get('slug')).toBe('accessories')
    expect(toast.success).toHaveBeenCalledWith('Category created')
    await waitFor(() =>
      expect(screen.queryByRole('heading', { name: /new category/i })).not.toBeInTheDocument()
    )
  })

  it('keeps the dialog open and toasts when creation fails', async () => {
    vi.mocked(createCategory).mockResolvedValue({ error: 'Slug taken' })
    const user = userEvent.setup()
    render(<CategoryDialog />)

    await user.click(screen.getByRole('button', { name: /new category/i }))
    await user.type(await screen.findByLabelText('Name'), 'Dup')
    await user.type(screen.getByLabelText('Slug'), 'dup')
    await user.click(screen.getByRole('button', { name: /^create$/i }))

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Slug taken'))
    expect(screen.getByRole('heading', { name: /new category/i })).toBeInTheDocument()
  })
})

describe('CategoryDialog (edit)', () => {
  const category = { id: 'c1', name: 'Dresses', slug: 'dresses' }

  it('opens from a custom trigger pre-filled and saves changes', async () => {
    vi.mocked(updateCategory).mockResolvedValue({ error: null })
    const user = userEvent.setup()
    render(<CategoryDialog category={category} trigger={<button>Edit</button>} />)

    await user.click(screen.getByRole('button', { name: 'Edit' }))

    expect(await screen.findByLabelText('Name')).toHaveValue('Dresses')
    expect(screen.getByLabelText('Slug')).toHaveValue('dresses')

    await user.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() => expect(updateCategory).toHaveBeenCalledWith('c1', expect.any(FormData)))
    expect(toast.success).toHaveBeenCalledWith('Category updated')
  })
})
