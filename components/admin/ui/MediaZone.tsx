'use client'

import { useEffect, useRef, useState } from 'react'
import { useDropzone } from 'react-dropzone'
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
import { GripVertical, ImagePlus, X } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface StagedImage {
  id: string
  file: File
  url: string
}

function SortableThumb({ image, onRemove }: { image: StagedImage; onRemove: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: image.id,
  })

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        'group bg-muted relative aspect-square overflow-hidden rounded-lg border',
        isDragging && 'ring-ring z-10 opacity-80 ring-2'
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={image.url} alt="" className="size-full object-cover" />

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
  )
}

export function MediaZone({ onChange }: { onChange?: (files: File[]) => void }) {
  const [images, setImages] = useState<StagedImage[]>([])
  // Mirrors `images` so the unmount cleanup can revoke the current object URLs
  // without a stale closure. Every mutation must go through `commit`, never
  // `setImages` directly, or the ref desyncs and URLs leak.
  const imagesRef = useRef<StagedImage[]>([])

  function commit(next: StagedImage[]) {
    imagesRef.current = next
    setImages(next)
    onChange?.(next.map((img) => img.file))
  }

  useEffect(() => {
    return () => imagesRef.current.forEach((img) => URL.revokeObjectURL(img.url))
  }, [])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } })
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'image/*': [] },
    onDrop: (accepted) => {
      const added = accepted.map((file) => ({
        id: `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2)}`,
        file,
        url: URL.createObjectURL(file),
      }))
      commit([...images, ...added])
    },
  })

  function handleRemove(id: string) {
    const target = images.find((img) => img.id === id)
    if (target) URL.revokeObjectURL(target.url)
    commit(images.filter((img) => img.id !== id))
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = images.findIndex((img) => img.id === active.id)
    const newIndex = images.findIndex((img) => img.id === over.id)
    commit(arrayMove(images, oldIndex, newIndex))
  }

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 text-center transition-colors',
          isDragActive ? 'border-ring bg-muted/50' : 'border-input hover:bg-muted/30'
        )}
      >
        <input {...getInputProps()} />
        <ImagePlus className="text-muted-foreground size-6" />
        <p className="text-sm font-medium">
          {isDragActive ? 'Drop the photos here' : 'Add images'}
        </p>
        <p className="text-muted-foreground text-xs">PNG or JPG, multiple allowed</p>
      </div>

      {images.length > 0 && (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={images.map((img) => img.id)} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
              {images.map((image) => (
                <SortableThumb
                  key={image.id}
                  image={image}
                  onRemove={() => handleRemove(image.id)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {images.length > 0 && (
        <p className="text-muted-foreground text-xs">
          The first photo is the main image. Drag to reorder.
        </p>
      )}
    </div>
  )
}
