'use client'

import { useCallback, useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import useEmblaCarousel from 'embla-carousel-react'
import { Bookmark, ChevronLeft, Share2 } from 'lucide-react'
import { toast } from 'sonner'

import { cn } from '@/shared/lib/utils'
import { formatPrice } from '@/shared/lib/format'
import { useFavorites } from '@/features/storefront/favorites'
import { BagButton } from '@/features/storefront/bag'
import { IconButton } from '@/shared/components/IconButton'
import { Eyebrow } from '@/shared/components/Eyebrow'
import { SectionTitle } from '@/shared/components/SectionTitle'
import { AddToBagSheet } from './AddToBagSheet'
import { BuyActions } from './BuyActions'
import type { ProductDetailData } from '../lib/product-detail'
import type { SwipeCard } from '../services/product-queries'

// The product page: a swipeable carousel of this product's photos, then price,
// name and description, then more from the same category. Buying happens in the
// AddToBagSheet (colour + size + quantity); the horizontal swipe browses photos,
// not other products.
export function ProductDetail({ data, more }: { data: ProductDetailData; more: SwipeCard[] }) {
  const router = useRouter()
  const { isFavorite, ready, toggle } = useFavorites()
  const [sheetOpen, setSheetOpen] = useState(false)

  const images = data.sections.flatMap((s) => s.images)
  const saved = ready && isFavorite(data.id)

  async function handleFavorite() {
    const { needsAuth } = await toggle(data.id)
    if (needsAuth) {
      toast('Log in to save favorites', {
        description: 'Favorites are saved to your account.',
        action: { label: 'Log in', onClick: () => router.push('/account/login') },
        cancel: { label: 'Register', onClick: () => router.push('/account/register') },
      })
    }
  }

  async function handleShare() {
    const url = window.location.href
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: data.name, url })
      } catch {
        // user dismissed the share sheet
      }
      return
    }
    try {
      await navigator.clipboard.writeText(url)
      toast.success('Link copied')
    } catch {
      // clipboard unavailable
    }
  }

  return (
    <div className="pb-24 md:pb-0">
      <div className="relative">
        {/* Mobile chrome floating over the photo: back (left), bag (right). */}
        <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between p-2 md:hidden">
          <IconButton onClick={() => router.back()} aria-label="Back">
            <ChevronLeft className="size-5" strokeWidth={1.8} />
          </IconButton>
          <BagButton />
        </div>

        <PhotoCarousel images={images} productName={data.name} />

        {/* Favorite + share float on the photo, bottom-right (Kikuu-style). */}
        <div className="absolute right-2 bottom-2 z-20 flex flex-col gap-2">
          <IconButton
            onClick={handleFavorite}
            aria-label={saved ? 'Remove from favorites' : 'Save to favorites'}
            aria-pressed={saved}
          >
            <Bookmark className={cn('size-5', saved && 'fill-current')} strokeWidth={1.7} />
          </IconButton>
          <IconButton onClick={handleShare} aria-label="Share">
            <Share2 className="size-5" strokeWidth={1.7} />
          </IconButton>
        </div>
      </div>

      <div className="mx-auto max-w-2xl space-y-4 px-4 py-5 md:px-8">
        <p className="text-2xl">{formatPrice(data.price)}</p>
        <SectionTitle as="h1">{data.name}</SectionTitle>
        {data.description && (
          <p className="text-muted-foreground text-sm leading-relaxed whitespace-pre-wrap">
            {data.description}
          </p>
        )}

        {/* Desktop CTA lives inline; mobile gets the sticky bar below. */}
        <div className="hidden gap-3 pt-2 md:flex">
          <BuyActions onAddToBag={() => setSheetOpen(true)} />
        </div>
      </div>

      {more.length > 0 && <MoreInCategory list={more} />}

      {/* Mobile sticky purchase bar: Add to bag + Chat. */}
      <div className="bg-background/95 fixed bottom-0 left-1/2 z-30 flex w-full max-w-[480px] -translate-x-1/2 items-center gap-3 border-t p-3 backdrop-blur md:hidden">
        <BuyActions onAddToBag={() => setSheetOpen(true)} />
      </div>

      <AddToBagSheet product={data} open={sheetOpen} onOpenChange={setSheetOpen} />
    </div>
  )
}

// Horizontal photo carousel with dot indicators — the dots are the "there's more
// to see, swipe" cue the customer expects.
function PhotoCarousel({
  images,
  productName,
}: {
  images: { id: string; url: string; alt: string | null }[]
  productName: string
}) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ align: 'center' })
  const [selected, setSelected] = useState(0)

  const onSelect = useCallback(() => {
    if (emblaApi) setSelected(emblaApi.selectedScrollSnap())
  }, [emblaApi])

  useEffect(() => {
    if (!emblaApi) return
    emblaApi.on('select', onSelect)
    emblaApi.on('reInit', onSelect)
    return () => {
      emblaApi.off('select', onSelect)
      emblaApi.off('reInit', onSelect)
    }
  }, [emblaApi, onSelect])

  if (images.length === 0) {
    return <div className="bg-muted aspect-square w-full" />
  }

  return (
    <div className="relative">
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex">
          {images.map((image, i) => (
            <div key={image.id} className="min-w-0 flex-[0_0_100%]">
              <div className="bg-background relative aspect-square w-full">
                <Image
                  src={image.url}
                  alt={image.alt ?? productName}
                  fill
                  sizes="(max-width: 768px) 100vw, 66vw"
                  className="object-contain"
                  priority={i === 0}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {images.length > 1 && (
        <div className="absolute inset-x-0 bottom-3 z-10 flex justify-center gap-1.5">
          {images.map((image, i) => (
            <span
              key={image.id}
              className={cn(
                'size-1.5 rounded-full transition-colors',
                i === selected ? 'bg-foreground' : 'bg-foreground/30'
              )}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function MoreInCategory({ list }: { list: SwipeCard[] }) {
  return (
    <section className="border-t px-4 py-6 md:px-8">
      <Eyebrow as="h2" className="font-heading mb-3 font-medium">
        More in this category
      </Eyebrow>
      <div className="grid grid-cols-2 gap-x-3 gap-y-5 md:grid-cols-4">
        {list.map((card) => (
          <Link key={card.slug} href={`/product/${card.slug}`} className="group block">
            <div className="bg-muted relative aspect-[3/4] w-full overflow-hidden">
              {card.thumbnail && (
                <Image
                  src={card.thumbnail}
                  alt={card.name}
                  fill
                  sizes="(max-width: 768px) 50vw, 25vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
              )}
            </div>
            <p className="text-foreground pt-2 text-[15px] font-medium tracking-wide tabular-nums">
              {formatPrice(card.price)}
            </p>
          </Link>
        ))}
      </div>
    </section>
  )
}
