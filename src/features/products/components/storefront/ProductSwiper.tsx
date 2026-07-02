'use client'

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import useEmblaCarousel from 'embla-carousel-react'
import { Bookmark, ChevronLeft, ChevronRight, Share2, X } from 'lucide-react'
import { toast } from 'sonner'

import { cn } from '@/shared/lib/utils'
import { formatPrice } from '@/shared/lib/format'
import { bagKey, useBag } from '@/features/bag'
import { useFavorites } from '@/features/favorites'
import { Button } from '@/shared/ui'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/shared/ui'
import { ProductPanel } from './ProductPanel'
import { HERO_HEIGHT } from './ProductGallery'
import { BagButton } from '@/features/bag'
import type { SwipeCard } from '@/lib/db/queries'
import { firstColourId, type ProductDetailData, type DetailColour } from '../../lib/product-detail'

const HINT_KEY = 'zita-pdp-swipe-hint'
const subscribeMount = () => () => {}

function hintSeen() {
  try {
    return !!localStorage.getItem(HINT_KEY)
  } catch {
    return true
  }
}

export function ProductSwiper({
  list,
  initial,
  initialIndex,
}: {
  list: SwipeCard[]
  initial: ProductDetailData
  initialIndex: number
}) {
  const router = useRouter()
  const { add } = useBag()
  const { isFavorite, ready, toggle } = useFavorites()

  const multi = list.length > 1
  // The horizontal product swipe is only live while the hero is on screen; once
  // the customer scrolls down into the details, a sideways drag would fight the
  // read, so embla's watchDrag reads this ref and refuses to start a drag.
  const allowSwipe = useRef(true)
  const options = useMemo(
    () => ({
      align: 'center' as const,
      startIndex: initialIndex,
      watchDrag: () => allowSwipe.current,
    }),
    [initialIndex]
  )
  const [emblaRef, emblaApi] = useEmblaCarousel(options)

  // The coachmark only makes sense over the hero; hide it once scrolled away.
  const [atTop, setAtTop] = useState(true)
  useEffect(() => {
    if (!multi) return
    const onScroll = () => {
      const top = window.scrollY < window.innerHeight * 0.5
      allowSwipe.current = top
      setAtTop((prev) => (prev === top ? prev : top))
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [multi])

  const [selected, setSelected] = useState(initialIndex)
  const [details, setDetails] = useState<Record<string, ProductDetailData>>({
    [initial.slug]: initial,
  })
  const [colourBySlug, setColourBySlug] = useState<Record<string, string | null>>({
    [initial.slug]: firstColourId(initial),
  })
  const [sizeSheetOpen, setSizeSheetOpen] = useState(false)

  // Slugs already fetched or in flight — seeded with the server-rendered one so
  // it's never re-requested.
  const requested = useRef<Set<string>>(new Set([initial.slug]))

  const fetchDetail = useCallback((slug: string) => {
    if (requested.current.has(slug)) return
    requested.current.add(slug)
    fetch(`/api/products/${slug}`)
      .then((res) => (res.ok ? (res.json() as Promise<ProductDetailData>) : null))
      .then((data) => {
        if (!data) return
        setDetails((prev) => (prev[slug] ? prev : { ...prev, [slug]: data }))
        setColourBySlug((prev) => (slug in prev ? prev : { ...prev, [slug]: firstColourId(data) }))
      })
      .catch(() => {
        // Allow a retry on the next approach if the fetch failed.
        requested.current.delete(slug)
      })
  }, [])

  // Coachmark for the horizontal product swipe — shown once, then remembered.
  const mounted = useSyncExternalStore(
    subscribeMount,
    () => true,
    () => false
  )
  const [hintDismissed, setHintDismissed] = useState(false)
  const showHint = multi && mounted && !hintDismissed && !hintSeen()

  const dismissHint = useCallback(() => {
    setHintDismissed(true)
    try {
      localStorage.setItem(HINT_KEY, '1')
    } catch {
      // ignore privacy-mode errors
    }
  }, [])

  const onSelect = useCallback(() => {
    if (!emblaApi) return
    const i = emblaApi.selectedScrollSnap()
    setSelected(i)
    dismissHint()
    const card = list[i]
    if (!card) return
    // Shallow URL sync — keep the pager mounted (router.replace would refetch
    // the RSC and remount), update the address bar to the active product.
    window.history.replaceState(window.history.state, '', `/product/${card.slug}`)
    // Prime the active slide and its immediate neighbours so the next swipe lands
    // on a ready panel.
    fetchDetail(card.slug)
    if (list[i + 1]) fetchDetail(list[i + 1].slug)
    if (list[i - 1]) fetchDetail(list[i - 1].slug)
  }, [emblaApi, list, fetchDetail, dismissHint])

  useEffect(() => {
    if (!emblaApi) return
    emblaApi.on('select', onSelect)
    // Prime the initial slide's neighbours up front. This only triggers state
    // updates asynchronously (inside fetchDetail's promise), never synchronously
    // in the effect body.
    if (list[initialIndex + 1]) fetchDetail(list[initialIndex + 1].slug)
    if (list[initialIndex - 1]) fetchDetail(list[initialIndex - 1].slug)
    return () => {
      emblaApi.off('select', onSelect)
    }
  }, [emblaApi, onSelect, fetchDetail, list, initialIndex])

  const activeThumb = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    const el = activeThumb.current
    const row = el?.parentElement
    if (!el || !row) return
    // Center the active thumb in its own horizontal strip only — scrollIntoView
    // would also scroll the page vertically (the strip sits below a tall gallery),
    // yanking the customer past the hero on open.
    const elR = el.getBoundingClientRect()
    const rowR = row.getBoundingClientRect()
    row.scrollBy({ left: elR.left - rowR.left - (rowR.width - elR.width) / 2, behavior: 'smooth' })
  }, [selected])

  const activeCard = list[selected] ?? {
    slug: initial.slug,
    name: initial.name,
    price: initial.price,
    thumbnail: initial.fallbackImageUrl,
  }
  const activeData = details[activeCard.slug] ?? null
  const saved = ready && activeData ? isFavorite(activeData.id) : false

  function addLine(size: string | null) {
    if (!activeData) return
    const colourId = colourBySlug[activeData.slug] ?? firstColourId(activeData)
    const colour = activeData.colours.find((c: DetailColour) => c.optionId === colourId) ?? null
    add({
      key: bagKey(activeData.id, colour?.value ?? null, size),
      productId: activeData.id,
      slug: activeData.slug,
      name: activeData.name,
      price: activeData.price,
      colorValue: colour?.value ?? null,
      colorHex: colour?.hex ?? null,
      size,
      imageUrl: colour?.repImageUrl ?? activeData.fallbackImageUrl,
    })
    toast.success('Added to your bag')
  }

  function handleAdd() {
    if (!activeData) return
    if (activeData.sizes.length > 0) {
      setSizeSheetOpen(true)
      return
    }
    addLine(null)
  }

  async function handleFavorite() {
    if (!activeData) return
    const { needsAuth } = await toggle(activeData.id)
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
        await navigator.share({ title: activeCard.name, url })
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

  // Mobile hero is full-bleed — no neighbour peek; the coachmark teaches the
  // swipe instead. Desktop keeps a centred gallery that reveals siblings.
  const slideBasis = multi
    ? 'flex-[0_0_100%] md:flex-[0_0_70%] lg:flex-[0_0_55%]'
    : 'flex-[0_0_100%]'

  return (
    <div className="pb-44 md:pb-0">
      {/* Mobile top bar (the global header is hidden on the PDP): ✕ · favorite · share · bag. */}
      <div className="bg-background/90 sticky top-0 z-40 flex h-14 items-center justify-between pr-1 pl-1 backdrop-blur md:hidden">
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Close"
          className="flex size-11 items-center justify-center"
        >
          <X className="size-5" strokeWidth={1.8} />
        </button>
        <div className="flex items-center">
          <FavoriteShare saved={saved} onFavorite={handleFavorite} onShare={handleShare} />
          <BagButton />
        </div>
      </div>

      {/* Desktop favorite + share (bag + nav live in the global header). */}
      <div className="hidden items-center justify-end px-8 pt-4 md:flex">
        <FavoriteShare saved={saved} onFavorite={handleFavorite} onShare={handleShare} />
      </div>

      <div className="relative">
        <div className="overflow-hidden" ref={emblaRef}>
          <div className="flex">
            {list.map((card, i) => {
              const isActive = i === selected
              const data = details[card.slug]
              const near = Math.abs(i - selected) <= 1
              return (
                <div key={card.slug} className={cn('min-w-0 px-1', slideBasis)}>
                  {isActive && data ? (
                    <ProductPanel
                      data={data}
                      activeColourId={colourBySlug[card.slug] ?? null}
                      onColour={(id) => setColourBySlug((prev) => ({ ...prev, [card.slug]: id }))}
                      hideHeadingOnMobile={atTop}
                    />
                  ) : (
                    <SlidePlaceholder card={card} showImage={near} />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {multi && (
          <>
            <PagerArrow
              side="left"
              disabled={selected === 0}
              onClick={() => emblaApi?.scrollPrev()}
            />
            <PagerArrow
              side="right"
              disabled={selected === list.length - 1}
              onClick={() => emblaApi?.scrollNext()}
            />
          </>
        )}
      </div>

      {/* Desktop: thumbnails + add flow below the pager (no locked chrome). */}
      <div className="hidden md:block">
        {multi && (
          <section className="border-t pt-4 pb-2">
            <h2 className="font-heading px-8 text-[11px] font-medium tracking-[0.15em] uppercase">
              More in this category
            </h2>
            <div className="mt-3">
              <CategoryThumbs
                list={list}
                selected={selected}
                onPick={(i) => emblaApi?.scrollTo(i)}
              />
            </div>
          </section>
        )}
        <div className="px-8 pt-4 pb-8">
          <Button
            type="button"
            variant="outline"
            disabled={!activeData}
            className="h-12 w-full max-w-md rounded-none text-sm"
            onClick={handleAdd}
          >
            Add to bag
          </Button>
        </div>
      </div>

      {/* One-time coachmark teaching the horizontal swipe (no peek to hint it). */}
      {multi && showHint && atTop && (
        <button
          type="button"
          onClick={dismissHint}
          aria-label="Swipe left or right to browse other products"
          className="bg-foreground/85 text-background fixed bottom-44 left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 rounded-full px-4 py-2 text-[11px] tracking-[0.12em] uppercase backdrop-blur md:hidden"
        >
          <ChevronLeft
            className="size-3.5"
            style={{ animation: 'swipe-hint 1.4s ease-in-out infinite' }}
          />
          Swipe to browse
          <ChevronRight
            className="size-3.5"
            style={{ animation: 'swipe-hint 1.4s ease-in-out infinite' }}
          />
        </button>
      )}

      {/* Mobile: locked bottom chrome. While at the top of the hero it carries
          title + price + add + thumbnails (mirroring the in-flow heading,
          which hides itself on mobile via hideHeadingOnMobile to avoid a
          duplicate). Once scrolled past the hero it collapses to a slim
          add + price bar, matching the desktop footer's minimalism. Snaps
          instantly between variants on the same `atTop` flag driving the
          coachmark, rather than animating — title/price/thumbnails are
          either fully present or fully gone with nothing partially shown. */}
      <div className="bg-background/95 fixed bottom-0 left-1/2 z-30 w-full max-w-[480px] -translate-x-1/2 backdrop-blur md:hidden">
        {atTop ? (
          <>
            <div className="border-t px-4 pt-3 pb-1">
              <h1 className="font-heading text-base font-semibold tracking-[0.15em] uppercase">
                {activeCard.name}
              </h1>
              <p className="mt-1 text-lg">{formatPrice(activeCard.price)}</p>
            </div>
            <div className="px-4 py-3">
              <Button
                type="button"
                variant="outline"
                disabled={!activeData}
                className="h-12 w-full rounded-none text-sm"
                onClick={handleAdd}
              >
                Add to bag
              </Button>
            </div>
            {multi && (
              <div className="pb-2">
                <CategoryThumbs
                  list={list}
                  selected={selected}
                  onPick={(i) => emblaApi?.scrollTo(i)}
                  activeRef={activeThumb}
                />
              </div>
            )}
          </>
        ) : (
          <div className="flex items-center gap-3 border-t p-3">
            <Button
              type="button"
              variant="outline"
              disabled={!activeData}
              className="h-12 flex-1 rounded-none text-sm"
              onClick={handleAdd}
            >
              Add to bag
            </Button>
            <span className="shrink-0 text-base font-medium tabular-nums">
              {formatPrice(activeCard.price)}
            </span>
          </div>
        )}
      </div>

      <Sheet open={sizeSheetOpen} onOpenChange={setSizeSheetOpen}>
        <SheetContent side="bottom" className="gap-0 pb-[env(safe-area-inset-bottom)]">
          <SheetHeader className="items-center text-center">
            <SheetTitle>Select a size</SheetTitle>
            <SheetDescription className="truncate uppercase">{activeCard.name}</SheetDescription>
          </SheetHeader>
          <div className="flex flex-col">
            {(activeData?.sizes ?? []).map((size: string) => (
              <button
                key={size}
                type="button"
                onClick={() => {
                  addLine(size)
                  setSizeSheetOpen(false)
                }}
                className="hover:bg-muted flex min-h-14 items-center justify-center text-sm tracking-wide"
              >
                {size}
              </button>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}

// Favorite (account-gated) + share, shared by the mobile top bar and desktop row.
function FavoriteShare({
  saved,
  onFavorite,
  onShare,
}: {
  saved: boolean
  onFavorite: () => void
  onShare: () => void
}) {
  return (
    <>
      <button
        type="button"
        onClick={onFavorite}
        aria-pressed={saved}
        aria-label={saved ? 'Remove from favorites' : 'Save to favorites'}
        className="flex size-11 items-center justify-center"
      >
        <Bookmark className={cn('size-5', saved && 'fill-current')} strokeWidth={1.7} />
      </button>
      <button
        type="button"
        onClick={onShare}
        aria-label="Share"
        className="flex size-11 items-center justify-center"
      >
        <Share2 className="size-5" strokeWidth={1.7} />
      </button>
    </>
  )
}

// Horizontal strip of sibling products. Shared by the locked mobile chrome and
// the desktop in-flow section; tapping a thumb pages the hero to that product.
function CategoryThumbs({
  list,
  selected,
  onPick,
  activeRef,
}: {
  list: SwipeCard[]
  selected: number
  onPick: (i: number) => void
  activeRef?: React.RefObject<HTMLButtonElement | null>
}) {
  return (
    <div className="flex [scrollbar-width:none] gap-2 overflow-x-auto overscroll-x-contain px-4">
      {list.map((card, i) => {
        const isActive = i === selected
        return (
          <button
            key={card.slug}
            ref={isActive ? activeRef : undefined}
            type="button"
            aria-label={card.name}
            aria-current={isActive}
            onClick={() => onPick(i)}
            className={cn(
              'w-14 shrink-0 transition-opacity',
              isActive ? 'opacity-100' : 'opacity-50'
            )}
          >
            <div className="bg-muted relative aspect-[3/4] w-full overflow-hidden">
              {card.thumbnail && (
                <Image
                  src={card.thumbnail}
                  alt={card.name}
                  fill
                  sizes="56px"
                  className="object-cover"
                />
              )}
            </div>
          </button>
        )
      })}
    </div>
  )
}

// A not-yet-active slide: the product's main image (only when adjacent, to keep
// off-screen products from loading their photos) with name + price.
function SlidePlaceholder({ card, showImage }: { card: SwipeCard; showImage: boolean }) {
  return (
    <div>
      <div className={cn('bg-muted relative w-full overflow-hidden', HERO_HEIGHT)}>
        {showImage && card.thumbnail && (
          <Image
            src={card.thumbnail}
            alt={card.name}
            fill
            sizes="(max-width: 768px) 92vw, 55vw"
            className="object-cover"
          />
        )}
      </div>
      <div className="px-4 py-5">
        <h2 className="font-heading text-base font-semibold tracking-[0.15em] uppercase">
          {card.name}
        </h2>
        <p className="mt-1 text-lg">{formatPrice(card.price)}</p>
      </div>
    </div>
  )
}

function PagerArrow({
  side,
  disabled,
  onClick,
}: {
  side: 'left' | 'right'
  disabled: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={side === 'left' ? 'Previous product' : 'Next product'}
      className={cn(
        'bg-background/80 absolute top-1/2 z-20 hidden size-10 -translate-y-1/2 place-items-center rounded-full border backdrop-blur disabled:opacity-0 md:grid',
        side === 'left' ? 'left-4' : 'right-4'
      )}
    >
      {side === 'left' ? (
        <ChevronLeft className="size-5" strokeWidth={1.8} />
      ) : (
        <ChevronRight className="size-5" strokeWidth={1.8} />
      )}
    </button>
  )
}
