'use server'

import { revalidatePath } from 'next/cache'
import { and, asc, eq } from 'drizzle-orm'

import { db } from '@/lib/db'
import { productVariantGroups, productVariantOptions } from '@/lib/db/schema'
import { hexColorSchema, variantGroupSchema, variantOptionSchema } from './variants.schema'
import { requireAdmin } from '@/features/auth/services/admin-guard'
import { firstZodError } from '@/shared/lib/error'

async function nextPosition(rows: { position: number }[]) {
  return rows.length > 0 ? (rows[rows.length - 1]?.position ?? -1) + 1 : 0
}

export async function addVariantGroup(productId: string, name: string) {
  const gate = await requireAdmin()
  if (gate.error) return { error: gate.error, group: null }

  const parsed = variantGroupSchema.safeParse({ name })
  if (!parsed.success) return { error: firstZodError(parsed.error, 'Invalid'), group: null }

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

export async function reorderVariantGroups(productId: string, orderedIds: string[]) {
  const gate = await requireAdmin()
  if (gate.error) return { error: gate.error }

  try {
    await Promise.all(
      orderedIds.map((id, index) =>
        db
          .update(productVariantGroups)
          .set({ position: index })
          .where(
            and(eq(productVariantGroups.id, id), eq(productVariantGroups.productId, productId))
          )
      )
    )
  } catch {
    return { error: 'Could not reorder options' }
  }
  revalidatePath(`/admin/products/${productId}/edit`)
  return { error: null }
}

export async function deleteVariantGroup(id: string, productId: string) {
  const gate = await requireAdmin()
  if (gate.error) return { error: gate.error }

  try {
    await db.delete(productVariantGroups).where(eq(productVariantGroups.id, id))
  } catch {
    return { error: 'Could not delete group' }
  }
  revalidatePath(`/admin/products/${productId}/edit`)
  return { error: null }
}

export async function addVariantOption(groupId: string, productId: string, value: string) {
  const gate = await requireAdmin()
  if (gate.error) return { error: gate.error, option: null }

  const parsed = variantOptionSchema.safeParse({ value })
  if (!parsed.success) return { error: firstZodError(parsed.error, 'Invalid'), option: null }

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
  const gate = await requireAdmin()
  if (gate.error) return { error: gate.error }

  try {
    await db.delete(productVariantOptions).where(eq(productVariantOptions.id, id))
  } catch {
    return { error: 'Could not delete option' }
  }
  revalidatePath(`/admin/products/${productId}/edit`)
  return { error: null }
}

export async function setVariantOptionImage(
  optionId: string,
  productId: string,
  imageId: string | null
) {
  const gate = await requireAdmin()
  if (gate.error) return { error: gate.error }

  try {
    await db
      .update(productVariantOptions)
      .set({ imageId })
      .where(eq(productVariantOptions.id, optionId))
  } catch {
    return { error: 'Could not set option image' }
  }
  revalidatePath(`/admin/products/${productId}/edit`)
  return { error: null }
}

export async function setVariantOptionHex(optionId: string, productId: string, hex: string | null) {
  const gate = await requireAdmin()
  if (gate.error) return { error: gate.error }

  if (hex !== null) {
    const parsed = hexColorSchema.safeParse(hex)
    if (!parsed.success) return { error: firstZodError(parsed.error, 'Invalid colour') }
  }
  try {
    await db
      .update(productVariantOptions)
      .set({ hex })
      .where(eq(productVariantOptions.id, optionId))
  } catch {
    return { error: 'Could not set option colour' }
  }
  revalidatePath(`/admin/products/${productId}/edit`)
  return { error: null }
}
