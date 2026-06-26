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
  it('marks existing options as selected', () => {
    render(<VariantManager productId="p1" initialGroups={groups} images={[]} />)
    expect(screen.getByRole('button', { name: 'S' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'M' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'L' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('adds an option to an existing preset group', async () => {
    vi.mocked(addVariantOption).mockResolvedValue({ error: null, option: { id: 'o3', value: 'L' } })
    const user = userEvent.setup()
    render(<VariantManager productId="p1" initialGroups={groups} images={[]} />)

    await user.click(screen.getByRole('button', { name: 'L' }))

    expect(addVariantOption).toHaveBeenCalledWith('g1', 'p1', 'L')
    expect(addVariantGroup).not.toHaveBeenCalled()
    expect(await screen.findByRole('button', { name: 'L', pressed: true })).toBeInTheDocument()
  })

  it('creates the group when selecting an option for a not-yet-used type', async () => {
    vi.mocked(addVariantGroup).mockResolvedValue({
      error: null,
      group: { id: 'g2', productId: 'p1', name: 'Colour', position: 1, options: [] },
    })
    vi.mocked(addVariantOption).mockResolvedValue({
      error: null,
      option: { id: 'o9', value: 'Black' },
    })
    const user = userEvent.setup()
    render(<VariantManager productId="p1" initialGroups={[]} images={[]} />)

    await user.click(screen.getByRole('button', { name: 'Black' }))

    await waitFor(() => expect(addVariantGroup).toHaveBeenCalledWith('p1', 'Colour'))
    await waitFor(() => expect(addVariantOption).toHaveBeenCalledWith('g2', 'p1', 'Black'))
  })

  it('removes an option but keeps a group that still has options', async () => {
    vi.mocked(deleteVariantOption).mockResolvedValue({ error: null })
    const user = userEvent.setup()
    render(<VariantManager productId="p1" initialGroups={groups} images={[]} />)

    await user.click(screen.getByRole('button', { name: 'M' }))

    expect(deleteVariantOption).toHaveBeenCalledWith('o2', 'p1')
    expect(deleteVariantGroup).not.toHaveBeenCalled()
    expect(await screen.findByRole('button', { name: 'M', pressed: false })).toBeInTheDocument()
  })

  it('deletes the group when its last option is removed', async () => {
    vi.mocked(deleteVariantOption).mockResolvedValue({ error: null })
    vi.mocked(deleteVariantGroup).mockResolvedValue({ error: null })
    const single = [{ id: 'g1', name: 'Size', options: [{ id: 'o1', value: 'S', imageId: null }] }]
    const user = userEvent.setup()
    render(<VariantManager productId="p1" initialGroups={single} images={[]} />)

    await user.click(screen.getByRole('button', { name: 'S' }))

    expect(deleteVariantOption).toHaveBeenCalledWith('o1', 'p1')
    await waitFor(() => expect(deleteVariantGroup).toHaveBeenCalledWith('g1', 'p1'))
  })

  it('restores state when removing an option fails', async () => {
    vi.mocked(deleteVariantOption).mockResolvedValue({ error: 'Nope' })
    const user = userEvent.setup()
    render(<VariantManager productId="p1" initialGroups={groups} images={[]} />)

    await user.click(screen.getByRole('button', { name: 'M' }))

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Nope'))
    expect(await screen.findByRole('button', { name: 'M', pressed: true })).toBeInTheDocument()
  })

  it('adds a custom type and shows it', async () => {
    vi.mocked(addVariantGroup).mockResolvedValue({
      error: null,
      group: { id: 'g5', productId: 'p1', name: 'Style', position: 0, options: [] },
    })
    const user = userEvent.setup()
    render(<VariantManager productId="p1" initialGroups={[]} images={[]} />)

    await user.type(screen.getByPlaceholderText(/new type/i), 'Style')
    await user.click(screen.getByRole('button', { name: /add group/i }))

    expect(addVariantGroup).toHaveBeenCalledWith('p1', 'Style')
    expect(await screen.findByText('Style')).toBeInTheDocument()
  })
})
