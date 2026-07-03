'use client'

import { useCallback, useEffect, useState } from 'react'

import { createClient } from '@/lib/supabase/client'
import type { InquiryItem } from '@/shared/types'

export interface ChatMessage {
  id: string
  content: string
  fromAdmin: boolean
  createdAt: string | Date
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

// Owns the live conversation: seeds from the server-rendered messages, then
// subscribes to new chat_messages for this session (fetching the product cards a
// customer inquiry carries before the message renders). `addMessage` lets the
// component append its own optimistic admin reply.
export function useAdminChat(sessionId: string, initialMessages: ChatMessage[]) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages)

  const addMessage = useCallback((message: ChatMessage) => {
    setMessages((prev) => (prev.some((m) => m.id === message.id) ? prev : [...prev, message]))
  }, [])

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`chat:${sessionId}`)
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

          // A customer inquiry carries product cards in chat_message_items; fetch
          // them before rendering so the message lands complete.
          let items: InquiryItem[] = []
          if (!row.from_admin) {
            const { data } = await supabase
              .from('chat_message_items')
              .select(
                'id, product_id, name_snapshot, color_value, size_value, price_snapshot, image_url_snapshot, products(slug, visible)'
              )
              .eq('message_id', row.id)
              .order('position')
            items = ((data as RawItemRow[] | null) ?? []).map(mapItemRow)
          }

          addMessage({
            id: row.id,
            content: row.content,
            fromAdmin: row.from_admin,
            createdAt: row.created_at,
            items,
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [sessionId, addMessage])

  return { messages, addMessage }
}
