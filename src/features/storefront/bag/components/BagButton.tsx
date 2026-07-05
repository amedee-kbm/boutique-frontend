'use client'

import Link from 'next/link'
import { ShoppingBagOpenIcon } from '@phosphor-icons/react'

import { CountBadge } from '@/shared/components/CountBadge'
import { useBag } from '../hooks/useBag'

export function BagButton() {
  const { count, hydrated } = useBag()

  return (
    <Link
      href="/bag"
      aria-label={`Bag${hydrated && count > 0 ? `, ${count} items` : ''}`}
      className="relative inline-flex size-11 items-center justify-center"
    >
      <ShoppingBagOpenIcon className="size-5" />
      {hydrated && count > 0 && <CountBadge count={count} className="absolute top-1 right-0.5" />}
    </Link>
  )
}
