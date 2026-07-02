import { and, asc, desc, eq, exists, gte, inArray, lte, sql } from 'drizzle-orm'

import { db } from '@/lib/db'
import {
  categories,
  categoryFilterOptions,
  categoryFilters,
  productFilterValues,
  productVariantGroups,
  productVariantOptions,
  products,
} from '@/lib/db/schema'
import {
  hexesSql,
  thumbnailSql,
  type StoreCard,
} from '@/features/storefront/products/services/product-queries'
import type { CategoryFilter } from '@/shared/types'

// Storefront category read layer. Drizzle bypasses RLS (connects as table
// owner), so every read here MUST explicitly filter products.visible = true.

// A category's filter facets, for the storefront filter sheet. The admin owns
// its own copy (admin/categories) so the two apps stay independent.
export async function getCategoryFilters(categoryId: string): Promise<CategoryFilter[]> {
  const filters = await db
    .select({ id: categoryFilters.id, name: categoryFilters.name })
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

  return filters.map((f) => ({
    id: f.id,
    name: f.name,
    options: options.filter((o) => o.filterId === f.id).map((o) => ({ id: o.id, value: o.value })),
  }))
}

export interface CategoryProductFilters {
  optionIds?: string[]
  hexes?: string[]
  minPrice?: number
  maxPrice?: number
  sort?: 'newest' | 'price-asc' | 'price-desc'
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
