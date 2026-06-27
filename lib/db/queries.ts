import { and, asc, count, desc, eq, exists, gte, inArray, lte, sql } from 'drizzle-orm'

import { db } from '@/lib/db'
import {
  categories,
  categoryFilterOptions,
  categoryFilters,
  chatMessageItems,
  chatMessages,
  chatSessions,
  productFilterValues,
  productImages,
  products,
  productVariantGroups,
  productVariantOptions,
} from '@/lib/db/schema'
import type { InquiryItem } from '@/components/ProductInquiryCard'

export interface CategoryFilter {
  id: string
  name: string
  options: { id: string; value: string }[]
}

function groupFilters(
  filters: { id: string; categoryId: string; name: string }[],
  options: { id: string; filterId: string; value: string }[]
): (CategoryFilter & { categoryId: string })[] {
  return filters.map((f) => ({
    id: f.id,
    categoryId: f.categoryId,
    name: f.name,
    options: options.filter((o) => o.filterId === f.id).map((o) => ({ id: o.id, value: o.value })),
  }))
}

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

export async function getCategoryFilters(categoryId: string): Promise<CategoryFilter[]> {
  const filters = await db
    .select({
      id: categoryFilters.id,
      categoryId: categoryFilters.categoryId,
      name: categoryFilters.name,
    })
    .from(categoryFilters)
    .where(eq(categoryFilters.categoryId, categoryId))
    .orderBy(asc(categoryFilters.position))

  if (filters.length === 0) return []

  const options = await db
    .select({
      id: categoryFilterOptions.id,
      filterId: categoryFilterOptions.filterId,
      value: categoryFilterOptions.value,
    })
    .from(categoryFilterOptions)
    .where(
      inArray(
        categoryFilterOptions.filterId,
        filters.map((f) => f.id)
      )
    )
    .orderBy(asc(categoryFilterOptions.position))

  return groupFilters(filters, options).map((f) => ({ id: f.id, name: f.name, options: f.options }))
}

export async function getAllCategoryFilters() {
  const [filters, options] = await Promise.all([
    db
      .select({
        id: categoryFilters.id,
        categoryId: categoryFilters.categoryId,
        name: categoryFilters.name,
      })
      .from(categoryFilters)
      .orderBy(asc(categoryFilters.position)),
    db
      .select({
        id: categoryFilterOptions.id,
        filterId: categoryFilterOptions.filterId,
        value: categoryFilterOptions.value,
      })
      .from(categoryFilterOptions)
      .orderBy(asc(categoryFilterOptions.position)),
  ])

  return groupFilters(filters, options)
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

  const [images, groups, filterValues] = await Promise.all([
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
    db
      .select({ optionId: productFilterValues.optionId })
      .from(productFilterValues)
      .where(eq(productFilterValues.productId, id)),
  ])

  const filterOptionIds = filterValues.map((v) => v.optionId)

  const groupIds = groups.map((g) => g.id)
  const options = groupIds.length
    ? await db
        .select({
          id: productVariantOptions.id,
          groupId: productVariantOptions.groupId,
          value: productVariantOptions.value,
          imageId: productVariantOptions.imageId,
          hex: productVariantOptions.hex,
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
      .map((o) => ({ id: o.id, value: o.value, imageId: o.imageId, hex: o.hex })),
  }))

  return { ...rows[0], images, variantGroups, filterOptionIds }
}

// ============================================================
// Storefront read layer
// Drizzle bypasses RLS (connects as table owner), so every read here MUST
// explicitly filter products.visible = true.
// ============================================================

export interface StoreCard {
  id: string
  name: string
  slug: string
  price: string
  thumbnail: string | null
  hexes: string[]
}

export interface CategoryProductFilters {
  optionIds?: string[]
  hexes?: string[]
  minPrice?: number
  maxPrice?: number
  sort?: 'newest' | 'price-asc' | 'price-desc'
}

// Outer table is referenced literally as products.id (not interpolated) because
// these standalone sql fragments otherwise render the column unqualified as "id",
// which is ambiguous inside the joined subqueries.
const thumbnailSql = sql<string | null>`(
  SELECT url FROM product_images
  WHERE product_id = products.id
  ORDER BY position ASC
  LIMIT 1
)`.as('thumbnail')

// Distinct colour swatch hexes for a product, in option order.
const hexesSql = sql<string[]>`coalesce((
  SELECT array_agg(o.hex ORDER BY o.position)
  FROM product_variant_options o
  JOIN product_variant_groups g ON g.id = o.group_id
  WHERE g.product_id = products.id
    AND g.name = 'Colour'
    AND o.hex IS NOT NULL
), '{}')`.as('hexes')

export async function getHomeFeed(limit = 20): Promise<StoreCard[]> {
  return db
    .select({
      id: products.id,
      name: products.name,
      slug: products.slug,
      price: products.price,
      thumbnail: thumbnailSql,
      hexes: hexesSql,
    })
    .from(products)
    .where(eq(products.visible, true))
    .orderBy(desc(products.createdAt))
    .limit(limit)
}

export async function getCategoryIndex() {
  return db
    .select({
      id: categories.id,
      name: categories.name,
      slug: categories.slug,
      productCount: sql<number>`(
        SELECT COUNT(*)::int FROM products p
        WHERE p.category_id = categories.id AND p.visible = true
      )`.as('product_count'),
      image: sql<string | null>`(
        SELECT i.url FROM product_images i
        JOIN products p ON p.id = i.product_id
        WHERE p.category_id = categories.id AND p.visible = true
        ORDER BY p.created_at DESC, i.position ASC
        LIMIT 1
      )`.as('image'),
    })
    .from(categories)
    .orderBy(asc(categories.name))
}

export async function getCategoryBySlug(slug: string) {
  const rows = await db
    .select({ id: categories.id, name: categories.name, slug: categories.slug })
    .from(categories)
    .where(eq(categories.slug, slug))
    .limit(1)

  return rows[0] ?? null
}

export async function getCategoryProducts(
  categoryId: string,
  filters: CategoryProductFilters = {}
): Promise<StoreCard[]> {
  const conditions = [eq(products.visible, true), eq(products.categoryId, categoryId)]

  if (filters.minPrice != null) conditions.push(gte(products.price, String(filters.minPrice)))
  if (filters.maxPrice != null) conditions.push(lte(products.price, String(filters.maxPrice)))

  // Facets: OR within a facet, AND across facets. Group the selected option ids
  // by their parent filter, then require a match in each group.
  if (filters.optionIds?.length) {
    const selected = await db
      .select({ id: categoryFilterOptions.id, filterId: categoryFilterOptions.filterId })
      .from(categoryFilterOptions)
      .where(inArray(categoryFilterOptions.id, filters.optionIds))

    const byFacet = new Map<string, string[]>()
    for (const opt of selected) {
      const list = byFacet.get(opt.filterId) ?? []
      list.push(opt.id)
      byFacet.set(opt.filterId, list)
    }

    for (const ids of byFacet.values()) {
      conditions.push(
        exists(
          db
            .select({ n: sql`1` })
            .from(productFilterValues)
            .where(
              and(
                eq(productFilterValues.productId, products.id),
                inArray(productFilterValues.optionId, ids)
              )
            )
        )
      )
    }
  }

  if (filters.hexes?.length) {
    conditions.push(
      exists(
        db
          .select({ n: sql`1` })
          .from(productVariantOptions)
          .innerJoin(
            productVariantGroups,
            eq(productVariantGroups.id, productVariantOptions.groupId)
          )
          .where(
            and(
              eq(productVariantGroups.productId, products.id),
              inArray(productVariantOptions.hex, filters.hexes)
            )
          )
      )
    )
  }

  const orderBy =
    filters.sort === 'price-asc'
      ? asc(products.price)
      : filters.sort === 'price-desc'
        ? desc(products.price)
        : desc(products.createdAt)

  return db
    .select({
      id: products.id,
      name: products.name,
      slug: products.slug,
      price: products.price,
      thumbnail: thumbnailSql,
      hexes: hexesSql,
    })
    .from(products)
    .where(and(...conditions))
    .orderBy(orderBy)
}

export interface CategoryProductMeta {
  id: string
  price: string
  optionIds: string[]
  hexes: string[]
}

// Lightweight per-product facet metadata for the whole visible category, used by
// the filter sheet to compute the live "Show N results" count client-side. The
// server render of the grid stays authoritative via getCategoryProducts.
export async function getCategoryProductMeta(categoryId: string): Promise<CategoryProductMeta[]> {
  return db
    .select({
      id: products.id,
      price: products.price,
      optionIds: sql<string[]>`coalesce((
        SELECT array_agg(option_id) FROM product_filter_values
        WHERE product_id = products.id
      ), '{}')`.as('option_ids'),
      hexes: hexesSql,
    })
    .from(products)
    .where(and(eq(products.visible, true), eq(products.categoryId, categoryId)))
}

export async function getProductBySlug(slug: string) {
  const rows = await db
    .select({
      id: products.id,
      name: products.name,
      slug: products.slug,
      description: products.description,
      price: products.price,
      categoryId: products.categoryId,
    })
    .from(products)
    .where(and(eq(products.slug, slug), eq(products.visible, true)))
    .limit(1)

  if (!rows[0]) return null

  const product = rows[0]

  const [images, groups] = await Promise.all([
    db
      .select({
        id: productImages.id,
        url: productImages.url,
        alt: productImages.alt,
        optionId: productImages.optionId,
      })
      .from(productImages)
      .where(eq(productImages.productId, product.id))
      .orderBy(asc(productImages.position)),
    db
      .select({
        id: productVariantGroups.id,
        name: productVariantGroups.name,
        position: productVariantGroups.position,
      })
      .from(productVariantGroups)
      .where(eq(productVariantGroups.productId, product.id))
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
          hex: productVariantOptions.hex,
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
      .map((o) => ({ id: o.id, value: o.value, imageId: o.imageId, hex: o.hex })),
  }))

  return { ...product, images, variantGroups }
}

export async function getAllChatSessions() {
  return db
    .select({
      id: chatSessions.id,
      guestName: chatSessions.guestName,
      createdAt: chatSessions.createdAt,
      lastMessageAt: chatSessions.lastMessageAt,
      // Qualify chat_sessions.id explicitly: an unqualified `id` binds to the
      // inner chat_messages.id and the correlation silently returns null.
      lastMessage: sql<string | null>`(
        SELECT content FROM chat_messages
        WHERE chat_messages.session_id = chat_sessions.id
        ORDER BY created_at DESC
        LIMIT 1
      )`.as('last_message'),
      // Customer messages newer than the seller's last reply — i.e. what's
      // still waiting on a response. Needs no read-tracking column.
      unreadCount: sql<number>`(
        SELECT count(*)::int FROM chat_messages
        WHERE chat_messages.session_id = chat_sessions.id
          AND chat_messages.from_admin = false
          AND chat_messages.created_at > COALESCE(
            (SELECT max(created_at) FROM chat_messages
             WHERE chat_messages.session_id = chat_sessions.id
               AND chat_messages.from_admin = true),
            'epoch'
          )
      )`.as('unread_count'),
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
  const messages = await db
    .select({
      id: chatMessages.id,
      content: chatMessages.content,
      fromAdmin: chatMessages.fromAdmin,
      createdAt: chatMessages.createdAt,
    })
    .from(chatMessages)
    .where(eq(chatMessages.sessionId, sessionId))
    .orderBy(asc(chatMessages.createdAt))

  if (messages.length === 0) return messages.map((m) => ({ ...m, items: [] as InquiryItem[] }))

  const rows = await db
    .select({
      id: chatMessageItems.id,
      messageId: chatMessageItems.messageId,
      productId: chatMessageItems.productId,
      nameSnapshot: chatMessageItems.nameSnapshot,
      colorValue: chatMessageItems.colorValue,
      sizeValue: chatMessageItems.sizeValue,
      priceSnapshot: chatMessageItems.priceSnapshot,
      imageUrlSnapshot: chatMessageItems.imageUrlSnapshot,
      slug: products.slug,
      visible: products.visible,
    })
    .from(chatMessageItems)
    .leftJoin(products, eq(products.id, chatMessageItems.productId))
    .where(
      inArray(
        chatMessageItems.messageId,
        messages.map((m) => m.id)
      )
    )
    .orderBy(asc(chatMessageItems.position))

  const itemsByMessage = new Map<string, InquiryItem[]>()
  for (const row of rows) {
    const item: InquiryItem = {
      id: row.id,
      productId: row.productId,
      slug: row.productId && row.visible ? row.slug : null,
      name: row.nameSnapshot,
      colorValue: row.colorValue,
      sizeValue: row.sizeValue,
      price: row.priceSnapshot,
      imageUrl: row.imageUrlSnapshot,
    }
    const list = itemsByMessage.get(row.messageId) ?? []
    list.push(item)
    itemsByMessage.set(row.messageId, list)
  }

  return messages.map((m) => ({ ...m, items: itemsByMessage.get(m.id) ?? [] }))
}
