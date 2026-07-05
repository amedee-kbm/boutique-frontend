'use client'

import { useEffect, useRef, useState } from 'react'
import { useDropzone } from 'react-dropzone'

import { AddImageDropzone } from '@/shared/components/AddImageDropzone'
import { SortableImageGrid } from './SortableImageGrid'

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
      <AddImageDropzone
        variant="empty"
        getRootProps={getRootProps}
        getInputProps={getInputProps}
        isDragActive={isDragActive}
      />
    )
  }

  const addTile = (
    <AddImageDropzone
      variant="tile"
      getRootProps={getRootProps}
      getInputProps={getInputProps}
      isDragActive={isDragActive}
    />
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
