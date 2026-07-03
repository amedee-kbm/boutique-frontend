'use client'

import { createClient } from '@/lib/supabase/client'
import { getGuestSession, setGuestSession } from './guest'

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
