import { NextResponse } from 'next/server'
import { requireCliente } from '@/lib/cliente-api-auth'
import { buildCommercialReport } from '@/lib/commercial-report'

export const runtime = 'nodejs'

export async function GET(request) {
  const auth = await requireCliente(request)

  if (auth.errorResponse) {
    return auth.errorResponse
  }

  try {
    const { searchParams } = new URL(request.url)

    const periodo = searchParams.get('periodo') || 'ultimos_30'
    const hotspotId = String(searchParams.get('hotspotId') || '').trim()

    const report = await buildCommercialReport({
      periodo,
      clienteId: auth.cliente.id,
      hotspotId,
    })

    return NextResponse.json(report)
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error.message || 'Erro ao carregar relatório comercial do cliente',
      },
      { status: 500 }
    )
  }
}
