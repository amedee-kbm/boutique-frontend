// Components
export { GuestChat } from './components/GuestChat'
export { ChatPresence } from './components/ChatPresence'

// Hooks / helpers
export {
  useGuestName,
  useGuestReady,
  useGuestSession,
  getGuestSession,
  setGuestSession,
} from './hooks/guest'
export { useUnread, markChatSeen, markLastMessageAt } from './hooks/useUnread'
export { useGuestChat } from './hooks/useGuestChat'

// funnel (ensureAnonUser, startGuestChat) is imported by path where needed.
