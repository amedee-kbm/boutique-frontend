'use client'

import { useQuery } from '@tanstack/react-query'

import { GridCard } from '@/features/storefront/products'
import { Eyebrow } from '@/shared/components/Eyebrow'
import { useBag } from '../hooks/useBag'
import { getCartSuggestions } from '../services/bag.actions'

// Same-category suggestions for the cart area, keyed off whatever is in the bag
// (empty bag → featured-then-newest). Reuses the feed's GridCard so favoriting
// and pricing stay consistent with the rest of the storefront.
export function YouMayAlsoLike() {
  const { items, hydrated } = useBag()
  const productIds = items.map((i) => i.productId)
  const { data: suggestions = [] } = useQuery({
    queryKey: ['cart-suggestions', [...productIds].sort()],
    enabled: hydrated,
    queryFn: () => getCartSuggestions(productIds),
  })

  if (suggestions.length === 0) return null

  return (
    <section className="px-4 pt-8 pb-24">
      <Eyebrow as="h2" className="font-heading">
        You may also like
      </Eyebrow>
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
