'use client'

import { useEffect, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { createClient } from '@/lib/supabase/client'
import { usePostgresChanges } from '@/shared/hooks/usePostgresChanges'
import {
  CHAT_ITEM_SELECT,
  mapChatItemRow,
  mapChatRow,
  type RawChatItemRow,
} from '@/shared/lib/chat'
import type { ChatMessage, InquiryItem } from '@/shared/types'
import { useGuestSession } from './guest'
import { markChatSeen, markLastMessageAt } from './useUnread'

// A Bag or Favorites piece the guest keeps attached to their opening question.
// Mirrors the snapshot columns on chat_message_items so a card still renders
// after the product changes or hides.
export interface ContextItem {
  productId: string
  name: string
  colorValue: string | null
  size: string | null
  price: string
  imageUrl: string | null
}

// Loads a session's messages and the product cards attached to them (batched in
// one items query), newest last.
async function loadGuestMessages(sessionId: string): Promise<ChatMessage[]> {
  const supabase = createClient()
  const { data: rows } = await supabase
    .from('chat_messages')
    .select('id, content, from_admin, created_at')
    .eq('session_id', sessionId)
    .order('created_at')
  if (!rows) return []

  const { data: itemRows } = await supabase
    .from('chat_message_items')
    .select(`message_id, ${CHAT_ITEM_SELECT}`)
    .in(
      'message_id',
      rows.map((r) => r.id)
    )

  const byMessage = new Map<string, InquiryItem[]>()
  for (const raw of (itemRows as (RawChatItemRow & { message_id: string })[] | null) ?? []) {
    const list = byMessage.get(raw.message_id) ?? []
    list.push(mapChatItemRow(raw))
    byMessage.set(raw.message_id, list)
  }

  return rows.map((r) => mapChatRow(r, byMessage.get(r.id) ?? []))
}

export function useGuestChat() {
  const sessionId = useGuestSession()?.sessionId ?? null
  const queryClient = useQueryClient()
  const key = ['guest-chat', sessionId] as const
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const { data: messages = [] } = useQuery({
    queryKey: key,
    enabled: !!sessionId,
    queryFn: () => loadGuestMessages(sessionId!),
  })

  function appendMessage(message: ChatMessage) {
    queryClient.setQueryData<ChatMessage[]>(key, (prev = []) =>
      prev.some((m) => m.id === message.id) ? prev : [...prev, message]
    )
  }

  useEffect(() => {
    if (messages.length) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
      markChatSeen()
    }
  }, [messages])

  usePostgresChanges<{ id: string; content: string; from_admin: boolean; created_at: string }>(
    sessionId ? `guest-chat:${sessionId}` : null,
    { table: 'chat_messages', filter: sessionId ? `session_id=eq.${sessionId}` : undefined },
    async (payload) => {
      const row = payload.new as {
        id: string
        content: string
        from_admin: boolean
        created_at: string
      }
      if (row.from_admin) markLastMessageAt(row.created_at)

      const { data } = await createClient()
        .from('chat_message_items')
        .select(CHAT_ITEM_SELECT)
        .eq('message_id', row.id)
        .order('position')
      const items = ((data as RawChatItemRow[] | null) ?? []).map(mapChatItemRow)
      appendMessage(mapChatRow(row, items))
    }
  )

  // `context` is attached only to the guest's FIRST message — their opening
  // question about the pieces they've selected. Later messages carry no items.
  async function handleSend(context: ContextItem[] = []) {
    const content = draft.trim()
    if (!content || !sessionId) return
    const isFirst = messages.length === 0
    setDraft('')
    setSending(true)
    const supabase = createClient()
    const { data, error } = await supabase
      .from('chat_messages')
      .insert({ session_id: sessionId, content, from_admin: false })
      .select('id, content, from_admin, created_at')
      .single()
    if (error || !data) {
      setSending(false)
      toast.error('Could not send. Please try again.')
      setDraft(content)
      return
    }

    let items: InquiryItem[] = []
    if (isFirst && context.length > 0) {
      await supabase.from('chat_message_items').insert(
        context.map((item, position) => ({
          message_id: data.id,
          product_id: item.productId,
          position,
          name_snapshot: item.name,
          color_value: item.colorValue,
          size_value: item.size,
          price_snapshot: item.price,
          image_url_snapshot: item.imageUrl,
        }))
      )
      const { data: itemRows } = await supabase
        .from('chat_message_items')
        .select(CHAT_ITEM_SELECT)
        .eq('message_id', data.id)
        .order('position')
      items = ((itemRows as RawChatItemRow[] | null) ?? []).map(mapChatItemRow)
    }

    setSending(false)
    await supabase
      .from('chat_sessions')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', sessionId)
    appendMessage(mapChatRow(data, items))
  }

  return {
    messages,
    draft,
    setDraft,
    sending,
    handleSend,
    bottomRef,
    sessionId,
  }
}
