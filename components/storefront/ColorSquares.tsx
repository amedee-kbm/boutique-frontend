import { cn } from '@/lib/utils'

// Small solid colour indicators (NOT photo thumbnails, not clickable). Light
// swatches get a faint inset ring so white doesn't vanish on a white card.
export function ColorSquares({ hexes, className }: { hexes: string[]; className?: string }) {
  if (hexes.length === 0) return null
  const shown = hexes.slice(0, 5)
  const extra = hexes.length - shown.length

  return (
    <div className={cn('flex items-center gap-1', className)} aria-hidden>
      {shown.map((hex, i) => (
        <span
          key={`${hex}-${i}`}
          className="size-2.5 ring-black/10 ring-inset"
          style={{ backgroundColor: hex, boxShadow: 'inset 0 0 0 1px rgb(0 0 0 / 0.08)' }}
        />
      ))}
      {extra > 0 && <span className="text-muted-foreground text-[10px]">+{extra}</span>}
    </div>
  )
}
