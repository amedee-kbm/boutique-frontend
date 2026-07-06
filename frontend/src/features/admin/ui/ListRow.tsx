'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'

import { cn } from '@/shared/lib/utils'
import { ProductThumb } from '@/shared/components/ProductThumb'

interface ListRowProps {
  href?: string
  thumbnail?: string | null
  title: ReactNode
  meta?: ReactNode
  /** Status / warning line shown in an accent colour, e.g. "Hidden". */
  accent?: ReactNode
  /** Trailing controls (toggle, delete, …). */
  actions?: ReactNode
  className?: string
}

export function ListRow({
  href,
  thumbnail,
  title,
  meta,
  accent,
  actions,
  className,
}: ListRowProps) {
  const heading =
    href !== undefined ? (
      <Link href={href} className="hover:underline">
        {title}
      </Link>
    ) : (
      title
    )

  return (
    <li className={cn('flex items-center gap-3 py-3', className)}>
      <ProductThumb
        src={thumbnail}
        className="bg-muted size-12 shrink-0 rounded-md border object-cover"
      />

      <div className="min-w-0 flex-1">
        <p className="text-foreground truncate text-sm font-medium">{heading}</p>
        {meta && <p className="text-muted-foreground truncate text-xs">{meta}</p>}
        {accent && <p className="text-destructive truncate text-xs">{accent}</p>}
      </div>

      {actions && <div className="flex shrink-0 items-center gap-1">{actions}</div>}
    </li>
  )
}
