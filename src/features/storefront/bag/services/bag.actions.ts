'use server'

import { and, eq, inArray } from 'drizzle-orm'

import { db } from '@/lib/db'
import { products } from '@/lib/db/schema'

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
