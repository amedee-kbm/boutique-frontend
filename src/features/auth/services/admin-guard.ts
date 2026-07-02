import 'server-only'

import { createClient } from '@/lib/supabase/server'

// Server-only admin authorization. This is the enforcement gate for admin
// server-action mutations: Drizzle writes bypass RLS, so the DB is NOT the gate
// on that path — authorization must live in the action. This is distinct from
// the browser-side AuthService (login/logout), which never runs on the server.

export async function getAdminUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { user: null, isAdmin: false }
  const { data: isAdmin } = await supabase.rpc('is_admin')
  return { user, isAdmin: !!isAdmin }
}

export async function requireAdmin() {
  const { isAdmin } = await getAdminUser()
  return isAdmin ? { error: null } : { error: 'Forbidden' }
}
