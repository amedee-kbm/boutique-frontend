import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

import { formatPrice } from '@/shared/lib/format'
import { ProductThumb } from '@/features/products'

export interface InquiryItem {
  id: string
  // Null once the product is deleted; slug is null when it's also hidden/gone.
  productId: string | null
  slug: string | null
  name: string
  colorValue: string | null
  sizeValue: string | null
  price: string
  imageUrl: string | null
}

function metaLine(item: InquiryItem): string | null {
  const parts = [item.colorValue, item.sizeValue].filter(Boolean)
  return parts.length ? parts.join(' · ') : null
}

export function ProductInquiryCard({ item }: { item: InquiryItem }) {
  const meta = metaLine(item)
  const href = item.slug
    ? `/product/${item.slug}${item.colorValue ? `?colour=${encodeURIComponent(item.colorValue)}` : ''}`
    : null

  return (
    <div className="bg-background flex items-center gap-3 rounded-lg border p-2">
      <ProductThumb
        src={item.imageUrl}
        alt={item.name}
        className="size-14 shrink-0 rounded-md object-cover"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{item.name}</p>
        {meta && <p className="text-muted-foreground truncate text-xs">{meta}</p>}
        <p className="truncate text-sm">{formatPrice(item.price)}</p>
      </div>
      {href ? (
        <Link
          href={href}
          className="text-muted-foreground hover:text-foreground flex shrink-0 items-center text-xs"
        >
          View
          <ChevronRight className="size-4" />
        </Link>
      ) : (
        <span className="text-muted-foreground shrink-0 text-xs">Unavailable</span>
      )}
    </div>
  )
}
