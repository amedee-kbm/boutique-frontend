'use client'

import { useSyncExternalStore } from 'react'

const noop = () => () => {}

// False during SSR and the first client render, true after hydration. Persisted
// Zustand stores read localStorage synchronously on the client, so gating
// client-only data (bag items, guest session) on this flag keeps the first
// render matching the server and avoids a hydration mismatch/flash. Uses
// useSyncExternalStore's server/client snapshot split rather than an effect.
export function useHydrated(): boolean {
  return useSyncExternalStore(
    noop,
    () => true,
    () => false
  )
}
