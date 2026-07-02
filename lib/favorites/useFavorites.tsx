'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { toast } from 'sonner'

import { createClient } from '@/lib/supabase/client'
import { useCustomer } from '@/lib/auth/useCustomer'

interface FavoritesContextValue {
  ready: boolean
  signedIn: boolean
  isFavorite: (productId: string) => boolean
  // Guests get { needsAuth: true } and no write — favoriting requires an account.
  toggle: (productId: string) => Promise<{ needsAuth: boolean }>
}

const FavoritesContext = createContext<FavoritesContextValue | null>(null)

// Loads the signed-in customer's favorites once and shares them, so the N cards
// on a feed don't each query the table. Owner-only RLS guards every read/write.
export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const { customer, loading } = useCustomer()
  const [ids, setIds] = useState<Set<string>>(new Set())
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (loading) return
    let cancelled = false
    // Guests have no server rows; resolve to empty so login/logout still clears
    // the set. Routing both cases through the async callback keeps setState out
    // of the synchronous effect body.
    const load = customer
      ? createClient()
          .from('favorites')
          .select('product_id')
          .then(({ data }) => (data ?? []).map((r) => r.product_id as string))
      : Promise.resolve<string[]>([])
    load.then((productIds) => {
      if (cancelled) return
      setIds(new Set(productIds))
      setReady(true)
    })
    return () => {
      cancelled = true
    }
  }, [customer, loading])

  const isFavorite = useCallback((productId: string) => ids.has(productId), [ids])

  const toggle = useCallback(
    async (productId: string) => {
      if (!customer) return { needsAuth: true }

      const has = ids.has(productId)
      setIds((prev) => {
        const next = new Set(prev)
        if (has) next.delete(productId)
        else next.add(productId)
        return next
      })

      const supabase = createClient()
      const { error } = has
        ? await supabase
            .from('favorites')
            .delete()
            .eq('user_id', customer.id)
            .eq('product_id', productId)
        : await supabase.from('favorites').insert({ user_id: customer.id, product_id: productId })

      if (error) {
        setIds((prev) => {
          const next = new Set(prev)
          if (has) next.add(productId)
          else next.delete(productId)
          return next
        })
        toast.error('Could not update favorites')
      }

      return { needsAuth: false }
    },
    [customer, ids]
  )

  return (
    <FavoritesContext.Provider
      value={{ ready: ready && !loading, signedIn: !!customer, isFavorite, toggle }}
    >
      {children}
    </FavoritesContext.Provider>
  )
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext)
  if (!ctx) throw new Error('useFavorites must be used within a FavoritesProvider')
  return ctx
}
