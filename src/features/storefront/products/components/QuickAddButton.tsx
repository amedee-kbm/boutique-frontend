'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'

import { addToBag, bagKey } from '@/features/storefront/bag'
import type { HomeCard } from '@/features/storefront/products'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/shared/ui'

// Bottom-right "+" on a home card. With no sizes it drops straight into the Bag;
// otherwise it opens a bottom size-picker sheet over the feed. Quick-add never
// commits to a colour — that choice lives on the product page.
export function QuickAddButton({ product }: { product: HomeCard }) {
  const [open, setOpen] = useState(false)

  function add(size: string | null) {
    addToBag({
      key: bagKey(product.id, null, size),
      productId: product.id,
      slug: product.slug,
      name: product.name,
      price: product.price,
      colorValue: null,
      colorHex: null,
      size,
      imageUrl: product.thumbnail,
    })
    toast.success('Added to your bag')
  }

  function handleClick() {
    if (product.sizes.length === 0) {
      add(null)
      return
    }
    setOpen(true)
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        aria-label={`Add ${product.name} to bag`}
        className="absolute right-1 bottom-1 z-10 grid size-11 place-items-center"
      >
        <span className="bg-background/80 grid size-8 place-items-center rounded-full backdrop-blur">
          <Plus className="size-4" strokeWidth={1.8} />
        </span>
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="gap-0 pb-[env(safe-area-inset-bottom)]">
          <SheetHeader className="items-center text-center">
            <SheetTitle>Select a size</SheetTitle>
            <SheetDescription className="truncate uppercase">{product.name}</SheetDescription>
          </SheetHeader>
          <div className="flex flex-col">
            {product.sizes.map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => {
                  add(size)
                  setOpen(false)
                }}
                className="hover:bg-muted flex min-h-14 items-center justify-center text-sm tracking-wide"
              >
                {size}
              </button>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
