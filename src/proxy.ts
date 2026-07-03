import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const MAINTENANCE_PATH = '/maintenance'
const KEEP_ALIVE_TTL = 30_000

// Auto-maintenance decision is cached so we ping at most once per TTL, not on
// every matched request.
let autoCache = { active: false, checkedAt: 0 }

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

async function autoMaintenanceActive(): Promise<boolean> {
  const now = Date.now()
  if (now - autoCache.checkedAt < KEEP_ALIVE_TTL) return autoCache.active
  const active = await databaseUnreachable()
  autoCache = { active, checkedAt: now }
  return active
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Maintenance is opt-in. NEXT_PUBLIC_MAINTENANCE_MODE=yes forces it; the
  // separate NEXT_PUBLIC_MAINTENANCE_AUTO=yes enables the keep-alive auto-trip,
  // which fires only on a real DB outage (an RLS denial never trips it). Both
  // unset (the default) means no ping and no maintenance.
  const forceMaintenance = process.env.NEXT_PUBLIC_MAINTENANCE_MODE === 'yes'
  const autoMaintenance = process.env.NEXT_PUBLIC_MAINTENANCE_AUTO === 'yes'
  const maintenanceOn = forceMaintenance || (autoMaintenance && (await autoMaintenanceActive()))

  if (maintenanceOn) {
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
