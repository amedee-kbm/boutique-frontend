'use client'

import { useQuery } from '@tanstack/react-query'
import type { User } from '@supabase/supabase-js'

import { createClient } from '@/lib/supabase/client'

export interface Customer {
  id: string
  email: string
}

export const CUSTOMER_QUERY_KEY = ['customer'] as const

// A "customer" is a signed-in user with a real email/password identity. Guests
// who only ever hit the anonymous-auth order/chat path have `is_anonymous` set
// and are NOT customers — Favorites and the Account screen key off this.
export function toCustomer(user: User | null): Customer | null {
  if (!user || user.is_anonymous || !user.email) return null
  return { id: user.id, email: user.email }
}

// Reads the shared customer identity from the query cache. A single AuthBridge
// (mounted once, app-wide) subscribes to onAuthStateChange and keeps this cache
// entry current, so every consumer shares one identity and one listener.
export function useCustomer() {
  const { data: customer = null, isPending } = useQuery({
    queryKey: CUSTOMER_QUERY_KEY,
    queryFn: async () => toCustomer((await createClient().auth.getUser()).data.user),
    staleTime: Infinity,
  })
  return { customer, loading: isPending }
}
