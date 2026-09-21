// src/proxy.js
// ============================================================
// Proxy global da NexaWi ADS.
//
// Funções:
// 1. Redirecionar painel legado /admin para o painel oficial.
// 2. Manter CORS seguro para /api/control.
//
// Substitui o antigo src/middleware.js no Next.js 16.
// ============================================================

import { NextResponse } from 'next/server'

const ALLOWED_ORIGINS = new Set([
  'https://nexawi.com.br',
  'https://www.nexawi.com.br',
  'https://go.nexawi.com.br',
  'https://www.go.nexawi.com.br',
  'https://wifi.nexawi.com.br',
])

const GO_HOSTS = new Set(['go.nexawi.com.br', 'www.go.nexawi.com.br'])
const GO_RESERVED_SEGMENTS = new Set([
  'admin', 'api', 'cliente', 'dashboard', 'go', 'login', 'logout', 'q', 'qr', 'r',
])

function requestHost(request) {
  const forwardedHost = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim()
  return String(forwardedHost || request.headers.get('host') || '')
    .toLowerCase()
    .split(':')[0]
}

export function proxy(request) {
  const { pathname } = request.nextUrl
  const isGoHost = GO_HOSTS.has(requestHost(request))

  // ============================================================
  // 1. Plataforma QR no subdomínio go.nexawi.com.br
  // ============================================================

  if (isGoHost && (pathname === '/' || pathname === '/admin/login')) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirect', '/dashboard/geradores/qr')
    return NextResponse.redirect(url)
  }

  if (isGoHost) {
    const segments = pathname.split('/').filter(Boolean)

    if (segments.length === 1 && !GO_RESERVED_SEGMENTS.has(segments[0])) {
      const url = request.nextUrl.clone()
      url.pathname = `/go/${segments[0]}`
      return NextResponse.rewrite(url)
    }
  }

  // ============================================================
  // 2. Redirecionamento de rotas antigas do painel /admin
  // ============================================================

  if (pathname === '/admin/login') {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  // ============================================================
  // 3. CORS somente para /api/control
  // ============================================================

  if (!pathname.startsWith('/api/control/')) {
    return NextResponse.next()
  }

  const origin = request.headers.get('origin') || ''
  const isAllowedOrigin = ALLOWED_ORIGINS.has(origin)

  if (request.method === 'OPTIONS') {
    const response = new NextResponse(null, { status: 204 })

    if (isAllowedOrigin) {
      response.headers.set('Access-Control-Allow-Origin', origin)
    }

    response.headers.set('Vary', 'Origin')
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    response.headers.set('Access-Control-Max-Age', '86400')

    return response
  }

  const response = NextResponse.next()

  if (isAllowedOrigin) {
    response.headers.set('Access-Control-Allow-Origin', origin)
  }

  response.headers.set('Vary', 'Origin')
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)'],
}
