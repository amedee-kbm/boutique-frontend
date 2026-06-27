import Link from 'next/link'

import { getCategoryIndex, getHomeFeed } from '@/lib/db/queries'
import { FeedCard } from '@/components/storefront/FeedCard'

// Catalog changes in the admin must show immediately; don't serve a build snapshot.
export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const [feed, categories] = await Promise.all([getHomeFeed(), getCategoryIndex()])

  const shortcuts = categories.filter((c) => c.productCount > 0)

  return (
    <div className="pb-6">
      {shortcuts.length > 0 && (
        <div className="flex [scrollbar-width:none] gap-2 overflow-x-auto border-b px-4 py-3">
          {shortcuts.map((category) => (
            <Link
              key={category.id}
              href={`/category/${category.slug}`}
              className="border-foreground/15 hover:bg-muted shrink-0 border px-3 py-1.5 text-[11px] tracking-[0.1em] uppercase"
            >
              {category.name}
            </Link>
          ))}
        </div>
      )}

      {feed.length === 0 ? (
        <p className="text-muted-foreground px-4 py-16 text-center text-sm">
          Nothing here yet. Check back soon.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 md:gap-px xl:grid-cols-3">
          {feed.map((product, i) => (
            <FeedCard key={product.id} product={product} priority={i === 0} />
          ))}
        </div>
      )}
    </div>
  )
}
