'use client'

import Link from 'next/link'
import { ShoppingBagOpenIcon } from '@phosphor-icons/react'

import { CountBadge } from '@/shared/components/CountBadge'
import { useBag } from '../hooks/useBag'

export function BagButton() {
  const { count, hydrated, addNonce } = useBag()

  return (
    <Link
      href="/bag"
      aria-label={`Bag${hydrated && count > 0 ? `, ${count} items` : ''}`}
      className="relative inline-flex size-11 items-center justify-center"
    >
      {/* Re-keying on addNonce restarts the one-shot pop on every add (incl. a
          re-add that only bumps a quantity); it never fires on remove. */}
      <ShoppingBagOpenIcon
        key={addNonce}
        className="size-5"
        style={addNonce > 0 ? { animation: 'bag-pop 300ms ease' } : undefined}
      />
      {hydrated && count > 0 && <CountBadge count={count} className="absolute top-1 right-0.5" />}
    </Link>
  )
}
