'use client'

import { usePostgresChanges } from '@/shared/hooks/usePostgresChanges'
import { markLastMessageAt } from './useUnread'

// Subscribes to a guest session's messages so an admin reply lights the Chat
// tab's unread dot even when the customer is browsing other pages.
export function usePresence(sessionId: string | null) {
  usePostgresChanges<{ from_admin: boolean; created_at: string }>(
    sessionId ? `presence-chat:${sessionId}` : '',
    { table: 'chat_messages', filter: sessionId ? `session_id=eq.${sessionId}` : undefined },
    (payload) => {
      const row = payload.new
      if ('from_admin' in row && row.from_admin) markLastMessageAt(row.created_at)
    }
  )
}
