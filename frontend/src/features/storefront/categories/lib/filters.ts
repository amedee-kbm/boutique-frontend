import type { CategoryFilter } from '@/shared/types'
import type { CategoryProductFilters, CategoryProductMeta } from '../services/category-queries'

export type SortOption = 'newest' | 'price-asc' | 'price-desc'

export const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'newest', label: 'Newest' },
  { value: 'price-asc', label: 'Price: low to high' },
  { value: 'price-desc', label: 'Price: high to low' },
]

export interface PriceBucket {
  id: string
  label: string
  min?: number
  max?: number
}

export const PRICE_BUCKETS: PriceBucket[] = [
  { id: 'under-5k', label: 'Under 5,000', max: 5000 },
  { id: '5k-10k', label: '5,000 – 10,000', min: 5000, max: 10000 },
  { id: '10k-20k', label: '10,000 – 20,000', min: 10000, max: 20000 },
  { id: 'over-20k', label: '20,000+', min: 20000 },
]

export interface FilterSelection {
  optionIds: string[]
  hexes: string[]
  price: string
  sort: SortOption
}

function splitParam(value: string | string[] | undefined): string[] {
  if (!value) return []
  const raw = Array.isArray(value) ? value.join(',') : value
  return raw.split(',').filter(Boolean)
}

export function parseFilterParams(
  searchParams: Record<string, string | string[] | undefined>
): FilterSelection {
  const sort = Array.isArray(searchParams.sort) ? searchParams.sort[0] : searchParams.sort
  return {
    optionIds: splitParam(searchParams.f),
    hexes: splitParam(searchParams.colour),
    price: (Array.isArray(searchParams.price) ? searchParams.price[0] : searchParams.price) ?? '',
    sort: sort === 'price-asc' || sort === 'price-desc' ? sort : 'newest',
  }
}

export function bucketById(id: string): PriceBucket | undefined {
  return PRICE_BUCKETS.find((b) => b.id === id)
}

export function toQueryFilters(selection: FilterSelection): CategoryProductFilters {
  const bucket = bucketById(selection.price)
  return {
    optionIds: selection.optionIds,
    hexes: selection.hexes,
    minPrice: bucket?.min,
    maxPrice: bucket?.max,
    sort: selection.sort,
  }
}

export function optionFacetMap(filters: CategoryFilter[]): Map<string, string> {
  const map = new Map<string, string>()
  for (const filter of filters) {
    for (const option of filter.options) map.set(option.id, filter.id)
  }
  return map
}

// Client-side replica of getCategoryProducts' filter logic, used only to count
// pending results in the filter sheet. OR within a facet, AND across facets.
export function matchesFilters(
  meta: CategoryProductMeta,
  selection: FilterSelection,
  optionToFacet: Map<string, string>
): boolean {
  const bucket = bucketById(selection.price)
  if (bucket) {
    const price = Number(meta.price)
    if (bucket.min != null && price < bucket.min) return false
    if (bucket.max != null && price > bucket.max) return false
  }

  if (selection.hexes.length && !meta.hexes.some((h) => selection.hexes.includes(h))) return false

  if (selection.optionIds.length) {
    const byFacet = new Map<string, string[]>()
    for (const id of selection.optionIds) {
      const facet = optionToFacet.get(id)
      if (!facet) continue
      const list = byFacet.get(facet) ?? []
      list.push(id)
      byFacet.set(facet, list)
    }
    for (const ids of byFacet.values()) {
      if (!ids.some((id) => meta.optionIds.includes(id))) return false
    }
  }

  return true
}

export function countMatches(
  metas: CategoryProductMeta[],
  selection: FilterSelection,
  optionToFacet: Map<string, string>
): number {
  return metas.reduce((n, m) => (matchesFilters(m, selection, optionToFacet) ? n + 1 : n), 0)
}
