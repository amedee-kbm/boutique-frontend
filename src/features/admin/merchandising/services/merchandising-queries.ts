import 'server-only'

import { asc } from 'drizzle-orm'

import { db } from '@/lib/db'
import { homeFilters } from '@/lib/db/schema'

export interface AdminHomeFilter {
  id: string
  label: string
  href: string
  visible: boolean
}

// Admin scope: includes hidden rows (the storefront read filters visible = true).
export async function getAdminHomeFilters(): Promise<AdminHomeFilter[]> {
  return db
    .select({
      id: homeFilters.id,
      label: homeFilters.label,
      href: homeFilters.href,
      visible: homeFilters.visible,
    })
    .from(homeFilters)
    .orderBy(asc(homeFilters.position))
}
