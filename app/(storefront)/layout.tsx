import { NuqsAdapter } from 'nuqs/adapters/next/app'

import { StoreHeader } from '@/components/storefront/StoreHeader'
import { StoreTabBar } from '@/components/storefront/StoreTabBar'
import { ChatPresence } from '@/components/storefront/ChatPresence'

export default function StorefrontLayout({ children }: { children: React.ReactNode }) {
  return (
    <NuqsAdapter>
      <div className="bg-background mx-auto flex min-h-svh w-full max-w-[480px] flex-col border-x md:max-w-none md:border-x-0">
        <StoreHeader />

        <main className="flex-1">{children}</main>

        <StoreTabBar />
        <ChatPresence />
      </div>
    </NuqsAdapter>
  )
}
