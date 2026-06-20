import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/admin/ConfirmDialog'

function setup(onConfirm: () => Promise<{ error: string | null } | void>, props = {}) {
  return render(
    <ConfirmDialog
      title="Delete product?"
      description="This cannot be undone."
      onConfirm={onConfirm}
      trigger={<Button>Delete</Button>}
      {...props}
    />
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('ConfirmDialog', () => {
  it('opens to reveal the title and description', async () => {
    const user = userEvent.setup()
    setup(vi.fn().mockResolvedValue(undefined))

    await user.click(screen.getByRole('button', { name: 'Delete' }))

    expect(await screen.findByRole('heading', { name: /delete product\?/i })).toBeInTheDocument()
    expect(screen.getByText(/this cannot be undone/i)).toBeInTheDocument()
  })

  it('runs onConfirm, toasts success, and closes', async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined)
    const user = userEvent.setup()
    setup(onConfirm, { successMessage: 'Product deleted' })

    await user.click(screen.getByRole('button', { name: 'Delete' }))
    await user.click(await screen.findByRole('button', { name: 'Delete' }))

    await waitFor(() => expect(onConfirm).toHaveBeenCalledTimes(1))
    expect(toast.success).toHaveBeenCalledWith('Product deleted')
    await waitFor(() =>
      expect(screen.queryByRole('heading', { name: /delete product\?/i })).not.toBeInTheDocument()
    )
  })

  it('keeps the dialog open and toasts the error when onConfirm fails', async () => {
    const onConfirm = vi.fn().mockResolvedValue({ error: 'Has products' })
    const user = userEvent.setup()
    setup(onConfirm)

    await user.click(screen.getByRole('button', { name: 'Delete' }))
    await user.click(await screen.findByRole('button', { name: 'Delete' }))

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Has products'))
    expect(screen.getByRole('heading', { name: /delete product\?/i })).toBeInTheDocument()
  })

  it('closes without calling onConfirm when cancelled', async () => {
    const onConfirm = vi.fn()
    const user = userEvent.setup()
    setup(onConfirm)

    await user.click(screen.getByRole('button', { name: 'Delete' }))
    await user.click(await screen.findByRole('button', { name: /cancel/i }))

    await waitFor(() =>
      expect(screen.queryByRole('heading', { name: /delete product\?/i })).not.toBeInTheDocument()
    )
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('uses a custom confirm label when provided', async () => {
    const user = userEvent.setup()
    setup(vi.fn().mockResolvedValue(undefined), { confirmLabel: 'Remove' })

    await user.click(screen.getByRole('button', { name: 'Delete' }))

    expect(await screen.findByRole('button', { name: 'Remove' })).toBeInTheDocument()
  })
})
