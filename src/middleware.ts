import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname, hostname } = request.nextUrl

  // Skip middleware for static files
  if (
    pathname.startsWith('/_next') ||
    pathname.match(/\.(png|jpg|jpeg|gif|svg|ico|css|js)$/)
  ) {
    return NextResponse.next()
  }

  // Detect tenant from subdomain or path
  let tenantSlug: string | null = null

  // Option 1: Subdomain-based (e.g., demo-store.localhost:3000)
  const hostParts = hostname.split('.')
  if (hostParts.length > 1 && hostParts[0] !== 'www' && hostParts[0] !== 'localhost') {
    tenantSlug = hostParts[0]
  }

  // Option 2: Path-based (e.g., localhost:3000/store/demo-store)
  const pathMatch = pathname.match(/^\/store\/([^\/]+)/)
  if (pathMatch) {
    tenantSlug = pathMatch[1]
  }

  // For development, always default to demo-store if no tenant found
  // This allows accessing /pos, /api/products directly without subdomain
  if (!tenantSlug) {
    tenantSlug = 'demo-store'
  }

  // Add tenant to headers
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-tenant-slug', tenantSlug)

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
