import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { checkRateLimit } from '@/lib/rate-limit'
import { normalizeMacAddress, refreshWifiPixEfiPaymentStatus } from '@/lib/wifi-pix'

export const runtime = 'nodejs'

const RATE_LIMIT = {
  keyPrefix: 'portal:pix:status',
  limit: 120,
  windowMs: 60_000,
}

function clean(value = '') {
  return String(value || '').trim()
}

export async function POST(request) {
  const rate = checkRateLimit(request, RATE_LIMIT)

  if (!rate.allowed) {
    return NextResponse.json(
      { ok: false, error: 'Muitas consultas. Aguarde alguns segundos.' },
      { status: 429 }
    )
  }

  try {
    const body = await request.json()
    const vendaId = clean(body.vendaId || body.venda_id)
    const macAddress = normalizeMacAddress(body.macAddress || body.mac_address)

    if (!vendaId) throw new Error('vendaId Ã© obrigatÃ³rio.')

    const { data: venda, error } = await supabaseAdmin
      .from('wifi_pix_vendas')
      .select('*')
      .eq('id', vendaId)
      .maybeSingle()

    if (error) throw error
    if (!venda) throw new Error('Venda nÃ£o encontrada.')

    if (venda?.mac_address && macAddress && normalizeMacAddress(venda.mac_address) !== macAddress) {
      throw new Error('Este pagamento pertence a outro aparelho.')
    }

    let vendaAtual = venda
    let gatewayWarning = ''

    if (!['pago', 'autorizado'].includes(venda.status)) {
      try {
        const refreshed = await refreshWifiPixEfiPaymentStatus(venda)
        vendaAtual = refreshed.venda || venda
      } catch (refreshError) {
        gatewayWarning = refreshError.message || 'Nao foi possivel consultar o gateway de pagamento.'
      }
    }

    return NextResponse.json({
      ok: true,
      venda: {
        id: vendaAtual.id,
        status: vendaAtual.status,
        valor: Number(vendaAtual.valor || 0),
        duracao_minutos: Number(vendaAtual.duracao_minutos || 0),
        pago_em: vendaAtual.pago_em || null,
        autorizado_em: vendaAtual.autorizado_em || null,
        expira_em: vendaAtual.expira_em || null,
        invoiceUrl: vendaAtual.asaas_invoice_url || '',
        erro_autorizacao: vendaAtual.erro_autorizacao || '',
        gatewayWarning,
      },
    })
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error.message || 'Erro ao consultar Pix.' },
      { status: 400 }
    )
  }
}

