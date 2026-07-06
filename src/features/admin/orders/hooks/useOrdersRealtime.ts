'use client'

import { useRouter } from 'next/navigation'

import { usePostgresChanges } from '@/shared/hooks/usePostgresChanges'

// Keeps the seller's Orders inbox live: any orders insert refreshes the
// server-rendered list so a new order surfaces without a manual reload.
export function useOrdersRealtime() {
  const router = useRouter()
  usePostgresChanges('admin-orders', { table: 'orders' }, () => router.refresh())
}
