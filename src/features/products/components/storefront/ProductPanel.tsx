'use client'

import { useRef } from 'react'
import Link from 'next/link'
import { MessageSquare } from 'lucide-react'

import { cn } from '@/shared/lib/utils'
import { formatPrice } from '@/shared/lib/format'
import { ProductGallery, type GalleryHandle } from './ProductGallery'
import { ColorStrip } from './ColorStrip'
import type { ProductDetailData } from '../../lib/product-detail'

// One product within the swipe pager: its vertically-scrolled gallery plus
// name, price, inline colour squares and description. The purchase chrome
// (top bar, add-to-bag, size sheet) is hoisted to ProductSwiper and acts on
// whichever panel is active, so colour selection is lifted here via `onColour`.
export function ProductPanel({
  data,
  activeColourId,
  onColour,
  hideHeadingOnMobile = false,
}: {
  data: ProductDetailData
  activeColourId: string | null
  onColour: (optionId: string | null) => void
  // While the mobile locked footer is showing its "at top" variant (title +
  // price + add + thumbnails), that info is duplicated there, so the in-flow
  // heading below the gallery hides on mobile to avoid repeating it. Desktop
  // has no such footer, so the heading always renders there.
  hideHeadingOnMobile?: boolean
}) {
  const galleryRef = useRef<GalleryHandle>(null)

  function handleJump(optionId: string) {
    onColour(optionId)
    galleryRef.current?.jumpToColour(optionId)
  }

  return (
    <div>
      <ProductGallery
        ref={galleryRef}
        sections={data.sections}
        productName={data.name}
        onActiveChange={onColour}
      />

      <div className="space-y-5 px-4 py-5">
        <div className={cn(hideHeadingOnMobile && 'hidden', 'md:block')}>
          <h1 className="font-heading text-base font-semibold tracking-[0.15em] uppercase">
            {data.name}
          </h1>
          <p className="mt-1 text-lg">{formatPrice(data.price)}</p>
        </div>

        {data.colours.length > 0 && (
          <ColorStrip
            colours={data.colours}
            activeId={activeColourId}
            onJump={handleJump}
            sticky={false}
          />
        )}

        {data.description && (
          <p className="text-muted-foreground text-sm leading-relaxed whitespace-pre-wrap">
            {data.description}
          </p>
        )}

        <Link
          href="/chat"
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-xs tracking-[0.12em] uppercase"
        >
          <MessageSquare className="size-4" strokeWidth={1.7} />
          Ask about this piece
        </Link>
      </div>
    </div>
  )
}
