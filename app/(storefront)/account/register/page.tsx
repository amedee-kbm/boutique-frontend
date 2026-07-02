import type { Metadata } from 'next'

import { CustomerAuthForm } from '@/components/storefront/CustomerAuthForm'

export const metadata: Metadata = { title: 'Register — Zita Boutique' }

export default function CustomerRegisterPage() {
  return <CustomerAuthForm mode="register" />
}
