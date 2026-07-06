import Link from 'next/link'

import { getHomeFilters } from '@/features/storefront/products/services/product-queries'
import { loadHomeFeedPage } from '@/features/storefront/products/services/product.actions'
import { CategoryStrip, HomeFeed } from '@/features/storefront/products'
import { BrowseShell } from '@/widgets/storefront-nav'
import { eyebrowVariants } from '@/shared/components/Eyebrow'
import { cn } from '@/shared/lib/utils'

// Catalog changes in the admin must show immediately; don't serve a build snapshot.
export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const seed = crypto.randomUUID()
  const [initial, filters] = await Promise.all([loadHomeFeedPage(seed, 0), getHomeFilters()])

  return (
    <BrowseShell>
      <div className="pb-6">
        <CategoryStrip />

        {filters.length > 0 && (
          <div className="bg-background/90 sticky top-14 z-30 flex [scrollbar-width:none] items-center gap-5 overflow-x-auto border-b px-4 py-3 backdrop-blur">
            <Link
              href="/shop"
              className={cn(eyebrowVariants(), 'text-foreground shrink-0 font-semibold')}
            >
              View all
            </Link>
            {filters.map((filter) => (
              <Link
                key={filter.href}
                href={filter.href}
                className={cn(
                  eyebrowVariants(),
                  'text-muted-foreground hover:text-foreground shrink-0'
                )}
              >
                {filter.label}
              </Link>
            ))}
          </div>
        )}

        {initial.length === 0 ? (
          <p className="text-muted-foreground px-4 py-16 text-center text-sm">
            Nothing here yet. Check back soon.
          </p>
        ) : (
          <HomeFeed initial={initial} seed={seed} />
        )}
      </div>
    </BrowseShell>
  )
}
