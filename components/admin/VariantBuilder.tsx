'use client'

import type { ReactNode } from 'react'
import { useState } from 'react'
import { Plus, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { VARIANT_PRESET_TYPES, isPresetGroup } from '@/lib/variant-presets'

export interface BuilderOption {
  id: string
  value: string
}

export interface BuilderGroup {
  id: string
  name: string
  options: BuilderOption[]
}

interface VariantBuilderProps {
  groups: BuilderGroup[]
  onToggleOption: (groupName: string, value: string, selected: boolean) => void
  onAddCustomGroup: (name: string) => void
  onRemoveGroup: (groupId: string) => void
  onAddCustomOption: (groupId: string, value: string) => void
  onRemoveOption: (groupId: string, optionId: string) => void
  // Edit-mode only: renders a per-option control (e.g. a colour swatch image picker).
  renderOptionTrailing?: (groupId: string, option: BuilderOption) => ReactNode
}

function OptionChip({
  label,
  selected,
  onToggle,
}: {
  label: string
  selected: boolean
  onToggle: () => void
}) {
  return (
    <Button
      type="button"
      size="sm"
      variant={selected ? 'default' : 'outline'}
      aria-pressed={selected}
      className={'rounded-full' /* unslop-ignore: pill chips matching the P7 segmented control */}
      onClick={onToggle}
    >
      {label}
    </Button>
  )
}

function CustomOptionInput({ onAdd }: { onAdd: (value: string) => void }) {
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
        placeholder="Add an option (e.g. M)"
        className="h-7"
      />
      <Button type="submit" size="icon-sm" variant="outline" aria-label="Add option">
        <Plus className="size-4" />
      </Button>
    </form>
  )
}

export function VariantBuilder({
  groups,
  onToggleOption,
  onAddCustomGroup,
  onRemoveGroup,
  onAddCustomOption,
  onRemoveOption,
  renderOptionTrailing,
}: VariantBuilderProps) {
  const [newGroup, setNewGroup] = useState('')

  const customGroups = groups.filter((g) => !isPresetGroup(g.name))

  function addCustomGroup() {
    const name = newGroup.trim()
    if (!name) return
    onAddCustomGroup(name)
    setNewGroup('')
  }

  return (
    <div className="space-y-6">
      {VARIANT_PRESET_TYPES.map((type) => {
        const group = groups.find((g) => g.name === type.name)
        const isSelected = (value: string) => Boolean(group?.options.some((o) => o.value === value))
        const swatchOptions =
          type.supportsImages && renderOptionTrailing ? (group?.options ?? []) : []

        return (
          <section key={type.name} className="space-y-2.5">
            <div>
              <h3 className="text-sm font-medium">{type.name}</h3>
              {type.helper && <p className="text-muted-foreground text-xs">{type.helper}</p>}
            </div>

            {type.sections.map((section, index) => (
              <div key={section.label ?? index} className="space-y-1.5">
                {section.label && (
                  <p className="text-muted-foreground text-xs font-medium">{section.label}</p>
                )}
                <div className="flex flex-wrap gap-2">
                  {section.options.map((value) => (
                    <OptionChip
                      key={value}
                      label={value}
                      selected={isSelected(value)}
                      onToggle={() => onToggleOption(type.name, value, !isSelected(value))}
                    />
                  ))}
                </div>
              </div>
            ))}

            {swatchOptions.length > 0 && group && (
              <ul className="divide-y rounded-lg border">
                {swatchOptions.map((option) => (
                  <li key={option.id} className="flex items-center gap-3 px-3 py-2">
                    {renderOptionTrailing!(group.id, option)}
                    <span className="flex-1 text-sm">{option.value}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )
      })}

      <section className="space-y-2.5">
        <h3 className="text-sm font-medium">Other options</h3>

        {customGroups.map((group) => (
          <div key={group.id} className="space-y-2 rounded-lg border p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{group.name}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => onRemoveGroup(group.id)}
                aria-label={`Delete ${group.name} group`}
              >
                <X className="text-destructive size-4" />
              </Button>
            </div>

            {group.options.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {group.options.map((option) => (
                  <Badge key={option.id} variant="secondary" className="gap-1 pr-1">
                    {option.value}
                    <button
                      type="button"
                      onClick={() => onRemoveOption(group.id, option.id)}
                      aria-label={`Remove ${option.value}`}
                      className="hover:bg-muted-foreground/20 rounded-full p-0.5"
                    >
                      <X className="size-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}

            <CustomOptionInput onAdd={(value) => onAddCustomOption(group.id, value)} />
          </div>
        ))}

        <form
          onSubmit={(e) => {
            e.preventDefault()
            addCustomGroup()
          }}
          className={cn('flex items-center gap-2', customGroups.length > 0 && 'pt-1')}
        >
          <Input
            value={newGroup}
            onChange={(e) => setNewGroup(e.target.value)}
            placeholder="New type (e.g. Style)"
          />
          <Button type="submit" variant="outline" size="sm" aria-label="Add group">
            <Plus className="size-4" />
            Type
          </Button>
        </form>
      </section>
    </div>
  )
}
