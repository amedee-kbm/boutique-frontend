'use server'

import { revalidatePath } from 'next/cache'

import { createAdminClient } from '@/lib/supabase/admin'
import { sendChatPush } from '@/features/pwa/lib/send'
import { requireAdmin } from '@/features/auth/services/admin-guard'

export async function sendAdminMessage(sessionId: string, content: string) {
  const gate = await requireAdmin()
  if (gate.error) return { error: gate.error, message: null }

  const trimmed = content.trim()
  if (!trimmed) return { error: 'Message is empty', message: null }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('chat_messages')
    .insert({ session_id: sessionId, content: trimmed, from_admin: true })
    .select('id, content, from_admin, created_at')
    .single()

  if (error) return { error: error.message, message: null }

  await supabase
    .from('chat_sessions')
    .update({ last_message_at: new Date().toISOString() })
    .eq('id', sessionId)

  // Best-effort push so the customer learns of the reply after leaving the tab.
  try {
    await sendChatPush(sessionId, trimmed)
  } catch {
    // A push failure must never fail the reply.
  }

  // Refresh the inbox preview/order and this conversation after the reply.
  revalidatePath('/admin/chat')
  revalidatePath(`/admin/chat/${sessionId}`)

  return {
    error: null,
    message: {
      id: data.id as string,
      content: data.content as string,
      fromAdmin: data.from_admin as boolean,
      createdAt: data.created_at as string,
    },
  }
}
