import { asc, count, desc, eq, inArray, sql } from 'drizzle-orm'

import { db } from '@/lib/db'
import {
  categories,
  chatMessages,
  chatSessions,
  productImages,
  products,
  productVariantGroups,
  productVariantOptions,
} from '@/lib/db/schema'

export async function getDashboardStats() {
  const [productResult, categoryResult, chatResult] = await Promise.all([
    db.select({ count: count() }).from(products),
    db.select({ count: count() }).from(categories),
    db.select({ count: count() }).from(chatSessions),
  ])

  return {
    productCount: productResult[0].count,
    categoryCount: categoryResult[0].count,
    chatCount: chatResult[0].count,
  }
}

export async function getRecentProducts(limit = 5) {
  return db
    .select({
      id: products.id,
      name: products.name,
      price: products.price,
      visible: products.visible,
      createdAt: products.createdAt,
      categoryName: categories.name,
      thumbnail: sql<string | null>`(
        SELECT url FROM product_images
        WHERE product_id = ${products.id}
        ORDER BY position ASC
        LIMIT 1
      )`.as('thumbnail'),
    })
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .orderBy(desc(products.createdAt))
    .limit(limit)
}

export async function getAllCategories() {
  return db
    .select({
      id: categories.id,
      name: categories.name,
      slug: categories.slug,
      createdAt: categories.createdAt,
      productCount: count(products.id),
    })
    .from(categories)
    .leftJoin(products, eq(products.categoryId, categories.id))
    .groupBy(categories.id, categories.name, categories.slug, categories.createdAt)
    .orderBy(asc(categories.name))
}

export async function getAllProducts() {
  return db
    .select({
      id: products.id,
      name: products.name,
      slug: products.slug,
      price: products.price,
      visible: products.visible,
      createdAt: products.createdAt,
      categoryId: products.categoryId,
      categoryName: categories.name,
      thumbnail: sql<string | null>`(
        SELECT url FROM product_images
        WHERE product_id = ${products.id}
        ORDER BY position ASC
        LIMIT 1
      )`.as('thumbnail'),
      variantCount: sql<number>`(
        SELECT COUNT(*)::int FROM product_variant_options o
        JOIN product_variant_groups g ON g.id = o.group_id
        WHERE g.product_id = ${products.id}
      )`.as('variant_count'),
    })
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .orderBy(desc(products.createdAt))
}

export async function getProductById(id: string) {
  const rows = await db
    .select({
      id: products.id,
      name: products.name,
      slug: products.slug,
      description: products.description,
      price: products.price,
      visible: products.visible,
      categoryId: products.categoryId,
      createdAt: products.createdAt,
      updatedAt: products.updatedAt,
    })
    .from(products)
    .where(eq(products.id, id))
    .limit(1)

  if (!rows[0]) return null

  const [images, groups] = await Promise.all([
    db
      .select()
      .from(productImages)
      .where(eq(productImages.productId, id))
      .orderBy(asc(productImages.position)),
    db
      .select({
        id: productVariantGroups.id,
        name: productVariantGroups.name,
        position: productVariantGroups.position,
      })
      .from(productVariantGroups)
      .where(eq(productVariantGroups.productId, id))
      .orderBy(asc(productVariantGroups.position)),
  ])

  const groupIds = groups.map((g) => g.id)
  const options = groupIds.length
    ? await db
        .select({
          id: productVariantOptions.id,
          groupId: productVariantOptions.groupId,
          value: productVariantOptions.value,
          imageId: productVariantOptions.imageId,
        })
        .from(productVariantOptions)
        .where(inArray(productVariantOptions.groupId, groupIds))
        .orderBy(asc(productVariantOptions.position))
    : []

  const variantGroups = groups.map((group) => ({
    id: group.id,
    name: group.name,
    options: options
      .filter((o) => o.groupId === group.id)
      .map((o) => ({ id: o.id, value: o.value, imageId: o.imageId })),
  }))

  return { ...rows[0], images, variantGroups }
}

export async function getAllChatSessions() {
  return db
    .select({
      id: chatSessions.id,
      guestName: chatSessions.guestName,
      createdAt: chatSessions.createdAt,
      lastMessageAt: chatSessions.lastMessageAt,
      lastMessage: sql<string | null>`(
        SELECT content FROM chat_messages
        WHERE session_id = ${chatSessions.id}
        ORDER BY created_at DESC
        LIMIT 1
      )`.as('last_message'),
    })
    .from(chatSessions)
    .orderBy(sql`${chatSessions.lastMessageAt} desc nulls last`, desc(chatSessions.createdAt))
}

export async function getChatSession(id: string) {
  const rows = await db
    .select({
      id: chatSessions.id,
      guestName: chatSessions.guestName,
      createdAt: chatSessions.createdAt,
    })
    .from(chatSessions)
    .where(eq(chatSessions.id, id))
    .limit(1)

  return rows[0] ?? null
}

export async function getChatMessages(sessionId: string) {
  return db
    .select({
      id: chatMessages.id,
      content: chatMessages.content,
      fromAdmin: chatMessages.fromAdmin,
      createdAt: chatMessages.createdAt,
    })
    .from(chatMessages)
    .where(eq(chatMessages.sessionId, sessionId))
    .orderBy(asc(chatMessages.createdAt))
}
