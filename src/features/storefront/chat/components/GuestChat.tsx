'use client'

import { useMemo, useState, useTransition } from 'react'
import { format } from 'date-fns'
import { Send, X } from 'lucide-react'
import { toast } from 'sonner'

import { useGuestName, useGuestReady } from '../hooks/guest'
import { startGuestChat } from '../hooks/funnel'
import { useGuestChat, type ContextItem } from '../hooks/useGuestChat'
import type { StoreCard } from '@/features/storefront/products'
import { useBag } from '@/features/storefront/bag'
import { useFavorites } from '@/features/storefront/favorites'
import { cn } from '@/shared/lib/utils'
import { formatPrice } from '@/shared/lib/format'
import { Button, Input } from '@/shared/ui'
import { ProductThumb } from '@/shared/components/ProductThumb'
import { ProductInquiryCard } from '@/shared/components/ProductInquiryCard'

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

interface ContextChip extends ContextItem {
  // Stable key so a dismiss is local to this row, never a Bag/Favorites write.
  chipKey: string
}

// The Bag + Favorites strip above the composer. ✕ is CHAT-LOCAL ONLY: it drops
// the piece from the context THIS question is about — it does NOT remove it from
// the Bag or Favorites. The remaining chips are attached to the first message.
function ContextStrip({
  chips,
  onDismiss,
}: {
  chips: ContextChip[]
  onDismiss: (chipKey: string) => void
}) {
  if (chips.length === 0) return null
  return (
    <div className="flex gap-2 overflow-x-auto border-t px-3 py-2">
      {chips.map((chip) => (
        <div
          key={chip.chipKey}
          className="bg-muted/40 flex shrink-0 items-center gap-2 border px-2 py-1"
        >
          <ProductThumb src={chip.imageUrl} alt={chip.name} className="size-8 object-cover" />
          <div className="max-w-32 min-w-0">
            <p className="truncate text-xs font-medium">{chip.name}</p>
            <p className="text-muted-foreground text-[10px]">{formatPrice(chip.price)}</p>
          </div>
          <button
            type="button"
            onClick={() => onDismiss(chip.chipKey)}
            aria-label={`Remove ${chip.name} from this question`}
            className="text-muted-foreground hover:text-foreground p-0.5"
          >
            <X className="size-3.5" />
          </button>
        </div>
      ))}
    </div>
  )
}

export function GuestChat({ favoriteProducts = [] }: { favoriteProducts?: StoreCard[] }) {
  const ready = useGuestReady()
  const { messages, draft, setDraft, sending, handleSend, bottomRef, sessionId } = useGuestChat()
  const { items: bagItems } = useBag()
  const { isFavorite } = useFavorites()
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())

  // Context only rides the opening question, so once anything has been said the
  // strip disappears.
  const showContext = messages.length === 0

  const chips = useMemo<ContextChip[]>(() => {
    const fromBag = bagItems.map((item) => ({
      chipKey: `bag:${item.key}`,
      productId: item.productId,
      name: item.name,
      colorValue: item.colorValue,
      size: item.size,
      price: item.price,
      imageUrl: item.imageUrl,
    }))
    const fromFavorites = favoriteProducts
      .filter((product) => isFavorite(product.id))
      .map((product) => ({
        chipKey: `fav:${product.id}`,
        productId: product.id,
        name: product.name,
        colorValue: null,
        size: null,
        price: product.price,
        imageUrl: product.thumbnail,
      }))
    return [...fromBag, ...fromFavorites].filter((chip) => !dismissed.has(chip.chipKey))
  }, [bagItems, favoriteProducts, isFavorite, dismissed])

  function dismissChip(chipKey: string) {
    setDismissed((prev) => new Set(prev).add(chipKey))
  }

  function submit() {
    const context: ContextItem[] = showContext
      ? chips.map((chip) => ({
          productId: chip.productId,
          name: chip.name,
          colorValue: chip.colorValue,
          size: chip.size,
          price: chip.price,
          imageUrl: chip.imageUrl,
        }))
      : []
    handleSend(context)
  }

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

      {showContext && <ContextStrip chips={chips} onDismiss={dismissChip} />}

      <form
        onSubmit={(e) => {
          e.preventDefault()
          submit()
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
