import { NextResponse } from 'next/server'

const ALLOWED_ORIGINS = new Set([
  'https://nexawi.com.br',
  'https://www.nexawi.com.br',
  'https://wifi.nexawi.com.br',
])

export function middleware(request) {
  const { pathname } = request.nextUrl

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
  matcher: ['/api/control/:path*'],
}