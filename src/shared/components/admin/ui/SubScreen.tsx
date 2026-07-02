'use client'

import type { ReactNode } from 'react'

import { Sheet, SheetClose, SheetContent, SheetTrigger } from '@/shared/ui'
import { Button } from '@/shared/ui'
import { XIcon } from 'lucide-react'

interface SubScreenProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  trigger?: ReactNode
  title: string
  subtitle?: string
  /**
   * Optional explicit commit action. Omit for single-field editors that commit
   * live to the parent editor — the ✕ then just closes the panel, with no
   * redundant "Done" button (the parent's header Save is the real persist).
   */
  saveLabel?: string
  onSave?: () => void
  children: ReactNode
}

export function SubScreen({
  open,
  onOpenChange,
  trigger,
  title,
  subtitle,
  saveLabel = 'Done',
  onSave,
  children,
}: SubScreenProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      {trigger && <SheetTrigger render={trigger as React.ReactElement} />}
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className={
          'gap-0 p-0 data-[side=bottom]:h-[92dvh] ' +
          // Desktop: a full-height bottom sheet for one focused field is wrong —
          // render as a centered, constrained modal instead (md+).
          'md:data-[side=bottom]:inset-x-auto md:data-[side=bottom]:top-1/2 md:data-[side=bottom]:bottom-auto md:data-[side=bottom]:left-1/2 md:data-[side=bottom]:h-auto md:data-[side=bottom]:max-h-[80dvh] md:data-[side=bottom]:w-[min(28rem,calc(100vw-2rem))] md:data-[side=bottom]:-translate-x-1/2 md:data-[side=bottom]:-translate-y-1/2 md:data-[side=bottom]:rounded-2xl md:data-[side=bottom]:border ' +
          'md:data-[side=bottom]:data-ending-style:-translate-y-1/2 md:data-[side=bottom]:data-starting-style:-translate-y-1/2'
        }
      >
        <header className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 border-b px-3 py-2.5">
          <div className="justify-self-start">
            <SheetClose
              render={
                <Button type="button" variant="ghost" size="icon-sm" aria-label="Close">
                  <XIcon />
                </Button>
              }
            />
          </div>
          <div className="justify-self-center text-center">
            <p className="text-foreground text-sm font-medium">{title}</p>
            {subtitle && <p className="text-muted-foreground text-xs">{subtitle}</p>}
          </div>
          <div className="justify-self-end">
            {onSave && (
              <SheetClose
                render={
                  <Button type="button" size="sm" onClick={onSave}>
                    {saveLabel}
                  </Button>
                }
              />
            )}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4">{children}</div>
      </SheetContent>
    </Sheet>
  )
}
