'use server'

import { revalidatePath } from 'next/cache'
import { asc, eq } from 'drizzle-orm'

import { db } from '@/lib/db'
import {
  productImages,
  products,
  productVariantGroups,
  productVariantOptions,
} from '@/lib/db/schema'
import { createAdminClient } from '@/lib/supabase/admin'
import { productFormSchema } from './products.schema'
import { requireAdmin } from '@/features/auth/services/admin-guard'
import { slugify } from '@/shared/lib/slug'
import { tempId } from '@/shared/lib/id'
import { firstZodError, isUniqueViolation } from '@/shared/lib/error'

const SLUG_CONFLICT = 'A product with that slug already exists.'
const SAVE_FAILED = 'Could not save the product. Please try again.'

// Build the product payload from the submitted FormData and validate it.
// `slugFallback` slugifies the name when no slug is supplied (create flow);
// update passes it through untouched so an admin can't silently re-slug on edit.
function parseProductForm(formData: FormData, { slugFallback }: { slugFallback: boolean }) {
  const name = formData.get('name')
  const slug = formData.get('slug')
  return productFormSchema.safeParse({
    name,
    slug: slugFallback ? slug || slugify(String(name)) : slug,
    description: formData.get('description') || undefined,
    price: formData.get('price'),
    categoryId: formData.get('categoryId') || null,
    visible: formData.get('visible') === 'true',
  })
}

function revalidateProductEdit(id: string) {
  revalidatePath(`/admin/products/${id}/edit`)
}

export async function createProduct(formData: FormData) {
  const gate = await requireAdmin()
  if (gate.error) return { error: gate.error, id: null }

  const parsed = parseProductForm(formData, { slugFallback: true })
  if (!parsed.success) {
    return { error: firstZodError(parsed.error), id: null }
  }

  try {
    const [product] = await db
      .insert(products)
      .values({
        name: parsed.data.name,
        slug: parsed.data.slug,
        description: parsed.data.description,
        price: parsed.data.price,
        categoryId: parsed.data.categoryId ?? null,
        visible: parsed.data.visible,
      })
      .returning({ id: products.id })

    revalidatePath('/admin/products')
    return { error: null, id: product.id }
  } catch (err) {
    return { error: isUniqueViolation(err) ? SLUG_CONFLICT : SAVE_FAILED, id: null }
  }
}

// Create a product together with its images and variant groups in a single DB
// transaction so a mid-chain failure can't leave an orphaned half-product (the
// old client-side create → upload → variant chain could). Files are uploaded to
// storage first (storage isn't transactional); on a DB failure the uploaded
// objects are best-effort removed. `variantGroups` is a JSON array of
// { name, options: string[] }.
export async function createFullProduct(formData: FormData) {
  const gate = await requireAdmin()
  if (gate.error) return { error: gate.error, id: null }

  const parsed = parseProductForm(formData, { slugFallback: true })
  if (!parsed.success) {
    return { error: firstZodError(parsed.error), id: null }
  }

  let groups: { name: string; options: string[] }[] = []
  const groupsRaw = formData.get('variantGroups')
  if (typeof groupsRaw === 'string' && groupsRaw) {
    try {
      groups = JSON.parse(groupsRaw)
    } catch {
      return { error: 'Invalid variant data', id: null }
    }
  }

  const productId = tempId()

  // Upload images to storage before opening the transaction. Keep the paths so a
  // DB failure can clean them up.
  const files = formData.getAll('files').filter((f): f is File => f instanceof File)
  const supabase = createAdminClient()
  const uploadedPaths: string[] = []
  const imageRows: { url: string; position: number }[] = []
  for (const [index, file] of files.entries()) {
    const ext = file.name.split('.').pop()
    const path = `${productId}/${Date.now()}-${index}.${ext}`
    const { error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(path, file, { contentType: file.type, upsert: false })
    if (uploadError) {
      if (uploadedPaths.length) await supabase.storage.from('product-images').remove(uploadedPaths)
      return { error: uploadError.message, id: null }
    }
    uploadedPaths.push(path)
    const {
      data: { publicUrl },
    } = supabase.storage.from('product-images').getPublicUrl(path)
    imageRows.push({ url: publicUrl, position: index })
  }

  try {
    await db.transaction(async (tx) => {
      await tx.insert(products).values({
        id: productId,
        name: parsed.data.name,
        slug: parsed.data.slug,
        description: parsed.data.description,
        price: parsed.data.price,
        categoryId: parsed.data.categoryId ?? null,
        visible: parsed.data.visible,
      })

      if (imageRows.length) {
        await tx
          .insert(productImages)
          .values(imageRows.map((r) => ({ productId, url: r.url, position: r.position })))
      }

      for (const [groupIndex, group] of groups.entries()) {
        const [created] = await tx
          .insert(productVariantGroups)
          .values({ productId, name: group.name, position: groupIndex })
          .returning({ id: productVariantGroups.id })
        if (created && group.options.length) {
          await tx.insert(productVariantOptions).values(
            group.options.map((value, optionIndex) => ({
              groupId: created.id,
              value,
              position: optionIndex,
            }))
          )
        }
      }
    })
  } catch (err) {
    if (uploadedPaths.length) await supabase.storage.from('product-images').remove(uploadedPaths)
    return { error: isUniqueViolation(err) ? SLUG_CONFLICT : SAVE_FAILED, id: null }
  }

  revalidatePath('/admin/products')
  return { error: null, id: productId }
}

export async function updateProduct(id: string, formData: FormData) {
  const gate = await requireAdmin()
  if (gate.error) return { error: gate.error }

  const parsed = parseProductForm(formData, { slugFallback: false })
  if (!parsed.success) {
    return { error: firstZodError(parsed.error) }
  }

  try {
    await db
      .update(products)
      .set({
        name: parsed.data.name,
        slug: parsed.data.slug,
        description: parsed.data.description,
        price: parsed.data.price,
        categoryId: parsed.data.categoryId ?? null,
        visible: parsed.data.visible,
        updatedAt: new Date(),
      })
      .where(eq(products.id, id))
  } catch (err) {
    return { error: isUniqueViolation(err) ? SLUG_CONFLICT : SAVE_FAILED }
  }

  revalidatePath('/admin/products')
  revalidateProductEdit(id)
  return { error: null }
}

export async function toggleProductVisibility(id: string, visible: boolean) {
  const gate = await requireAdmin()
  if (gate.error) return { error: gate.error }
  await db.update(products).set({ visible, updatedAt: new Date() }).where(eq(products.id, id))
  revalidatePath('/admin/products')
  return { error: null }
}

// Pin/unpin a product so it sorts ahead of the rest in the storefront home feed.
export async function toggleProductFeatured(id: string, featured: boolean) {
  const gate = await requireAdmin()
  if (gate.error) return { error: gate.error }
  await db.update(products).set({ featured, updatedAt: new Date() }).where(eq(products.id, id))
  revalidatePath('/admin/products')
  revalidatePath('/')
  return { error: null }
}

export async function deleteProduct(id: string) {
  const gate = await requireAdmin()
  if (gate.error) return { error: gate.error }
  // Images are cascade-deleted by DB constraint
  await db.delete(products).where(eq(products.id, id))
  revalidatePath('/admin/products')
  return { error: null }
}

export async function uploadProductImage(productId: string, formData: FormData, position?: number) {
  const gate = await requireAdmin()
  if (gate.error) return { error: gate.error, url: null }

  const file = formData.get('file') as File | null
  if (!file) return { error: 'No file provided', url: null }

  const ext = file.name.split('.').pop()
  // Include the caller-supplied position in the key so a parallel batch landing
  // in the same millisecond can't collide on the storage path.
  const suffix = position === undefined ? '' : `-${position}`
  const path = `${productId}/${Date.now()}${suffix}.${ext}`

  const supabase = createAdminClient()
  const { error: uploadError } = await supabase.storage
    .from('product-images')
    .upload(path, file, { contentType: file.type, upsert: false })

  if (uploadError) return { error: uploadError.message, url: null }

  const {
    data: { publicUrl },
  } = supabase.storage.from('product-images').getPublicUrl(path)

  // Trust the caller's position when given (the create flow knows the order of
  // its staged files); otherwise look up the next slot after existing images.
  let resolvedPosition = position
  if (resolvedPosition === undefined) {
    const existing = await db
      .select({ position: productImages.position })
      .from(productImages)
      .where(eq(productImages.productId, productId))
      .orderBy(asc(productImages.position))

    resolvedPosition = existing.length > 0 ? (existing[existing.length - 1]?.position ?? -1) + 1 : 0
  }

  await db.insert(productImages).values({
    productId,
    url: publicUrl,
    position: resolvedPosition,
  })

  revalidateProductEdit(productId)
  return { error: null, url: publicUrl }
}

export async function setProductImageOption(imageId: string, optionId: string | null) {
  const gate = await requireAdmin()
  if (gate.error) return { error: gate.error }

  const rows = await db
    .select({ productId: productImages.productId })
    .from(productImages)
    .where(eq(productImages.id, imageId))
    .limit(1)

  if (!rows[0]) return { error: 'Image not found' }

  await db.update(productImages).set({ optionId }).where(eq(productImages.id, imageId))

  revalidateProductEdit(rows[0].productId)
  return { error: null }
}

export async function deleteProductImage(imageId: string) {
  const gate = await requireAdmin()
  if (gate.error) return { error: gate.error }

  const rows = await db
    .select({ url: productImages.url, productId: productImages.productId })
    .from(productImages)
    .where(eq(productImages.id, imageId))
    .limit(1)

  if (!rows[0]) return { error: 'Image not found' }

  const { url, productId } = rows[0]

  // Extract storage path from public URL
  const storagePathMatch = url.match(/product-images\/(.+)$/)
  if (storagePathMatch) {
    const supabase = createAdminClient()
    await supabase.storage.from('product-images').remove([storagePathMatch[1]])
  }

  await db.delete(productImages).where(eq(productImages.id, imageId))

  revalidateProductEdit(productId)
  return { error: null }
}

export async function reorderProductImages(orderedIds: string[]) {
  const gate = await requireAdmin()
  if (gate.error) return { error: gate.error }

  await Promise.all(
    orderedIds.map((id, position) =>
      db.update(productImages).set({ position }).where(eq(productImages.id, id))
    )
  )

  if (orderedIds.length > 0) {
    const first = await db
      .select({ productId: productImages.productId })
      .from(productImages)
      .where(eq(productImages.id, orderedIds[0]!))
      .limit(1)

    if (first[0]) {
      revalidateProductEdit(first[0].productId)
    }
  }
  return { error: null }
}

export async function bulkUpdateProducts(
  updates: {
    id: string
    slug: string
    name: string
    price: string
    categoryId: string | null
    visible: boolean
  }[]
) {
  const gate = await requireAdmin()
  if (gate.error) return { error: gate.error }

  if (updates.length === 0) return { error: null }

  const trimmed = updates.map((u) => ({ ...u, name: u.name.trim() }))
  const invalid = trimmed.find((u) => !u.name || !u.price || isNaN(Number(u.price)))
  if (invalid) return { error: `"${invalid.name || 'A product'}" has an invalid name or price.` }

  try {
    await Promise.all(
      trimmed.map(({ id, slug, name, price, categoryId, visible }) =>
        db
          .update(products)
          .set({ name, slug, price, categoryId, visible, updatedAt: new Date() })
          .where(eq(products.id, id))
      )
    )
    revalidatePath('/admin/products')
    return { error: null }
  } catch {
    return { error: 'Failed to save changes.' }
  }
}
