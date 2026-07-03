'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useGuestSession } from './guest'
import { markChatSeen, markLastMessageAt } from './useUnread'
import { toast } from 'sonner'
import type { InquiryItem } from '@/shared/types'

export interface Message {
  id: string
  content: string
  fromAdmin: boolean
  createdAt: string
  items: InquiryItem[]
}

interface RawItemRow {
  id: string
  product_id: string | null
  name_snapshot: string
  color_value: string | null
  size_value: string | null
  price_snapshot: string
  image_url_snapshot: string | null
  products: { slug: string; visible: boolean } | null
}

function mapItemRow(row: RawItemRow): InquiryItem {
  return {
    id: row.id,
    productId: row.product_id,
    slug: row.product_id && row.products?.visible ? row.products.slug : null,
    name: row.name_snapshot,
    colorValue: row.color_value,
    sizeValue: row.size_value,
    price: row.price_snapshot,
    imageUrl: row.image_url_snapshot,
  }
}

const ITEM_SELECT =
  'id, product_id, name_snapshot, color_value, size_value, price_snapshot, image_url_snapshot, products(slug, visible)'

export function useGuestChat() {
  const sessionId = useGuestSession()?.sessionId ?? null
  const [messages, setMessages] = useState<Message[]>([])
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (messages.length) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
      markChatSeen()
    }
  }, [messages])

  useEffect(() => {
    if (!sessionId) return
    const supabase = createClient()
    let cancelled = false

    async function load() {
      const { data: rows } = await supabase
        .from('chat_messages')
        .select('id, content, from_admin, created_at')
        .eq('session_id', sessionId)
        .order('created_at')
      if (!rows) return

      const { data: itemRows } = await supabase
        .from('chat_message_items')
        .select(`message_id, ${ITEM_SELECT}`)
        .in(
          'message_id',
          rows.map((r) => r.id)
        )

      const byMessage = new Map<string, InquiryItem[]>()
      for (const raw of (itemRows as (RawItemRow & { message_id: string })[] | null) ?? []) {
        const list = byMessage.get(raw.message_id) ?? []
        list.push(mapItemRow(raw))
        byMessage.set(raw.message_id, list)
      }

      if (cancelled) return
      setMessages(
        rows.map((r) => ({
          id: r.id as string,
          content: r.content as string,
          fromAdmin: r.from_admin as boolean,
          createdAt: r.created_at as string,
          items: byMessage.get(r.id as string) ?? [],
        }))
      )
    }

    load()

    const channel = supabase
      .channel(`guest-chat:${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `session_id=eq.${sessionId}`,
        },
        async (payload) => {
          const row = payload.new as {
            id: string
            content: string
            from_admin: boolean
            created_at: string
          }
          if (row.from_admin) markLastMessageAt(row.created_at)

          const { data } = await supabase
            .from('chat_message_items')
            .select(ITEM_SELECT)
            .eq('message_id', row.id)
            .order('position')
          const items = ((data as RawItemRow[] | null) ?? []).map(mapItemRow)

          setMessages((prev) =>
            prev.some((m) => m.id === row.id)
              ? prev
              : [
                  ...prev,
                  {
                    id: row.id,
                    content: row.content,
                    fromAdmin: row.from_admin,
                    createdAt: row.created_at,
                    items,
                  },
                ]
          )
        }
      )
      .subscribe()

    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
  }, [sessionId])

  async function handleSend() {
    const content = draft.trim()
    if (!content || !sessionId) return
    setDraft('')
    setSending(true)
    const supabase = createClient()
    const { data, error } = await supabase
      .from('chat_messages')
      .insert({ session_id: sessionId, content, from_admin: false })
      .select('id, content, from_admin, created_at')
      .single()
    setSending(false)
    if (error || !data) {
      toast.error('Could not send. Please try again.')
      setDraft(content)
      return
    }
    await supabase
      .from('chat_sessions')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', sessionId)
    setMessages((prev) =>
      prev.some((m) => m.id === data.id)
        ? prev
        : [
            ...prev,
            {
              id: data.id as string,
              content: data.content as string,
              fromAdmin: data.from_admin as boolean,
              createdAt: data.created_at as string,
              items: [],
            },
          ]
    )
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
