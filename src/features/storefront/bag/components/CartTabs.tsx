'use client'

import { useState } from 'react'
import { Bookmark } from 'lucide-react'

import type { StoreCard } from '@/features/storefront/products'
import { FavoritesPanel } from '@/features/storefront/favorites'
import { cn } from '@/shared/lib/utils'
import { useBag } from '../hooks/useBag'
import { BagList } from './BagList'
import { YouMayAlsoLike } from './YouMayAlsoLike'

type Tab = 'bag' | 'favorites'

// The cart area's two panels — Shopping Bag and Favorites — behind a Zara-clean
// segmented toggle (uppercase, hairline underline on the active tab). Favorited
// product cards are fetched server-side and handed to the Favorites panel.
export function CartTabs({ favoriteProducts }: { favoriteProducts: StoreCard[] }) {
  const [tab, setTab] = useState<Tab>('bag')
  const { count, hydrated } = useBag()

  return (
    <div>
      <div className="flex items-center gap-6 border-b px-4">
        <TabButton active={tab === 'bag'} onClick={() => setTab('bag')}>
          Shopping bag
          <span className="tabular-nums">{hydrated ? ` | ${count} |` : ' |'}</span>
        </TabButton>
        <TabButton active={tab === 'favorites'} onClick={() => setTab('favorites')}>
          Favorites <Bookmark className="size-3.5" aria-hidden />
        </TabButton>
      </div>

      {tab === 'bag' ? <BagList /> : <FavoritesPanel products={favoriteProducts} />}

      <YouMayAlsoLike />
    </div>
  )
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'font-heading -mb-px flex items-center gap-1.5 border-b py-3 text-xs tracking-[0.15em] uppercase transition-colors',
        active
          ? 'border-foreground text-foreground font-semibold'
          : 'text-muted-foreground border-transparent'
      )}
    >
      {children}
    </button>
  )
}
