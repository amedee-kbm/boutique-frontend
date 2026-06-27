'use client'

import { useEffect, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'
import { toast } from 'sonner'

import { formatPrice } from '@/lib/format'
import { useSelection } from '@/lib/selection/useSelection'
import { getAvailableProductIds } from '@/lib/actions/selection'
import { sendSelectionInquiry } from '@/lib/chat/funnel'
import { useGuestName } from '@/lib/chat/guest'
import { markChatSeen } from '@/lib/chat/useUnread'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ProductThumb } from '@/components/admin/ProductThumb'

export function SelectionList() {
  const { items, remove, clear, hydrated } = useSelection()
  const router = useRouter()
  const persistedName = useGuestName()
  const [editedName, setEditedName] = useState<string | null>(null)
  const name = editedName ?? persistedName
  const [available, setAvailable] = useState<Set<string> | null>(null)
  const [sending, startSending] = useTransition()

  useEffect(() => {
    if (!hydrated) return
    const ids = items.map((i) => i.productId)
    let cancelled = false
    const lookup = ids.length === 0 ? Promise.resolve<string[]>([]) : getAvailableProductIds(ids)
    lookup.then((ok) => {
      if (!cancelled) setAvailable(new Set(ok))
    })
    return () => {
      cancelled = true
    }
  }, [hydrated, items])

  const isStale = (productId: string) => available !== null && !available.has(productId)
  const liveItems = items.filter((i) => !isStale(i.productId))
  const total = liveItems.reduce((sum, i) => sum + Number(i.price), 0)

  function handleAsk() {
    const trimmed = name.trim()
    if (!trimmed) {
      toast.error('Add your name so the seller knows who they are chatting with')
      return
    }
    if (liveItems.length === 0) {
      toast.error('Nothing available to ask about')
      return
    }
    startSending(async () => {
      const { sessionId, error } = await sendSelectionInquiry({ items: liveItems, name: trimmed })
      if (error || !sessionId) {
        toast.error(error ?? 'Could not send your inquiry')
        return
      }
      clear()
      markChatSeen()
      router.push('/chat')
    })
  }

  if (!hydrated) return null

  if (items.length === 0) {
    return (
      <div className="px-4 py-16 text-center">
        <p className="text-sm">Your selection is empty.</p>
        <p className="text-muted-foreground mt-1 text-xs">
          Browse pieces and add the ones you like.
        </p>
        <Button variant="outline" className="mt-4 rounded-none" render={<Link href="/" />}>
          Start browsing
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col pb-40">
      <ul className="divide-y">
        {items.map((item) => {
          const stale = isStale(item.productId)
          return (
            <li key={item.key} className="flex items-center gap-3 px-4 py-3">
              <ProductThumb
                src={item.imageUrl}
                alt={item.name}
                className="size-16 shrink-0 object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{item.name}</p>
                {(item.colorValue || item.size) && (
                  <p className="text-muted-foreground truncate text-xs">
                    {[item.colorValue, item.size].filter(Boolean).join(' · ')}
                  </p>
                )}
                {stale ? (
                  <p className="text-destructive text-xs">No longer available — remove</p>
                ) : (
                  <p className="text-sm">{formatPrice(item.price)}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => remove(item.key)}
                aria-label={`Remove ${item.name}`}
                className="text-muted-foreground hover:text-foreground p-2"
              >
                <X className="size-4" />
              </button>
            </li>
          )
        })}
      </ul>

      <div className="bg-background/95 fixed bottom-14 left-1/2 z-30 w-full max-w-[480px] -translate-x-1/2 space-y-3 border-t p-4 backdrop-blur md:bottom-0 md:max-w-2xl">
        <p className="text-muted-foreground text-xs">
          About {formatPrice(total)} — before you chat. Final price is agreed with the seller.
        </p>
        <Input
          value={name}
          onChange={(e) => setEditedName(e.target.value)}
          placeholder="Your name"
          aria-label="Your name"
          className="rounded-none"
        />
        <Button
          type="button"
          className="h-12 w-full rounded-none"
          disabled={sending || liveItems.length === 0}
          onClick={handleAsk}
        >
          {sending ? 'Sending…' : `Ask about these (${liveItems.length})`}
        </Button>
      </div>
    </div>
  )
}
