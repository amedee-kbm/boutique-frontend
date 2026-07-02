'use client'

import { useEffect } from 'react'

// Registers the service worker. Gated to production so Turbopack HMR isn't
// disrupted in dev (the SW caches static chunks). Renders nothing.
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return
    if (!('serviceWorker' in navigator)) return
    navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' }).catch(() => {
      // Registration is best-effort; the app works without it.
    })
  }, [])

  return null
}
