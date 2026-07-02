import { NuqsAdapter } from 'nuqs/adapters/next/app'

import { StoreHeader } from '@/widgets/storefront-nav'
import { StoreTabBar } from '@/widgets/storefront-nav'
import { ChatPresence } from '@/features/chat'
import { ServiceWorkerRegistrar } from '@/features/pwa'
import { FavoritesProvider } from '@/features/favorites'

export default function StorefrontLayout({ children }: { children: React.ReactNode }) {
  return (
    <NuqsAdapter>
      <FavoritesProvider>
        <div className="bg-background mx-auto flex min-h-svh w-full max-w-[480px] flex-col border-x md:max-w-none md:border-x-0">
          <StoreHeader />

          <main className="flex-1">{children}</main>

          <StoreTabBar />
          <ChatPresence />
          <ServiceWorkerRegistrar />
        </div>
      </FavoritesProvider>
    </NuqsAdapter>
  )
}
