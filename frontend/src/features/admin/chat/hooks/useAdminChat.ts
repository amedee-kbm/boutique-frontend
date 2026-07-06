'use client'

import { useCallback, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'

import { createClient } from '@/lib/supabase/client'
import { usePostgresChanges } from '@/shared/hooks/usePostgresChanges'
import {
  CHAT_ITEM_SELECT,
  mapChatItemRow,
  mapChatRow,
  type RawChatItemRow,
} from '@/shared/lib/chat'
import type { ChatMessage } from '@/shared/types'

export type { ChatMessage }

// Owns the live conversation: seeds from the server-rendered messages into the
// query cache, then subscribes to new chat_messages for this session (fetching
// the product cards a customer inquiry carries before the message renders).
// `addMessage` lets the component append its own optimistic admin reply.
export function useAdminChat(sessionId: string, initialMessages: ChatMessage[]) {
  const queryClient = useQueryClient()
  const key = useMemo(() => ['chat', sessionId] as const, [sessionId])

  const { data: messages = initialMessages } = useQuery({
    queryKey: key,
    // No server fetch — the list is seeded once and grown by realtime + replies.
    queryFn: () => initialMessages,
    initialData: initialMessages,
    staleTime: Infinity,
  })

  const addMessage = useCallback(
    (message: ChatMessage) => {
      queryClient.setQueryData<ChatMessage[]>(key, (prev = []) =>
        prev.some((m) => m.id === message.id) ? prev : [...prev, message]
      )
    },
    [queryClient, key]
  )

  usePostgresChanges<{ id: string; content: string; from_admin: boolean; created_at: string }>(
    `chat:${sessionId}`,
    { table: 'chat_messages', filter: `session_id=eq.${sessionId}` },
    async (payload) => {
      const row = payload.new as {
        id: string
        content: string
        from_admin: boolean
        created_at: string
      }
      // A customer inquiry carries product cards in chat_message_items; fetch
      // them before rendering so the message lands complete.
      let items: ReturnType<typeof mapChatItemRow>[] = []
      if (!row.from_admin) {
        const { data } = await createClient()
          .from('chat_message_items')
          .select(CHAT_ITEM_SELECT)
          .eq('message_id', row.id)
          .order('position')
        items = ((data as RawChatItemRow[] | null) ?? []).map(mapChatItemRow)
      }
      addMessage(mapChatRow(row, items))
    }
  )

  return { messages, addMessage }
}
