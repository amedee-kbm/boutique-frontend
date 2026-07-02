import Link from 'next/link'
import Image from 'next/image'

import { formatPrice } from '@/shared/lib/format'
import type { StoreCard } from '@/lib/db/queries'
import { ColorSquares } from '@/features/products'
import { FavoriteButton } from '@/features/favorites'

export function GridCard({ product }: { product: StoreCard }) {
  return (
    <div className="relative">
      <FavoriteButton product={product} />
      <Link href={`/product/${product.slug}`} className="block">
        <div className="bg-muted relative aspect-[3/4] w-full overflow-hidden">
          {product.thumbnail ? (
            <Image
              src={product.thumbnail}
              alt={product.name}
              fill
              sizes="(max-width: 768px) 50vw, (max-width: 1280px) 33vw, 25vw"
              className="object-cover"
            />
          ) : null}
        </div>
        <div className="px-2 py-2">
          <h2 className="font-heading truncate text-[11px] font-medium tracking-[0.1em] uppercase">
            {product.name}
          </h2>
          <p className="text-muted-foreground mt-0.5 text-xs">{formatPrice(product.price)}</p>
          <ColorSquares hexes={product.hexes} className="mt-1.5" />
        </div>
      </Link>
    </div>
  )
}
