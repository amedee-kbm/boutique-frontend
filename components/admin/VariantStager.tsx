'use client'

import { useState } from 'react'
import { Plus, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

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

function OptionInput({ onAdd }: { onAdd: (value: string) => void }) {
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

export function VariantStager({
  groups,
  onChange,
}: {
  groups: StagedVariantGroup[]
  onChange: (groups: StagedVariantGroup[]) => void
}) {
  const [newGroup, setNewGroup] = useState('')

  function addGroup() {
    const name = newGroup.trim()
    if (!name) return
    onChange([...groups, { id: uid(), name, options: [] }])
    setNewGroup('')
  }

  function deleteGroup(id: string) {
    onChange(groups.filter((g) => g.id !== id))
  }

  function addOption(groupId: string, value: string) {
    onChange(
      groups.map((g) =>
        g.id === groupId ? { ...g, options: [...g.options, { id: uid(), value }] } : g
      )
    )
  }

  function deleteOption(groupId: string, optionId: string) {
    onChange(
      groups.map((g) =>
        g.id === groupId ? { ...g, options: g.options.filter((o) => o.id !== optionId) } : g
      )
    )
  }

  return (
    <div className="space-y-4">
      {groups.length === 0 && (
        <p className="text-muted-foreground text-sm">
          No variants yet. Add a group like “Size” or “Color”, then list its options.
        </p>
      )}

      {groups.map((group) => (
        <div key={group.id} className="space-y-2 rounded-lg border p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">{group.name}</span>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => deleteGroup(group.id)}
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
                    onClick={() => deleteOption(group.id, option.id)}
                    aria-label={`Remove ${option.value}`}
                    className="hover:bg-muted-foreground/20 rounded-full p-0.5"
                  >
                    <X className="size-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}

          <OptionInput onAdd={(value) => addOption(group.id, value)} />
        </div>
      ))}

      <form
        onSubmit={(e) => {
          e.preventDefault()
          addGroup()
        }}
        className="flex items-center gap-2"
      >
        <Input
          value={newGroup}
          onChange={(e) => setNewGroup(e.target.value)}
          placeholder="New group (e.g. Size)"
        />
        <Button type="submit" variant="outline" size="sm" aria-label="Add group">
          <Plus className="size-4" />
          Group
        </Button>
      </form>
    </div>
  )
}
