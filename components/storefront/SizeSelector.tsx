'use client'

import { cn } from '@/lib/utils'

export function SizeSelector({
  sizes,
  selected,
  onSelect,
}: {
  sizes: string[]
  selected: string | null
  onSelect: (size: string) => void
}) {
  if (sizes.length === 0) return null

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium tracking-wide uppercase">Size</p>
      <div className="flex flex-wrap gap-2">
        {sizes.map((size) => {
          const active = selected === size
          return (
            <button
              key={size}
              type="button"
              aria-pressed={active}
              onClick={() => onSelect(size)}
              className={cn(
                'min-w-11 border px-3 py-2 text-sm',
                active ? 'border-foreground bg-foreground text-background' : 'border-foreground/20'
              )}
            >
              {size}
            </button>
          )
        })}
      </div>
    </div>
  )
}
