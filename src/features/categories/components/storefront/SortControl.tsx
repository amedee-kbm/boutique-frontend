'use client'

import { ChevronDown } from 'lucide-react'
import { useQueryStates } from 'nuqs'

import { SORT_OPTIONS, type SortOption } from '@/features/categories/lib/filters'
import { filterParsers } from '@/features/categories/lib/filter-params'
import { Button } from '@/shared/ui'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/shared/ui'

export function SortControl() {
  const [state, setState] = useQueryStates(filterParsers, { shallow: false, history: 'push' })
  const current = SORT_OPTIONS.find((o) => o.value === state.sort) ?? SORT_OPTIONS[0]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="sm" className="gap-1 rounded-none">
            {current.label}
            <ChevronDown className="size-4" />
          </Button>
        }
      />
      <DropdownMenuContent align="end">
        <DropdownMenuRadioGroup
          value={state.sort}
          onValueChange={(value) => setState({ sort: value as SortOption })}
        >
          {SORT_OPTIONS.map((option) => (
            <DropdownMenuRadioItem key={option.value} value={option.value}>
              {option.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
