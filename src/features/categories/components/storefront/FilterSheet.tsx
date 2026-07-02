'use client'

import { useMemo, useState } from 'react'
import { SlidersHorizontal } from 'lucide-react'
import { useQueryStates } from 'nuqs'

import type { CategoryFilter, CategoryProductMeta } from '@/lib/db/queries'
import {
  countMatches,
  optionFacetMap,
  PRICE_BUCKETS,
  type FilterSelection,
} from '@/features/categories/lib/filters'
import { filterParsers } from '@/features/categories/lib/filter-params'
import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/ui'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/shared/ui'

export function FilterSheet({
  categoryFilters,
  meta,
}: {
  categoryFilters: CategoryFilter[]
  meta: CategoryProductMeta[]
}) {
  const [state, setState] = useQueryStates(filterParsers, { shallow: false, history: 'push' })
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<FilterSelection>({
    optionIds: [],
    hexes: [],
    price: '',
    sort: 'newest',
  })

  const optionToFacet = useMemo(() => optionFacetMap(categoryFilters), [categoryFilters])
  const colours = useMemo(() => {
    const seen = new Set<string>()
    for (const m of meta) for (const h of m.hexes) seen.add(h)
    return [...seen]
  }, [meta])

  const activeCount = state.f.length + state.colour.length + (state.price ? 1 : 0)
  const pendingCount = countMatches(meta, { ...draft, sort: state.sort }, optionToFacet)

  function openSheet() {
    setDraft({ optionIds: state.f, hexes: state.colour, price: state.price, sort: state.sort })
    setOpen(true)
  }

  function toggle(list: string[], value: string): string[] {
    return list.includes(value) ? list.filter((v) => v !== value) : [...list, value]
  }

  function apply() {
    setState({ f: draft.optionIds, colour: draft.hexes, price: draft.price })
    setOpen(false)
  }

  function clearDraft() {
    setDraft((d) => ({ ...d, optionIds: [], hexes: [], price: '' }))
  }

  return (
    <Sheet open={open} onOpenChange={(o) => (o ? openSheet() : setOpen(false))}>
      <SheetTrigger
        render={
          <Button variant="outline" size="sm" className="gap-2 rounded-none">
            <SlidersHorizontal className="size-4" />
            Filters
            {activeCount > 0 && (
              <span className="bg-foreground text-background grid size-4 place-items-center rounded-full text-[10px]">
                {activeCount}
              </span>
            )}
          </Button>
        }
      />
      <SheetContent side="bottom" className="max-h-[85svh] gap-0 rounded-t-xl p-0">
        <SheetHeader className="border-b">
          <SheetTitle>Filters</SheetTitle>
        </SheetHeader>

        <div className="flex-1 space-y-6 overflow-y-auto p-4">
          {colours.length > 0 && (
            <section className="space-y-2">
              <h3 className="text-xs font-medium tracking-wide uppercase">Colour</h3>
              <div className="flex flex-wrap gap-2">
                {colours.map((hex) => {
                  const selected = draft.hexes.includes(hex)
                  return (
                    <button
                      key={hex}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => setDraft((d) => ({ ...d, hexes: toggle(d.hexes, hex) }))}
                      className={cn(
                        'size-8 ring-offset-2',
                        selected ? 'ring-foreground ring-2' : 'ring-1 ring-black/10'
                      )}
                      style={{ backgroundColor: hex }}
                    />
                  )
                })}
              </div>
            </section>
          )}

          <section className="space-y-2">
            <h3 className="text-xs font-medium tracking-wide uppercase">Price</h3>
            <div className="flex flex-wrap gap-2">
              {PRICE_BUCKETS.map((bucket) => {
                const selected = draft.price === bucket.id
                return (
                  <Chip
                    key={bucket.id}
                    label={bucket.label}
                    selected={selected}
                    onClick={() => setDraft((d) => ({ ...d, price: selected ? '' : bucket.id }))}
                  />
                )
              })}
            </div>
          </section>

          {categoryFilters.map((filter) => (
            <section key={filter.id} className="space-y-2">
              <h3 className="text-xs font-medium tracking-wide uppercase">{filter.name}</h3>
              <div className="flex flex-wrap gap-2">
                {filter.options.map((option) => (
                  <Chip
                    key={option.id}
                    label={option.value}
                    selected={draft.optionIds.includes(option.id)}
                    onClick={() =>
                      setDraft((d) => ({ ...d, optionIds: toggle(d.optionIds, option.id) }))
                    }
                  />
                ))}
              </div>
            </section>
          ))}
        </div>

        <div className="flex items-center gap-3 border-t p-4">
          <Button type="button" variant="ghost" className="rounded-none" onClick={clearDraft}>
            Clear
          </Button>
          <Button type="button" className="flex-1 rounded-none" onClick={apply}>
            Show {pendingCount} {pendingCount === 1 ? 'result' : 'results'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

function Chip({
  label,
  selected,
  onClick,
}: {
  label: string
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        'border px-3 py-1.5 text-xs tracking-wide',
        selected ? 'border-foreground bg-foreground text-background' : 'border-foreground/15'
      )}
    >
      {label}
    </button>
  )
}
