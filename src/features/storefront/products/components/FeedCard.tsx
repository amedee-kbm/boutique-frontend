import Link from 'next/link'
import Image from 'next/image'

import { formatPrice } from '@/shared/lib/format'
import type { HomeCard } from '@/features/storefront/products'

// Home feed tile: a uniform 3:4 photo that fills edge-to-edge (the image is the
// card — no surrounding box), with the price set as a confident caption below.
export function FeedCard({ product, priority = false }: { product: HomeCard; priority?: boolean }) {
  return (
    <Link href={`/product/${product.slug}`} className="group block">
      <div className="bg-muted relative aspect-[3/4] w-full overflow-hidden">
        {product.thumbnail ? (
          <Image
            src={product.thumbnail}
            alt={product.name}
            fill
            sizes="(max-width: 768px) 50vw, (max-width: 1280px) 25vw, 20vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            priority={priority}
          />
        ) : null}
      </div>
      <p className="text-foreground pt-2 text-[15px] font-medium tracking-wide tabular-nums">
        {formatPrice(product.price)}
      </p>
    </Link>
  )
}
