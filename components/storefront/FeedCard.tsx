import Link from 'next/link'
import Image from 'next/image'

import { cn } from '@/lib/utils'
import { formatPrice } from '@/lib/format'
import type { HomeCard } from '@/lib/db/queries'
import { ColorSquares } from '@/components/storefront/ColorSquares'
import { QuickAddButton } from '@/components/storefront/QuickAddButton'

export function FeedCard({
  product,
  priority = false,
  fullBleed = false,
}: {
  product: HomeCard
  priority?: boolean
  fullBleed?: boolean
}) {
  return (
    <div className={cn('relative', fullBleed && 'col-span-2 md:col-span-1')}>
      <Link href={`/product/${product.slug}`} className="block">
        <div
          className={cn(
            'bg-muted relative w-full overflow-hidden',
            fullBleed ? 'aspect-[4/5] md:aspect-[3/4]' : 'aspect-[3/4]'
          )}
        >
          {product.thumbnail ? (
            <Image
              src={product.thumbnail}
              alt={product.name}
              fill
              sizes={
                fullBleed
                  ? '(max-width: 768px) 100vw, (max-width: 1280px) 33vw, 25vw'
                  : '(max-width: 768px) 50vw, (max-width: 1280px) 33vw, 25vw'
              }
              className="object-cover"
              priority={priority}
            />
          ) : null}
        </div>
        <div className="px-2 py-2 pr-12">
          <h2 className="font-heading truncate text-[11px] font-medium tracking-[0.1em] uppercase">
            {product.name}
          </h2>
          <p className="text-muted-foreground mt-0.5 text-xs">{formatPrice(product.price)}</p>
          <ColorSquares hexes={product.hexes} className="mt-1.5" />
        </div>
      </Link>
      <QuickAddButton product={product} />
    </div>
  )
}
