'use client'

import { ImagePlus, Loader2, Plus } from 'lucide-react'
import type { DropzoneState } from 'react-dropzone'

import { cn } from '@/shared/lib/utils'

// The dashed dropzone card shared by the admin media editors. `empty` is the
// full-size "Add images" card shown when there are no photos yet; `tile` is the
// compact "Add" square that sits in the sortable grid. The caller owns the
// useDropzone (its onDrop differs: stage-locally vs upload-now) and passes the
// bindings in.
export function AddImageDropzone({
  variant,
  busy,
  getRootProps,
  getInputProps,
  isDragActive,
}: {
  variant: 'empty' | 'tile'
  busy?: boolean
  getRootProps: DropzoneState['getRootProps']
  getInputProps: DropzoneState['getInputProps']
  isDragActive: boolean
}) {
  const dashed = isDragActive ? 'border-ring bg-muted/50' : 'border-input hover:bg-muted/30'

  if (variant === 'tile') {
    return (
      <div
        {...getRootProps()}
        className={cn(
          'flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed text-center transition-colors',
          dashed
        )}
      >
        <input {...getInputProps()} />
        {busy ? (
          <Loader2 className="text-muted-foreground size-5 animate-spin" />
        ) : (
          <Plus className="text-muted-foreground size-5" />
        )}
        <span className="text-muted-foreground text-xs">Add</span>
      </div>
    )
  }

  return (
    <div
      {...getRootProps()}
      className={cn(
        'flex aspect-[3/2] cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed text-center transition-colors',
        dashed
      )}
    >
      <input {...getInputProps()} />
      {busy ? (
        <Loader2 className="text-muted-foreground size-6 animate-spin" />
      ) : (
        <ImagePlus className="text-muted-foreground size-6" />
      )}
      <p className="text-sm font-medium">{isDragActive ? 'Drop the photos here' : 'Add images'}</p>
      <p className="text-muted-foreground text-xs">PNG or JPG · the first photo is the main one</p>
    </div>
  )
}
