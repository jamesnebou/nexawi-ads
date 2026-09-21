import { NextRequest, NextResponse } from 'next/server'

const GO_HOSTS = new Set(['go.nexawi.com.br', 'www.go.nexawi.com.br'])
const RESERVED_SEGMENTS = new Set([
  'admin',
  'api',
  'cliente',
  'dashboard',
  'go',
  'login',
  'logout',
  'q',
  'qr',
  'r',
])

function requestHost(request: NextRequest) {
  const forwardedHost = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim()
  return String(forwardedHost || request.headers.get('host') || '')
    .toLowerCase()
    .split(':')[0]
}

export function proxy(request: NextRequest) {
  if (!GO_HOSTS.has(requestHost(request))) return NextResponse.next()

  const pathname = request.nextUrl.pathname

  if (pathname === '/' || pathname === '/admin/login') {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    loginUrl.searchParams.set('redirect', '/dashboard/geradores/qr')
    return NextResponse.redirect(loginUrl)
  }

  const segments = pathname.split('/').filter(Boolean)
  if (segments.length !== 1 || RESERVED_SEGMENTS.has(segments[0])) {
    return NextResponse.next()
  }

  const publicPageUrl = request.nextUrl.clone()
  publicPageUrl.pathname = `/go/${segments[0]}`
  return NextResponse.rewrite(publicPageUrl)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)'],
}
