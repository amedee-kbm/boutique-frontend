// Components
export { CategoryBanner } from './components/CategoryBanner'
export { AppliedChips } from './components/AppliedChips'
export { FilterSheet } from './components/FilterSheet'
export { SortControl } from './components/SortControl'

// Pure filter helpers (no server-only or client-singleton imports)
export * from './lib/filters'

// Read types. Type-only re-export — the server-only read service is not pulled
// into the client bundle; import the functions by path. filter-params (nuqs
// parsers) is client-only and imported by path, never via this barrel.
export type { CategoryProductFilters, CategoryProductMeta } from './services/category-queries'
