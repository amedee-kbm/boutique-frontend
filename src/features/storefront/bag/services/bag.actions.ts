'use server'

import { and, desc, eq, inArray, notInArray } from 'drizzle-orm'

import { db } from '@/lib/db'
import { products } from '@/lib/db/schema'
import {
  hexesSql,
  thumbnailSql,
  type StoreCard,
} from '@/features/storefront/products/services/product-queries'

// Returns the subset of product ids that are still visible, so the Bag screen
// can mark vanished pieces as "no longer available".
export async function getAvailableProductIds(ids: string[]): Promise<string[]> {
  const unique = [...new Set(ids)]
  if (unique.length === 0) return []
  const rows = await db
    .select({ id: products.id })
    .from(products)
    .where(and(inArray(products.id, unique), eq(products.visible, true)))
  return rows.map((r) => r.id)
}

const suggestionColumns = {
  id: products.id,
  name: products.name,
  slug: products.slug,
  price: products.price,
  thumbnail: thumbnailSql,
  hexes: hexesSql,
}

// "You may also like" for the cart area. Given the ids currently in the bag,
// suggests other visible pieces from the same categories (excluding what's
// already in the bag); with an empty bag it falls back to featured-then-newest.
// The bag lives in localStorage, so the ids come from the client.
export async function getCartSuggestions(bagIds: string[], limit = 8): Promise<StoreCard[]> {
  // Cap the client-supplied list before it reaches an inArray — a real bag is
  // tiny, so anything beyond a sane bound is noise or abuse.
  const unique = [...new Set(bagIds)].slice(0, 50)

  if (unique.length > 0) {
    const cats = await db
      .selectDistinct({ categoryId: products.categoryId })
      .from(products)
      .where(inArray(products.id, unique))
    const categoryIds = cats.map((c) => c.categoryId).filter((c): c is string => c !== null)

    if (categoryIds.length > 0) {
      return db
        .select(suggestionColumns)
        .from(products)
        .where(
          and(
            eq(products.visible, true),
            inArray(products.categoryId, categoryIds),
            notInArray(products.id, unique)
          )
        )
        .orderBy(desc(products.featured), desc(products.createdAt))
        .limit(limit)
    }
  }

  return db
    .select(suggestionColumns)
    .from(products)
    .where(
      and(eq(products.visible, true), unique.length ? notInArray(products.id, unique) : undefined)
    )
    .orderBy(desc(products.featured), desc(products.createdAt))
    .limit(limit)
}
