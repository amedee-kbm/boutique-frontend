import { asc, desc, eq, inArray, sql } from 'drizzle-orm'

import { db } from '@/lib/db'
import { chatMessageItems, chatMessages, chatSessions, products } from '@/lib/db/schema'
import type { InquiryItem } from '@/shared/types'

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
