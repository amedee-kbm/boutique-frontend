'use server'

import { revalidatePath } from 'next/cache'
import { asc, eq } from 'drizzle-orm'

import { db } from '@/lib/db'
import { categoryFilterOptions, categoryFilters } from '@/lib/db/schema'
import { categoryFilterOptionSchema, categoryFilterSchema } from './category-filters.schema'
import { defaultFiltersForCategory } from '../consts/category-filter-presets'

function nextPosition(rows: { position: number }[]) {
  return rows.length > 0 ? (rows[rows.length - 1]?.position ?? -1) + 1 : 0
}

// Called from createCategory so a fresh category isn't a blank slate.
export async function seedDefaultFilters(categoryId: string, categoryName: string) {
  const presets = defaultFiltersForCategory(categoryName)
  for (const [filterIndex, preset] of presets.entries()) {
    const [filter] = await db
      .insert(categoryFilters)
      .values({ categoryId, name: preset.name, position: filterIndex })
      .returning({ id: categoryFilters.id })
    if (!filter) continue
    await db.insert(categoryFilterOptions).values(
      preset.options.map((value, optionIndex) => ({
        filterId: filter.id,
        value,
        position: optionIndex,
      }))
    )
  }
}

export async function addCategoryFilter(categoryId: string, name: string) {
  const parsed = categoryFilterSchema.safeParse({ name })
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid', filter: null }

  const existing = await db
    .select({ position: categoryFilters.position })
    .from(categoryFilters)
    .where(eq(categoryFilters.categoryId, categoryId))
    .orderBy(asc(categoryFilters.position))

  const [filter] = await db
    .insert(categoryFilters)
    .values({ categoryId, name: parsed.data.name, position: nextPosition(existing) })
    .returning({ id: categoryFilters.id, name: categoryFilters.name })

  revalidatePath('/admin/categories')
  return { error: null, filter: { ...filter, options: [] as { id: string; value: string }[] } }
}

export async function deleteCategoryFilter(id: string) {
  try {
    await db.delete(categoryFilters).where(eq(categoryFilters.id, id))
  } catch {
    return { error: 'Could not delete filter' }
  }
  revalidatePath('/admin/categories')
  return { error: null }
}

export async function addCategoryFilterOption(filterId: string, value: string) {
  const parsed = categoryFilterOptionSchema.safeParse({ value })
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid', option: null }

  const existing = await db
    .select({ position: categoryFilterOptions.position })
    .from(categoryFilterOptions)
    .where(eq(categoryFilterOptions.filterId, filterId))
    .orderBy(asc(categoryFilterOptions.position))

  const [option] = await db
    .insert(categoryFilterOptions)
    .values({ filterId, value: parsed.data.value, position: nextPosition(existing) })
    .returning({ id: categoryFilterOptions.id, value: categoryFilterOptions.value })

  revalidatePath('/admin/categories')
  return { error: null, option }
}

export async function deleteCategoryFilterOption(id: string) {
  try {
    await db.delete(categoryFilterOptions).where(eq(categoryFilterOptions.id, id))
  } catch {
    return { error: 'Could not delete option' }
  }
  revalidatePath('/admin/categories')
  return { error: null }
}
