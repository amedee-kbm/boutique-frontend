'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useDropzone } from 'react-dropzone'
import { toast } from 'sonner'

import {
  deleteProductImage,
  reorderProductImages,
  setProductImageOption,
  uploadProductImage,
} from '@/features/admin/products'
import { AddImageDropzone } from '@/shared/components/AddImageDropzone'
import { SortableImageGrid } from '@/features/admin/ui'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/ui'

interface ProductImage {
  id: string
  url: string
  alt: string | null
  optionId: string | null
}

interface ColorOption {
  id: string
  value: string
  hex: string | null
}

export function ProductImageManager({
  productId,
  initialImages,
  colorOptions,
}: {
  productId: string
  initialImages: ProductImage[]
  colorOptions: ColorOption[]
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
          setImages((prev) => [
            ...prev,
            { id: `temp-${result.url}`, url: result.url!, alt: null, optionId: null },
          ])
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

  function handleSetOption(id: string, optionId: string | null) {
    const previous = images
    setImages((prev) => prev.map((img) => (img.id === id ? { ...img, optionId } : img)))
    startUpload(async () => {
      const result = await setProductImageOption(id, optionId)
      if (result.error) {
        toast.error(result.error)
        setImages(previous)
      }
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

  if (images.length === 0) {
    return (
      <AddImageDropzone
        variant="empty"
        busy={isUploading}
        getRootProps={getRootProps}
        getInputProps={getInputProps}
        isDragActive={isDragActive}
      />
    )
  }

  const addTile = (
    <AddImageDropzone
      variant="tile"
      busy={isUploading}
      getRootProps={getRootProps}
      getInputProps={getInputProps}
      isDragActive={isDragActive}
    />
  )

  return (
    <SortableImageGrid
      images={images}
      onReorder={handleReorder}
      onRemove={handleDelete}
      addTile={addTile}
      renderOverlay={
        colorOptions.length > 0
          ? (image) => {
              const isTemp = image.id.startsWith('temp-')
              const option = colorOptions.find((o) => o.id === image.optionId) ?? null
              return (
                <DropdownMenu>
                  <DropdownMenuTrigger
                    disabled={isTemp}
                    render={
                      <button
                        type="button"
                        aria-label="Assign colour"
                        className="bg-background/80 text-foreground flex h-7 max-w-[10rem] items-center gap-1.5 rounded-md px-2 text-xs backdrop-blur-sm disabled:opacity-50"
                      >
                        {option ? (
                          <>
                            <span
                              className="size-3 shrink-0 rounded-full border"
                              style={{ backgroundColor: option.hex ?? 'transparent' }}
                            />
                            <span className="truncate">{option.value}</span>
                          </>
                        ) : (
                          <>
                            <span className="size-3 shrink-0 rounded-full border border-dashed" />
                            <span className="text-muted-foreground">Colour</span>
                          </>
                        )}
                      </button>
                    }
                  />
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleSetOption(image.id, null)}>
                      No colour
                    </DropdownMenuItem>
                    {colorOptions.map((o) => (
                      <DropdownMenuItem key={o.id} onClick={() => handleSetOption(image.id, o.id)}>
                        <span
                          className="size-3 shrink-0 rounded-full border"
                          style={{ backgroundColor: o.hex ?? 'transparent' }}
                        />
                        {o.value}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )
            }
          : undefined
      }
    />
  )
}
