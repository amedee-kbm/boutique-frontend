'use client'

import type { ReactNode } from 'react'

import { Button } from '@/components/ui/button'

interface EditorHeaderProps {
  title?: ReactNode
  /** Overrides `title` for the centre slot — e.g. a status selector. */
  center?: ReactNode
  cancelLabel?: string
  onCancel?: () => void
  saveLabel?: string
  saving?: boolean
  saveDisabled?: boolean
  /** Submit the enclosing form by default; pass `'button'` + `onSave` for standalone use. */
  saveType?: 'submit' | 'button'
  onSave?: () => void
}

export function EditorHeader({
  title,
  center,
  cancelLabel = 'Cancel',
  onCancel,
  saveLabel = 'Save',
  saving = false,
  saveDisabled = false,
  saveType = 'submit',
  onSave,
}: EditorHeaderProps) {
  return (
    <header className="bg-background sticky top-0 z-20 -mx-4 grid grid-cols-[1fr_auto_1fr] items-center gap-2 border-b px-4 py-2.5">
      <div className="justify-self-start">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          {cancelLabel}
        </Button>
      </div>

      <div className="text-foreground justify-self-center text-sm font-medium">
        {center ?? title}
      </div>

      <div className="justify-self-end">
        <Button type={saveType} size="sm" onClick={onSave} disabled={saving || saveDisabled}>
          {saving ? 'Saving…' : saveLabel}
        </Button>
      </div>
    </header>
  )
}
