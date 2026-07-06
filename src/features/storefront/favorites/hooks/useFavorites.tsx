'use client'

import { createContext, useContext } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { createClient } from '@/lib/supabase/client'
import { useCustomer } from '@/features/auth'

interface FavoritesContextValue {
  ready: boolean
  signedIn: boolean
  isFavorite: (productId: string) => boolean
  // Guests get { needsAuth: true } and no write — favoriting requires an account.
  toggle: (productId: string) => Promise<{ needsAuth: boolean }>
}

const FavoritesContext = createContext<FavoritesContextValue | null>(null)

const EMPTY = new Set<string>()
const favoritesKey = (userId?: string) => ['favorites', userId ?? 'guest'] as const

// Loads the signed-in customer's favorites once and shares them, so the N cards
// on a feed don't each query the table. The ids live in the query cache; the
// toggle writes optimistically to that cache and rolls back on error. Owner-only
// RLS guards every read/write.
export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const { customer, loading } = useCustomer()
  const queryClient = useQueryClient()
  const key = favoritesKey(customer?.id)

  const { data: ids, isSuccess } = useQuery({
    queryKey: key,
    enabled: !loading,
    // Guests have no server rows; resolve to empty so login/logout still clears.
    queryFn: async () => {
      if (!customer) return [] as string[]
      const { data } = await createClient().from('favorites').select('product_id')
      return (data ?? []).map((r) => r.product_id as string)
    },
    select: (rows) => new Set(rows),
  })

  const favorites = ids ?? EMPTY

  const toggleMutation = useMutation({
    mutationFn: async ({ productId, has }: { productId: string; has: boolean }) => {
      const supabase = createClient()
      const { error } = has
        ? await supabase
            .from('favorites')
            .delete()
            .eq('user_id', customer!.id)
            .eq('product_id', productId)
        : await supabase.from('favorites').insert({ user_id: customer!.id, product_id: productId })
      if (error) throw new Error('Could not update favorites')
    },
    onMutate: ({ productId, has }) => {
      const previous = queryClient.getQueryData<string[]>(key)
      queryClient.setQueryData<string[]>(key, (old = []) =>
        has ? old.filter((id) => id !== productId) : [...old, productId]
      )
      return { previous }
    },
    onError: (err: Error, _vars, ctx) => {
      toast.error(err.message)
      if (ctx?.previous) queryClient.setQueryData(key, ctx.previous)
    },
  })

  async function toggle(productId: string) {
    if (!customer) return { needsAuth: true }
    toggleMutation.mutate({ productId, has: favorites.has(productId) })
    return { needsAuth: false }
  }

  return (
    <FavoritesContext.Provider
      value={{
        ready: isSuccess && !loading,
        signedIn: !!customer,
        isFavorite: (productId) => favorites.has(productId),
        toggle,
      }}
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
