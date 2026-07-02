import { asc, desc, eq, inArray, sql } from 'drizzle-orm'

import { db } from '@/lib/db'
import {
  categories,
  productFilterValues,
  productImages,
  products,
  productVariantGroups,
  productVariantOptions,
} from '@/lib/db/schema'

// Admin read layer: the full catalog list + a single product for the editor.
// Unlike the storefront reads, these intentionally include hidden products.

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
