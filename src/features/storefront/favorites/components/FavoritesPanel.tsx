'use client'

import Link from 'next/link'
import { ShoppingBag, X } from 'lucide-react'
import { toast } from 'sonner'

import type { StoreCard } from '@/features/storefront/products'
import { bagKey, useBag } from '@/features/storefront/bag'
import { formatPrice } from '@/shared/lib/format'
import { Button } from '@/shared/ui'
import { ProductThumb } from '@/shared/components/ProductThumb'
import { useFavorites } from '../hooks/useFavorites'

// The FAVORITES tab. Product card data is fetched server-side (owner + visible
// filtered) and passed in; useFavorites owns the live id set so a remove tap
// drops the row instantly and a stale login/logout clears the list.
export function FavoritesPanel({ products }: { products: StoreCard[] }) {
  const { ready, signedIn, isFavorite, toggle } = useFavorites()
  const { add } = useBag()

  if (!ready) return null

  if (!signedIn) {
    return (
      <div className="px-4 py-16 text-center">
        <p className="text-muted-foreground mx-auto max-w-xs text-sm">
          You must log in to view or save items in your favorites list
        </p>
        <div className="mx-auto mt-6 flex max-w-xs flex-col gap-2">
          <Button className="h-11 rounded-none" render={<Link href="/account/login" />}>
            LOG IN
          </Button>
          <Button
            variant="outline"
            className="h-11 rounded-none"
            render={<Link href="/account/register" />}
          >
            REGISTER
          </Button>
        </div>
      </div>
    )
  }

  const saved = products.filter((product) => isFavorite(product.id))

  if (saved.length === 0) {
    return (
      <div className="px-4 py-16 text-center">
        <p className="text-sm">No favorites yet.</p>
        <p className="text-muted-foreground mt-1 text-xs">Tap the heart on a piece to save it.</p>
        <Button variant="outline" className="mt-4 rounded-none" render={<Link href="/" />}>
          Start browsing
        </Button>
      </div>
    )
  }

  function moveToBag(product: StoreCard) {
    add({
      key: bagKey(product.id, null, null),
      productId: product.id,
      slug: product.slug,
      name: product.name,
      price: product.price,
      colorValue: null,
      colorHex: null,
      size: null,
      imageUrl: product.thumbnail,
    })
    toast.success('Moved to bag')
  }

  return (
    <ul className="divide-y pb-40">
      {saved.map((product) => (
        <li key={product.id} className="flex items-center gap-3 px-4 py-3">
          <Link href={`/product/${product.slug}`} className="shrink-0">
            <ProductThumb
              src={product.thumbnail}
              alt={product.name}
              className="size-16 object-cover"
            />
          </Link>
          <div className="min-w-0 flex-1">
            <Link href={`/product/${product.slug}`} className="block">
              <p className="truncate text-sm font-medium">{product.name}</p>
              <p className="text-sm">{formatPrice(product.price)}</p>
            </Link>
            <button
              type="button"
              onClick={() => moveToBag(product)}
              className="text-muted-foreground hover:text-foreground mt-1 inline-flex items-center gap-1 text-xs"
            >
              <ShoppingBag className="size-3.5" /> Move to bag
            </button>
          </div>
          <button
            type="button"
            onClick={() => toggle(product.id)}
            aria-label={`Remove ${product.name} from favorites`}
            className="text-muted-foreground hover:text-foreground p-2"
          >
            <X className="size-4" />
          </button>
        </li>
      ))}
    </ul>
  )
}
