import type { Metadata } from 'next'

import { AccountView } from '@/components/storefront/AccountView'

export const metadata: Metadata = { title: 'Account — Zita Boutique' }

export default function AccountPage() {
  return <AccountView />
}
