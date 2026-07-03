'use client'

import { useGuestSession } from '../hooks/guest'
import { usePresence } from '../hooks/usePresence'

// Mounted once in the storefront shell so an admin reply lights the Chat tab's
// unread dot even when the customer is browsing other pages.
export function ChatPresence() {
  const sessionId = useGuestSession()?.sessionId ?? null
  usePresence(sessionId)
  return null
}
