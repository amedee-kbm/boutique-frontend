'use client'

import { useState, useTransition } from 'react'
import { Plus, X } from 'lucide-react'
import { toast } from 'sonner'

import {
  addCategoryFilter,
  addCategoryFilterOption,
  deleteCategoryFilter,
  deleteCategoryFilterOption,
} from '@/features/admin/categories'
import type { CategoryFilter } from '@/shared/types'
import { Button } from '@/shared/ui'
import { Input } from '@/shared/ui'
import { Badge } from '@/shared/ui'

function OptionInput({ onAdd }: { onAdd: (value: string) => void }) {
  const [value, setValue] = useState('')
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        const trimmed = value.trim()
        if (!trimmed) return
        onAdd(trimmed)
        setValue('')
      }}
      className="flex items-center gap-2"
    >
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Add a value (e.g. Midi)"
        className="h-7"
      />
      <Button type="submit" size="icon-sm" variant="outline" aria-label="Add value">
        <Plus className="size-4" />
      </Button>
    </form>
  )
}

export function CategoryFilterManager({
  categoryId,
  initialFilters,
}: {
  categoryId: string
  initialFilters: CategoryFilter[]
}) {
  const [filters, setFilters] = useState<CategoryFilter[]>(initialFilters)
  const [newFilter, setNewFilter] = useState('')
  const [, startTransition] = useTransition()

  function addFilter(name: string) {
    startTransition(async () => {
      const result = await addCategoryFilter(categoryId, name)
      if (result.error || !result.filter) {
        toast.error(result.error ?? 'Could not add filter')
        return
      }
      setFilters((prev) => [...prev, { ...result.filter }])
    })
  }

  function removeFilter(id: string) {
    const previous = filters
    setFilters((prev) => prev.filter((f) => f.id !== id))
    startTransition(async () => {
      const result = await deleteCategoryFilter(id)
      if (result.error) {
        toast.error(result.error)
        setFilters(previous)
      }
    })
  }

  function addOption(filterId: string, value: string) {
    startTransition(async () => {
      const result = await addCategoryFilterOption(filterId, value)
      if (result.error || !result.option) {
        toast.error(result.error ?? 'Could not add value')
        return
      }
      setFilters((prev) =>
        prev.map((f) => (f.id === filterId ? { ...f, options: [...f.options, result.option] } : f))
      )
    })
  }

  function removeOption(filterId: string, optionId: string) {
    const previous = filters
    setFilters((prev) =>
      prev.map((f) =>
        f.id === filterId ? { ...f, options: f.options.filter((o) => o.id !== optionId) } : f
      )
    )
    startTransition(async () => {
      const result = await deleteCategoryFilterOption(optionId)
      if (result.error) {
        toast.error(result.error)
        setFilters(previous)
      }
    })
  }

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-medium">Filters</h3>
        <p className="text-muted-foreground text-xs">
          Facets customers can filter this category by. Colour and price are added automatically.
        </p>
      </div>

      {filters.map((filter) => (
        <div key={filter.id} className="space-y-2 rounded-lg border p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">{filter.name}</span>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => removeFilter(filter.id)}
              aria-label={`Delete ${filter.name} filter`}
            >
              <X className="text-destructive size-4" />
            </Button>
          </div>

          {filter.options.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {filter.options.map((option) => (
                <Badge key={option.id} variant="secondary" className="gap-1 pr-1">
                  {option.value}
                  <button
                    type="button"
                    onClick={() => removeOption(filter.id, option.id)}
                    aria-label={`Remove ${option.value}`}
                    className="hover:bg-muted-foreground/20 rounded-full p-0.5"
                  >
                    <X className="size-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}

          <OptionInput onAdd={(value) => addOption(filter.id, value)} />
        </div>
      ))}

      <form
        onSubmit={(e) => {
          e.preventDefault()
          const name = newFilter.trim()
          if (!name) return
          addFilter(name)
          setNewFilter('')
        }}
        className="flex items-center gap-2"
      >
        <Input
          value={newFilter}
          onChange={(e) => setNewFilter(e.target.value)}
          placeholder="New filter (e.g. Occasion)"
        />
        <Button type="submit" variant="outline" size="sm" aria-label="Add filter">
          <Plus className="size-4" />
          Filter
        </Button>
      </form>
    </div>
  )
}
