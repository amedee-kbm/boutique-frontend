'use server'

import { revalidatePath } from 'next/cache'
import { eq } from 'drizzle-orm'

import { db } from '@/lib/db'
import { orders } from '@/lib/db/schema'
import { orderStatusSchema } from './orders.schema'
import { requireAdmin } from '@/features/auth/services/admin-guard'

export async function updateOrderStatus(id: string, status: string) {
  const gate = await requireAdmin()
  if (gate.error) return { error: gate.error }

  const parsed = orderStatusSchema.safeParse(status)
  if (!parsed.success) return { error: 'Invalid status' }

  await db.update(orders).set({ status: parsed.data }).where(eq(orders.id, id))

  revalidatePath('/admin/orders')
  revalidatePath('/admin')
  return { error: null }
}
