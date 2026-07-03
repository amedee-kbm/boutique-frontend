import { GuestChat } from '@/features/storefront/chat'
import { EnableNotifications } from '@/features/pwa'

export const metadata = { title: 'Chat — Zita Boutique' }

export default function ChatPage() {
  return (
    <div className="mx-auto w-full md:max-w-2xl">
      <EnableNotifications />
      <GuestChat />
    </div>
  )
}
