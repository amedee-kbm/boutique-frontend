'use client'

import { useState } from 'react'
import { Plus, X } from 'lucide-react'

import { Button } from '@/shared/ui'
import { Input } from '@/shared/ui'
import { Badge } from '@/shared/ui'
import { Checkbox } from '@/shared/ui'
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui'
import { defaultHexForName, type VariantPresetSection } from '../../consts/variant-presets'
import type { BuilderOption } from './types'

// Token field that opens a checkbox checklist of preset values, mirroring
// Shopify's option editor: tick as many presets as apply, then add any
// one-off value through the entry box at the bottom. Selected values show as
// removable chips inside the field.
export function PresetValuePicker({
  name,
  sections,
  selected,
  showSwatch,
  onAdd,
  onRemove,
}: {
  name: string
  sections: VariantPresetSection[]
  selected: BuilderOption[]
  showSwatch?: boolean
  onAdd: (value: string) => void
  onRemove: (option: BuilderOption) => void
}) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const selectedValues = new Set(selected.map((o) => o.value))
  const lower = name.toLowerCase()

  function addCustom() {
    const trimmed = draft.trim()
    if (!trimmed) return
    if (!selectedValues.has(trimmed)) onAdd(trimmed)
    setDraft('')
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <div
            role="button"
            tabIndex={0}
            aria-label={`${name} values`}
            className="border-input focus-within:border-ring focus-within:ring-ring/50 flex min-h-9 w-full cursor-pointer flex-wrap items-center gap-1 rounded-md border px-2 py-1.5 text-sm transition-[color,box-shadow] focus-within:ring-[3px]"
          >
            {selected.map((option) => (
              <Badge key={option.id} variant="secondary" className="gap-1 pr-1">
                {showSwatch && (
                  <span
                    aria-hidden
                    className="size-3 shrink-0 rounded-full border"
                    style={{ backgroundColor: defaultHexForName(option.value) }}
                  />
                )}
                {option.value}
                <button
                  type="button"
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation()
                    onRemove(option)
                  }}
                  aria-label={`Remove ${option.value}`}
                  className="hover:bg-muted-foreground/20 rounded-full p-0.5"
                >
                  <X className="size-3" />
                </button>
              </Badge>
            ))}
            {selected.length === 0 && (
              <span className="text-muted-foreground px-1 py-0.5">Add {lower}</span>
            )}
          </div>
        }
      />
      <PopoverContent className="min-w-60 p-0">
        <div className="max-h-64 overflow-y-auto p-1">
          {sections.map((section, index) => (
            <div key={section.label ?? index} className="py-0.5">
              {section.label && (
                <p className="text-muted-foreground px-2 py-1 text-xs font-medium">
                  {section.label}
                </p>
              )}
              {section.options.map((value) => {
                const checked = selectedValues.has(value)
                return (
                  <label
                    key={value}
                    className="hover:bg-accent flex min-h-11 cursor-pointer items-center gap-2.5 rounded-md px-2"
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(next) => {
                        if (next) {
                          onAdd(value)
                        } else {
                          const option = selected.find((o) => o.value === value)
                          if (option) onRemove(option)
                        }
                      }}
                    />
                    {showSwatch && (
                      <span
                        aria-hidden
                        className="size-4 shrink-0 rounded-full border"
                        style={{ backgroundColor: defaultHexForName(value) }}
                      />
                    )}
                    <span className="text-sm">{value}</span>
                  </label>
                )
              })}
            </div>
          ))}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            addCustom()
          }}
          className="flex items-center gap-2 border-t p-2"
        >
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={`Add ${lower}`}
            className="h-8"
          />
          <Button type="submit" size="icon-sm" variant="outline" aria-label={`Add ${lower} value`}>
            <Plus className="size-4" />
          </Button>
        </form>
      </PopoverContent>
    </Popover>
  )
}
