'use client'

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

import { useHydrated } from '@/shared/hooks/useHydrated'

export interface BagItem {
  // Unique per product + chosen colour + size, so the same product in two
  // colours stays two lines.
  key: string
  productId: string
  slug: string
  name: string
  price: string
  colorValue: string | null
  colorHex: string | null
  size: string | null
  quantity: number
  imageUrl: string | null
}

export function bagKey(productId: string, colorValue: string | null, size: string | null) {
  return [productId, colorValue ?? '', size ?? ''].join('|')
}

const EMPTY: BagItem[] = []

interface BagState {
  items: BagItem[]
  // Bumped on every add — including a re-add that only bumps a line's quantity.
  // The semantic "an item was added" signal: feedback/animation keys off it, and
  // it never changes on remove/quantity-down. Not persisted.
  addNonce: number
  add: (item: BagItem) => void
  setQuantity: (key: string, quantity: number) => void
  remove: (key: string) => void
  clear: () => void
}

const useBagStore = create<BagState>()(
  persist(
    (set, get) => ({
      items: [],
      addNonce: 0,
      add: (item) => {
        const items = get().items
        const existing = items.find((i) => i.key === item.key)
        const next = existing
          ? // Same product + colour + size is one line; a repeat add bumps its count.
            items.map((i) =>
              i.key === item.key ? { ...i, quantity: i.quantity + item.quantity } : i
            )
          : [...items, { ...item, quantity: Math.max(1, item.quantity) }]
        set({ items: next, addNonce: get().addNonce + 1 })
      },
      setQuantity: (key, quantity) => {
        if (quantity < 1) {
          set({ items: get().items.filter((i) => i.key !== key) })
          return
        }
        set({ items: get().items.map((i) => (i.key === key ? { ...i, quantity } : i)) })
      },
      remove: (key) => set({ items: get().items.filter((i) => i.key !== key) }),
      clear: () => set({ items: [] }),
    }),
    {
      name: 'zita-bag-v1',
      storage: createJSONStorage(() =>
        typeof window !== 'undefined' ? window.localStorage : (undefined as unknown as Storage)
      ),
      // addNonce is an ephemeral session signal, not persisted.
      partialize: (state) => ({ items: state.items }),
    }
  )
)

// persist doesn't sync across tabs; rehydrate when another tab writes the key.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === 'zita-bag-v1') void useBagStore.persist.rehydrate()
  })
}

export function useBag() {
  const items = useBagStore((s) => s.items)
  const addNonce = useBagStore((s) => s.addNonce)
  const add = useBagStore((s) => s.add)
  const setQuantity = useBagStore((s) => s.setQuantity)
  const remove = useBagStore((s) => s.remove)
  const clear = useBagStore((s) => s.clear)
  // Client-only data stays hidden until after mount so SSR output matches.
  const hydrated = useHydrated()

  return {
    items: hydrated ? items : EMPTY,
    count: hydrated ? items.length : 0,
    addNonce,
    add,
    setQuantity,
    remove,
    clear,
    hydrated,
  }
}
