// Components
export { CategoriesTable } from './components/CategoriesTable'
export { CategoryDialog } from './components/CategoryDialog'
export { CategoryFilterManager } from './components/CategoryFilterManager'

// Actions ('use server' — safe in the barrel; RPC-stubbed on the client)
export * from './services/categories'
export * from './services/category-filters'

// Admin read services (getAllCategories, getAllCategoryFilters, getCategoryFilters)
// are server-only and imported by path from './services/category-queries'.
