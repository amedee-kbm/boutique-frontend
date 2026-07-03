import { asc, desc, inArray } from 'drizzle-orm'

import { db } from '@/lib/db'
import { orderItems, orders } from '@/lib/db/schema'

export type OrderStatus = 'new' | 'contacted' | 'done'

export interface AdminOrderItem {
  id: string
  name: string
  colorValue: string | null
  sizeValue: string | null
  price: string
  imageUrl: string | null
}

export interface AdminOrder {
  id: string
  guestName: string
  phone: string
  address: string
  note: string | null
  status: OrderStatus
  createdAt: Date
  items: AdminOrderItem[]
}

export async function getAllOrders(): Promise<AdminOrder[]> {
  const rows = await db
    .select({
      id: orders.id,
      guestName: orders.guestName,
      phone: orders.phone,
      address: orders.address,
      note: orders.note,
      status: orders.status,
      createdAt: orders.createdAt,
    })
    .from(orders)
    .orderBy(desc(orders.createdAt))

  if (rows.length === 0) return []

  const itemRows = await db
    .select({
      id: orderItems.id,
      orderId: orderItems.orderId,
      name: orderItems.nameSnapshot,
      colorValue: orderItems.colorValue,
      sizeValue: orderItems.sizeValue,
      price: orderItems.priceSnapshot,
      imageUrl: orderItems.imageUrlSnapshot,
    })
    .from(orderItems)
    .where(
      inArray(
        orderItems.orderId,
        rows.map((r) => r.id)
      )
    )
    .orderBy(asc(orderItems.position))

  const byOrder = new Map<string, AdminOrderItem[]>()
  for (const item of itemRows) {
    const list = byOrder.get(item.orderId) ?? []
    list.push({
      id: item.id,
      name: item.name,
      colorValue: item.colorValue,
      sizeValue: item.sizeValue,
      price: item.price,
      imageUrl: item.imageUrl,
    })
    byOrder.set(item.orderId, list)
  }

  return rows.map((r) => ({ ...r, items: byOrder.get(r.id) ?? [] }))
}
