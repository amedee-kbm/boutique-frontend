'use client'

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

import { useHydrated } from '@/shared/hooks/useHydrated'

interface UnreadState {
  lastMessageAt: string | null
  lastSeenAt: string | null
  setLastMessageAt: (at: string) => void
  markSeen: () => void
}

const useUnreadStore = create<UnreadState>()(
  persist(
    (set) => ({
      lastMessageAt: null,
      lastSeenAt: null,
      setLastMessageAt: (at) => set({ lastMessageAt: at }),
      markSeen: () => set({ lastSeenAt: new Date().toISOString() }),
    }),
    {
      name: 'zita-chat-unread-v1',
      storage: createJSONStorage(() =>
        typeof window !== 'undefined' ? window.localStorage : (undefined as unknown as Storage)
      ),
    }
  )
)

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === 'zita-chat-unread-v1') void useUnreadStore.persist.rehydrate()
  })
}

// Called by the chat realtime subscription when an admin reply arrives.
export function markLastMessageAt(at: string) {
  useUnreadStore.getState().setLastMessageAt(at)
}

// Called when the customer views the chat thread.
export function markChatSeen() {
  useUnreadStore.getState().markSeen()
}

export function useUnread() {
  const lastMessageAt = useUnreadStore((s) => s.lastMessageAt)
  const lastSeenAt = useUnreadStore((s) => s.lastSeenAt)
  const hydrated = useHydrated()
  const hasUnread =
    hydrated && !!lastMessageAt && (!lastSeenAt || new Date(lastMessageAt) > new Date(lastSeenAt))
  return { hasUnread }
}
