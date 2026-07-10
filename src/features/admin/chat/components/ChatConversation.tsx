'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { format } from 'date-fns'
import { Send } from 'lucide-react'
import { toast } from 'sonner'

import { sendAdminMessage } from '@/features/admin/chat'
import { useAdminChat, type ChatMessage } from '../hooks/useAdminChat'
import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/ui'
import { Input } from '@/shared/ui'
import { ProductInquiryCard } from '@/shared/components/ProductInquiryCard'
import type { InquiryItem } from '@/shared/types'

export type { ChatMessage }

export function ChatConversation({
  sessionId,
  initialMessages,
}: {
  sessionId: string
  initialMessages: ChatMessage[]
}) {
  const { messages, addMessage } = useAdminChat(sessionId, initialMessages)
  const [draft, setDraft] = useState('')
  const [isPending, startTransition] = useTransition()
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function handleSend() {
    const content = draft.trim()
    if (!content) return
    setDraft('')

    startTransition(async () => {
      const result = await sendAdminMessage(sessionId, content)
      if (result.error || !result.message) {
        toast.error(result.error ?? 'Could not send message')
        setDraft(content)
        return
      }
      addMessage({ ...result.message, items: [] as InquiryItem[] })
    })
  }

  return (
    <div className="bg-background flex h-[calc(100svh-13rem)] flex-col rounded-lg border md:h-[calc(100svh-12rem)]">
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <p className="text-muted-foreground py-8 text-center text-sm">
            No messages yet. Say hello!
          </p>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={cn('flex', message.fromAdmin ? 'justify-end' : 'justify-start')}
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
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-foreground'
                  )}
                >
                  <p className="break-words whitespace-pre-wrap">{message.content}</p>
                  <p
                    className={cn(
                      'mt-1 text-[10px]',
                      message.fromAdmin ? 'text-primary-foreground/70' : 'text-muted-foreground'
                    )}
                  >
                    {format(new Date(message.createdAt), 'h:mm a')}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
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
          placeholder="Type a reply…"
          autoComplete="off"
        />
        <Button type="submit" size="icon" disabled={isPending || !draft.trim()} aria-label="Send">
          <Send className="size-4" />
        </Button>
      </form>
    </div>
  )
}
