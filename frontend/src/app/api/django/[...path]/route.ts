import { NextRequest, NextResponse } from 'next/server'

import { env } from '@/config'
import { refreshAccessToken } from '@/lib/auth/refresh'
import { getToken } from '@/lib/auth/tokens'

// Same-origin BFF proxy: the browser calls /api/django/<path>, we attach the
// access token from the HttpOnly cookie as a Bearer header and forward to
// Django. On a 401 we refresh once and retry, so token expiry is invisible to
// the caller. The token never reaches the browser.
async function forward(
  request: NextRequest,
  path: string[],
  token: string | null,
  body: string | undefined,
) {
  const url = `${env.DJANGO_API_URL}/${path.join('/')}${request.nextUrl.search}`

  const headers: Record<string, string> = {}
  const contentType = request.headers.get('content-type')
  if (contentType) headers['Content-Type'] = contentType
  if (token) headers['Authorization'] = `Bearer ${token}`

  return fetch(url, { method: request.method, headers, body, cache: 'no-store' })
}

async function handle(request: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params
  if (path.some((s) => s === '..' || s === '.')) {
    return NextResponse.json({ detail: 'Invalid path' }, { status: 400 })
  }

  // Read the body once so the 401 retry can reuse it (a stream reads only once).
  const body =
    request.method === 'GET' || request.method === 'HEAD' ? undefined : await request.text()

  const token = await getToken()
  let res = await forward(request, path, token, body)

  if (res.status === 401 && token) {
    const refreshed = await refreshAccessToken()
    if (refreshed) res = await forward(request, path, refreshed, body)
  }

  return new NextResponse(res.body, {
    status: res.status,
    headers: { 'content-type': res.headers.get('content-type') ?? 'application/json' },
  })
}

export {
  handle as GET,
  handle as POST,
  handle as PUT,
  handle as PATCH,
  handle as DELETE,
}
