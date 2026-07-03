import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const MAINTENANCE_PATH = '/maintenance'
const KEEP_ALIVE_TTL = 30_000

// The keep-alive result is cached so we ping at most once per TTL, not on every
// matched request.
let cache = { unreachable: false, checkedAt: 0 }

// Pings a dedicated `keep-alive` table via PostgREST. Returns true only when the
// database is genuinely unreachable. An RLS denial (42501 / "permission denied")
// means the DB answered — it is UP — and must NOT trip maintenance; pinging a
// table anyone can hit (like categories) would false-trip on a policy change.
async function databaseUnreachable(): Promise<boolean> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  if (!url || !key) return true

  try {
    const res = await fetch(`${url.replace(/\/$/, '')}/rest/v1/keep-alive?select=id&limit=1`, {
      cache: 'no-store',
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    })
    if (res.ok) return false

    const body = (await res.json().catch(() => ({}))) as { code?: string; message?: string }
    const code = body.code ?? ''
    const message = body.message ?? ''

    // The DB answered with a permission/RLS denial — it's up, not down.
    if (code === '42501' || message.includes('permission denied')) return false

    // Genuine connection / PostgREST-availability failures.
    return (
      code === 'PGRST301' ||
      code === 'PGRST204' ||
      message.includes('fetch') ||
      message.includes('network')
    )
  } catch {
    // fetch threw before a response — a real network failure.
    return true
  }
}

async function maintenanceActive(): Promise<boolean> {
  const now = Date.now()
  if (now - cache.checkedAt < KEEP_ALIVE_TTL) return cache.unreachable
  const unreachable = await databaseUnreachable()
  cache = { unreachable, checkedAt: now }
  return unreachable
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Maintenance is driven solely by database reachability: the keep-alive ping
  // trips it only on a genuine outage (an RLS denial never does).
  if (await maintenanceActive()) {
    if (pathname === MAINTENANCE_PATH) return NextResponse.next()
    const url = request.nextUrl.clone()
    url.pathname = MAINTENANCE_PATH
    url.search = ''
    return NextResponse.redirect(url)
  }

  if (pathname === MAINTENANCE_PATH) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // getClaims() reads from the session token — no network round-trip
  const { data } = await supabase.auth.getClaims()
  const user = data?.claims

  const isAdminRoute = pathname.startsWith('/admin')
  const isAdminLogin = pathname === '/admin/login'

  if (isAdminRoute && !isAdminLogin && !user) {
    return NextResponse.redirect(new URL('/admin/login', request.url))
  }

  if (isAdminLogin && user) {
    return NextResponse.redirect(new URL('/admin', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|sw\\.js|manifest\\.webmanifest|icons|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
