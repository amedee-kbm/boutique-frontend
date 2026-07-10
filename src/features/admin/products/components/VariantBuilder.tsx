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
import { SortableContext, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Database, X } from 'lucide-react'

import { Button } from '@/shared/ui'
import { Badge } from '@/shared/ui'
import { AddValueInput } from '@/shared/components/AddValueInput'
import {
  VARIANT_PRESET_TYPES,
  isPresetGroup,
  type VariantPresetType,
} from '../consts/variant-presets'
import type { BuilderGroup, BuilderOption } from './variant-builder/types'
import { PresetValuePicker } from './variant-builder/PresetValuePicker'
import { CollapsedOption } from './variant-builder/CollapsedOption'
import { SortableOption } from './variant-builder/SortableOption'
import { AddOptionMenu } from './variant-builder/AddOptionMenu'

export type { BuilderOption, BuilderGroup } from './variant-builder/types'

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
