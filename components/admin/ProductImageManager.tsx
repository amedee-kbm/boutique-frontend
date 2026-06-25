'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useDropzone } from 'react-dropzone'
import { ImagePlus, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import {
  deleteProductImage,
  reorderProductImages,
  updateProductImageAlt,
  uploadProductImage,
} from '@/lib/actions/products'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { SortableImageGrid } from '@/components/admin/ui/SortableImageGrid'

interface ProductImage {
  id: string
  url: string
  alt: string | null
}

export function ProductImageManager({
  productId,
  initialImages,
}: {
  productId: string
  initialImages: ProductImage[]
}) {
  const router = useRouter()
  // Seeded from server props; the parent remounts this component (via key) after
  // router.refresh() so temp ids are replaced with real ones.
  const [images, setImages] = useState(initialImages)
  const [isUploading, startUpload] = useTransition()

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'image/*': [] },
    onDrop: (accepted) => {
      startUpload(async () => {
        for (const file of accepted) {
          const formData = new FormData()
          formData.set('file', file)
          const result = await uploadProductImage(productId, formData)
          if (result.error || !result.url) {
            toast.error(result.error ?? 'Upload failed')
            continue
          }
          // Optimistic: id unknown until refresh, use url as temp key replaced on reload
          setImages((prev) => [...prev, { id: `temp-${result.url}`, url: result.url!, alt: null }])
        }
        toast.success('Images uploaded')
        router.refresh()
      })
    },
  })

  function handleDelete(id: string) {
    const previous = images
    setImages((prev) => prev.filter((img) => img.id !== id))
    startUpload(async () => {
      if (id.startsWith('temp-')) return
      const result = await deleteProductImage(id)
      if (result.error) {
        toast.error(result.error)
        setImages(previous)
      }
    })
  }

  function handleAltSave(id: string, alt: string) {
    setImages((prev) =>
      prev.map((img) => (img.id === id ? { ...img, alt: alt.trim() || null } : img))
    )
    startUpload(async () => {
      const result = await updateProductImageAlt(id, alt)
      if (result.error) toast.error(result.error)
    })
  }

  function handleReorder(reordered: ProductImage[]) {
    setImages(reordered)

    const persistableIds = reordered
      .filter((img) => !img.id.startsWith('temp-'))
      .map((img) => img.id)
    if (persistableIds.length === reordered.length) {
      startUpload(async () => {
        await reorderProductImages(persistableIds)
      })
    }
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
        {isUploading ? (
          <Loader2 className="text-muted-foreground size-6 animate-spin" />
        ) : (
          <ImagePlus className="text-muted-foreground size-6" />
        )}
        <p className="text-sm font-medium">
          {isDragActive ? 'Drop the photos here' : 'Drag photos here, or tap to choose'}
        </p>
        <p className="text-muted-foreground text-xs">PNG or JPG, multiple allowed</p>
      </div>

      {images.length > 0 && (
        <SortableImageGrid
          images={images}
          onReorder={handleReorder}
          onRemove={handleDelete}
          renderFooter={(image) => {
            const isTemp = image.id.startsWith('temp-')
            return (
              <Input
                defaultValue={image.alt ?? ''}
                disabled={isTemp}
                placeholder="Alt text (optional)"
                aria-label="Image alt text"
                className="h-7 text-xs"
                onBlur={(e) => {
                  if (isTemp) return
                  if (e.target.value.trim() !== (image.alt ?? ''))
                    handleAltSave(image.id, e.target.value)
                }}
              />
            )
          }}
        />
      )}

      {images.length > 0 && (
        <p className="text-muted-foreground text-xs">
          The first image is the main photo. Drag to reorder.
        </p>
      )}
    </div>
  )
}
