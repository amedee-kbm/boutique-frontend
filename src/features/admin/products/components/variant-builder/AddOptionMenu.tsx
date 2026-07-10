'use client'

import { useState } from 'react'
import { Plus, PlusCircle, Search } from 'lucide-react'

import { Button } from '@/shared/ui'
import { Input } from '@/shared/ui'
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui'
import { cn } from '@/shared/lib/utils'
import type { VariantPresetType } from '../../consts/variant-presets'

// The entry point for adding an option. Empty state shows a full-width prompt;
// once options exist it shrinks to an "Add another option" row. Opens a search
// over the recommended preset types, with an escape hatch to a custom option.
export function AddOptionMenu({
  available,
  hasOptions,
  onAddPreset,
  onAddCustom,
}: {
  available: VariantPresetType[]
  hasOptions: boolean
  onAddPreset: (name: string) => void
  onAddCustom: (name: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [customMode, setCustomMode] = useState(false)
  const [customName, setCustomName] = useState('')

  const filtered = available.filter((t) =>
    t.name.toLowerCase().includes(query.trim().toLowerCase())
  )

  function reset() {
    setQuery('')
    setCustomMode(false)
    setCustomName('')
  }

  function pickPreset(name: string) {
    onAddPreset(name)
    setOpen(false)
    reset()
  }

  function submitCustom() {
    const name = customName.trim()
    if (!name) return
    onAddCustom(name)
    setOpen(false)
    reset()
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) reset()
      }}
    >
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant={hasOptions ? 'ghost' : 'outline'}
            className={cn(
              'w-full justify-start gap-2 font-medium',
              hasOptions ? 'h-auto rounded-none px-3 py-3' : 'h-11'
            )}
          >
            <PlusCircle className="size-4" />
            {hasOptions ? 'Add another option' : 'Add options like size or colour'}
          </Button>
        }
      />
      <PopoverContent align="start" className="w-72 p-0">
        {customMode ? (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              submitCustom()
            }}
            className="space-y-2.5 p-3"
          >
            <p className="text-muted-foreground text-xs font-medium">Option name</p>
            <Input
              autoFocus
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="e.g. Style"
              aria-label="New option name"
              className="h-9"
            />
            <div className="flex items-center justify-between">
              <Button type="button" variant="ghost" size="sm" onClick={() => setCustomMode(false)}>
                Back
              </Button>
              <Button type="submit" size="sm" aria-label="Add group">
                Add
              </Button>
            </div>
          </form>
        ) : (
          <>
            <div className="flex items-center gap-2 border-b px-3 py-2">
              <Search className="text-muted-foreground size-4 shrink-0" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search"
                aria-label="Search option types"
                className="placeholder:text-muted-foreground w-full bg-transparent text-sm outline-none"
              />
            </div>
            <div className="max-h-64 overflow-y-auto p-1">
              {filtered.length > 0 ? (
                <>
                  <p className="text-muted-foreground px-2 py-1 text-xs font-medium">Recommended</p>
                  {filtered.map((type) => (
                    <button
                      key={type.name}
                      type="button"
                      onClick={() => pickPreset(type.name)}
                      className="hover:bg-accent flex min-h-11 w-full items-center rounded-md px-2 text-left text-sm"
                    >
                      {type.name}
                    </button>
                  ))}
                </>
              ) : (
                <p className="text-muted-foreground px-2 py-2 text-sm">No matching types</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => {
                setCustomName(query.trim())
                setCustomMode(true)
              }}
              className="hover:bg-accent flex w-full items-center gap-2 border-t px-3 py-2.5 text-sm"
            >
              <Plus className="size-4" />
              Create custom option
            </button>
          </>
        )}
      </PopoverContent>
    </Popover>
  )
}
