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

export interface SortableImage {
  id: string
  url: string
  alt?: string | null
}

function SortableCard({
  image,
  featured,
  onRemove,
  overlay,
}: {
  image: SortableImage
  featured: boolean
  onRemove: () => void
  overlay?: ReactNode
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: image.id,
  })

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        'group bg-muted relative aspect-square overflow-hidden rounded-xl border',
        featured && 'col-span-2 row-span-2',
        isDragging && 'ring-ring z-10 opacity-80 ring-2'
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={image.url} alt={image.alt ?? ''} className="size-full object-cover" />

      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label="Drag to reorder"
        className="bg-background/80 text-foreground absolute top-1.5 left-1.5 flex size-7 touch-none items-center justify-center rounded-md backdrop-blur-sm"
      >
        <GripVertical className="size-4" />
      </button>

      <button
        type="button"
        onClick={onRemove}
        aria-label="Remove image"
        className="bg-background/80 text-foreground hover:bg-destructive hover:text-destructive-foreground absolute top-1.5 right-1.5 flex size-7 items-center justify-center rounded-md backdrop-blur-sm transition-colors"
      >
        <X className="size-4" />
      </button>

      {featured && (
        <span className="bg-background/80 text-foreground absolute bottom-1.5 left-1.5 rounded-md px-2 py-0.5 text-xs font-medium backdrop-blur-sm">
          Main
        </span>
      )}

      {overlay && <div className="absolute right-1.5 bottom-1.5">{overlay}</div>}
    </div>
  )
}

export function SortableImageGrid<T extends SortableImage>({
  images,
  onReorder,
  onRemove,
  renderOverlay,
  addTile,
}: {
  images: T[]
  onReorder: (images: T[]) => void
  onRemove: (id: string) => void
  renderOverlay?: (image: T) => ReactNode
  addTile?: ReactNode
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
        <div className="grid auto-rows-fr grid-cols-3 gap-2.5 sm:grid-cols-4">
          {images.map((image, index) => (
            <SortableCard
              key={image.id}
              image={image}
              featured={index === 0}
              onRemove={() => onRemove(image.id)}
              overlay={renderOverlay?.(image)}
            />
          ))}
          {addTile}
        </div>
      </SortableContext>
    </DndContext>
  )
}
