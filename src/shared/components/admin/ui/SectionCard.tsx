'use client'

import type { ReactNode } from 'react'

import { Card, CardContent } from '@/shared/ui'
import { cn } from '@/shared/lib/utils'

interface SectionCardProps {
  label?: string
  action?: ReactNode
  className?: string
  children: ReactNode
}

export function SectionCard({ label, action, className, children }: SectionCardProps) {
  return (
    <section className="space-y-2">
      {(label || action) && (
        <div className="flex items-center justify-between px-1">
          {label && <h2 className="text-foreground text-sm font-medium">{label}</h2>}
          {action}
        </div>
      )}
      <Card className={cn('h-fit', className)}>
        <CardContent className="p-4">{children}</CardContent>
      </Card>
    </section>
  )
}
