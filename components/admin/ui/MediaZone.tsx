'use client'

import { useEffect, useRef, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { ImagePlus } from 'lucide-react'

import { cn } from '@/lib/utils'
import { SortableImageGrid } from '@/components/admin/ui/SortableImageGrid'

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
        <SortableImageGrid images={images} onReorder={commit} onRemove={handleRemove} />
      )}

      {images.length > 0 && (
        <p className="text-muted-foreground text-xs">
          The first photo is the main image. Drag to reorder.
        </p>
      )}
    </div>
  )
}
