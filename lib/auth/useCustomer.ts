'use client'

import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'

import { createClient } from '@/lib/supabase/client'

export interface Customer {
  id: string
  email: string
}

// A "customer" is a signed-in user with a real email/password identity. Guests
// who only ever hit the anonymous-auth order/chat path have `is_anonymous` set
// and are NOT customers — Favorites and the Account screen key off this.
function toCustomer(user: User | null): Customer | null {
  if (!user || user.is_anonymous || !user.email) return null
  return { id: user.id, email: user.email }
}

export function useCustomer() {
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()

    supabase.auth.getUser().then(({ data }) => {
      setCustomer(toCustomer(data.user))
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setCustomer(toCustomer(session?.user ?? null))
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  return { customer, loading }
}
