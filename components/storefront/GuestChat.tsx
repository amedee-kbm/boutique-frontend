'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { Send } from 'lucide-react'
import { toast } from 'sonner'

import { createClient } from '@/lib/supabase/client'
import { useGuestReady, useGuestSession } from '@/lib/chat/guest'
import { markChatSeen, markLastMessageAt } from '@/lib/chat/useUnread'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ProductInquiryCard, type InquiryItem } from '@/components/ProductInquiryCard'

interface Message {
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

export function GuestChat() {
  const sessionId = useGuestSession()?.sessionId ?? null
  const ready = useGuestReady()
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

  if (!ready) return null

  if (!sessionId) {
    return (
      <div className="px-4 py-16 text-center">
        <p className="text-sm">No messages yet.</p>
        <p className="text-muted-foreground mt-1 text-xs">
          Add pieces to your selection and tap “Ask about these” to start chatting with the seller.
        </p>
        <Button variant="outline" className="mt-4 rounded-none" render={<Link href="/" />}>
          Browse pieces
        </Button>
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100svh-3.5rem-3.5rem)] flex-col md:h-[calc(100svh-3.5rem)]">
      <div className="text-muted-foreground border-b px-4 py-2 text-center text-xs">
        Usually replies within an hour
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn('flex', message.fromAdmin ? 'justify-start' : 'justify-end')}
          >
            <div className="max-w-[85%] space-y-2">
              {message.items.length > 0 && (
                <div className="space-y-2">
                  {message.items.map((item) => (
                    <ProductInquiryCard key={item.id} item={item} />
                  ))}
                </div>
              )}
              <div
                className={cn(
                  'rounded-2xl px-3 py-2 text-sm',
                  message.fromAdmin
                    ? 'bg-muted text-foreground'
                    : 'bg-primary text-primary-foreground'
                )}
              >
                <p className="break-words whitespace-pre-wrap">{message.content}</p>
                <p
                  className={cn(
                    'mt-1 text-[10px]',
                    message.fromAdmin ? 'text-muted-foreground' : 'text-primary-foreground/70'
                  )}
                >
                  {format(new Date(message.createdAt), 'h:mm a')}
                </p>
              </div>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          handleSend()
        }}
        className="flex items-center gap-2 border-t p-3"
      >
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Type a message…"
          autoComplete="off"
          className="rounded-none"
        />
        <Button type="submit" size="icon" disabled={sending || !draft.trim()} aria-label="Send">
          <Send className="size-4" />
        </Button>
      </form>
    </div>
  )
}
