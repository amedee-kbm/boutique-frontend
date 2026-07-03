// Components
export { ChatConversation } from './components/ChatConversation'
export { InboxRealtime } from './components/InboxRealtime'

// Actions ('use server' — safe in the barrel; RPC-stubbed on the client)
export * from './services/chat'

// Read service (getAllChatSessions, getChatSession, getChatMessages) is
// server-only and imported by path from './services/chat-queries'.
