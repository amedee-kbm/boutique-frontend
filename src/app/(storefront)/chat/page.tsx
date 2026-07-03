import { GuestChat } from '@/features/storefront/chat'
import { getFavoriteProducts } from '@/features/storefront/favorites/services/favorite-queries'
import { EnableNotifications } from '@/features/pwa'
import { createClient } from '@/lib/supabase/server'

export const metadata = { title: 'Chat — Zita Boutique' }

export default async function ChatPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const favoriteProducts = user ? await getFavoriteProducts(user.id) : []

  return (
    <div className="mx-auto w-full md:max-w-2xl">
      <EnableNotifications />
      <GuestChat favoriteProducts={favoriteProducts} />
    </div>
  )
}
