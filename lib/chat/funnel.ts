'use client'

import { createClient } from '@/lib/supabase/client'
import type { SelectionItem } from '@/lib/selection/useSelection'
import { getGuestSession, setGuestSession } from '@/lib/chat/guest'

const OPENING_MESSAGE = "Hi! I'd love to know more about these pieces."

// Drives the inquiry funnel from the browser (RLS-guarded): anonymous sign-in →
// find/create the guest's single ongoing session → one message + its product
// cards. Returns the session id, or an error string.
export async function sendSelectionInquiry({
  items,
  name,
}: {
  items: SelectionItem[]
  name: string
}): Promise<{ sessionId: string | null; error: string | null }> {
  if (items.length === 0) return { sessionId: null, error: 'Your selection is empty' }

  const supabase = createClient()

  let {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    const { data, error } = await supabase.auth.signInAnonymously()
    if (error || !data.user) {
      return { sessionId: null, error: 'Could not start a chat. Please try again.' }
    }
    user = data.user
  }

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
