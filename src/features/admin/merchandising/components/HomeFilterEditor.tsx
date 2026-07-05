'use client'

import { useMemo, useState, useTransition } from 'react'
import { ArrowDown, ArrowUp, X } from 'lucide-react'
import { toast } from 'sonner'

import { EditorHeader, FieldRow, ListRow, SubScreen } from '@/features/admin/ui'
import { FloatingLabelInput } from '@/features/admin/ui'
import { Button, Switch } from '@/shared/ui'
import { tempId } from '@/shared/lib/id'
import type { AdminHomeFilter } from '../services/merchandising-queries'
import { saveHomeFilters } from '../services/merchandising'

interface Entry {
  // Local key for React + reorder; DB rows are replaced wholesale on Save.
  key: string
  label: string
  href: string
  visible: boolean
}

interface EditingState {
  mode: 'new' | 'edit'
  key?: string
  label: string
  href: string
}

function snapshot(entries: Entry[]) {
  return JSON.stringify(entries.map((e) => [e.label, e.href, e.visible]))
}

export function HomeFilterEditor({ initial }: { initial: AdminHomeFilter[] }) {
  const initialEntries = useMemo<Entry[]>(
    () =>
      initial.map((row) => ({
        key: row.id,
        label: row.label,
        href: row.href,
        visible: row.visible,
      })),
    [initial]
  )
  const [entries, setEntries] = useState<Entry[]>(initialEntries)
  const [baseline, setBaseline] = useState(() => snapshot(initialEntries))
  const [editing, setEditing] = useState<EditingState | null>(null)
  const [saving, startSaving] = useTransition()

  const dirty = snapshot(entries) !== baseline

  function move(index: number, delta: number) {
    const target = index + delta
    if (target < 0 || target >= entries.length) return
    setEntries((prev) => {
      const next = [...prev]
      const [moved] = next.splice(index, 1)
      next.splice(target, 0, moved!)
      return next
    })
  }

  function remove(key: string) {
    setEntries((prev) => prev.filter((e) => e.key !== key))
  }

  function toggleVisible(key: string) {
    setEntries((prev) => prev.map((e) => (e.key === key ? { ...e, visible: !e.visible } : e)))
  }

  function commitEditing() {
    if (!editing) return
    const label = editing.label.trim()
    const href = editing.href.trim()
    if (!label || !href) {
      toast.error('Add both a label and a link')
      return
    }
    if (editing.mode === 'new') {
      setEntries((prev) => [...prev, { key: tempId(), label, href, visible: true }])
    } else {
      setEntries((prev) => prev.map((e) => (e.key === editing.key ? { ...e, label, href } : e)))
    }
    setEditing(null)
  }

  function handleSave() {
    startSaving(async () => {
      const result = await saveHomeFilters(
        entries.map(({ label, href, visible }) => ({ label, href, visible }))
      )
      if (result.error) {
        toast.error(result.error)
        return
      }
      setBaseline(snapshot(entries))
      toast.success('Home strip saved')
    })
  }

  return (
    <div>
      <EditorHeader
        title="Home filter strip"
        cancelLabel="Reset"
        onCancel={() => setEntries(initialEntries)}
        saveType="button"
        onSave={handleSave}
        saving={saving}
        saveDisabled={!dirty}
      />

      <p className="text-muted-foreground mt-4 text-sm">
        These chips sit at the top of the storefront home page. Reorder, hide, or edit them. When
        none are shown, the strip falls back to your categories.
      </p>

      <ul className="mt-4 divide-y">
        {entries.map((entry, index) => (
          <ListRow
            key={entry.key}
            thumbnail={null}
            title={
              <button
                type="button"
                onClick={() =>
                  setEditing({ mode: 'edit', key: entry.key, label: entry.label, href: entry.href })
                }
                className="text-left hover:underline"
              >
                {entry.label}
              </button>
            }
            meta={entry.href}
            accent={entry.visible ? undefined : 'Hidden'}
            actions={
              <>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => move(index, -1)}
                  disabled={index === 0}
                  aria-label={`Move ${entry.label} up`}
                >
                  <ArrowUp className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => move(index, 1)}
                  disabled={index === entries.length - 1}
                  aria-label={`Move ${entry.label} down`}
                >
                  <ArrowDown className="size-4" />
                </Button>
                <Switch
                  checked={entry.visible}
                  onCheckedChange={() => toggleVisible(entry.key)}
                  aria-label={`${entry.visible ? 'Hide' : 'Show'} ${entry.label}`}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => remove(entry.key)}
                  aria-label={`Delete ${entry.label}`}
                >
                  <X className="text-destructive size-4" />
                </Button>
              </>
            }
          />
        ))}
      </ul>

      <div className="mt-2">
        <FieldRow
          label="filter"
          emptyLabel="Add a filter"
          onClick={() => setEditing({ mode: 'new', label: '', href: '' })}
        />
      </div>

      <SubScreen
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
        title={editing?.mode === 'new' ? 'New filter' : 'Edit filter'}
        saveLabel="Done"
        onSave={commitEditing}
      >
        {editing && (
          <div className="space-y-4">
            <FloatingLabelInput
              label="Label"
              value={editing.label}
              onChange={(e) => setEditing({ ...editing, label: e.target.value })}
              placeholder="New in"
              helperText="What customers see on the chip."
            />
            <FloatingLabelInput
              label="Link"
              value={editing.href}
              onChange={(e) => setEditing({ ...editing, href: e.target.value })}
              placeholder="/category/dresses"
              helperText="Where the chip goes, e.g. /category/dresses or /."
            />
          </div>
        )}
      </SubScreen>
    </div>
  )
}
