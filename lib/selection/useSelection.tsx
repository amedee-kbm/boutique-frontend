'use client'

import { useSyncExternalStore } from 'react'

const STORAGE_KEY = 'zita-selection-v1'
const CHANGE_EVENT = 'zita-selection-change'

export interface SelectionItem {
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

export function selectionKey(productId: string, colorValue: string | null, size: string | null) {
  return [productId, colorValue ?? '', size ?? ''].join('|')
}

const EMPTY: SelectionItem[] = []
const returnTrue = () => true
const returnFalse = () => false

// Module-level cache so getSnapshot returns a stable reference between renders;
// useSyncExternalStore loops forever if the snapshot identity changes each call.
let cache: SelectionItem[] = EMPTY
let initialized = false

function read(): SelectionItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as SelectionItem[]) : EMPTY
  } catch {
    return EMPTY
  }
}

function ensureInitialized() {
  if (initialized) return
  cache = read()
  initialized = true
}

function commit(next: SelectionItem[]) {
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

function getSnapshot(): SelectionItem[] {
  ensureInitialized()
  return cache
}

function getServerSnapshot(): SelectionItem[] {
  return EMPTY
}

export function addToSelection(item: SelectionItem) {
  ensureInitialized()
  if (cache.some((i) => i.key === item.key)) return
  commit([...cache, item])
}

export function removeFromSelection(key: string) {
  ensureInitialized()
  commit(cache.filter((i) => i.key !== key))
}

export function clearSelection() {
  commit(EMPTY)
}

export function useSelection() {
  const items = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  const hydrated = useSyncExternalStore(subscribe, returnTrue, returnFalse)
  return {
    items,
    count: items.length,
    add: addToSelection,
    remove: removeFromSelection,
    clear: clearSelection,
    hydrated,
  }
}
