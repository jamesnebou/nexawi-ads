import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-api-auth'
import { buildCommercialReport } from '@/lib/commercial-report'
import {
  buildCommercialReportCsv,
  buildCommercialReportFileName,
} from '@/lib/commercial-report-email'

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
    const formato = String(searchParams.get('format') || '').trim().toLowerCase()

    const report = await buildCommercialReport({
      periodo,
      clienteId,
      hotspotId,
      auth,
    })

    if (formato === 'csv') {
      if (!auth.canAccess('relatorios', 'export')) {
        return NextResponse.json(
          { ok: false, error: 'Sem permissao para exportar relatorios' },
          { status: 403 }
        )
      }

      const csv = buildCommercialReportCsv(report)

      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${buildCommercialReportFileName({ periodo, clienteId, hotspotId })}"`,
          'Cache-Control': 'no-store',
        },
      })
    }

    return NextResponse.json({
      ...report,
      empresaScope: auth.empresaScope,
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
