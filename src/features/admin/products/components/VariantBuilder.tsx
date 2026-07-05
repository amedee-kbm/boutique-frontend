'use client'

import type { ReactNode } from 'react'
import { useEffect, useRef, useState } from 'react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Database, GripVertical, Plus, PlusCircle, Search, X } from 'lucide-react'

import { Button } from '@/shared/ui'
import { Input } from '@/shared/ui'
import { Badge } from '@/shared/ui'
import { Checkbox } from '@/shared/ui'
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui'
import { AddValueInput } from '@/shared/components/AddValueInput'
import { cn } from '@/shared/lib/utils'
import {
  VARIANT_PRESET_TYPES,
  defaultHexForName,
  isPresetGroup,
  type VariantPresetSection,
  type VariantPresetType,
} from '../consts/variant-presets'

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
  onReorderGroups: (orderedGroupIds: string[]) => void
  // Edit-mode only: renders a per-option control (e.g. a colour swatch image picker).
  renderOptionTrailing?: (groupId: string, option: BuilderOption) => ReactNode
}

// Token field that opens a checkbox checklist of preset values, mirroring
// Shopify's option editor: tick as many presets as apply, then add any
// one-off value through the entry box at the bottom. Selected values show as
// removable chips inside the field.
function PresetValuePicker({
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

// Collapsed option row, mirroring Shopify's option summary once it holds values:
// name, the chosen values as chips, and a type marker pinned to the right.
// Tapping anywhere on the row re-opens the editor.
function CollapsedOption({
  name,
  values,
  isPreset,
  showSwatch,
  onExpand,
}: {
  name: string
  values: BuilderOption[]
  isPreset: boolean
  showSwatch?: boolean
  onExpand: () => void
}) {
  return (
    <button
      type="button"
      aria-expanded={false}
      onClick={onExpand}
      className="hover:bg-muted/40 flex w-full items-start gap-3 px-3 py-3 text-left transition-colors"
    >
      <span className="min-w-0 flex-1 space-y-2">
        <span className="text-sm font-medium">{name}</span>
        {values.length > 0 && (
          <span className="flex flex-wrap gap-1.5">
            {values.map((o) => (
              <span
                key={o.id}
                className="bg-secondary text-secondary-foreground inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs"
              >
                {showSwatch && (
                  <span
                    aria-hidden
                    className="size-3 shrink-0 rounded-[3px] border"
                    style={{ backgroundColor: defaultHexForName(o.value) }}
                  />
                )}
                {o.value}
              </span>
            ))}
          </span>
        )}
      </span>
      {isPreset && (
        <Database aria-hidden className="text-muted-foreground mt-0.5 size-4 shrink-0" />
      )}
    </button>
  )
}

// Wraps an option in a drag handle so the seller can reorder how the options
// appear. Draft presets pass their name as the id; reorders that touch a draft
// are filtered out before persisting, since a draft has no group row yet.
function SortableOption({ id, children }: { id: string; children: ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  })
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn('bg-background flex items-start', isDragging && 'relative z-10 opacity-80')}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label="Drag to reorder"
        className="text-muted-foreground hover:text-foreground flex h-11 w-9 shrink-0 cursor-grab touch-none items-center justify-center"
      >
        <GripVertical className="size-4" />
      </button>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}

// The entry point for adding an option. Empty state shows a full-width prompt;
// once options exist it shrinks to an "Add another option" row. Opens a search
// over the recommended preset types, with an escape hatch to a custom option.
function AddOptionMenu({
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

export function VariantBuilder({
  groups,
  onToggleOption,
  onAddCustomGroup,
  onRemoveGroup,
  onAddCustomOption,
  onRemoveOption,
  onReorderGroups,
  renderOptionTrailing,
}: VariantBuilderProps) {
  // Only one option is expanded at a time; the rest sit as collapsed summary
  // rows. A preset with no values yet is a "draft" the user has opened — tracked
  // here so it stays visible until they hit Done or Delete.
  const [editing, setEditing] = useState<string | null>(null)
  const [draftPresets, setDraftPresets] = useState<Set<string>>(new Set())

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } })
  )

  const customGroups = groups.filter((g) => !isPresetGroup(g.name))

  // Auto-open a custom option the moment its group lands in props (it is created
  // asynchronously in edit mode), without re-opening the ones present on mount.
  const seenCustomIds = useRef<Set<string> | null>(null)
  useEffect(() => {
    const ids = customGroups.map((g) => g.id)
    if (seenCustomIds.current === null) {
      seenCustomIds.current = new Set(ids)
      return
    }
    const created = ids.find((id) => !seenCustomIds.current!.has(id))
    if (created) setEditing(created)
    seenCustomIds.current = new Set(ids)
  }, [customGroups])

  // Persisted options follow the order of `groups` (sorted by position); draft
  // presets that have no group yet trail behind. Both render through the same
  // sortable wrapper, keyed by name for presets, so a draft becoming persisted
  // (its group is created) updates in place instead of remounting the editor.
  const persistedCards = groups.map((group) => ({
    key: isPresetGroup(group.name) ? group.name : group.id,
    type: VARIANT_PRESET_TYPES.find((t) => t.name === group.name),
    group: group as BuilderGroup | undefined,
  }))
  const draftCards = VARIANT_PRESET_TYPES.filter(
    (type) => draftPresets.has(type.name) && !groups.some((g) => g.name === type.name)
  ).map((type) => ({ key: type.name, type, group: undefined }))

  const cards = [...persistedCards, ...draftCards]
  const sortableIds = cards.map((card) => card.group?.id ?? card.key)

  const presentNames = new Set([...groups.map((g) => g.name), ...draftPresets])
  const availablePresets = VARIANT_PRESET_TYPES.filter((type) => !presentNames.has(type.name))
  const hasOptions = cards.length > 0

  function openPreset(name: string) {
    setDraftPresets((prev) => new Set(prev).add(name))
    setEditing(name)
  }

  function closePreset(name: string) {
    setDraftPresets((prev) => {
      const next = new Set(prev)
      next.delete(name)
      return next
    })
    setEditing((prev) => (prev === name ? null : prev))
  }

  function deletePreset(name: string) {
    const group = groups.find((g) => g.name === name)
    if (group) onRemoveGroup(group.id)
    closePreset(name)
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = sortableIds.indexOf(String(active.id))
    const newIndex = sortableIds.indexOf(String(over.id))
    if (oldIndex < 0 || newIndex < 0) return
    const groupIds = new Set(groups.map((g) => g.id))
    onReorderGroups(arrayMove(sortableIds, oldIndex, newIndex).filter((id) => groupIds.has(id)))
  }

  function renderOption(
    type: VariantPresetType | undefined,
    group: BuilderGroup | undefined,
    key: string
  ) {
    const name = type ? type.name : group!.name
    const selected = group?.options ?? []

    if (editing !== key) {
      return (
        <CollapsedOption
          name={name}
          values={selected}
          isPreset={Boolean(type)}
          showSwatch={type?.supportsImages}
          onExpand={() => (type ? openPreset(name) : setEditing(group!.id))}
        />
      )
    }

    if (type) {
      const showSwatches = Boolean(
        type.supportsImages && renderOptionTrailing && group && selected.length > 0
      )
      return (
        <section className="space-y-3 p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-muted-foreground text-xs font-medium">Option name</p>
              <p className="text-sm font-medium">{type.name}</p>
              {type.helper && <p className="text-muted-foreground text-xs">{type.helper}</p>}
            </div>
            <span className="bg-muted text-muted-foreground inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs font-medium">
              <Database aria-hidden className="size-3.5" />
              {type.name}
            </span>
          </div>

          <PresetValuePicker
            name={type.name}
            sections={type.sections}
            selected={selected}
            showSwatch={type.supportsImages}
            onAdd={(value) => onToggleOption(type.name, value, true)}
            onRemove={(option) => onToggleOption(type.name, option.value, false)}
          />

          {showSwatches && group && (
            <ul className="divide-y rounded-lg border">
              {selected.map((option) => (
                <li key={option.id} className="flex items-center gap-3 px-3 py-2">
                  {renderOptionTrailing!(group.id, option)}
                  <span className="flex-1 text-sm">{option.value}</span>
                  <button
                    type="button"
                    onClick={() => onToggleOption(type.name, option.value, false)}
                    aria-label={`Remove ${option.value}`}
                    className="text-muted-foreground hover:text-foreground p-1"
                  >
                    <X className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="flex items-center justify-between">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-destructive"
              onClick={() => deletePreset(type.name)}
              aria-label={`Delete ${type.name} option`}
            >
              Delete
            </Button>
            <Button type="button" size="sm" onClick={() => closePreset(type.name)}>
              Done
            </Button>
          </div>
        </section>
      )
    }

    return (
      <section className="space-y-3 p-3">
        <div className="space-y-1">
          <p className="text-muted-foreground text-xs font-medium">Option name</p>
          <p className="text-sm font-medium">{group!.name}</p>
        </div>

        {group!.options.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {group!.options.map((option) => (
              <Badge key={option.id} variant="secondary" className="gap-1 pr-1">
                {option.value}
                <button
                  type="button"
                  onClick={() => onRemoveOption(group!.id, option.id)}
                  aria-label={`Remove ${option.value}`}
                  className="hover:bg-muted-foreground/20 rounded-full p-0.5"
                >
                  <X className="size-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}

        <AddValueInput
          placeholder="Add a value (e.g. Cropped)"
          addLabel="Add option"
          onAdd={(value) => onAddCustomOption(group!.id, value)}
        />

        <div className="flex items-center justify-between">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-destructive"
            onClick={() => {
              onRemoveGroup(group!.id)
              setEditing((prev) => (prev === group!.id ? null : prev))
            }}
            aria-label={`Delete ${group!.name} group`}
          >
            Delete
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => setEditing((prev) => (prev === group!.id ? null : prev))}
          >
            Done
          </Button>
        </div>
      </section>
    )
  }

  return (
    <div className="space-y-3">
      {hasOptions ? (
        <div className="divide-y overflow-hidden rounded-xl border">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
              {cards.map(({ key, type, group }) => (
                <SortableOption key={key} id={group?.id ?? key}>
                  {renderOption(type, group, key)}
                </SortableOption>
              ))}
            </SortableContext>
          </DndContext>

          <AddOptionMenu
            available={availablePresets}
            hasOptions
            onAddPreset={openPreset}
            onAddCustom={onAddCustomGroup}
          />
        </div>
      ) : (
        <AddOptionMenu
          available={availablePresets}
          hasOptions={false}
          onAddPreset={openPreset}
          onAddCustom={onAddCustomGroup}
        />
      )}
    </div>
  )
}
