'use client'

import { useEffect, useState } from 'react'

const LAST_MESSAGE_KEY = 'zita-chat-last-message-at'
const LAST_SEEN_KEY = 'zita-chat-last-seen-at'
const CHANGE_EVENT = 'zita-unread-change'

function computeUnread(): boolean {
  try {
    const lastMessage = localStorage.getItem(LAST_MESSAGE_KEY)
    if (!lastMessage) return false
    const lastSeen = localStorage.getItem(LAST_SEEN_KEY)
    return !lastSeen || new Date(lastMessage) > new Date(lastSeen)
  } catch {
    return false
  }
}

function emitChange() {
  window.dispatchEvent(new Event(CHANGE_EVENT))
}

// Called by the chat realtime subscription when an admin reply arrives.
export function markLastMessageAt(at: string) {
  try {
    localStorage.setItem(LAST_MESSAGE_KEY, at)
    emitChange()
  } catch {
    // ignore
  }
}

// Called when the customer views the chat thread.
export function markChatSeen() {
  try {
    localStorage.setItem(LAST_SEEN_KEY, new Date().toISOString())
    emitChange()
  } catch {
    // ignore
  }
}

export function useUnread() {
  const [hasUnread, setHasUnread] = useState(false)

  useEffect(() => {
    const update = () => setHasUnread(computeUnread())
    update()
    window.addEventListener(CHANGE_EVENT, update)
    window.addEventListener('focus', update)
    window.addEventListener('storage', update)
    return () => {
      window.removeEventListener(CHANGE_EVENT, update)
      window.removeEventListener('focus', update)
      window.removeEventListener('storage', update)
    }
  }, [])

  return { hasUnread }
}
