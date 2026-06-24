'use server'

import { revalidatePath } from 'next/cache'
import { asc, eq } from 'drizzle-orm'

import { db } from '@/lib/db'
import { productVariantGroups, productVariantOptions } from '@/lib/db/schema'
import { variantGroupSchema, variantOptionSchema } from '@/lib/actions/variants.schema'

async function nextPosition(rows: { position: number }[]) {
  return rows.length > 0 ? (rows[rows.length - 1]?.position ?? -1) + 1 : 0
}

export async function addVariantGroup(productId: string, name: string) {
  const parsed = variantGroupSchema.safeParse({ name })
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid', group: null }

  const existing = await db
    .select({ position: productVariantGroups.position })
    .from(productVariantGroups)
    .where(eq(productVariantGroups.productId, productId))
    .orderBy(asc(productVariantGroups.position))

  const [group] = await db
    .insert(productVariantGroups)
    .values({ productId, name: parsed.data.name, position: await nextPosition(existing) })
    .returning()

  revalidatePath(`/admin/products/${productId}/edit`)
  return { error: null, group: { ...group, options: [] as { id: string; value: string }[] } }
}

export async function deleteVariantGroup(id: string, productId: string) {
  try {
    await db.delete(productVariantGroups).where(eq(productVariantGroups.id, id))
  } catch {
    return { error: 'Could not delete group' }
  }
  revalidatePath(`/admin/products/${productId}/edit`)
  return { error: null }
}

export async function addVariantOption(groupId: string, productId: string, value: string) {
  const parsed = variantOptionSchema.safeParse({ value })
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid', option: null }

  const existing = await db
    .select({ position: productVariantOptions.position })
    .from(productVariantOptions)
    .where(eq(productVariantOptions.groupId, groupId))
    .orderBy(asc(productVariantOptions.position))

  const [option] = await db
    .insert(productVariantOptions)
    .values({ groupId, value: parsed.data.value, position: await nextPosition(existing) })
    .returning({ id: productVariantOptions.id, value: productVariantOptions.value })

  revalidatePath(`/admin/products/${productId}/edit`)
  return { error: null, option }
}

export async function deleteVariantOption(id: string, productId: string) {
  try {
    await db.delete(productVariantOptions).where(eq(productVariantOptions.id, id))
  } catch {
    return { error: 'Could not delete option' }
  }
  revalidatePath(`/admin/products/${productId}/edit`)
  return { error: null }
}
