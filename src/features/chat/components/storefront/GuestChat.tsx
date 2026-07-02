'use client'

import { useState, useTransition } from 'react'
import { format } from 'date-fns'
import { Send } from 'lucide-react'
import { toast } from 'sonner'

import { useGuestName, useGuestReady } from '../../hooks/guest'
import { startGuestChat } from '../../hooks/funnel'
import { useGuestChat } from '../../hooks/useGuestChat'
import { cn } from '@/shared/lib/utils'
import { Button, Input } from '@/shared/ui'
import { ProductInquiryCard } from './ProductInquiryCard'

function StartChat() {
  const persistedName = useGuestName()
  const [editedName, setEditedName] = useState<string | null>(null)
  const name = editedName ?? persistedName
  const [starting, startTransition] = useTransition()

  function handleStart() {
    const trimmed = name.trim()
    if (!trimmed) {
      toast.error('Add your name so the seller knows who they are chatting with')
      return
    }
    startTransition(async () => {
      const { error } = await startGuestChat({ name: trimmed })
      if (error) toast.error(error)
    })
  }

  return (
    <div className="px-4 py-16 text-center">
      <p className="text-sm font-medium">Chat with Zita</p>
      <p className="text-muted-foreground mx-auto mt-1 max-w-xs text-xs">
        Ask anything about sizing, colours, or delivery. Add your name to start.
      </p>
      <div className="mx-auto mt-4 flex max-w-xs flex-col gap-2">
        <Input
          value={name}
          onChange={(e) => setEditedName(e.target.value)}
          placeholder="Your name"
          aria-label="Your name"
          autoComplete="name"
          className="rounded-none"
          onKeyDown={(e) => e.key === 'Enter' && handleStart()}
        />
        <Button
          type="button"
          className="h-11 rounded-none"
          disabled={starting}
          onClick={handleStart}
        >
          {starting ? 'Starting…' : 'Start chatting'}
        </Button>
      </div>
    </div>
  )
}

export function GuestChat() {
  const ready = useGuestReady()
  const { messages, draft, setDraft, sending, handleSend, bottomRef, sessionId } = useGuestChat()

  if (!ready) return null

  if (!sessionId) return <StartChat />

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
