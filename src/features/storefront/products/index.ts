// Components
export { CategoryStrip } from './components/CategoryStrip'
export { FeedCard } from './components/FeedCard'
export { HomeFeed } from './components/HomeFeed'
export { GridCard } from './components/GridCard'
export { ProductDetail } from './components/ProductDetail'

// Pure helpers / consts (safe in the barrel — no server-only imports)
export * from './lib/product-detail'

// Card types. Type-only re-export — the read service (server-only) is never
// pulled into the client bundle by this line; import the functions by path.
export type { StoreCard, HomeCard, HomeFilter, SwipeCard } from './services/product-queries'
