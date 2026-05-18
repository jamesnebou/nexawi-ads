import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-api-auth'
import { sendCommercialReportEmail } from '@/lib/commercial-report-email'

export const runtime = 'nodejs'

export async function POST(request) {
  const auth = await requireAdmin(request, {
    module: 'relatorios',
    action: 'export',
  })

  if (auth.errorResponse) {
    return auth.errorResponse
  }

  try {
    const body = await request.json().catch(() => ({}))
    const periodo = String(body.periodo || 'ultimos_30').trim()
    const clienteId = String(body.clienteId || '').trim()
    const hotspotId = String(body.hotspotId || '').trim()
    const to = String(body.to || process.env.ADMIN_ALERT_EMAIL || '').trim()

    if (!to) {
      return NextResponse.json(
        { ok: false, error: 'E-mail de destino nao configurado' },
        { status: 400 }
      )
    }

    const { emailResult, filename } = await sendCommercialReportEmail({
      periodo,
      clienteId,
      hotspotId,
      to,
      auth,
    })

    if (!emailResult.ok) {
      return NextResponse.json(
        { ok: false, error: emailResult.error || 'Erro ao enviar relatorio por e-mail' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      ok: true,
      to,
      messageId: emailResult.messageId || null,
      filename,
    })
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error.message || 'Erro ao enviar relatorio comercial por e-mail',
      },
      { status: 500 }
    )
  }
}
