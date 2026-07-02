'use client'

import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import Image from 'next/image'

import { cn } from '@/lib/utils'

// First image of the first colour section is the hero: it fills the space
// between the sticky top bar (3.5rem) and the locked bottom chrome (~10rem:
// add button + pinned thumbnail strip). Every later image stacks at the normal
// portrait ratio. On desktop the hero reverts to the same ratio.
export const HERO_HEIGHT = 'h-[calc(100svh-3.5rem-10rem)] md:h-auto md:aspect-[4/5]'

export interface GallerySection {
  key: string
  colourId: string | null
  images: { id: string; url: string; alt: string | null }[]
}

export interface GalleryHandle {
  jumpToColour: (colourId: string) => void
}

export const ProductGallery = forwardRef<
  GalleryHandle,
  {
    sections: GallerySection[]
    productName: string
    onActiveChange: (colourId: string | null) => void
  }
>(function ProductGallery({ sections, productName, onActiveChange }, ref) {
  const els = useRef(new Map<string, HTMLDivElement>())
  const colourEls = useRef(new Map<string, HTMLDivElement>())

  useImperativeHandle(ref, () => ({
    jumpToColour(colourId) {
      colourEls.current.get(colourId)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    },
  }))

  useEffect(() => {
    const nodes = [...els.current.values()]
    if (nodes.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
        if (visible) {
          const colourId = (visible.target as HTMLElement).dataset.colourId || null
          onActiveChange(colourId)
        }
      },
      // Bias the "active" section toward the top, under the sticky header + strip.
      { rootMargin: '-140px 0px -55% 0px', threshold: [0, 0.25, 0.5, 1] }
    )

    nodes.forEach((node) => observer.observe(node))
    return () => observer.disconnect()
  }, [sections, onActiveChange])

  return (
    <div>
      {sections.map((section, sIdx) => (
        <div
          key={section.key}
          data-colour-id={section.colourId ?? ''}
          ref={(el) => {
            if (!el) return
            els.current.set(section.key, el)
            if (section.colourId && !colourEls.current.has(section.colourId)) {
              colourEls.current.set(section.colourId, el)
            }
          }}
        >
          {section.images.map((image, i) => {
            const isHero = sIdx === 0 && i === 0
            return (
              <div
                key={image.id}
                className={cn('bg-muted relative w-full', isHero ? HERO_HEIGHT : 'aspect-[4/5]')}
              >
                <Image
                  src={image.url}
                  alt={image.alt ?? productName}
                  fill
                  sizes="(max-width: 768px) 100vw, 66vw"
                  className="object-cover"
                  priority={isHero}
                />
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
})
