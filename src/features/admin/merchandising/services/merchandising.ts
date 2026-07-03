'use server'

import { revalidatePath } from 'next/cache'

import { db } from '@/lib/db'
import { homeFilters } from '@/lib/db/schema'
import { requireAdmin } from '@/features/auth/services/admin-guard'
import { homeFiltersSchema, type HomeFilterEntry } from './merchandising.schema'

// The editor commits the whole strip at once (EditorHeader Save), so this
// replaces the table contents in order — position is the array index. Atomic so
// the storefront never reads a half-written strip.
export async function saveHomeFilters(entries: HomeFilterEntry[]) {
  const gate = await requireAdmin()
  if (gate.error) return { error: gate.error }

  const parsed = homeFiltersSchema.safeParse(entries)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid input' }

  try {
    await db.transaction(async (tx) => {
      await tx.delete(homeFilters)
      if (parsed.data.length > 0) {
        await tx.insert(homeFilters).values(
          parsed.data.map((entry, position) => ({
            label: entry.label,
            href: entry.href,
            visible: entry.visible,
            position,
          }))
        )
      }
    })
  } catch {
    return { error: 'Could not save the filter strip.' }
  }

  revalidatePath('/admin/merchandising')
  revalidatePath('/')
  return { error: null }
}
