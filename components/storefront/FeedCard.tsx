import Link from 'next/link'
import Image from 'next/image'

import { formatPrice } from '@/lib/format'
import type { StoreCard } from '@/lib/db/queries'
import { ColorSquares } from '@/components/storefront/ColorSquares'

export function FeedCard({
  product,
  priority = false,
}: {
  product: StoreCard
  priority?: boolean
}) {
  return (
    <Link href={`/product/${product.slug}`} className="block">
      <div className="bg-muted relative aspect-[4/5] w-full overflow-hidden">
        {product.thumbnail ? (
          <Image
            src={product.thumbnail}
            alt={product.name}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
            className="object-cover"
            priority={priority}
          />
        ) : null}
      </div>
      <div className="px-4 py-2.5">
        <h2 className="font-heading truncate text-xs font-medium tracking-[0.12em] uppercase">
          {product.name}
        </h2>
        <p className="text-muted-foreground mt-0.5 text-sm">{formatPrice(product.price)}</p>
        <ColorSquares hexes={product.hexes} className="mt-1.5" />
      </div>
    </Link>
  )
}
