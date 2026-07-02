'use client'

import { useEffect, useRef, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { ImagePlus, Plus } from 'lucide-react'

import { cn } from '@/shared/lib/utils'
import { SortableImageGrid } from '@/shared/components/admin/ui/SortableImageGrid'

interface StagedImage {
  id: string
  file: File
  url: string
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

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'image/*': [] },
    onDrop: (accepted) => {
      const added = accepted.map((file) => ({
        id: `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2)}`,
        file,
        url: URL.createObjectURL(file),
      }))
      // Read the ref, not the render-closure `images`, so two rapid drops
      // before a re-render don't drop the first batch.
      commit([...imagesRef.current, ...added])
    },
  })

  function handleRemove(id: string) {
    const target = images.find((img) => img.id === id)
    if (target) URL.revokeObjectURL(target.url)
    commit(images.filter((img) => img.id !== id))
  }

  if (images.length === 0) {
    return (
      <div
        {...getRootProps()}
        className={cn(
          'flex aspect-[3/2] cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed text-center transition-colors',
          isDragActive ? 'border-ring bg-muted/50' : 'border-input hover:bg-muted/30'
        )}
      >
        <input {...getInputProps()} />
        <ImagePlus className="text-muted-foreground size-6" />
        <p className="text-sm font-medium">
          {isDragActive ? 'Drop the photos here' : 'Add images'}
        </p>
        <p className="text-muted-foreground text-xs">
          PNG or JPG · the first photo is the main one
        </p>
      </div>
    )
  }

  const addTile = (
    <div
      {...getRootProps()}
      className={cn(
        'flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed text-center transition-colors',
        isDragActive ? 'border-ring bg-muted/50' : 'border-input hover:bg-muted/30'
      )}
    >
      <input {...getInputProps()} />
      <Plus className="text-muted-foreground size-5" />
      <span className="text-muted-foreground text-xs">Add</span>
    </div>
  )

  return (
    <SortableImageGrid
      images={images}
      onReorder={commit}
      onRemove={handleRemove}
      addTile={addTile}
    />
  )
}
