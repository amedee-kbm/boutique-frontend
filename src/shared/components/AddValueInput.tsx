'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'

import { cn } from '@/shared/lib/utils'
import { Button, Input } from '@/shared/ui'

// Inline "type a value, press + (or Enter) to add it" form. Used for variant
// option values and category filter option values; the field trims and clears
// on submit.
export function AddValueInput({
  onAdd,
  placeholder,
  addLabel = 'Add value',
  inputClassName,
}: {
  onAdd: (value: string) => void
  placeholder: string
  addLabel?: string
  inputClassName?: string
}) {
  const [value, setValue] = useState('')

  function submit() {
    const trimmed = value.trim()
    if (!trimmed) return
    onAdd(trimmed)
    setValue('')
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
      className="flex items-center gap-2"
    >
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className={cn('h-9', inputClassName)}
      />
      <Button type="submit" size="icon-sm" variant="outline" aria-label={addLabel}>
        <Plus className="size-4" />
      </Button>
    </form>
  )
}
