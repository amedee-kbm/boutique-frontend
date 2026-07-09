import 'server-only'

import { cookies } from 'next/headers'

// The JWTs live in HttpOnly cookies on the Next origin — the browser never sees
// them. Lifetimes mirror NINJA_JWT (access 1h, refresh 1 day). SameSite=lax is
// safe because the browser only ever calls the same-origin BFF routes.
const ACCESS = 'auth-token'
const REFRESH = 'auth-refresh-token'

const base = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV !== 'development',
  path: '/',
} as const

export async function getToken(): Promise<string | null> {
  return (await cookies()).get(ACCESS)?.value ?? null
}

export async function getRefreshToken(): Promise<string | null> {
  return (await cookies()).get(REFRESH)?.value ?? null
}

export async function setToken(access: string): Promise<void> {
  ;(await cookies()).set(ACCESS, access, { ...base, maxAge: 60 * 60 })
}

export async function setRefreshToken(refresh: string): Promise<void> {
  ;(await cookies()).set(REFRESH, refresh, { ...base, maxAge: 60 * 60 * 24 })
}

export async function deleteTokens(): Promise<void> {
  const store = await cookies()
  store.delete(ACCESS)
  store.delete(REFRESH)
}
