import { NextResponse } from 'next/server'
import { sendCommercialReportEmail } from '@/lib/commercial-report-email'

export const runtime = 'nodejs'

function isAuthorized(request) {
  const secret = process.env.NEXAWI_CRON_SECRET
  const headerSecret = request.headers.get('x-cron-secret')
  const bearer = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '')

  return Boolean(secret && (headerSecret === secret || bearer === secret))
}

async function handleSend(request, body = {}) {
  if (!isAuthorized(request)) {
    return NextResponse.json(
      { ok: false, error: 'Nao autorizado' },
      { status: 401 }
    )
  }

  const { searchParams } = new URL(request.url)
  const periodo = String(body.periodo || searchParams.get('periodo') || 'mes_anterior').trim()
  const to = String(body.to || searchParams.get('to') || process.env.ADMIN_ALERT_EMAIL || '').trim()

  if (!to) {
    return NextResponse.json(
      { ok: false, error: 'E-mail de destino nao configurado' },
      { status: 400 }
    )
  }

  try {
    const { emailResult, filename, pdfFilename, report } = await sendCommercialReportEmail({
      periodo,
      to,
    })

    if (!emailResult.ok) {
      return NextResponse.json(
        { ok: false, error: emailResult.error || 'Erro ao enviar relatorio por e-mail' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      ok: true,
      periodo,
      to,
      filename,
      pdfFilename,
      messageId: emailResult.messageId || null,
      resumo: report.resumo || {},
    })
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error.message || 'Erro ao enviar relatorio comercial automatico',
      },
      { status: 500 }
    )
  }
}

export async function GET(request) {
  return handleSend(request)
}

export async function POST(request) {
  const body = await request.json().catch(() => ({}))
  return handleSend(request, body)
}
