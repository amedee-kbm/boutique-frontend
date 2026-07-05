'use client'

import Link from 'next/link'
import { ShoppingBagOpenIcon } from '@phosphor-icons/react'

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
      {hydrated && count > 0 && (
        <span className="bg-foreground text-background absolute top-1 right-0.5 grid min-w-4 place-items-center rounded-full px-1 text-[10px] leading-4 font-medium">
          {count}
        </span>
      )}
    </Link>
  )
}
