import { NextResponse } from 'next/server'

export async function proxyControlRequest(request, targetPath, method = 'POST') {
  const baseUrl = (process.env.CONTROL_API_BASE_URL || '').replace(/\/$/, '')

  if (!baseUrl) {
    return NextResponse.json(
      { ok: false, error: 'CONTROL_API_BASE_URL não configurado' },
      { status: 500 }
    )
  }

  const url = `${baseUrl}${targetPath.startsWith('/') ? targetPath : `/${targetPath}`}`
  const body = method === 'GET' ? undefined : await request.text()

  const headers = {
    'Content-Type': request.headers.get('content-type') || 'application/json',
  }

  const controlSecret = request.headers.get('x-control-secret')
  const cronSecret = request.headers.get('x-cron-secret')
  const authorization = request.headers.get('authorization')

  if (controlSecret) headers['x-control-secret'] = controlSecret
  if (cronSecret) headers['x-cron-secret'] = cronSecret
  if (authorization) headers.Authorization = authorization

  try {
    const response = await fetch(url, {
      method,
      headers,
      body,
      cache: 'no-store',
    })

    const text = await response.text()

    return new NextResponse(text, {
      status: response.status,
      headers: {
        'Content-Type': response.headers.get('content-type') || 'application/json',
      },
    })
  } catch (error) {
    const detail =
      error?.cause?.message ||
      error?.message ||
      'Falha desconhecida ao chamar a VPS'

    return NextResponse.json(
      {
        ok: false,
        error: `Proxy falhou ao acessar ${url}: ${detail}`,
      },
      { status: 500 }
    )
  }
}