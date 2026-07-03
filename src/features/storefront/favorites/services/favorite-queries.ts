import 'server-only'

import { and, desc, eq } from 'drizzle-orm'

import { db } from '@/lib/db'
import { favorites, products } from '@/lib/db/schema'
import {
  hexesSql,
  thumbnailSql,
  type StoreCard,
} from '@/features/storefront/products/services/product-queries'

// Card data for a signed-in customer's favorited products, newest-favorite
// first. Drizzle bypasses RLS, so this MUST filter both to the owner and to
// visible products — a piece the seller has since hidden drops out of the list.
export async function getFavoriteProducts(userId: string): Promise<StoreCard[]> {
  return db
    .select({
      id: products.id,
      name: products.name,
      slug: products.slug,
      price: products.price,
      thumbnail: thumbnailSql,
      hexes: hexesSql,
    })
    .from(favorites)
    .innerJoin(products, eq(products.id, favorites.productId))
    .where(and(eq(favorites.userId, userId), eq(products.visible, true)))
    .orderBy(desc(favorites.createdAt))
}
