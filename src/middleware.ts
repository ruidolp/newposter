import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifySuperadminToken } from '@/lib/superadmin-auth'

export async function middleware(request: NextRequest) {
  const { pathname, hostname } = request.nextUrl

  // Skip static files
  if (
    pathname.startsWith('/_next') ||
    pathname.match(/\.(png|jpg|jpeg|gif|svg|ico|css|js|woff2?)$/)
  ) {
    return NextResponse.next()
  }

  // ── Superadmin routes ──────────────────────────────────────────────────────
  if (pathname.startsWith('/superadmin')) {
    // Login page is always accessible
    if (pathname === '/superadmin/login') return NextResponse.next()

    // All other /superadmin/* require valid sa_token cookie
    const token = request.cookies.get('sa_token')?.value
    const id = token ? await verifySuperadminToken(token) : null
    if (!id) {
      return NextResponse.redirect(new URL('/superadmin/login', request.url))
    }
    return NextResponse.next()
  }

  // ── Tenant resolution ──────────────────────────────────────────────────────
  let tenantSlug: string | null = null

  // 1. Subdomain (e.g. demo-store.localhost:3000)
  const hostParts = hostname.split('.')
  if (hostParts.length > 1 && hostParts[0] !== 'www' && hostParts[0] !== 'localhost') {
    tenantSlug = hostParts[0]
  }

  // 2. /login/[slug] path — extract slug but don't treat as store path
  const loginSlugMatch = pathname.match(/^\/login\/([^/]+)/)
  if (loginSlugMatch) {
    tenantSlug = loginSlugMatch[1]
  }

  // 3. /store/[slug] path
  const storeMatch = pathname.match(/^\/store\/([^/]+)/)
  if (storeMatch) {
    tenantSlug = storeMatch[1]
  }

  // 4. Cookie fallback (fixes local dev issue where domain is localhost)
  if (!tenantSlug) {
    const cookieSlug = request.cookies.get('tenant_slug')?.value
    if (cookieSlug) tenantSlug = cookieSlug
  }

  // 5. Default fallback for development
  if (!tenantSlug) {
    tenantSlug = 'demo-store'
  }

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-tenant-slug', tenantSlug)

  return NextResponse.next({ request: { headers: requestHeaders } })
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
