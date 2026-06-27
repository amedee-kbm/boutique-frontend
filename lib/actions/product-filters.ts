'use server'

import { revalidatePath } from 'next/cache'
import { and, eq } from 'drizzle-orm'

import { db } from '@/lib/db'
import { productFilterValues } from '@/lib/db/schema'

export async function setProductFilterValue(
  productId: string,
  optionId: string,
  selected: boolean
) {
  try {
    if (selected) {
      await db.insert(productFilterValues).values({ productId, optionId }).onConflictDoNothing()
    } else {
      await db
        .delete(productFilterValues)
        .where(
          and(
            eq(productFilterValues.productId, productId),
            eq(productFilterValues.optionId, optionId)
          )
        )
    }
  } catch {
    return { error: 'Could not update filter' }
  }
  revalidatePath(`/admin/products/${productId}/edit`)
  return { error: null }
}
