'use client'

import Link from 'next/link'
import Image from 'next/image'

import { DotsThreeOutlineVerticalIcon } from '@phosphor-icons/react'

import { formatPrice } from '@/shared/lib/format'
import type { HomeCard } from '@/features/storefront/products'

// Home feed tile: a uniform 3:4 photo that fills edge-to-edge (the image is the
// card — no surrounding box), with the price set as a confident caption below.
export function FeedCard({ product, priority = false }: { product: HomeCard; priority?: boolean }) {
  return (
    <Link href={`/product/${product.slug}`} className="group flex flex-col bg-white">
      <div className="bg-muted relative aspect-[3/4] w-full overflow-hidden rounded-t-xs">
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
      <div className="m-2 flex items-center justify-between pt-4">
        <p className="text-[12px] font-semibold tabular-nums">{formatPrice(product.price)}</p>
        <DotsThreeOutlineVerticalIcon size={12} weight="fill" className="text-zinc-500" />
      </div>
    </Link>
  )
}
