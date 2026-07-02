import type { Metadata } from 'next'

import { CustomerAuthForm } from '@/features/auth'

export const metadata: Metadata = { title: 'Register — Zita Boutique' }

export default function CustomerRegisterPage() {
  return <CustomerAuthForm mode="register" />
}
