'use client'

import { useEffect, useState } from 'react'

import { GridCard, type StoreCard } from '@/features/storefront/products'
import { useBag } from '../hooks/useBag'
import { getCartSuggestions } from '../services/bag.actions'

// Same-category suggestions for the cart area, keyed off whatever is in the bag
// (empty bag → featured-then-newest). Reuses the feed's GridCard so favoriting
// and pricing stay consistent with the rest of the storefront.
export function YouMayAlsoLike() {
  const { items, hydrated } = useBag()
  const [suggestions, setSuggestions] = useState<StoreCard[]>([])

  useEffect(() => {
    if (!hydrated) return
    let cancelled = false
    getCartSuggestions(items.map((i) => i.productId)).then((rows) => {
      if (!cancelled) setSuggestions(rows)
    })
    return () => {
      cancelled = true
    }
  }, [hydrated, items])

  if (suggestions.length === 0) return null

  return (
    <section className="px-4 pt-8 pb-24">
      <h2 className="font-heading text-xs tracking-[0.15em] uppercase">You may also like</h2>
      <div className="-mx-1 mt-3 flex gap-1 overflow-x-auto px-1 pb-2">
        {suggestions.map((product) => (
          <div key={product.id} className="w-36 shrink-0 sm:w-40">
            <GridCard product={product} />
          </div>
        ))}
      </div>
    </section>
  )
}
