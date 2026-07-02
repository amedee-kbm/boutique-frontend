'use client'

import type { ReactNode } from 'react'
import { ChevronRight, Plus } from 'lucide-react'

import { cn } from '@/shared/lib/utils'

interface FieldRowProps {
  label: string
  /** Current value; when empty the row renders as an "add" affordance. */
  value?: ReactNode
  /** Leading icon when a value is present. Defaults to none. */
  icon?: ReactNode
  /** Text shown when there is no value, e.g. "Add description". */
  emptyLabel?: string
  onClick?: () => void
}

export function FieldRow({ label, value, icon, emptyLabel, onClick }: FieldRowProps) {
  const filled = value !== undefined && value !== null && value !== ''

  return (
    <button
      type="button"
      onClick={onClick}
      className="hover:bg-muted/40 flex min-h-11 w-full items-center gap-3 rounded-lg px-1 py-2 text-left transition-colors"
    >
      <span className="text-muted-foreground flex size-5 shrink-0 items-center justify-center">
        {filled ? icon : <Plus className="size-5" />}
      </span>

      <span className="min-w-0 flex-1">
        {filled ? (
          <>
            <span className="text-muted-foreground block text-xs">{label}</span>
            <span className="text-foreground block truncate text-sm">{value}</span>
          </>
        ) : (
          <span className="text-muted-foreground text-sm">{emptyLabel ?? `Add ${label}`}</span>
        )}
      </span>

      <ChevronRight className={cn('text-muted-foreground size-4 shrink-0')} />
    </button>
  )
}
