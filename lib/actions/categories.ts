'use server'

import { revalidatePath } from 'next/cache'
import { eq } from 'drizzle-orm'

import { db } from '@/lib/db'
import { categories } from '@/lib/db/schema'
import { categoryFormSchema } from '@/lib/actions/categories.schema'
import { seedDefaultFilters } from '@/lib/actions/category-filters'

function slugify(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export async function createCategory(formData: FormData) {
  const raw = {
    name: formData.get('name'),
    slug: formData.get('slug') || slugify(String(formData.get('name'))),
  }

  const parsed = categoryFormSchema.safeParse(raw)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input' }
  }

  try {
    const [created] = await db
      .insert(categories)
      .values(parsed.data)
      .returning({ id: categories.id })
    if (created) await seedDefaultFilters(created.id, parsed.data.name)
  } catch {
    return { error: 'A category with that slug already exists.' }
  }

  revalidatePath('/admin/categories')
  return { error: null }
}

export async function updateCategory(id: string, formData: FormData) {
  const raw = {
    name: formData.get('name'),
    slug: formData.get('slug'),
  }

  const parsed = categoryFormSchema.safeParse(raw)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input' }
  }

  try {
    await db.update(categories).set(parsed.data).where(eq(categories.id, id))
  } catch {
    return { error: 'A category with that slug already exists.' }
  }

  revalidatePath('/admin/categories')
  return { error: null }
}

export async function deleteCategory(id: string) {
  try {
    await db.delete(categories).where(eq(categories.id, id))
  } catch {
    return { error: 'Cannot delete — category has products.' }
  }

  revalidatePath('/admin/categories')
  return { error: null }
}
