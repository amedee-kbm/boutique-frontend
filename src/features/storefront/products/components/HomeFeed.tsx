'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import { ArrowUpIcon } from '@phosphor-icons/react'
import { useWindowVirtualizer } from '@tanstack/react-virtual'

import { FeedCard } from './FeedCard'
import { useMediaQuery } from '@/shared/hooks/use-media-query'
import { useHydrated } from '@/shared/hooks/useHydrated'
import { HOME_PAGE_SIZE } from '../consts/home-feed'
import { loadHomeFeedPage } from '../services/product.actions'
import type { HomeCard } from '../services/product-queries'

type Entry = { key: string; product: HomeCard }

// Vertical gap between rows (gap-y-7 = 1.75rem). The virtualizer owns row
// spacing, so it's applied here rather than as a grid gap.
const ROW_GAP = 28

// Endless server-paged feed. The first page is SSR'd; each further page is
// fetched via a 'use server' action as the list nears its end. When we run past
// the end of the (finite) catalog we wrap back to the top with a fresh seed, so
// the feed never ends and each lap is a new shuffle.
//
// Off-screen rows are recycled with @tanstack/react-virtual (window scroll), so
// the DOM stays bounded no matter how far someone scrolls. Before hydration the
// SSR'd first page renders as a plain grid so first paint (and the LCP image)
// isn't blank; after hydration it switches to the virtualized list.
export function HomeFeed({ initial, seed }: { initial: HomeCard[]; seed: string }) {
  const [items, setItems] = useState<Entry[]>(() =>
    initial.map((product, i) => ({ key: `s0-${i}`, product }))
  )
  const [loading, setLoading] = useState(false)
  const [showTop, setShowTop] = useState(false)
  const hydrated = useHydrated()

  // Loop bookkeeping in refs so async loads always read the latest without
  // re-subscribing on every change.
  const seedRef = useRef(seed)
  const offsetRef = useRef(initial.length < HOME_PAGE_SIZE ? 0 : 1)
  const seqRef = useRef(1)
  const emptyRef = useRef(initial.length === 0)

  async function loadMore() {
    if (loading || emptyRef.current) return
    setLoading(true)

    let page = await loadHomeFeedPage(seedRef.current, offsetRef.current)

    // Overshot the end on an exact-multiple catalog: restart the lap and refetch
    // so there's always something to append (otherwise paging stalls).
    if (page.length === 0) {
      if (offsetRef.current === 0) {
        emptyRef.current = true
        setLoading(false)
        return
      }
      offsetRef.current = 0
      seedRef.current = crypto.randomUUID()
      page = await loadHomeFeedPage(seedRef.current, 0)
      if (page.length === 0) {
        emptyRef.current = true
        setLoading(false)
        return
      }
    }

    const seq = seqRef.current++
    setItems((prev) => [...prev, ...page.map((product, i) => ({ key: `s${seq}-${i}`, product }))])

    // A short page is the tail of the catalog — wrap to the top for the next lap.
    if (page.length < HOME_PAGE_SIZE) {
      offsetRef.current = 0
      seedRef.current = crypto.randomUUID()
    } else {
      offsetRef.current += 1
    }

    setLoading(false)
  }

  const loadMoreRef = useRef(loadMore)
  useEffect(() => {
    loadMoreRef.current = loadMore
  })

  // Column count mirrors the Tailwind breakpoints (grid-cols-2 / lg:3 / xl:4).
  // Only used once virtualized (client-only), so matchMedia is reliable here.
  const isLg = useMediaQuery('(min-width: 1024px)')
  const isXl = useMediaQuery('(min-width: 1280px)')
  const columns = isXl ? 4 : isLg ? 3 : 2

  const rows: Entry[][] = []
  for (let i = 0; i < items.length; i += columns) rows.push(items.slice(i, i + columns))

  // Window virtualizer over rows. scrollMargin is the list's distance from the
  // top of the document (there's a header + category strip above it). Measured
  // via a callback ref — set from the plain-grid phase so it's already correct
  // by the time the virtualized list renders.
  const [scrollMargin, setScrollMargin] = useState(0)
  const listRef = useCallback((node: HTMLDivElement | null) => {
    if (node) setScrollMargin(node.offsetTop)
  }, [])

  const virtualizer = useWindowVirtualizer({
    count: rows.length,
    estimateSize: () => 300,
    overscan: 4,
    gap: ROW_GAP,
    scrollMargin,
    getItemKey: (index) => rows[index]?.[0]?.key ?? index,
  })

  const virtualRows = virtualizer.getVirtualItems()

  // Page in more as the last virtual row nears the end of what's loaded.
  useEffect(() => {
    const last = virtualRows[virtualRows.length - 1]
    if (last && last.index >= rows.length - 2) loadMoreRef.current()
  }, [virtualRows, rows.length])

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 800)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const backToTop = showTop ? (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label="Back to top"
      className="bg-foreground text-background fixed right-4 bottom-20 z-40 flex size-11 items-center justify-center rounded-full shadow-lg transition active:scale-95"
    >
      <ArrowUpIcon size={20} weight="bold" />
    </button>
  ) : null

  // SSR + first client render: plain responsive grid so first paint isn't blank
  // and the server/client markup matches. Swaps to virtualized after mount.
  if (!hydrated) {
    return (
      <div
        ref={listRef}
        className="grid grid-cols-2 gap-x-3 gap-y-7 px-3 pt-3 lg:grid-cols-3 xl:grid-cols-4"
      >
        {items.map((entry, i) => (
          <FeedCard key={entry.key} product={entry.product} priority={i === 0} />
        ))}
      </div>
    )
  }

  return (
    <>
      <div className="px-3 pt-3">
        <div
          ref={listRef}
          className="relative w-full"
          style={{ height: virtualizer.getTotalSize() }}
        >
          {virtualRows.map((virtualRow) => {
            const row = rows[virtualRow.index]
            if (!row) return null
            return (
              <div
                key={virtualRow.key}
                data-index={virtualRow.index}
                ref={virtualizer.measureElement}
                className="absolute top-0 left-0 grid w-full gap-x-3"
                style={{
                  gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
                  transform: `translateY(${virtualRow.start - virtualizer.options.scrollMargin}px)`,
                }}
              >
                {row.map((entry) => (
                  <FeedCard key={entry.key} product={entry.product} />
                ))}
              </div>
            )
          })}
        </div>
      </div>

      {backToTop}
    </>
  )
}
