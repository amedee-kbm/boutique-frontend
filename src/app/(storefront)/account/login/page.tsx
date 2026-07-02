import type { Metadata } from 'next'

import { CustomerAuthForm } from '@/features/auth'

export const metadata: Metadata = { title: 'Log in — Zita Boutique' }

export default function CustomerLoginPage() {
  return <CustomerAuthForm mode="login" />
}
