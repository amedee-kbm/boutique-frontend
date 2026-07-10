import { asc, count, eq, inArray } from 'drizzle-orm'

import { db } from '@/lib/db'
import { categories, categoryFilterOptions, categoryFilters, products } from '@/lib/db/schema'
import type { CategoryFilter } from '@/shared/types'

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
