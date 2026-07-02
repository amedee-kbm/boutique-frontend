'use client'

import { cn } from '@/shared/lib/utils'

export interface StripColour {
  optionId: string
  value: string
  hex: string | null
}

// Sticky colour strip + name that auto-updates as the gallery scrolls (scroll
// spy); tapping a swatch jumps to that colour's photos.
export function ColorStrip({
  colours,
  activeId,
  onJump,
  sticky = true,
}: {
  colours: StripColour[]
  activeId: string | null
  onJump: (optionId: string) => void
  sticky?: boolean
}) {
  if (colours.length === 0) return null

  const activeName = colours.find((c) => c.optionId === activeId)?.value ?? colours[0]?.value

  return (
    <div className={cn(sticky && 'bg-background/90 sticky top-14 z-30 border-b backdrop-blur')}>
      <div className={cn('flex items-center gap-3', sticky && 'px-4 py-2.5')}>
        <div className="flex [scrollbar-width:none] items-center gap-3 overflow-x-auto">
          {colours.map((colour) => {
            const active = colour.optionId === activeId
            return (
              <button
                key={colour.optionId}
                type="button"
                aria-label={colour.value}
                aria-pressed={active}
                onClick={() => onJump(colour.optionId)}
                className={cn(
                  'size-6 shrink-0',
                  active
                    ? 'ring-foreground ring-1 ring-offset-2'
                    : 'ring-1 ring-black/15 ring-inset'
                )}
                style={{ backgroundColor: colour.hex ?? 'transparent' }}
              />
            )
          })}
        </div>
        <span className="text-xs tracking-[0.12em] uppercase">{activeName}</span>
      </div>
    </div>
  )
}
