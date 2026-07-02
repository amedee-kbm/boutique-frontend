import type { Metadata } from 'next'
import { LoginForm } from '@/features/auth'

export const metadata: Metadata = { title: 'Sign in — Zita Boutique' }

export default function AdminLoginPage() {
  return (
    <div className="bg-muted/40 flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="font-heading text-2xl font-bold tracking-tight">Zita Boutique</p>
        </div>
        <LoginForm />
      </div>
    </div>
  )
}
