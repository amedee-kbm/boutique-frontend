import type { ChatMessage, InquiryItem } from '@/shared/types'

// The columns a chat_message_items row needs to render a product card, plus the
// joined product for the live slug/visibility. Shared by both chat hooks.
export const CHAT_ITEM_SELECT =
  'id, product_id, name_snapshot, color_value, size_value, price_snapshot, image_url_snapshot, products(slug, visible)'

export interface RawChatItemRow {
  id: string
  product_id: string | null
  name_snapshot: string
  color_value: string | null
  size_value: string | null
  price_snapshot: string
  image_url_snapshot: string | null
  products: { slug: string; visible: boolean } | null
}

export function mapChatItemRow(row: RawChatItemRow): InquiryItem {
  return {
    id: row.id,
    productId: row.product_id,
    slug: row.product_id && row.products?.visible ? row.products.slug : null,
    name: row.name_snapshot,
    colorValue: row.color_value,
    sizeValue: row.size_value,
    price: row.price_snapshot,
    imageUrl: row.image_url_snapshot,
  }
}

export interface RawChatMessageRow {
  id: string
  content: string
  from_admin: boolean
  created_at: string
}

export function mapChatRow(row: RawChatMessageRow, items: InquiryItem[] = []): ChatMessage {
  return {
    id: row.id,
    content: row.content,
    fromAdmin: row.from_admin,
    createdAt: row.created_at,
    items,
  }
}
