// Components
export { HomeFilterEditor } from './components/HomeFilterEditor'

// Actions ('use server' — safe in the barrel; RPC-stubbed on the client)
export * from './services/merchandising'

// getAdminHomeFilters is a server-only read — import it by path from
// './services/merchandising-queries', never through this barrel.
