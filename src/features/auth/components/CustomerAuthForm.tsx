'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { Button } from '@/shared/ui/button'
import { Eyebrow, eyebrowVariants } from '@/shared/components/Eyebrow'
import { cn } from '@/shared/lib/utils'
import { AuthService } from '../services/auth.service'

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

    const result =
      mode === 'register'
        ? await AuthService.signUp(email, password)
        : await AuthService.signIn(email, password)

    if (result.error) {
      setError(result.error)
      setPending(false)
      return
    }

    router.push('/account')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6 px-6 pt-10 md:mx-auto md:max-w-sm">
      <Eyebrow as="h1" className="text-base">
        {copy.title}
      </Eyebrow>

      <div className="flex flex-col gap-5">
        <label className="flex flex-col gap-2">
          <Eyebrow className="text-muted-foreground">Email</Eyebrow>
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
          <Eyebrow className="text-muted-foreground">Password</Eyebrow>
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
        className={cn(eyebrowVariants(), 'h-12 rounded-none')}
      >
        {pending ? copy.pending : copy.submit}
      </Button>

      <p className="text-xs tracking-wide">
        {copy.altPrompt}{' '}
        <Link
          href={copy.altHref}
          className={cn(eyebrowVariants(), 'underline-offset-4 hover:underline')}
        >
          {copy.altLabel}
        </Link>
      </p>
    </form>
  )
}
