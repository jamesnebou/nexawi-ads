import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-api-auth'

export const runtime = 'nodejs'

async function callControlApi(path, { method = 'GET', body } = {}) {
  const baseUrl = (process.env.CONTROL_API_BASE_URL || '').replace(/\/$/, '')
  const secret = process.env.NEXAWI_CRON_SECRET

  if (!baseUrl) {
    throw new Error('CONTROL_API_BASE_URL não configurado')
  }

  if (!secret) {
    throw new Error('NEXAWI_CRON_SECRET não configurado')
  }

  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'x-control-secret': secret,
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  })

  const text = await response.text()

  let data = null

  try {
    data = text ? JSON.parse(text) : null
  } catch {
    throw new Error(`Control API não retornou JSON. Status: ${response.status}`)
  }

  if (!response.ok) {
    throw new Error(data?.error || 'Erro ao consultar Control API')
  }

  return data
}

export async function GET(request) {
  const auth = await requireAdmin(request)

  if (auth.errorResponse) {
    return auth.errorResponse
  }

  if (!auth.isMaster && !auth.permissions?.hotspots?.view) {
    return NextResponse.json(
      { ok: false, error: 'Sem permissão para visualizar controle de rede' },
      { status: 403 }
    )
  }

  try {
    const status = await callControlApi('/api/control/router/policy/status')

    return NextResponse.json({
      ok: true,
      status,
      permissions: {
        view: true,
        update: Boolean(auth.isMaster || auth.permissions?.hotspots?.update),
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error.message || 'Erro ao consultar política de rede',
      },
      { status: 500 }
    )
  }
}