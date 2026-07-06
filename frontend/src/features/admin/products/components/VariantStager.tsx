'use client'

import { tempId } from '@/shared/lib/id'
import { VariantBuilder } from './VariantBuilder'

export interface StagedVariantOption {
  id: string
  value: string
}

export interface StagedVariantGroup {
  id: string
  name: string
  options: StagedVariantOption[]
}

export function VariantStager({
  groups,
  onChange,
}: {
  groups: StagedVariantGroup[]
  onChange: (groups: StagedVariantGroup[]) => void
}) {
  function toggleOption(groupName: string, value: string, selected: boolean) {
    if (selected) {
      const existing = groups.find((g) => g.name === groupName)
      if (!existing) {
        onChange([...groups, { id: tempId(), name: groupName, options: [{ id: tempId(), value }] }])
        return
      }
      onChange(
        groups.map((g) =>
          g.id === existing.id ? { ...g, options: [...g.options, { id: tempId(), value }] } : g
        )
      )
      return
    }

    onChange(
      groups
        .map((g) =>
          g.name === groupName ? { ...g, options: g.options.filter((o) => o.value !== value) } : g
        )
        .filter((g) => g.options.length > 0)
    )
  }

  function addCustomGroup(name: string) {
    onChange([...groups, { id: tempId(), name, options: [] }])
  }

  function removeGroup(id: string) {
    onChange(groups.filter((g) => g.id !== id))
  }

  function addCustomOption(groupId: string, value: string) {
    onChange(
      groups.map((g) =>
        g.id === groupId ? { ...g, options: [...g.options, { id: tempId(), value }] } : g
      )
    )
  }

  function removeOption(groupId: string, optionId: string) {
    onChange(
      groups.map((g) =>
        g.id === groupId ? { ...g, options: g.options.filter((o) => o.id !== optionId) } : g
      )
    )
  }

  function reorderGroups(orderedIds: string[]) {
    onChange(orderedIds.map((id) => groups.find((g) => g.id === id)).filter((g) => g !== undefined))
  }

  return (
    <VariantBuilder
      groups={groups}
      onToggleOption={toggleOption}
      onAddCustomGroup={addCustomGroup}
      onRemoveGroup={removeGroup}
      onAddCustomOption={addCustomOption}
      onRemoveOption={removeOption}
      onReorderGroups={reorderGroups}
    />
  )
}
