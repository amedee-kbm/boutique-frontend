'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

import { Button } from '@/shared/ui/button'
import { Eyebrow, eyebrowVariants } from '@/shared/components/Eyebrow'
import { cn } from '@/shared/lib/utils'
import { AuthService } from '../services/auth.service'
import { loginSchema, registerSchema, type LoginValues } from '../lib/auth-schema'

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
  const [error, setError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(mode === 'register' ? registerSchema : loginSchema),
    defaultValues: { email: '', password: '' },
  })

  const onSubmit = handleSubmit(async ({ email, password }) => {
    setError(null)
    const result =
      mode === 'register'
        ? await AuthService.signUp(email, password)
        : await AuthService.signIn(email, password)

    if (result.error) {
      setError(result.error)
      return
    }

    router.push('/account')
    router.refresh()
  })

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6 px-6 pt-10 md:mx-auto md:max-w-sm">
      <Eyebrow as="h1" className="text-base">
        {copy.title}
      </Eyebrow>

      <div className="flex flex-col gap-5">
        <label className="flex flex-col gap-2">
          <Eyebrow className="text-muted-foreground">Email</Eyebrow>
          <input
            type="email"
            autoComplete="email"
            {...register('email')}
            className="border-foreground/30 focus:border-foreground h-11 border-b bg-transparent text-sm outline-none"
          />
          {errors.email && <p className="text-destructive text-xs">{errors.email.message}</p>}
        </label>

        <label className="flex flex-col gap-2">
          <Eyebrow className="text-muted-foreground">Password</Eyebrow>
          <input
            type="password"
            autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
            {...register('password')}
            className="border-foreground/30 focus:border-foreground h-11 border-b bg-transparent text-sm outline-none"
          />
          {errors.password && <p className="text-destructive text-xs">{errors.password.message}</p>}
        </label>
      </div>

      {error && <p className="text-destructive text-xs">{error}</p>}

      <Button
        type="submit"
        variant="outline"
        disabled={isSubmitting}
        className={cn(eyebrowVariants(), 'h-12 rounded-none')}
      >
        {isSubmitting ? copy.pending : copy.submit}
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
