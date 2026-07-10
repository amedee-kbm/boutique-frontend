import 'server-only'

import { env } from '@/config'
import { deleteTokens, getRefreshToken, setRefreshToken, setToken } from './tokens'

// Called by the proxy on a 401. Returns the new access token, or null if the
// refresh token is gone/expired/blacklisted (in which case the cookies are
// cleared so the browser stops retrying against a dead session).
export async function refreshAccessToken(): Promise<string | null> {
  const refresh = await getRefreshToken()
  if (!refresh) return null

  const res = await fetch(`${env.DJANGO_API_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh }),
    cache: 'no-store',
  })

  if (!res.ok) {
    await deleteTokens()
    return null
  }

  const data = (await res.json()) as { access: string; refresh?: string }
  await setToken(data.access)
  // ROTATE_REFRESH_TOKENS is on, so the old refresh is now blacklisted — persist
  // the rotated one or the next refresh would fail.
  if (data.refresh) await setRefreshToken(data.refresh)
  return data.access
}
