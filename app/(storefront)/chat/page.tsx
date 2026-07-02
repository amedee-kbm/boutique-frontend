import { GuestChat } from '@/components/storefront/GuestChat'
import { EnableNotifications } from '@/components/pwa/EnableNotifications'

export const metadata = { title: 'Chat — Zita Boutique' }

export default function ChatPage() {
  return (
    <div className="mx-auto w-full md:max-w-2xl">
      <EnableNotifications />
      <GuestChat />
    </div>
  )
}
