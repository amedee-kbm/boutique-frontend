'use client'

import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'

import { createClient } from '@/lib/supabase/client'
import { CUSTOMER_QUERY_KEY, toCustomer } from '../hooks/useCustomer'

// The one and only onAuthStateChange listener. Mounted once at the app root, it
// writes the current identity into the shared ['customer'] cache entry on every
// auth change (INITIAL_SESSION, sign-in, sign-out), so useCustomer consumers all
// read one source instead of each opening their own subscription.
export function AuthBridge() {
  const queryClient = useQueryClient()

  useEffect(() => {
    const supabase = createClient()
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      queryClient.setQueryData(CUSTOMER_QUERY_KEY, toCustomer(session?.user ?? null))
    })
    return () => subscription.unsubscribe()
  }, [queryClient])

  return null
}
