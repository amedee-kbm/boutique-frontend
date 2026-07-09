import { NextResponse } from 'next/server'

import { env } from '@/config'
import { setRefreshToken, setToken } from '@/lib/auth/tokens'

// Browser -> here (same-origin) with { phone_number, password }. We exchange
// them for tokens at Django's /auth/pair and keep the tokens server-side in
// HttpOnly cookies; only the non-secret user fields go back to the browser.
export async function POST(request: Request) {
  const body = await request.json()

  const res = await fetch(`${env.DJANGO_API_URL}/auth/pair`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
  })

  const data = await res.json()
  if (!res.ok) return NextResponse.json(data, { status: res.status })

  const { access, refresh, ...user } = data
  await setToken(access)
  await setRefreshToken(refresh)
  return NextResponse.json(user)
}
