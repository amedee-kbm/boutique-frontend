export { FavoriteButton } from './components/FavoriteButton'
export { FavoritesPanel } from './components/FavoritesPanel'
export { FavoritesProvider, useFavorites } from './hooks/useFavorites'

// getFavoriteProducts is a server-only read — import it by path from
// './services/favorite-queries', never through this barrel.
