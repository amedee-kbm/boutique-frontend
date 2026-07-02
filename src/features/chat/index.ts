// Storefront Components
export { ChatPresence } from './components/storefront/ChatPresence'
export { GuestChat } from './components/storefront/GuestChat'
export { ProductInquiryCard } from './components/storefront/ProductInquiryCard'
export type { InquiryItem } from './components/storefront/ProductInquiryCard'

// Admin Components
export { ChatConversation } from './components/admin/ChatConversation'
export { InboxRealtime } from './components/admin/InboxRealtime'

// Hooks / Helpers
export {
  useGuestName,
  useGuestReady,
  useGuestSession,
  getGuestSession,
  setGuestSession,
} from './hooks/guest'
export { useUnread, markChatSeen, markLastMessageAt } from './hooks/useUnread'
export { useGuestChat } from './hooks/useGuestChat'
