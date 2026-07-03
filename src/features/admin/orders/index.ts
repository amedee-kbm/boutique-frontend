// Components
export { OrdersList } from './components/OrdersList'
export { OrdersRealtime } from './components/OrdersRealtime'

// Actions ('use server' — safe in the barrel; RPC-stubbed on the client)
export * from './services/orders'

// Read service (getAllOrders + AdminOrder types) is server-only and imported by
// path from './services/order-queries'.
