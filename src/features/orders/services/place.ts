'use client'

import { createClient } from '@/lib/supabase/client'
import type { BagItem } from '@/features/bag'
import { ensureAnonUser } from '@/features/storefront/chat/hooks/funnel'
import type { OrderDetails } from './order.schema'

// Places a no-pay order from the browser (RLS-guarded): anonymous sign-in →
// insert the order with contact/delivery details → insert the item snapshots.
// No payment, no chat session. Returns the order id, or an error string.
export async function placeOrder({
  items,
  details,
}: {
  items: BagItem[]
  details: OrderDetails
}): Promise<{ orderId: string | null; error: string | null }> {
  if (items.length === 0) return { orderId: null, error: 'Your bag is empty' }

  const supabase = createClient()

  // A signed-in customer is returned as-is (order links to them via created_by);
  // a guest gets an anonymous user. Either way created_by carries their uid.
  const user = await ensureAnonUser(supabase)
  if (!user) return { orderId: null, error: 'Could not place your order. Please try again.' }

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      guest_name: details.name,
      phone: details.phone,
      address: details.address,
      note: details.note?.trim() ? details.note.trim() : null,
      created_by: user.id,
    })
    .select('id')
    .single()
  if (orderError || !order) return { orderId: null, error: 'Could not place your order.' }

  const { error: itemsError } = await supabase.from('order_items').insert(
    items.map((item, position) => ({
      order_id: order.id,
      product_id: item.productId,
      position,
      name_snapshot: item.name,
      color_value: item.colorValue,
      size_value: item.size,
      price_snapshot: item.price,
      image_url_snapshot: item.imageUrl,
    }))
  )
  if (itemsError) return { orderId: null, error: 'Could not attach your items.' }

  return { orderId: order.id as string, error: null }
}

// Contact + delivery details from the signed-in customer's most recent order, to
// prefill the order form for a returning buyer. Anonymous guests get null (the
// account, not the anon session, is what we prefill from). RLS "orders: guest
// read own" returns only the caller's own rows.
export async function getMyLatestOrderDetails(): Promise<OrderDetails | null> {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user || user.is_anonymous) return null

  const { data } = await supabase
    .from('orders')
    .select('guest_name, phone, address, note')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (!data) return null

  return {
    name: data.guest_name as string,
    phone: data.phone as string,
    address: data.address as string,
    note: (data.note as string | null) ?? undefined,
  }
}
