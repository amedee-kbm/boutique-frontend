import { NextResponse } from 'next/server'

import { env } from '@/config'
import { deleteTokens, getRefreshToken } from '@/lib/auth/tokens'

export async function POST() {
  const refresh = await getRefreshToken()

  // Best-effort server-side revocation (blacklist). Even if it fails, we still
  // clear the cookies so the browser is logged out locally.
  if (refresh) {
    await fetch(`${env.DJANGO_API_URL}/auth/blacklist`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh }),
      cache: 'no-store',
    }).catch(() => {})
  }

  await deleteTokens()
  return NextResponse.json({ detail: 'Logged out' })
}
