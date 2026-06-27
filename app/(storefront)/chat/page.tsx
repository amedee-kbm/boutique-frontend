import { GuestChat } from '@/components/storefront/GuestChat'

export const metadata = { title: 'Chat — Zita Boutique' }

export default function ChatPage() {
  return (
    <div className="mx-auto w-full md:max-w-2xl">
      <GuestChat />
    </div>
  )
}
