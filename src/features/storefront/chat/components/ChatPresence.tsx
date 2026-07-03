'use client'

import { useEffect } from 'react'

import { createClient } from '@/lib/supabase/client'
import { useGuestSession } from '../hooks/guest'
import { markLastMessageAt } from '../hooks/useUnread'

// Mounted once in the storefront shell so an admin reply lights the Chat tab's
// unread dot even when the customer is browsing other pages.
export function ChatPresence() {
  const sessionId = useGuestSession()?.sessionId ?? null

  useEffect(() => {
    if (!sessionId) return
    const supabase = createClient()
    const channel = supabase
      .channel(`presence-chat:${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          const row = payload.new as { from_admin: boolean; created_at: string }
          if (row.from_admin) markLastMessageAt(row.created_at)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [sessionId])

  return null
}
