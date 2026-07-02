import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const MAINTENANCE_PATH = '/maintenance'

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Maintenance is opt-in via env flag; a transient DB blip never trips it.
  const maintenanceOn = process.env.NEXT_PUBLIC_MAINTENANCE_MODE === 'yes'

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
