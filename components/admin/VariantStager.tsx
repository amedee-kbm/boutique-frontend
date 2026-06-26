'use client'

import { VariantBuilder } from '@/components/admin/VariantBuilder'

export interface StagedVariantOption {
  id: string
  value: string
}

export interface StagedVariantGroup {
  id: string
  name: string
  options: StagedVariantOption[]
}

function uid() {
  return globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)
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
        onChange([...groups, { id: uid(), name: groupName, options: [{ id: uid(), value }] }])
        return
      }
      onChange(
        groups.map((g) =>
          g.id === existing.id ? { ...g, options: [...g.options, { id: uid(), value }] } : g
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
    onChange([...groups, { id: uid(), name, options: [] }])
  }

  function removeGroup(id: string) {
    onChange(groups.filter((g) => g.id !== id))
  }

  function addCustomOption(groupId: string, value: string) {
    onChange(
      groups.map((g) =>
        g.id === groupId ? { ...g, options: [...g.options, { id: uid(), value }] } : g
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

  return (
    <VariantBuilder
      groups={groups}
      onToggleOption={toggleOption}
      onAddCustomGroup={addCustomGroup}
      onRemoveGroup={removeGroup}
      onAddCustomOption={addCustomOption}
      onRemoveOption={removeOption}
    />
  )
}
