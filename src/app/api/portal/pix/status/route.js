import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { checkRateLimit } from '@/lib/rate-limit'
import { normalizeMacAddress } from '@/lib/wifi-pix'

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

    if (!vendaId) throw new Error('vendaId é obrigatório.')

    const { data: venda, error } = await supabaseAdmin
      .from('wifi_pix_vendas')
      .select('id, status, valor, duracao_minutos, pago_em, autorizado_em, expira_em, asaas_invoice_url, erro_autorizacao, mac_address')
      .eq('id', vendaId)
      .maybeSingle()

    if (error) throw error
    if (!venda) throw new Error('Venda não encontrada.')

    if (venda?.mac_address && macAddress && normalizeMacAddress(venda.mac_address) !== macAddress) {
      throw new Error('Este pagamento pertence a outro aparelho.')
    }

    return NextResponse.json({
      ok: true,
      venda: {
        id: venda.id,
        status: venda.status,
        valor: Number(venda.valor || 0),
        duracao_minutos: Number(venda.duracao_minutos || 0),
        pago_em: venda.pago_em || null,
        autorizado_em: venda.autorizado_em || null,
        expira_em: venda.expira_em || null,
        invoiceUrl: venda.asaas_invoice_url || '',
        erro_autorizacao: venda.erro_autorizacao || '',
      },
    })
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error.message || 'Erro ao consultar Pix.' },
      { status: 400 }
    )
  }
}
