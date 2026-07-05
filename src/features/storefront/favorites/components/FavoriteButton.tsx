'use client'

import { useRouter } from 'next/navigation'
import { Heart } from 'lucide-react'
import { toast } from 'sonner'

import { cn } from '@/shared/lib/utils'
import type { StoreCard } from '@/features/storefront/products'
import { useFavorites } from '@/features/storefront/favorites'
import { IconButton } from '@/shared/components/IconButton'

// The save/favorite heart. Favoriting is account-gated (Zara-style): a guest tap
// opens a log in / register prompt instead of saving. Lives as an overlay
// outside the card's <Link>, so tapping it never navigates to the product.
export function FavoriteButton({ product }: { product: StoreCard }) {
  const { isFavorite, ready, toggle } = useFavorites()
  const router = useRouter()
  const saved = ready && isFavorite(product.id)

  async function handleClick() {
    const { needsAuth } = await toggle(product.id)
    if (needsAuth) {
      toast('Log in to save favorites', {
        description: 'Favorites are saved to your account.',
        action: { label: 'Log in', onClick: () => router.push('/account/login') },
        cancel: { label: 'Register', onClick: () => router.push('/account/register') },
      })
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={
        saved ? `Remove ${product.name} from favorites` : `Save ${product.name} to favorites`
      }
      aria-pressed={saved}
      className="absolute top-1 right-1 z-10 grid size-11 place-items-center"
    >
      <IconButton as="span" size="sm">
        <Heart className={cn('size-4', saved && 'fill-current')} strokeWidth={1.8} />
      </IconButton>
    </button>
  )
}
