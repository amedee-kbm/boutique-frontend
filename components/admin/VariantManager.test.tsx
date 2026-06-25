import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/actions/variants', () => ({
  addVariantGroup: vi.fn(),
  addVariantOption: vi.fn(),
  deleteVariantGroup: vi.fn(),
  deleteVariantOption: vi.fn(),
  setVariantOptionImage: vi.fn(),
}))

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

import {
  addVariantGroup,
  addVariantOption,
  deleteVariantGroup,
  deleteVariantOption,
} from '@/lib/actions/variants'
import { toast } from 'sonner'
import { VariantManager } from '@/components/admin/VariantManager'

const groups = [
  {
    id: 'g1',
    name: 'Size',
    options: [
      { id: 'o1', value: 'S', imageId: null },
      { id: 'o2', value: 'M', imageId: null },
    ],
  },
]

beforeEach(() => {
  vi.clearAllMocks()
})

describe('VariantManager', () => {
  it('prompts to add a group when there are none', () => {
    render(<VariantManager productId="p1" initialGroups={[]} images={[]} />)
    expect(screen.getByText(/no variants yet/i)).toBeInTheDocument()
  })

  it('renders existing groups and their options', () => {
    render(<VariantManager productId="p1" initialGroups={groups} images={[]} />)
    expect(screen.getByText('Size')).toBeInTheDocument()
    expect(screen.getByText('S')).toBeInTheDocument()
    expect(screen.getByText('M')).toBeInTheDocument()
  })

  it('exposes a delete control for each group', () => {
    render(<VariantManager productId="p1" initialGroups={groups} images={[]} />)
    expect(screen.getByRole('button', { name: /delete size group/i })).toBeInTheDocument()
  })

  it('adds a new group and shows it after the action succeeds', async () => {
    vi.mocked(addVariantGroup).mockResolvedValue({
      error: null,
      group: { id: 'g2', productId: 'p1', name: 'Color', position: 1, options: [] },
    })
    const user = userEvent.setup()
    render(<VariantManager productId="p1" initialGroups={[]} images={[]} />)

    await user.type(screen.getByPlaceholderText(/new group/i), 'Color')
    await user.click(screen.getByRole('button', { name: /add group/i }))

    expect(addVariantGroup).toHaveBeenCalledWith('p1', 'Color')
    expect(await screen.findByText('Color')).toBeInTheDocument()
  })

  it('shows a toast and does not add the group when the action fails', async () => {
    vi.mocked(addVariantGroup).mockResolvedValue({ error: 'Boom', group: null })
    const user = userEvent.setup()
    render(<VariantManager productId="p1" initialGroups={[]} images={[]} />)

    await user.type(screen.getByPlaceholderText(/new group/i), 'Color')
    await user.click(screen.getByRole('button', { name: /add group/i }))

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Boom'))
    expect(screen.queryByText('Color')).not.toBeInTheDocument()
  })

  it('does not call the action for a blank group name', async () => {
    const user = userEvent.setup()
    render(<VariantManager productId="p1" initialGroups={[]} images={[]} />)

    await user.click(screen.getByRole('button', { name: /add group/i }))

    expect(addVariantGroup).not.toHaveBeenCalled()
  })

  it('adds an option to an existing group', async () => {
    vi.mocked(addVariantOption).mockResolvedValue({ error: null, option: { id: 'o3', value: 'L' } })
    const user = userEvent.setup()
    render(<VariantManager productId="p1" initialGroups={groups} images={[]} />)

    await user.type(screen.getByPlaceholderText(/add an option/i), 'L')
    await user.click(screen.getByRole('button', { name: /add option/i }))

    expect(addVariantOption).toHaveBeenCalledWith('g1', 'p1', 'L')
    expect(await screen.findByText('L')).toBeInTheDocument()
  })

  it('optimistically removes a group and calls the delete action', async () => {
    vi.mocked(deleteVariantGroup).mockResolvedValue({ error: null })
    const user = userEvent.setup()
    render(<VariantManager productId="p1" initialGroups={groups} images={[]} />)

    await user.click(screen.getByRole('button', { name: /delete size group/i }))

    expect(deleteVariantGroup).toHaveBeenCalledWith('g1', 'p1')
    await waitFor(() => expect(screen.queryByText('Size')).not.toBeInTheDocument())
  })

  it('restores a group when deletion fails', async () => {
    vi.mocked(deleteVariantGroup).mockResolvedValue({ error: 'Nope' })
    const user = userEvent.setup()
    render(<VariantManager productId="p1" initialGroups={groups} images={[]} />)

    await user.click(screen.getByRole('button', { name: /delete size group/i }))

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Nope'))
    expect(screen.getByText('Size')).toBeInTheDocument()
  })

  it('removes an individual option and calls the delete action', async () => {
    vi.mocked(deleteVariantOption).mockResolvedValue({ error: null })
    const user = userEvent.setup()
    render(<VariantManager productId="p1" initialGroups={groups} images={[]} />)

    await user.click(screen.getByRole('button', { name: /remove m/i }))

    expect(deleteVariantOption).toHaveBeenCalledWith('o2', 'p1')
    await waitFor(() => expect(screen.queryByText('M')).not.toBeInTheDocument())
  })
})
