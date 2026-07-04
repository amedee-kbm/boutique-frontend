import Link from 'next/link'
import Image from 'next/image'

import { formatPrice } from '@/shared/lib/format'
import type { StoreCard } from '@/features/storefront/products'
import { FavoriteButton } from '@/features/storefront/favorites'

export function GridCard({ product }: { product: StoreCard }) {
  return (
    <div className="group relative">
      <FavoriteButton product={product} />
      <Link href={`/product/${product.slug}`} className="block">
        <div className="bg-muted relative aspect-[3/4] w-full overflow-hidden">
          {product.thumbnail ? (
            <Image
              src={product.thumbnail}
              alt={product.name}
              fill
              sizes="(max-width: 768px) 50vw, (max-width: 1280px) 25vw, 20vw"
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : null}
        </div>
        <p className="text-foreground pt-2 text-[15px] font-medium tracking-wide tabular-nums">
          {formatPrice(product.price)}
        </p>
      </Link>
    </div>
  )
}
