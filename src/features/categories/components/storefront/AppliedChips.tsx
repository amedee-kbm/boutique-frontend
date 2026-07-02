'use client'

import { X } from 'lucide-react'
import { useQueryStates } from 'nuqs'

import type { CategoryFilter } from '@/lib/db/queries'
import { bucketById } from '../../lib/filters'
import { filterParsers } from '../../lib/filter-params'

export function AppliedChips({ categoryFilters }: { categoryFilters: CategoryFilter[] }) {
  const [state, setState] = useQueryStates(filterParsers, { shallow: false, history: 'push' })

  const optionLabel = (id: string) => {
    for (const filter of categoryFilters) {
      const option = filter.options.find((o) => o.id === id)
      if (option) return option.value
    }
    return null
  }

  const bucket = state.price ? bucketById(state.price) : undefined
  const hasAny = state.f.length > 0 || state.colour.length > 0 || Boolean(bucket)
  if (!hasAny) return null

  return (
    <div className="flex flex-wrap items-center gap-2 px-4 pb-3">
      {state.f.map((id: string) => {
        const label = optionLabel(id)
        if (!label) return null
        return (
          <Chip
            key={id}
            label={label}
            onRemove={() => setState({ f: state.f.filter((v: string) => v !== id) })}
          />
        )
      })}

      {state.colour.map((hex: string) => (
        <button
          key={hex}
          type="button"
          onClick={() => setState({ colour: state.colour.filter((v: string) => v !== hex) })}
          className="border-foreground/15 flex items-center gap-1 border py-1 pr-1.5 pl-2 text-xs"
        >
          <span className="size-3 ring-1 ring-black/10" style={{ backgroundColor: hex }} />
          <X className="size-3" />
        </button>
      ))}

      {bucket && <Chip label={bucket.label} onRemove={() => setState({ price: '' })} />}

      <button
        type="button"
        onClick={() => setState({ f: [], colour: [], price: '' })}
        className="text-muted-foreground hover:text-foreground text-xs underline"
      >
        Clear all
      </button>
    </div>
  )
}

function Chip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <button
      type="button"
      onClick={onRemove}
      className="border-foreground/15 flex items-center gap-1 border py-1 pr-1.5 pl-2 text-xs tracking-wide"
    >
      {label}
      <X className="size-3" />
    </button>
  )
}
