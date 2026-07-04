'use client'

import { useState } from 'react'
import { Minus, Plus } from 'lucide-react'
import { toast } from 'sonner'

import { cn } from '@/shared/lib/utils'
import { formatPrice } from '@/shared/lib/format'
import { bagKey, useBag } from '@/features/storefront/bag'
import { Button, Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/shared/ui'
import { ProductThumb } from '@/shared/components/ProductThumb'
import type { DetailColour } from '../lib/product-detail'

// The pieces the sheet needs to build a bag line — a structural subset of
// ProductDetailData so the PDP can pass its data straight through.
export interface AddToBagProduct {
  id: string
  slug: string
  name: string
  price: string
  colours: DetailColour[]
  sizes: string[]
  fallbackImageUrl: string | null
}

// Kikuu-style purchase sheet: pick colour, size and quantity, then Confirm drops
// the line into the Bag. Colour + size default to the first option so a one-tap
// Confirm still works; the seller confirms every order by hand anyway.
export function AddToBagSheet({
  product,
  open,
  onOpenChange,
}: {
  product: AddToBagProduct
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { add } = useBag()
  const [colourId, setColourId] = useState<string | null>(product.colours[0]?.optionId ?? null)
  const [size, setSize] = useState<string | null>(product.sizes[0] ?? null)
  const [quantity, setQuantity] = useState(1)

  // If the sheet is reused for a different product, reset the draft to that
  // product's defaults during render — React's alternative to setState-in-effect.
  const [seenProductId, setSeenProductId] = useState(product.id)
  if (product.id !== seenProductId) {
    setSeenProductId(product.id)
    setColourId(product.colours[0]?.optionId ?? null)
    setSize(product.sizes[0] ?? null)
    setQuantity(1)
  }

  const colour = product.colours.find((c) => c.optionId === colourId) ?? null
  const needsColour = product.colours.length > 0 && !colour
  const needsSize = product.sizes.length > 0 && !size

  const selectedSummary = [colour?.value, size].filter(Boolean).join(' · ')

  function handleConfirm() {
    add({
      key: bagKey(product.id, colour?.value ?? null, size),
      productId: product.id,
      slug: product.slug,
      name: product.name,
      price: product.price,
      colorValue: colour?.value ?? null,
      colorHex: colour?.hex ?? null,
      size,
      quantity,
      imageUrl: colour?.repImageUrl ?? product.fallbackImageUrl,
    })
    toast.success('Added to your bag')
    onOpenChange(false)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="gap-0 pb-[env(safe-area-inset-bottom)]">
        <SheetHeader className="flex-row items-center gap-3 text-left">
          <ProductThumb
            src={colour?.repImageUrl ?? product.fallbackImageUrl}
            alt={product.name}
            className="bg-muted size-16 shrink-0 rounded-md border object-cover"
          />
          <div className="min-w-0">
            <SheetTitle className="text-lg">{formatPrice(product.price)}</SheetTitle>
            <SheetDescription className="truncate">
              {selectedSummary ? `Selected: ${selectedSummary}` : product.name}
            </SheetDescription>
          </div>
        </SheetHeader>

        <div className="max-h-[55svh] space-y-6 overflow-y-auto px-4 py-4">
          {product.colours.length > 0 && (
            <PillGroup label="Select colour">
              {product.colours.map((c) => (
                <Pill
                  key={c.optionId}
                  selected={c.optionId === colourId}
                  onClick={() => setColourId(c.optionId)}
                >
                  {c.hex && (
                    <span
                      className="size-3.5 shrink-0 rounded-full border"
                      style={{ backgroundColor: c.hex }}
                    />
                  )}
                  {c.value}
                </Pill>
              ))}
            </PillGroup>
          )}

          {product.sizes.length > 0 && (
            <PillGroup label="Select size">
              {product.sizes.map((s) => (
                <Pill key={s} selected={s === size} onClick={() => setSize(s)}>
                  {s}
                </Pill>
              ))}
            </PillGroup>
          )}

          <div>
            <p className="mb-2 text-sm font-medium">Quantity</p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                disabled={quantity <= 1}
                aria-label="Decrease quantity"
                className="hover:bg-muted grid size-11 place-items-center rounded-full border disabled:opacity-40"
              >
                <Minus className="size-4" />
              </button>
              <span className="w-8 text-center text-base tabular-nums">{quantity}</span>
              <button
                type="button"
                onClick={() => setQuantity((q) => q + 1)}
                aria-label="Increase quantity"
                className="hover:bg-muted grid size-11 place-items-center rounded-full border"
              >
                <Plus className="size-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="border-t p-4">
          <Button
            type="button"
            className="h-12 w-full rounded-none"
            disabled={needsColour || needsSize}
            onClick={handleConfirm}
          >
            {needsSize ? 'Select a size' : needsColour ? 'Select a colour' : 'Confirm'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

function PillGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-sm font-medium">{label}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  )
}

function Pill({
  selected,
  onClick,
  children,
}: {
  selected: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        'flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm transition-colors',
        selected ? 'border-foreground bg-foreground text-background' : 'border-input hover:bg-muted'
      )}
    >
      {children}
    </button>
  )
}
