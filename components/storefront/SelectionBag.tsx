'use client'

import Link from 'next/link'
import { ShoppingBag } from 'lucide-react'

import { useSelection } from '@/lib/selection/useSelection'

export function SelectionBag() {
  const { count, hydrated } = useSelection()

  return (
    <Link
      href="/selection"
      aria-label={`Selection${hydrated && count > 0 ? `, ${count} items` : ''}`}
      className="relative inline-flex size-11 items-center justify-center"
    >
      <ShoppingBag className="size-5" strokeWidth={1.7} />
      {hydrated && count > 0 && (
        <span className="bg-foreground text-background absolute top-1 right-0.5 grid min-w-4 place-items-center rounded-full px-1 text-[10px] leading-4 font-medium">
          {count}
        </span>
      )}
    </Link>
  )
}
