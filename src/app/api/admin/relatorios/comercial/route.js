import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-api-auth'
import { buildCommercialReport } from '@/lib/commercial-report'

export const runtime = 'nodejs'

export async function GET(request) {
  const auth = await requireAdmin(request, {
    module: 'relatorios',
    action: 'view',
  })

  if (auth.errorResponse) {
    return auth.errorResponse
  }

  try {
    const { searchParams } = new URL(request.url)

    const periodo = searchParams.get('periodo') || 'ultimos_30'
    const clienteId = String(searchParams.get('clienteId') || '').trim()
    const hotspotId = String(searchParams.get('hotspotId') || '').trim()

    const report = await buildCommercialReport({
      periodo,
      clienteId,
      hotspotId,
    })

    return NextResponse.json({
      ...report,
      permissions: auth.permissions?.relatorios || {},
    })
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error.message || 'Erro ao carregar relatório comercial',
      },
      { status: 500 }
    )
  }
}
