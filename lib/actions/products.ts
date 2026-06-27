'use server'

import { revalidatePath } from 'next/cache'
import { asc, eq } from 'drizzle-orm'

import { db } from '@/lib/db'
import { productImages, products } from '@/lib/db/schema'
import { createAdminClient } from '@/lib/supabase/admin'
import { productFormSchema } from '@/lib/actions/products.schema'

function slugify(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export async function createProduct(formData: FormData) {
  const raw = {
    name: formData.get('name'),
    slug: formData.get('slug') || slugify(String(formData.get('name'))),
    description: formData.get('description') || undefined,
    price: formData.get('price'),
    categoryId: formData.get('categoryId') || null,
    visible: formData.get('visible') === 'true',
  }

  const parsed = productFormSchema.safeParse(raw)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input', id: null }
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
  } catch {
    return { error: 'A product with that slug already exists.', id: null }
  }
}

export async function updateProduct(id: string, formData: FormData) {
  const raw = {
    name: formData.get('name'),
    slug: formData.get('slug'),
    description: formData.get('description') || undefined,
    price: formData.get('price'),
    categoryId: formData.get('categoryId') || null,
    visible: formData.get('visible') === 'true',
  }

  const parsed = productFormSchema.safeParse(raw)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input' }
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
  } catch {
    return { error: 'A product with that slug already exists.' }
  }

  revalidatePath('/admin/products')
  revalidatePath(`/admin/products/${id}/edit`)
  return { error: null }
}

export async function toggleProductVisibility(id: string, visible: boolean) {
  await db.update(products).set({ visible, updatedAt: new Date() }).where(eq(products.id, id))
  revalidatePath('/admin/products')
}

export async function deleteProduct(id: string) {
  // Images are cascade-deleted by DB constraint
  await db.delete(products).where(eq(products.id, id))
  revalidatePath('/admin/products')
}

export async function uploadProductImage(productId: string, formData: FormData, position?: number) {
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

  revalidatePath(`/admin/products/${productId}/edit`)
  return { error: null, url: publicUrl }
}

export async function updateProductImageAlt(imageId: string, alt: string) {
  const rows = await db
    .select({ productId: productImages.productId })
    .from(productImages)
    .where(eq(productImages.id, imageId))
    .limit(1)

  if (!rows[0]) return { error: 'Image not found' }

  await db
    .update(productImages)
    .set({ alt: alt.trim() || null })
    .where(eq(productImages.id, imageId))

  revalidatePath(`/admin/products/${rows[0].productId}/edit`)
  return { error: null }
}

export async function setProductImageOption(imageId: string, optionId: string | null) {
  const rows = await db
    .select({ productId: productImages.productId })
    .from(productImages)
    .where(eq(productImages.id, imageId))
    .limit(1)

  if (!rows[0]) return { error: 'Image not found' }

  await db.update(productImages).set({ optionId }).where(eq(productImages.id, imageId))

  revalidatePath(`/admin/products/${rows[0].productId}/edit`)
  return { error: null }
}

export async function deleteProductImage(imageId: string) {
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

  revalidatePath(`/admin/products/${productId}/edit`)
  return { error: null }
}

export async function reorderProductImages(orderedIds: string[]) {
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
      revalidatePath(`/admin/products/${first[0].productId}/edit`)
    }
  }
}

export async function sendAdminMessage(sessionId: string, content: string) {
  const trimmed = content.trim()
  if (!trimmed) return { error: 'Message is empty', message: null }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('chat_messages')
    .insert({ session_id: sessionId, content: trimmed, from_admin: true })
    .select('id, content, from_admin, created_at')
    .single()

  if (error) return { error: error.message, message: null }

  await supabase
    .from('chat_sessions')
    .update({ last_message_at: new Date().toISOString() })
    .eq('id', sessionId)

  // Refresh the inbox preview/order and this conversation after the reply.
  revalidatePath('/admin/chat')
  revalidatePath(`/admin/chat/${sessionId}`)

  return {
    error: null,
    message: {
      id: data.id as string,
      content: data.content as string,
      fromAdmin: data.from_admin as boolean,
      createdAt: data.created_at as string,
    },
  }
}
