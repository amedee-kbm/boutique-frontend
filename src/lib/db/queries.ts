import { asc, count, desc, eq, inArray, sql } from 'drizzle-orm'

import { db } from '@/lib/db'
import {
  categories,
  chatMessageItems,
  chatMessages,
  chatSessions,
  orderItems,
  orders,
  products,
} from '@/lib/db/schema'
import type { InquiryItem } from '@/features/chat'

export async function getDashboardStats() {
  const [productResult, categoryResult, chatResult, newOrderResult] = await Promise.all([
    db.select({ count: count() }).from(products),
    db.select({ count: count() }).from(categories),
    db.select({ count: count() }).from(chatSessions),
    db.select({ count: count() }).from(orders).where(eq(orders.status, 'new')),
  ])

  return {
    productCount: productResult[0].count,
    categoryCount: categoryResult[0].count,
    chatCount: chatResult[0].count,
    newOrderCount: newOrderResult[0].count,
  }
}

export async function getRecentProducts(limit = 5) {
  return db
    .select({
      id: products.id,
      name: products.name,
      price: products.price,
      visible: products.visible,
      createdAt: products.createdAt,
      categoryName: categories.name,
      thumbnail: sql<string | null>`(
        SELECT url FROM product_images
        WHERE product_id = ${products.id}
        ORDER BY position ASC
        LIMIT 1
      )`.as('thumbnail'),
    })
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .orderBy(desc(products.createdAt))
    .limit(limit)
}

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

export async function getAllChatSessions() {
  return db
    .select({
      id: chatSessions.id,
      guestName: chatSessions.guestName,
      createdAt: chatSessions.createdAt,
      lastMessageAt: chatSessions.lastMessageAt,
      // Qualify chat_sessions.id explicitly: an unqualified `id` binds to the
      // inner chat_messages.id and the correlation silently returns null.
      lastMessage: sql<string | null>`(
        SELECT content FROM chat_messages
        WHERE chat_messages.session_id = chat_sessions.id
        ORDER BY created_at DESC
        LIMIT 1
      )`.as('last_message'),
      // Customer messages newer than the seller's last reply — i.e. what's
      // still waiting on a response. Needs no read-tracking column.
      unreadCount: sql<number>`(
        SELECT count(*)::int FROM chat_messages
        WHERE chat_messages.session_id = chat_sessions.id
          AND chat_messages.from_admin = false
          AND chat_messages.created_at > COALESCE(
            (SELECT max(created_at) FROM chat_messages
             WHERE chat_messages.session_id = chat_sessions.id
               AND chat_messages.from_admin = true),
            'epoch'
          )
      )`.as('unread_count'),
    })
    .from(chatSessions)
    .orderBy(sql`${chatSessions.lastMessageAt} desc nulls last`, desc(chatSessions.createdAt))
}

export async function getChatSession(id: string) {
  const rows = await db
    .select({
      id: chatSessions.id,
      guestName: chatSessions.guestName,
      createdAt: chatSessions.createdAt,
    })
    .from(chatSessions)
    .where(eq(chatSessions.id, id))
    .limit(1)

  return rows[0] ?? null
}

export async function getChatMessages(sessionId: string) {
  const messages = await db
    .select({
      id: chatMessages.id,
      content: chatMessages.content,
      fromAdmin: chatMessages.fromAdmin,
      createdAt: chatMessages.createdAt,
    })
    .from(chatMessages)
    .where(eq(chatMessages.sessionId, sessionId))
    .orderBy(asc(chatMessages.createdAt))

  if (messages.length === 0) return messages.map((m) => ({ ...m, items: [] as InquiryItem[] }))

  const rows = await db
    .select({
      id: chatMessageItems.id,
      messageId: chatMessageItems.messageId,
      productId: chatMessageItems.productId,
      nameSnapshot: chatMessageItems.nameSnapshot,
      colorValue: chatMessageItems.colorValue,
      sizeValue: chatMessageItems.sizeValue,
      priceSnapshot: chatMessageItems.priceSnapshot,
      imageUrlSnapshot: chatMessageItems.imageUrlSnapshot,
      slug: products.slug,
      visible: products.visible,
    })
    .from(chatMessageItems)
    .leftJoin(products, eq(products.id, chatMessageItems.productId))
    .where(
      inArray(
        chatMessageItems.messageId,
        messages.map((m) => m.id)
      )
    )
    .orderBy(asc(chatMessageItems.position))

  const itemsByMessage = new Map<string, InquiryItem[]>()
  for (const row of rows) {
    const item: InquiryItem = {
      id: row.id,
      productId: row.productId,
      slug: row.productId && row.visible ? row.slug : null,
      name: row.nameSnapshot,
      colorValue: row.colorValue,
      sizeValue: row.sizeValue,
      price: row.priceSnapshot,
      imageUrl: row.imageUrlSnapshot,
    }
    const list = itemsByMessage.get(row.messageId) ?? []
    list.push(item)
    itemsByMessage.set(row.messageId, list)
  }

  return messages.map((m) => ({ ...m, items: itemsByMessage.get(m.id) ?? [] }))
}
