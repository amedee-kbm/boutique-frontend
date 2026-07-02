'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { createClient } from '@/lib/supabase/client'
import { useCustomer } from '../hooks/useCustomer'
import { Button } from '@/shared/ui'

export function AccountView() {
  const { customer, loading } = useCustomer()
  const router = useRouter()
  const [signingOut, setSigningOut] = useState(false)

  async function handleSignOut() {
    setSigningOut(true)
    await createClient().auth.signOut()
    router.refresh()
    setSigningOut(false)
  }

  if (loading) return null

  if (!customer) {
    return (
      <div className="flex flex-col gap-8 px-6 pt-16 md:mx-auto md:max-w-sm">
        <p className="text-sm tracking-wide">
          Log in to save favorites and reuse your delivery details.
        </p>
        <Button
          variant="outline"
          render={<Link href="/account/login" />}
          className="h-12 rounded-none text-[11px] tracking-[0.2em] uppercase"
        >
          Log in
        </Button>
        <p className="text-xs tracking-wide">
          Don&apos;t have an account?{' '}
          <Link
            href="/account/register"
            className="tracking-[0.15em] uppercase underline-offset-4 hover:underline"
          >
            Register
          </Link>
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8 px-6 pt-16 md:mx-auto md:max-w-sm">
      <div className="flex flex-col gap-1">
        <span className="text-muted-foreground text-[11px] tracking-[0.15em] uppercase">
          Account
        </span>
        <span className="text-sm">{customer.email}</span>
      </div>
      <Button
        variant="outline"
        onClick={handleSignOut}
        disabled={signingOut}
        className="h-12 rounded-none text-[11px] tracking-[0.2em] uppercase"
      >
        {signingOut ? 'Signing out…' : 'Sign out'}
      </Button>
    </div>
  )
}
