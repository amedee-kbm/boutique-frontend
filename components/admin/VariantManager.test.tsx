import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/actions/variants', () => ({
  addVariantGroup: vi.fn(),
  addVariantOption: vi.fn(),
  deleteVariantGroup: vi.fn(),
  deleteVariantOption: vi.fn(),
  setVariantOptionImage: vi.fn(),
  setVariantOptionHex: vi.fn(),
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
      { id: 'o1', value: 'S', imageId: null, hex: null },
      { id: 'o2', value: 'M', imageId: null, hex: null },
    ],
  },
]

beforeEach(() => {
  vi.clearAllMocks()
})

type User = ReturnType<typeof userEvent.setup>

// A preset type with values starts collapsed to its summary row; expand it,
// then open the value field's checklist popover to reach the checkboxes.
async function openSizePicker(user: User) {
  await user.click(screen.getByRole('button', { name: /^size/i }))
  await user.click(screen.getByRole('button', { name: /size values/i }))
}

// An unused preset type is added through the menu, which opens its editor; then
// open its checklist popover.
async function openColourPicker(user: User) {
  await user.click(screen.getByRole('button', { name: /add options/i }))
  await user.click(screen.getByRole('button', { name: 'Colour' }))
  await user.click(screen.getByRole('button', { name: /colour values/i }))
}

describe('VariantManager', () => {
  it('marks existing options as selected', async () => {
    const user = userEvent.setup()
    render(<VariantManager productId="p1" initialGroups={groups} images={[]} />)
    await openSizePicker(user)
    expect(await screen.findByRole('checkbox', { name: 'S' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'M' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'L' })).not.toBeChecked()
  })

  it('adds an option to an existing preset group', async () => {
    vi.mocked(addVariantOption).mockResolvedValue({ error: null, option: { id: 'o3', value: 'L' } })
    const user = userEvent.setup()
    render(<VariantManager productId="p1" initialGroups={groups} images={[]} />)
    await openSizePicker(user)

    await user.click(screen.getByRole('checkbox', { name: 'L' }))

    expect(addVariantOption).toHaveBeenCalledWith('g1', 'p1', 'L')
    expect(addVariantGroup).not.toHaveBeenCalled()
    expect(await screen.findByRole('checkbox', { name: 'L', checked: true })).toBeInTheDocument()
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
    await openColourPicker(user)

    await user.click(screen.getByRole('checkbox', { name: 'Black' }))

    await waitFor(() => expect(addVariantGroup).toHaveBeenCalledWith('p1', 'Colour'))
    await waitFor(() => expect(addVariantOption).toHaveBeenCalledWith('g2', 'p1', 'Black'))
  })

  it('removes an option but keeps a group that still has options', async () => {
    vi.mocked(deleteVariantOption).mockResolvedValue({ error: null })
    const user = userEvent.setup()
    render(<VariantManager productId="p1" initialGroups={groups} images={[]} />)
    await openSizePicker(user)

    await user.click(screen.getByRole('checkbox', { name: 'M' }))

    expect(deleteVariantOption).toHaveBeenCalledWith('o2', 'p1')
    expect(deleteVariantGroup).not.toHaveBeenCalled()
    expect(await screen.findByRole('checkbox', { name: 'M', checked: false })).toBeInTheDocument()
  })

  it('deletes the group when its last option is removed', async () => {
    vi.mocked(deleteVariantOption).mockResolvedValue({ error: null })
    vi.mocked(deleteVariantGroup).mockResolvedValue({ error: null })
    const single = [
      { id: 'g1', name: 'Size', options: [{ id: 'o1', value: 'S', imageId: null, hex: null }] },
    ]
    const user = userEvent.setup()
    render(<VariantManager productId="p1" initialGroups={single} images={[]} />)
    await openSizePicker(user)

    await user.click(screen.getByRole('checkbox', { name: 'S' }))

    expect(deleteVariantOption).toHaveBeenCalledWith('o1', 'p1')
    await waitFor(() => expect(deleteVariantGroup).toHaveBeenCalledWith('g1', 'p1'))
  })

  it('restores state when removing an option fails', async () => {
    vi.mocked(deleteVariantOption).mockResolvedValue({ error: 'Nope' })
    const user = userEvent.setup()
    render(<VariantManager productId="p1" initialGroups={groups} images={[]} />)
    await openSizePicker(user)

    await user.click(screen.getByRole('checkbox', { name: 'M' }))

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Nope'))
    expect(await screen.findByRole('checkbox', { name: 'M', checked: true })).toBeInTheDocument()
  })

  it('adds a custom type and shows it', async () => {
    vi.mocked(addVariantGroup).mockResolvedValue({
      error: null,
      group: { id: 'g5', productId: 'p1', name: 'Style', position: 0, options: [] },
    })
    const user = userEvent.setup()
    render(<VariantManager productId="p1" initialGroups={[]} images={[]} />)

    await user.click(screen.getByRole('button', { name: /add options/i }))
    await user.click(screen.getByRole('button', { name: /create custom option/i }))
    await user.type(screen.getByRole('textbox', { name: /new option name/i }), 'Style')
    await user.click(screen.getByRole('button', { name: /add group/i }))

    expect(addVariantGroup).toHaveBeenCalledWith('p1', 'Style')
    expect(await screen.findByText('Style')).toBeInTheDocument()
  })
})
