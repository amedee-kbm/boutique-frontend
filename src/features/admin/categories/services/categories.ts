'use server'

import { revalidatePath } from 'next/cache'
import { eq } from 'drizzle-orm'

import { db } from '@/lib/db'
import { categories } from '@/lib/db/schema'
import { categoryFormSchema } from './categories.schema'
import { seedDefaultFilters } from './category-filters'
import { requireAdmin } from '@/features/auth/services/admin-guard'
import { slugify } from '@/shared/lib/slug'
import { firstZodError, isUniqueViolation } from '@/shared/lib/error'

const SLUG_CONFLICT = 'A category with that slug already exists.'
const SAVE_FAILED = 'Could not save the category. Please try again.'

export async function createCategory(formData: FormData) {
  const gate = await requireAdmin()
  if (gate.error) return { error: gate.error }

  const raw = {
    name: formData.get('name'),
    slug: formData.get('slug') || slugify(String(formData.get('name'))),
  }

  const parsed = categoryFormSchema.safeParse(raw)
  if (!parsed.success) {
    return { error: firstZodError(parsed.error) }
  }

  try {
    const [created] = await db
      .insert(categories)
      .values(parsed.data)
      .returning({ id: categories.id })
    if (created) await seedDefaultFilters(created.id, parsed.data.name)
  } catch (err) {
    return { error: isUniqueViolation(err) ? SLUG_CONFLICT : SAVE_FAILED }
  }

  revalidatePath('/admin/categories')
  return { error: null }
}

export async function updateCategory(id: string, formData: FormData) {
  const gate = await requireAdmin()
  if (gate.error) return { error: gate.error }

  const raw = {
    name: formData.get('name'),
    slug: formData.get('slug'),
  }

  const parsed = categoryFormSchema.safeParse(raw)
  if (!parsed.success) {
    return { error: firstZodError(parsed.error) }
  }

  try {
    await db.update(categories).set(parsed.data).where(eq(categories.id, id))
  } catch (err) {
    return { error: isUniqueViolation(err) ? SLUG_CONFLICT : SAVE_FAILED }
  }

  revalidatePath('/admin/categories')
  return { error: null }
}

export async function deleteCategory(id: string) {
  const gate = await requireAdmin()
  if (gate.error) return { error: gate.error }

  try {
    await db.delete(categories).where(eq(categories.id, id))
  } catch {
    return { error: 'Cannot delete — category has products.' }
  }

  revalidatePath('/admin/categories')
  return { error: null }
}
