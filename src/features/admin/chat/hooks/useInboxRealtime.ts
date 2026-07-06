'use client'

import { useRouter } from 'next/navigation'

import { usePostgresChanges } from '@/shared/hooks/usePostgresChanges'

// Keeps the seller's inbox live. Any chat_messages insert — a customer's reply,
// or the opening message of a brand-new conversation — refreshes the
// server-rendered list, updating previews, ordering, and unread badges.
export function useInboxRealtime() {
  const router = useRouter()
  usePostgresChanges('admin-inbox', { table: 'chat_messages' }, () => router.refresh())
}
