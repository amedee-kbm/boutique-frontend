import type { Metadata } from 'next'

import { AccountView } from '@/features/auth'

export const metadata: Metadata = { title: 'Account — Zita Boutique' }

export default function AccountPage() {
  return <AccountView />
}
