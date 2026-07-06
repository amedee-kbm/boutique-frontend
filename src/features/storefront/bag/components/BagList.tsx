'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import Link from 'next/link'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { ChevronLeft, X } from 'lucide-react'
import { toast } from 'sonner'

import { formatPrice } from '@/shared/lib/format'
import { QuantityStepper } from '@/shared/components/QuantityStepper'
import { useBag } from '../hooks/useBag'
import { getAvailableProductIds } from '../services/bag.actions'
import { useGuestName } from '@/features/storefront/chat'
import { useCustomer } from '@/features/auth'
import { orderDetailsSchema } from '@/features/storefront/orders'
import { placeOrder, getMyLatestOrderDetails } from '@/features/storefront/orders'
import { Button, Input, Textarea } from '@/shared/ui'
import { ProductThumb } from '@/shared/components/ProductThumb'

type Stage = 'list' | 'details' | 'done'
type FieldErrors = Partial<Record<'name' | 'phone' | 'address', string>>

export function BagList() {
  const { items, remove, setQuantity, clear, hydrated } = useBag()
  const { customer } = useCustomer()
  const [stage, setStage] = useState<Stage>('list')
  const [placing, startPlacing] = useTransition()

  const persistedName = useGuestName()
  const [editedName, setEditedName] = useState<string | null>(null)
  const name = editedName ?? persistedName
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [note, setNote] = useState('')
  const [errors, setErrors] = useState<FieldErrors>({})
  const [confirmedPhone, setConfirmedPhone] = useState('')

  // Prefill the form for a signed-in customer from their most recent order, so a
  // returning buyer doesn't re-type their contact + delivery details.
  const prefilled = useRef(false)
  useEffect(() => {
    if (prefilled.current || !customer) return
    prefilled.current = true
    getMyLatestOrderDetails().then((last) => {
      if (!last) return
      setEditedName((prev) => prev ?? last.name)
      setPhone((prev) => prev || last.phone)
      setAddress((prev) => prev || last.address)
      setNote((prev) => prev || (last.note ?? ''))
    })
  }, [customer])

  // Which of the bagged products are still visible/available. Re-checked whenever
  // the set of product ids changes; the previous result is kept during a refetch
  // so lines don't flash "unavailable" mid-lookup.
  const productIds = items.map((i) => i.productId)
  const { data: available = null } = useQuery({
    queryKey: ['bag-availability', [...productIds].sort()],
    enabled: hydrated,
    placeholderData: keepPreviousData,
    queryFn: async () =>
      new Set(productIds.length === 0 ? [] : await getAvailableProductIds(productIds)),
  })

  const isStale = (productId: string) => available !== null && !available.has(productId)
  const liveItems = items.filter((i) => !isStale(i.productId))
  const total = liveItems.reduce((sum, i) => sum + Number(i.price) * i.quantity, 0)
  const totalPieces = liveItems.reduce((sum, i) => sum + i.quantity, 0)

  function handleConfirm() {
    const parsed = orderDetailsSchema.safeParse({ name, phone, address, note })
    if (!parsed.success) {
      const next: FieldErrors = {}
      for (const issue of parsed.error.issues) {
        const key = issue.path[0]
        if (key === 'name' || key === 'phone' || key === 'address') next[key] = issue.message
      }
      setErrors(next)
      return
    }
    setErrors({})
    if (liveItems.length === 0) {
      toast.error('Nothing available to order')
      return
    }
    startPlacing(async () => {
      const { orderId, error } = await placeOrder({ items: liveItems, details: parsed.data })
      if (error || !orderId) {
        toast.error(error ?? 'Could not place your order')
        return
      }
      setConfirmedPhone(parsed.data.phone)
      clear()
      setStage('done')
    })
  }

  if (!hydrated) return null

  if (stage === 'done') {
    return (
      <div className="px-4 py-16 text-center">
        <p className="text-base font-medium">Order placed.</p>
        <p className="text-muted-foreground mx-auto mt-2 max-w-xs text-sm">
          Zita will reach you on {confirmedPhone} to confirm the details and arrange delivery. No
          payment is taken here.
        </p>
        <Button variant="outline" className="mt-6 rounded-none" render={<Link href="/" />}>
          Keep browsing
        </Button>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="px-4 py-16 text-center">
        <p className="text-sm">Your bag is empty.</p>
        <p className="text-muted-foreground mt-1 text-xs">
          Browse pieces and add the ones you like.
        </p>
        <Button variant="outline" className="mt-4 rounded-none" render={<Link href="/" />}>
          Start browsing
        </Button>
      </div>
    )
  }

  if (stage === 'details') {
    return (
      <div className="flex flex-col pb-40">
        <button
          type="button"
          onClick={() => setStage('list')}
          className="text-muted-foreground hover:text-foreground flex items-center gap-1 px-4 py-3 text-xs"
        >
          <ChevronLeft className="size-4" /> Back to bag
        </button>

        <div className="space-y-4 px-4">
          <div>
            <Input
              value={name}
              onChange={(e) => setEditedName(e.target.value)}
              placeholder="Your name"
              aria-label="Your name"
              autoComplete="name"
              className="rounded-none"
            />
            {errors.name && <p className="text-destructive mt-1 text-xs">{errors.name}</p>}
          </div>
          <div>
            <Input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Phone number (07…)"
              aria-label="Phone number"
              autoComplete="tel"
              className="rounded-none"
            />
            {errors.phone && <p className="text-destructive mt-1 text-xs">{errors.phone}</p>}
          </div>
          <div>
            <Textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Delivery address"
              aria-label="Delivery address"
              rows={2}
              className="rounded-none"
            />
            {errors.address && <p className="text-destructive mt-1 text-xs">{errors.address}</p>}
          </div>
          <div>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Note for the seller (optional) — e.g. size, colour, landmark"
              aria-label="Note for the seller"
              rows={2}
              className="rounded-none"
            />
          </div>
        </div>

        <div className="bg-background/95 fixed bottom-14 left-1/2 z-30 w-full max-w-[480px] -translate-x-1/2 space-y-3 border-t p-4 backdrop-blur md:bottom-0 md:max-w-2xl">
          <p className="text-muted-foreground text-xs">
            {totalPieces} {totalPieces === 1 ? 'piece' : 'pieces'} · about {formatPrice(total)}. No
            payment now — the seller will contact you to confirm.
          </p>
          <Button
            type="button"
            className="h-12 w-full rounded-none"
            disabled={placing || liveItems.length === 0}
            onClick={handleConfirm}
          >
            {placing ? 'Placing…' : 'Confirm order'}
          </Button>
        </div>
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
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <p className="text-sm">{formatPrice(item.price)}</p>
                    <QuantityStepper
                      value={item.quantity}
                      onChange={(next) => setQuantity(item.key, next)}
                      size="sm"
                      name={item.name}
                    />
                  </div>
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
          About {formatPrice(total)}. No payment online — you order here and the seller arranges the
          rest.
        </p>
        <Button
          type="button"
          className="h-12 w-full rounded-none"
          disabled={liveItems.length === 0}
          onClick={() => setStage('details')}
        >
          Place order ({totalPieces})
        </Button>
      </div>
    </div>
  )
}
