import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { createWifiPixCheckout } from '@/lib/wifi-pix'
import { checkRateLimit } from '@/lib/rate-limit'
import { logAdminAction } from '@/lib/admin-audit-log'

export const runtime = 'nodejs'

const RATE_LIMIT = {
  keyPrefix: 'portal:pix:checkout',
  limit: 15,
  windowMs: 60_000,
}

const MAX_CHECKOUT_BODY_BYTES = 64 * 1024

function clean(value = '') {
  return String(value || '').trim()
}

async function grantTemporaryPaymentWindow(request, {
  hotspotSlug,
  macAddress,
  ipAddress,
  vendaId,
} = {}) {
  const mac = clean(macAddress)

  if (!hotspotSlug || !mac) {
    return {
      ok: false,
      skipped: true,
      reason: 'hotspotSlug ou MAC ausente para janela temporaria de pagamento.',
    }
  }

  try {
    const origin = new URL(request.url).origin
    const response = await fetch(`${origin}/api/control/session/authorize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
      body: JSON.stringify({
        hotspotSlug,
        leadId: null,
        clientMac: mac,
        clientIp: clean(ipAddress),
        adSessionId: null,
        authorizationReason: 'wifi_pix_payment_window',
      }),
    })

    const data = await response.json().catch(() => ({}))

    if (!response.ok) {
      return {
        ok: false,
        skipped: false,
        status: response.status,
        error: data.error || 'Falha ao liberar janela temporaria para pagamento.',
      }
    }

    return {
      ok: true,
      vendaId,
      sessionId: data?.session?.id || null,
      expiresAt: data?.session?.expires_at || null,
      alreadyAuthorized: Boolean(data?.alreadyAuthorized),
      reauthorized: Boolean(data?.reauthorized),
      bandwidthQueue: data?.bandwidthQueue || null,
    }
  } catch (error) {
    return {
      ok: false,
      skipped: false,
      error: error.message || 'Falha ao liberar janela temporaria para pagamento.',
    }
  }
}

export async function POST(request) {
  const rate = checkRateLimit(request, RATE_LIMIT)

  if (!rate.allowed) {
    return NextResponse.json(
      { ok: false, error: 'Muitas tentativas. Aguarde um pouco para gerar outro pagamento.' },
      { status: 429 }
    )
  }

  try {
    const contentLength = Number(request.headers.get('content-length') || 0)
    if (contentLength > MAX_CHECKOUT_BODY_BYTES) throw new Error('Payload do checkout Pix muito grande.')

    const body = await request.json()
    const hotspotId = clean(body.hotspotId || body.hotspot_id)
    const planoId = clean(body.planoId || body.plano_id)
    const telefone = clean(body.telefone)
    const nome = clean(body.nome)
    const cpfCnpj = clean(body.cpfCnpj || body.cpf_cnpj)
    const macAddress = clean(body.macAddress || body.mac_address)
    const ipAddress = clean(body.ipAddress || body.ip_address)
    const metodoPagamento = clean(body.metodoPagamento || body.metodo_pagamento || 'PIX')

    if (!hotspotId) throw new Error('hotspotId é obrigatório.')
    if (!planoId) throw new Error('planoId é obrigatório.')

    const { data: hotspot, error: hotspotError } = await supabaseAdmin
      .from('hotspots')
      .select('id, empresa_id, cliente_id, nome, slug, status, portal_modo_acesso, wifi_pix_ativo')
      .eq('id', hotspotId)
      .maybeSingle()

    if (hotspotError) throw hotspotError
    if (!hotspot || hotspot.status !== 'Ativo') throw new Error('Hotspot indisponível.')

    const modo = hotspot.portal_modo_acesso || 'anuncios'
    if (!hotspot.wifi_pix_ativo && modo !== 'pix' && modo !== 'hibrido') {
      throw new Error('Wi-Fi no Pix não está ativo neste hotspot.')
    }

    const { data: plano, error: planoError } = await supabaseAdmin
      .from('wifi_pix_planos')
      .select('*')
      .eq('id', planoId)
      .eq('hotspot_id', hotspot.id)
      .eq('ativo', true)
      .maybeSingle()

    if (planoError) throw planoError
    if (!plano) throw new Error('Plano indisponível.')

    const result = await createWifiPixCheckout({
      hotspot,
      plano,
      telefone,
      nome,
      cpfCnpj,
      macAddress,
      ipAddress,
      metodoPagamento,
    })

    const paymentWindow = await grantTemporaryPaymentWindow(request, {
      hotspotSlug: hotspot.slug,
      macAddress,
      ipAddress,
      vendaId: result.venda.id,
    })

    await logAdminAction({
      request,
      adminUser: { id: null, email: 'wifi-pix-checkout@nexawi.system' },
      action: 'wifi_pix_venda_criada',
      entity: 'wifi_pix_vendas',
      entityId: result.venda.id,
      description: 'Venda Wi-Fi no Pix criada pelo portal.',
      metadata: {
        hotspotId: hotspot.id,
        hotspotSlug: hotspot.slug,
        planoId: plano.id,
        metodoPagamento: result.venda.metodo_pagamento,
        valor: Number(result.venda.valor || 0),
        gateway: result.venda.gateway_pagamento || result.venda.asaas_payload?.provider || 'asaas',
        paymentWindow,
      },
    })

    return NextResponse.json({
      ok: true,
      venda: {
        id: result.venda.id,
        status: result.venda.status,
        metodo_pagamento: result.venda.metodo_pagamento,
        valor: Number(result.venda.valor || 0),
        duracao_minutos: Number(result.venda.duracao_minutos || 0),
      },
      checkout: result.checkout,
      paymentWindow,
    })
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error.message || 'Erro ao gerar pagamento.' },
      { status: 400 }
    )
  }
}
