'use client'

import type { ReactNode } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical } from 'lucide-react'

import { cn } from '@/shared/lib/utils'

// Wraps an option in a drag handle so the seller can reorder how the options
// appear. Draft presets pass their name as the id; reorders that touch a draft
// are filtered out before persisting, since a draft has no group row yet.
export function SortableOption({ id, children }: { id: string; children: ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  })
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn('bg-background flex items-start', isDragging && 'relative z-10 opacity-80')}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label="Drag to reorder"
        className="text-muted-foreground hover:text-foreground flex h-11 w-9 shrink-0 cursor-grab touch-none items-center justify-center"
      >
        <GripVertical className="size-4" />
      </button>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}
