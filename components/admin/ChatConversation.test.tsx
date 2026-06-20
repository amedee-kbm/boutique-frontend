import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/actions/products', () => ({ sendAdminMessage: vi.fn() }))
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

let changeHandler: ((payload: { new: Record<string, unknown> }) => void) | undefined
const subscribe = vi.fn()
const removeChannel = vi.fn()
const channel = {
  on: vi.fn((_event: string, _filter: unknown, cb: typeof changeHandler) => {
    changeHandler = cb
    return channel
  }),
  subscribe: vi.fn(() => {
    subscribe()
    return channel
  }),
}
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({ channel: () => channel, removeChannel }),
}))

import { sendAdminMessage } from '@/lib/actions/products'
import { toast } from 'sonner'
import { ChatConversation, type ChatMessage } from '@/components/admin/ChatConversation'

const messages: ChatMessage[] = [
  { id: 'm1', content: 'Hi there', fromAdmin: false, createdAt: '2026-06-18T10:00:00Z' },
  { id: 'm2', content: 'How can I help?', fromAdmin: true, createdAt: '2026-06-18T10:01:00Z' },
]

beforeEach(() => {
  vi.clearAllMocks()
  changeHandler = undefined
  Element.prototype.scrollIntoView = vi.fn()
})

describe('ChatConversation', () => {
  it('shows the empty state when there are no messages', () => {
    render(<ChatConversation sessionId="s1" initialMessages={[]} />)
    expect(screen.getByText(/no messages yet/i)).toBeInTheDocument()
  })

  it('renders the initial messages', () => {
    render(<ChatConversation sessionId="s1" initialMessages={messages} />)
    expect(screen.getByText('Hi there')).toBeInTheDocument()
    expect(screen.getByText('How can I help?')).toBeInTheDocument()
  })

  it('disables the send button until there is a draft', async () => {
    const user = userEvent.setup()
    render(<ChatConversation sessionId="s1" initialMessages={[]} />)

    expect(screen.getByRole('button', { name: /send/i })).toBeDisabled()
    await user.type(screen.getByPlaceholderText(/type a reply/i), 'Hello')
    expect(screen.getByRole('button', { name: /send/i })).toBeEnabled()
  })

  it('sends a reply and appends the returned message', async () => {
    vi.mocked(sendAdminMessage).mockResolvedValue({
      error: null,
      message: {
        id: 'm3',
        content: 'On its way',
        fromAdmin: true,
        createdAt: '2026-06-18T10:02:00Z',
      },
    })
    const user = userEvent.setup()
    render(<ChatConversation sessionId="s1" initialMessages={[]} />)

    await user.type(screen.getByPlaceholderText(/type a reply/i), 'On its way')
    await user.click(screen.getByRole('button', { name: /send/i }))

    expect(sendAdminMessage).toHaveBeenCalledWith('s1', 'On its way')
    expect(await screen.findByText('On its way')).toBeInTheDocument()
  })

  it('restores the draft and toasts when sending fails', async () => {
    vi.mocked(sendAdminMessage).mockResolvedValue({ error: 'Network down', message: null })
    const user = userEvent.setup()
    render(<ChatConversation sessionId="s1" initialMessages={[]} />)

    const input = screen.getByPlaceholderText(/type a reply/i)
    await user.type(input, 'Retry me')
    await user.click(screen.getByRole('button', { name: /send/i }))

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Network down'))
    expect(input).toHaveValue('Retry me')
  })

  it('subscribes to realtime inserts and appends incoming messages', async () => {
    render(<ChatConversation sessionId="s1" initialMessages={[]} />)

    await waitFor(() => expect(subscribe).toHaveBeenCalled())
    expect(changeHandler).toBeDefined()

    changeHandler!({
      new: {
        id: 'rt1',
        content: 'Realtime hello',
        from_admin: false,
        created_at: '2026-06-18T10:05:00Z',
      },
    })

    expect(await screen.findByText('Realtime hello')).toBeInTheDocument()
  })

  it('ignores a realtime message whose id is already present', async () => {
    render(<ChatConversation sessionId="s1" initialMessages={messages} />)
    await waitFor(() => expect(changeHandler).toBeDefined())

    changeHandler!({
      new: { id: 'm1', content: 'Hi there', from_admin: false, created_at: '2026-06-18T10:00:00Z' },
    })

    expect(screen.getAllByText('Hi there')).toHaveLength(1)
  })

  it('removes the realtime channel on unmount', () => {
    const { unmount } = render(<ChatConversation sessionId="s1" initialMessages={[]} />)
    unmount()
    expect(removeChannel).toHaveBeenCalled()
  })
})
