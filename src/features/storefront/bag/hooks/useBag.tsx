'use client'

import { useSyncExternalStore } from 'react'

const STORAGE_KEY = 'zita-bag-v1'
const CHANGE_EVENT = 'zita-bag-change'

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
  imageUrl: string | null
}

export function bagKey(productId: string, colorValue: string | null, size: string | null) {
  return [productId, colorValue ?? '', size ?? ''].join('|')
}

const EMPTY: BagItem[] = []
const returnTrue = () => true
const returnFalse = () => false

// Module-level cache so getSnapshot returns a stable reference between renders;
// useSyncExternalStore loops forever if the snapshot identity changes each call.
let cache: BagItem[] = EMPTY
let initialized = false

function read(): BagItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as BagItem[]) : EMPTY
  } catch {
    return EMPTY
  }
}

function ensureInitialized() {
  if (initialized) return
  cache = read()
  initialized = true
}

function commit(next: BagItem[]) {
  cache = next
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    // ignore quota / privacy-mode errors
  }
  window.dispatchEvent(new Event(CHANGE_EVENT))
}

function subscribe(callback: () => void) {
  const onStorage = () => {
    cache = read()
    callback()
  }
  window.addEventListener(CHANGE_EVENT, callback)
  window.addEventListener('storage', onStorage)
  return () => {
    window.removeEventListener(CHANGE_EVENT, callback)
    window.removeEventListener('storage', onStorage)
  }
}

function getSnapshot(): BagItem[] {
  ensureInitialized()
  return cache
}

function getServerSnapshot(): BagItem[] {
  return EMPTY
}

export function addToBag(item: BagItem) {
  ensureInitialized()
  if (cache.some((i) => i.key === item.key)) return
  commit([...cache, item])
}

export function removeFromBag(key: string) {
  ensureInitialized()
  commit(cache.filter((i) => i.key !== key))
}

export function clearBag() {
  commit(EMPTY)
}

export function useBag() {
  const items = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  const hydrated = useSyncExternalStore(subscribe, returnTrue, returnFalse)
  return {
    items,
    count: items.length,
    add: addToBag,
    remove: removeFromBag,
    clear: clearBag,
    hydrated,
  }
}
