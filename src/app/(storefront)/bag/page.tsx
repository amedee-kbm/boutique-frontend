import { CartTabs } from '@/features/storefront/bag'
import { getFavoriteProducts } from '@/features/storefront/favorites/services/favorite-queries'
import { createClient } from '@/lib/supabase/server'

export const metadata = { title: 'Your bag — Zita Boutique' }

export default async function BagPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const favoriteProducts = user ? await getFavoriteProducts(user.id) : []

  return (
    <div className="mx-auto w-full md:max-w-2xl">
      <CartTabs favoriteProducts={favoriteProducts} />
    </div>
  )
}
