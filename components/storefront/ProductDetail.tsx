'use client'

import { useRef, useState } from 'react'
import { toast } from 'sonner'

import { formatPrice } from '@/lib/format'
import { selectionKey, useSelection } from '@/lib/selection/useSelection'
import { Button } from '@/components/ui/button'
import { ProductGallery, type GalleryHandle, type GallerySection } from './ProductGallery'
import { ColorStrip, type StripColour } from './ColorStrip'
import { SizeSelector } from './SizeSelector'

export interface DetailColour extends StripColour {
  repImageUrl: string | null
}

export interface ProductDetailData {
  id: string
  slug: string
  name: string
  description: string | null
  price: string
  sections: GallerySection[]
  colours: DetailColour[]
  sizes: string[]
  fallbackImageUrl: string | null
  initialColourValue: string | null
}

export function ProductDetail({ product }: { product: ProductDetailData }) {
  const { add } = useSelection()
  const galleryRef = useRef<GalleryHandle>(null)

  const initialColour =
    product.colours.find((c) => c.value === product.initialColourValue) ??
    product.colours[0] ??
    null

  const [activeColourId, setActiveColourId] = useState<string | null>(
    initialColour?.optionId ?? null
  )
  const [selectedSize, setSelectedSize] = useState<string | null>(null)

  const activeColour = product.colours.find((c) => c.optionId === activeColourId) ?? null
  const needsSize = product.sizes.length > 0 && !selectedSize

  function handleJump(optionId: string) {
    setActiveColourId(optionId)
    galleryRef.current?.jumpToColour(optionId)
  }

  function handleAdd() {
    if (needsSize) {
      toast.error('Select a size first')
      return
    }
    add({
      key: selectionKey(product.id, activeColour?.value ?? null, selectedSize),
      productId: product.id,
      slug: product.slug,
      name: product.name,
      price: product.price,
      colorValue: activeColour?.value ?? null,
      colorHex: activeColour?.hex ?? null,
      size: selectedSize,
      imageUrl: activeColour?.repImageUrl ?? product.fallbackImageUrl,
    })
    toast.success('Added to your selection')
  }

  return (
    <div className="pb-28 md:pb-0">
      {/* Mobile: colour strip sticks over the gallery (scroll-spy). */}
      <div className="md:hidden">
        <ColorStrip colours={product.colours} activeId={activeColourId} onJump={handleJump} />
      </div>

      <div className="md:flex md:items-start">
        <div className="md:w-3/5 lg:w-2/3">
          <ProductGallery
            ref={galleryRef}
            sections={product.sections}
            productName={product.name}
            onActiveChange={setActiveColourId}
          />
        </div>

        <div className="md:sticky md:top-14 md:w-2/5 md:self-start lg:w-1/3">
          <div className="space-y-5 px-4 py-5 md:px-8 md:py-8">
            {/* Desktop: colour swatches live inside the info rail. */}
            {product.colours.length > 0 && (
              <div className="hidden md:block">
                <ColorStrip
                  colours={product.colours}
                  activeId={activeColourId}
                  onJump={handleJump}
                  sticky={false}
                />
              </div>
            )}

            <div>
              <h1 className="font-heading text-base font-semibold tracking-[0.15em] uppercase">
                {product.name}
              </h1>
              <p className="mt-1 text-lg">{formatPrice(product.price)}</p>
            </div>

            <SizeSelector
              sizes={product.sizes}
              selected={selectedSize}
              onSelect={setSelectedSize}
            />

            {product.description && (
              <p className="text-muted-foreground text-sm leading-relaxed whitespace-pre-wrap">
                {product.description}
              </p>
            )}

            <Button
              type="button"
              className="hidden h-12 w-full rounded-none text-sm md:block"
              onClick={handleAdd}
            >
              {needsSize ? 'Select a size' : 'Add to selection'}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile: sticky bottom CTA (no tab bar underneath in the focused view). */}
      <div className="bg-background/95 sticky bottom-0 z-30 border-t p-3 backdrop-blur md:hidden">
        <Button type="button" className="h-12 w-full rounded-none text-sm" onClick={handleAdd}>
          {needsSize ? 'Select a size' : 'Add to selection'}
        </Button>
      </div>
    </div>
  )
}
