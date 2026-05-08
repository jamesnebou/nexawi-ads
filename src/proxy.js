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
  'https://wifi.nexawi.com.br',
])

export function proxy(request) {
  const { pathname } = request.nextUrl

  // ============================================================
  // 1. Redirecionamento de rotas antigas do painel /admin
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
  // 2. CORS somente para /api/control
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
  matcher: [
    '/admin',
    '/admin/:path*',
    '/api/control/:path*',
  ],
}