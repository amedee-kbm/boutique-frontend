'use client'

import type { ReactNode } from 'react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { SortableContext, arrayMove, rectSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, X } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

export interface SortableImage {
  id: string
  url: string
  alt?: string | null
}

function SortableCard({
  image,
  onRemove,
  children,
}: {
  image: SortableImage
  onRemove: () => void
  children?: ReactNode
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: image.id,
  })

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn('space-y-1', isDragging && 'z-10 opacity-80')}
    >
      <div
        className={cn(
          'group bg-muted relative aspect-square overflow-hidden rounded-lg border',
          isDragging && 'ring-ring ring-2'
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={image.url} alt={image.alt ?? ''} className="size-full object-cover" />

        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label="Drag to reorder"
          className="bg-background/80 text-foreground absolute top-1 left-1 flex size-7 touch-none items-center justify-center rounded-md opacity-0 transition-opacity group-hover:opacity-100"
        >
          <GripVertical className="size-4" />
        </button>

        <Button
          type="button"
          variant="destructive"
          size="icon-sm"
          onClick={onRemove}
          aria-label="Remove image"
          className="absolute top-1 right-1 opacity-0 transition-opacity group-hover:opacity-100"
        >
          <X className="size-4" />
        </Button>
      </div>

      {children}
    </div>
  )
}

export function SortableImageGrid<T extends SortableImage>({
  images,
  onReorder,
  onRemove,
  renderFooter,
}: {
  images: T[]
  onReorder: (images: T[]) => void
  onRemove: (id: string) => void
  renderFooter?: (image: T) => ReactNode
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } })
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = images.findIndex((img) => img.id === active.id)
    const newIndex = images.findIndex((img) => img.id === over.id)
    onReorder(arrayMove(images, oldIndex, newIndex))
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={images.map((img) => img.id)} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {images.map((image) => (
            <SortableCard key={image.id} image={image} onRemove={() => onRemove(image.id)}>
              {renderFooter?.(image)}
            </SortableCard>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}
