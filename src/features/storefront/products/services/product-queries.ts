import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm'

import { db } from '@/lib/db'
import {
  categories,
  homeFilters,
  productImages,
  products,
  productVariantGroups,
  productVariantOptions,
} from '@/lib/db/schema'

// Storefront read layer for product cards + the product detail page.
// Drizzle bypasses RLS (connects as table owner), so every read here MUST
// explicitly filter products.visible = true.

export interface StoreCard {
  id: string
  name: string
  slug: string
  price: string
  thumbnail: string | null
  hexes: string[]
}

// Outer table is referenced literally as products.id (not interpolated) because
// these standalone sql fragments otherwise render the column unqualified as "id",
// which is ambiguous inside the joined subqueries.
export const thumbnailSql = sql<string | null>`(
  SELECT url FROM product_images
  WHERE product_id = products.id
  ORDER BY position ASC
  LIMIT 1
)`.as('thumbnail')

// Distinct colour swatch hexes for a product, in option order.
export const hexesSql = sql<string[]>`coalesce((
  SELECT array_agg(o.hex ORDER BY o.position)
  FROM product_variant_options o
  JOIN product_variant_groups g ON g.id = o.group_id
  WHERE g.product_id = products.id
    AND g.name = 'Colour'
    AND o.hex IS NOT NULL
), '{}')`.as('hexes')

// Size option values for a product, in option order. Home cards need these so
// the "+" quick-add can open a size sheet without a second round-trip.
export const sizesSql = sql<string[]>`coalesce((
  SELECT array_agg(o.value ORDER BY o.position)
  FROM product_variant_options o
  JOIN product_variant_groups g ON g.id = o.group_id
  WHERE g.product_id = products.id
    AND g.name = 'Size'
), '{}')`.as('sizes')

export interface HomeCard extends StoreCard {
  sizes: string[]
}

export async function getHomeFeed(limit = 20): Promise<HomeCard[]> {
  return db
    .select({
      id: products.id,
      name: products.name,
      slug: products.slug,
      price: products.price,
      thumbnail: thumbnailSql,
      hexes: hexesSql,
      sizes: sizesSql,
    })
    .from(products)
    .where(eq(products.visible, true))
    .orderBy(desc(products.featured), desc(products.createdAt))
    .limit(limit)
}

export interface HomeFilter {
  label: string
  href: string
}

// The home top filter strip. The seller edits it in the admin merchandising
// screen (home_filters table). When that table is empty the strip falls back to
// the visible category index so it is never blank.
export async function getHomeFilters(): Promise<HomeFilter[]> {
  const configured = await db
    .select({ label: homeFilters.label, href: homeFilters.href })
    .from(homeFilters)
    .where(eq(homeFilters.visible, true))
    .orderBy(asc(homeFilters.position))

  if (configured.length > 0) return configured

  const rows = await db
    .select({
      name: categories.name,
      slug: categories.slug,
      productCount: sql<number>`(
        SELECT COUNT(*)::int FROM products p
        WHERE p.category_id = categories.id AND p.visible = true
      )`.as('product_count'),
    })
    .from(categories)
    .orderBy(asc(categories.name))

  return rows
    .filter((r) => r.productCount > 0)
    .map((r) => ({ label: r.name, href: `/category/${r.slug}` }))
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

export interface SwipeCard {
  slug: string
  name: string
  price: string
  thumbnail: string | null
}

// The ordered same-category product list that backs the PDP swipe pager (P4):
// the main area swipes between these, the thumbnail strip mirrors them. Returns
// [] when the product has no category so the pager degrades to a single product.
// Order matches the category feed (newest first) so swipe + strip stay aligned.
export async function getCategorySwipeList(categoryId: string | null): Promise<SwipeCard[]> {
  if (!categoryId) return []
  return db
    .select({
      slug: products.slug,
      name: products.name,
      price: products.price,
      thumbnail: thumbnailSql,
    })
    .from(products)
    .where(and(eq(products.visible, true), eq(products.categoryId, categoryId)))
    .orderBy(desc(products.createdAt))
}
