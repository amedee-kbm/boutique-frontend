// Components
export { FeedCard } from './components/FeedCard'
export { GridCard } from './components/GridCard'
export { ProductGallery } from './components/ProductGallery'
export type { GallerySection } from './components/ProductGallery'
export { ProductPanel } from './components/ProductPanel'
export { ProductSwiper } from './components/ProductSwiper'
export { QuickAddButton } from './components/QuickAddButton'
export { ColorSquares } from './components/ColorSquares'
export { ColorStrip } from './components/ColorStrip'

// Pure helpers / consts (safe in the barrel — no server-only imports)
export * from './lib/feed-rhythm'
export * from './lib/product-detail'

// Card types. Type-only re-export — the read service (server-only) is never
// pulled into the client bundle by this line; import the functions by path.
export type { StoreCard, HomeCard, HomeFilter, SwipeCard } from './services/product-queries'
