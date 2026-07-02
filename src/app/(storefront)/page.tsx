import Link from 'next/link'

import {
  getHomeFeed,
  getHomeFilters,
} from '@/features/storefront/products/services/product-queries'
import { isFullBleed } from '@/features/storefront/products'
import { FeedCard } from '@/features/storefront/products'

// Catalog changes in the admin must show immediately; don't serve a build snapshot.
export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const [feed, filters] = await Promise.all([getHomeFeed(), getHomeFilters()])

  return (
    <div className="pb-6">
      {filters.length > 0 && (
        <div className="bg-background/90 sticky top-14 z-30 flex [scrollbar-width:none] items-center gap-5 overflow-x-auto border-b px-4 py-3 backdrop-blur">
          <Link
            href="/shop"
            className="text-foreground shrink-0 text-[11px] font-semibold tracking-[0.12em] uppercase"
          >
            View all
          </Link>
          {filters.map((filter) => (
            <Link
              key={filter.href}
              href={filter.href}
              className="text-muted-foreground hover:text-foreground shrink-0 text-[11px] tracking-[0.12em] uppercase"
            >
              {filter.label}
            </Link>
          ))}
        </div>
      )}

      {feed.length === 0 ? (
        <p className="text-muted-foreground px-4 py-16 text-center text-sm">
          Nothing here yet. Check back soon.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-x-px gap-y-4 md:grid-cols-3 md:gap-y-6 xl:grid-cols-4">
          {feed.map((product, i) => (
            <FeedCard
              key={product.id}
              product={product}
              priority={i === 0}
              fullBleed={isFullBleed(i)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
