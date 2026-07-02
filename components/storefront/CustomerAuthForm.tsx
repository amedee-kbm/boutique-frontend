'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'

type Mode = 'login' | 'register'

const COPY = {
  login: {
    title: 'Log in',
    submit: 'Log in',
    pending: 'Logging in…',
    altPrompt: "Don't have an account?",
    altLabel: 'Register',
    altHref: '/account/register',
  },
  register: {
    title: 'Register',
    submit: 'Create account',
    pending: 'Creating account…',
    altPrompt: 'Already have an account?',
    altLabel: 'Log in',
    altHref: '/account/login',
  },
} as const

export function CustomerAuthForm({ mode }: { mode: Mode }) {
  const copy = COPY[mode]
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setPending(true)
    setError(null)

    const supabase = createClient()
    // Email confirmation must be DISABLED in the Supabase dashboard
    // (Authentication → Sign In / Providers → Email → "Confirm email" OFF) so
    // signUp returns a session immediately — no OTP, no synthetic emails.
    const { error } =
      mode === 'register'
        ? await supabase.auth.signUp({ email, password })
        : await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setPending(false)
      return
    }

    router.push('/account')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6 px-6 pt-10 md:mx-auto md:max-w-sm">
      <h1 className="text-base tracking-[0.15em] uppercase">{copy.title}</h1>

      <div className="flex flex-col gap-5">
        <label className="flex flex-col gap-2">
          <span className="text-muted-foreground text-[11px] tracking-[0.15em] uppercase">
            Email
          </span>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="border-foreground/30 focus:border-foreground h-11 border-b bg-transparent text-sm outline-none"
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-muted-foreground text-[11px] tracking-[0.15em] uppercase">
            Password
          </span>
          <input
            type="password"
            required
            minLength={6}
            autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="border-foreground/30 focus:border-foreground h-11 border-b bg-transparent text-sm outline-none"
          />
        </label>
      </div>

      {error && <p className="text-destructive text-xs">{error}</p>}

      <Button
        type="submit"
        variant="outline"
        disabled={pending}
        className="h-12 rounded-none text-[11px] tracking-[0.2em] uppercase"
      >
        {pending ? copy.pending : copy.submit}
      </Button>

      <p className="text-xs tracking-wide">
        {copy.altPrompt}{' '}
        <Link
          href={copy.altHref}
          className="tracking-[0.15em] uppercase underline-offset-4 hover:underline"
        >
          {copy.altLabel}
        </Link>
      </p>
    </form>
  )
}
