import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { env } from '@/config'

// Cache to store maintenance check status
let maintenanceCache = {
  isActive: false,
  errorMessage: '',
  lastCheck: 0,
}

const CACHE_TTL = 30000 // 30 seconds

async function checkDatabaseConnection(): Promise<string | null> {
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    return 'Supabase environment variables are missing.'
  }

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 4000)

    // Ping categories to verify database connectivity
    const restUrl = `${supabaseUrl.replace(/\/$/, '')}/rest/v1/categories?select=id&limit=1`
    const response = await fetch(restUrl, {
      method: 'GET',
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
      },
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (response.ok || response.status === 406) {
      // 406 Not Acceptable is still acceptable as a keepalive sign of life
      return null
    }

    const text = await response.text()
    return `Database responded with status ${response.status}: ${text.substring(0, 100)}`
  } catch (err) {
    return err instanceof Error ? err.message : 'Database network timeout or connection failure.'
  }
}

async function checkMaintenance(): Promise<{ isActive: boolean; errorMessage: string }> {
  // Check if force maintenance mode is set manually via environment variables
  if (process.env.NEXT_PUBLIC_MAINTENANCE_MODE === 'yes') {
    return { isActive: true, errorMessage: 'Manual maintenance mode enabled' }
  }

  const now = Date.now()
  if (now - maintenanceCache.lastCheck < CACHE_TTL) {
    return {
      isActive: maintenanceCache.isActive,
      errorMessage: maintenanceCache.errorMessage,
    }
  }

  const error = await checkDatabaseConnection()
  const isActive = error !== null

  maintenanceCache = {
    isActive,
    errorMessage: error || '',
    lastCheck: now,
  }

  return { isActive, errorMessage: error || '' }
}

export async function middleware(request: NextRequest) {
  const { isActive, errorMessage } = await checkMaintenance()

  if (isActive) {
    const url = request.nextUrl.clone()

    if (url.pathname === '/maintenance') {
      const response = NextResponse.next()
      response.headers.set('x-pathname', url.pathname)
      return response
    }

    url.pathname = '/maintenance'
    url.search = ''

    const response = NextResponse.redirect(url)
    response.cookies.set('maintenance-type', 'database', {
      path: '/',
      maxAge: 60 * 5,
      sameSite: 'lax',
    })

    const encodedError = encodeURIComponent(errorMessage || 'Unknown error').substring(0, 4000)
    response.cookies.set('maintenance-error', encodedError, {
      path: '/',
      maxAge: 60 * 5,
      sameSite: 'lax',
    })

    return response
  }

  if (request.nextUrl.pathname === '/maintenance') {
    const response = NextResponse.redirect(new URL('/', request.url))
    response.cookies.delete('maintenance-type')
    response.cookies.delete('maintenance-error')
    return response
  }

  const response = NextResponse.next()
  response.headers.set('x-pathname', request.nextUrl.pathname)
  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
