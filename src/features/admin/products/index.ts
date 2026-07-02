// Components
export { ProductEditor } from './components/ProductEditor'
export { ProductImageManager } from './components/ProductImageManager'
export { ProductsBulkEdit } from './components/ProductsBulkEdit'
export { ProductsList } from './components/ProductsList'
export { VariantBuilder } from './components/VariantBuilder'
export type { BuilderOption, BuilderGroup } from './components/VariantBuilder'
export { VariantManager } from './components/VariantManager'
export { VariantStager } from './components/VariantStager'
export type { StagedVariantGroup } from './components/VariantStager'

// Actions ('use server' — safe in the barrel; RPC-stubbed on the client)
export * from './services/products'
export * from './services/product-filters'
export * from './services/variants'

// Admin read services (getAllProducts, getProductById) are server-only and are
// imported by path from './services/product-queries', not re-exported here.
