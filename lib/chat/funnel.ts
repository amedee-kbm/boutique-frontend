'use client'

import { createClient } from '@/lib/supabase/client'
import type { BagItem } from '@/lib/bag/useBag'
import { getGuestSession, setGuestSession } from '@/lib/chat/guest'

const OPENING_MESSAGE = "Hi! I'd love to know more about these pieces."

// Guests sign in anonymously so their inserts carry an auth.uid() the RLS
// "manage own" policies key off. Reused by the chat and order funnels.
export async function ensureAnonUser(supabase: ReturnType<typeof createClient>) {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (user) return user

  const { data, error } = await supabase.auth.signInAnonymously()
  if (error || !data.user) return null
  return data.user
}

// Starts (or reuses) a plain chat session for a guest who just wants to ask a
// question — no items. Anonymous sign-in → find/create their session. Returns
// the session id, or an error string.
export async function startGuestChat({
  name,
}: {
  name: string
}): Promise<{ sessionId: string | null; error: string | null }> {
  const supabase = createClient()

  const user = await ensureAnonUser(supabase)
  if (!user) return { sessionId: null, error: 'Could not start a chat. Please try again.' }

  const existing = getGuestSession()?.sessionId ?? null
  if (existing) {
    setGuestSession(existing, name)
    return { sessionId: existing, error: null }
  }

  const { data, error } = await supabase
    .from('chat_sessions')
    .insert({ guest_name: name, created_by: user.id })
    .select('id')
    .single()
  if (error || !data) return { sessionId: null, error: 'Could not start a chat.' }

  const sessionId = data.id as string
  setGuestSession(sessionId, name)
  return { sessionId, error: null }
}

// Drives the inquiry funnel from the browser (RLS-guarded): anonymous sign-in →
// find/create the guest's single ongoing session → one message + its product
// cards. Returns the session id, or an error string.
export async function sendBagInquiry({
  items,
  name,
}: {
  items: BagItem[]
  name: string
}): Promise<{ sessionId: string | null; error: string | null }> {
  if (items.length === 0) return { sessionId: null, error: 'Your bag is empty' }

  const supabase = createClient()

  const user = await ensureAnonUser(supabase)
  if (!user) return { sessionId: null, error: 'Could not start a chat. Please try again.' }

  let sessionId = getGuestSession()?.sessionId ?? null

  if (!sessionId) {
    // created_by must equal auth.uid() for the RLS "guest manage own" policy.
    const { data, error } = await supabase
      .from('chat_sessions')
      .insert({ guest_name: name, created_by: user.id })
      .select('id')
      .single()
    if (error || !data) return { sessionId: null, error: 'Could not start a chat.' }
    sessionId = data.id as string
  }

  const { data: message, error: messageError } = await supabase
    .from('chat_messages')
    .insert({ session_id: sessionId, content: OPENING_MESSAGE, from_admin: false })
    .select('id')
    .single()
  if (messageError || !message) return { sessionId: null, error: 'Could not send your message.' }

  const { error: itemsError } = await supabase.from('chat_message_items').insert(
    items.map((item, position) => ({
      message_id: message.id,
      product_id: item.productId,
      position,
      name_snapshot: item.name,
      color_value: item.colorValue,
      size_value: item.size,
      price_snapshot: item.price,
      image_url_snapshot: item.imageUrl,
    }))
  )
  if (itemsError) return { sessionId: null, error: 'Could not attach your items.' }

  await supabase
    .from('chat_sessions')
    .update({ last_message_at: new Date().toISOString() })
    .eq('id', sessionId)

  setGuestSession(sessionId, name)
  return { sessionId, error: null }
}
