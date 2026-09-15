import { NextResponse } from 'next/server'
import { checkRateLimit } from '@/lib/rate-limit'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { cleanPhone, normalizeMacAddress } from '@/lib/wifi-pix'
import { logAdminAction } from '@/lib/admin-audit-log'
import { getControlRequestHeaders } from '@/lib/control-auth'
import { fetchWithTimeout, getControlRequestTimeoutMs } from '@/lib/fetch-timeout'

export const runtime = 'nodejs'

const RATE_LIMIT = {
  keyPrefix: 'portal:pix:authorize',
  limit: 30,
  windowMs: 60_000,
}

function clean(value = '') {
  return String(value || '').trim()
}

function gerarStringAleatoria(tamanho = 24) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let resultado = ''

  for (let i = 0; i < tamanho; i += 1) {
    resultado += chars[Math.floor(Math.random() * chars.length)]
  }

  return resultado
}

function gerarCredenciaisRadius(macAddress = '') {
  const macLimpo = String(macAddress || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
  const sufixo = gerarStringAleatoria(6).toUpperCase()

  return {
    radiusUsername: `NXWPIX${macLimpo || 'SEMMA'}${Date.now()}${sufixo}`,
    radiusPassword: gerarStringAleatoria(32),
  }
}

function getMesAtualRange() {
  const agora = new Date()
  const inicio = new Date(agora.getFullYear(), agora.getMonth(), 1, 0, 0, 0, 0)
  const fim = new Date(agora.getFullYear(), agora.getMonth() + 1, 1, 0, 0, 0, 0)

  return {
    inicio: inicio.toISOString(),
    fim: fim.toISOString(),
  }
}

async function getOrCreateWifiPixLead({ venda, macAddress, ipAddress }) {
  const telefone = cleanPhone(venda.telefone)
  const { inicio, fim } = getMesAtualRange()

  const { data: existingLead, error: existingError } = await supabaseAdmin
    .from('leads')
    .select('id')
    .eq('hotspot_id', venda.hotspot_id)
    .eq('mac_address', macAddress)
    .eq('telefone', telefone)
    .gte('created_at', inicio)
    .lt('created_at', fim)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (existingError) throw existingError

  if (existingLead?.id) {
    const { error: updateError } = await supabaseAdmin
      .from('leads')
      .update({
        nome: venda.nome || 'Cliente Wi-Fi no Pix',
        telefone,
        ip_address: ipAddress || null,
        anuncio_id: null,
        aceite_lgpd: true,
        aceitou_promocoes: false,
      })
      .eq('id', existingLead.id)

    if (updateError) throw updateError

    return existingLead.id
  }

  const { radiusUsername, radiusPassword } = gerarCredenciaisRadius(macAddress)

  const { data, error } = await supabaseAdmin
    .from('leads')
    .insert([{
      hotspot_id: venda.hotspot_id,
      nome: venda.nome || 'Cliente Wi-Fi no Pix',
      email: `wifi-pix-${venda.id}@nexawi.local`,
      telefone,
      cpf: null,
      aceite_lgpd: true,
      aceitou_promocoes: false,
      data_aceite_promocoes: null,
      anuncio_id: null,
      mac_address: macAddress,
      ip_address: ipAddress || null,
      radius_username: radiusUsername,
      radius_password: radiusPassword,
      radius_used: false,
    }])
    .select('id')
    .single()

  if (error) throw error

  return data.id
}

async function callSessionAuthorize(request, payload) {
  const origin = new URL(request.url).origin
  const response = await fetchWithTimeout(`${origin}/api/control/session/authorize`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getControlRequestHeaders(),
    },
    cache: 'no-store',
    body: JSON.stringify(payload),
  }, getControlRequestTimeoutMs())

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data.error || `Falha ao liberar no MikroTik (${response.status})`)
  }

  return data
}

export async function POST(request) {
  const rate = checkRateLimit(request, RATE_LIMIT)

  if (!rate.allowed) {
    return NextResponse.json(
      { ok: false, error: 'Muitas tentativas. Aguarde um pouco para liberar o acesso.' },
      { status: 429 }
    )
  }

  try {
    const body = await request.json()
    const vendaId = clean(body.vendaId || body.venda_id)
    const hotspotSlug = clean(body.hotspotSlug || body.hotspot_slug)
    const macAddress = normalizeMacAddress(body.macAddress || body.mac_address)
    const ipAddress = clean(body.ipAddress || body.ip_address)

    if (!vendaId) throw new Error('vendaId e obrigatorio.')
    if (!hotspotSlug) throw new Error('hotspotSlug e obrigatorio.')
    if (!macAddress) throw new Error('MAC do cliente e obrigatorio.')

    const { data: venda, error: vendaError } = await supabaseAdmin
      .from('wifi_pix_vendas')
      .select('*, hotspots!inner(id, slug, nome, status)')
      .eq('id', vendaId)
      .maybeSingle()

    if (vendaError) throw vendaError
    if (!venda?.id) throw new Error('Pagamento nao encontrado.')
    if (venda.hotspots?.slug !== hotspotSlug) throw new Error('Pagamento nao pertence a este hotspot.')
    if (venda.hotspots?.status !== 'Ativo') throw new Error('Hotspot indisponivel.')

    const vendaMac = normalizeMacAddress(venda.mac_address || '')
    if (vendaMac && vendaMac !== macAddress) {
      throw new Error('Este pagamento foi iniciado por outro aparelho.')
    }

    if (venda.expira_em && new Date(venda.expira_em).getTime() <= Date.now()) {
      await supabaseAdmin
        .from('wifi_pix_vendas')
        .update({ status: 'expirado', updated_at: new Date().toISOString() })
        .eq('id', venda.id)

      await logAdminAction({
        request,
        adminUser: { id: null, email: 'wifi-pix-authorize@nexawi.system' },
        action: 'wifi_pix_venda_expirada',
        entity: 'wifi_pix_vendas',
        entityId: venda.id,
        description: 'Venda Wi-Fi no Pix expirada ao tentar liberar acesso.',
        metadata: { hotspotSlug, macAddress, ipAddress },
      })

      throw new Error('O tempo deste acesso já expirou.')
    }

    if (!['pago', 'autorizado'].includes(venda.status)) {
      throw new Error('Pagamento ainda nao confirmado.')
    }

    if (!vendaMac || venda.ip_address !== ipAddress) {
      await supabaseAdmin
        .from('wifi_pix_vendas')
        .update({
          mac_address: macAddress,
          ip_address: ipAddress || venda.ip_address || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', venda.id)
    }

    const leadId = await getOrCreateWifiPixLead({
      venda,
      macAddress,
      ipAddress,
    })

    let authorization

    try {
      authorization = await callSessionAuthorize(request, {
        hotspotSlug,
        leadId,
        clientMac: macAddress,
        clientIp: ipAddress,
        adSessionId: null,
        authorizationReason: 'wifi_pix_paid',
        sourceEntityId: venda.id,
      })
    } catch (authorizationError) {
      await supabaseAdmin
        .from('wifi_pix_vendas')
        .update({
          erro_autorizacao: authorizationError.message || 'Erro ao liberar acesso.',
          updated_at: new Date().toISOString(),
        })
        .eq('id', venda.id)

      throw authorizationError
    }

    const now = new Date().toISOString()
    const expiraEm = authorization?.session?.expires_at || venda.expira_em ||
      new Date(Date.now() + Number(venda.duracao_minutos || 0) * 60 * 1000).toISOString()
    const queueName = authorization?.bandwidthQueue?.queue?.name || authorization?.bandwidthQueue?.name || null

    const { data: updatedVenda, error: updateError } = await supabaseAdmin
      .from('wifi_pix_vendas')
      .update({
        status: 'autorizado',
        autorizado_em: venda.autorizado_em || now,
        expira_em: expiraEm,
        erro_autorizacao: null,
        updated_at: now,
      })
      .eq('id', venda.id)
      .select('id, status, autorizado_em, expira_em, valor, duracao_minutos')
      .single()

    if (updateError) throw updateError

    const accessPayload = {
      venda_id: venda.id,
      hotspot_id: venda.hotspot_id,
      router_id: authorization?.session?.router_id || null,
      mac_address: macAddress,
      ip_address: ipAddress || null,
      router_binding_id: authorization?.binding?.['.id'] || null,
      router_queue_name: queueName,
      autorizado_em: now,
      expira_em: expiraEm,
      status: 'ativo',
      metadata: {
        leadId,
        sessionId: authorization?.session?.id || null,
        alreadyAuthorized: Boolean(authorization?.alreadyAuthorized),
      },
    }

    const { data: existingAccess, error: existingAccessError } = await supabaseAdmin
      .from('wifi_pix_acessos')
      .select('id')
      .eq('venda_id', venda.id)
      .eq('status', 'ativo')
      .maybeSingle()

    if (existingAccessError) throw existingAccessError

    if (existingAccess?.id) {
      const { error: accessUpdateError } = await supabaseAdmin
        .from('wifi_pix_acessos')
        .update(accessPayload)
        .eq('id', existingAccess.id)

      if (accessUpdateError) throw accessUpdateError
    } else {
      const { error: accessInsertError } = await supabaseAdmin
        .from('wifi_pix_acessos')
        .insert([accessPayload])

      if (accessInsertError?.code === '23505') {
        const { data: racedAccess, error: racedAccessError } = await supabaseAdmin
          .from('wifi_pix_acessos')
          .select('id')
          .eq('venda_id', venda.id)
          .eq('status', 'ativo')
          .maybeSingle()

        if (racedAccessError) throw racedAccessError
        if (!racedAccess?.id) throw accessInsertError

        const { error: racedUpdateError } = await supabaseAdmin
          .from('wifi_pix_acessos')
          .update(accessPayload)
          .eq('id', racedAccess.id)

        if (racedUpdateError) throw racedUpdateError
      } else if (accessInsertError) {
        throw accessInsertError
      }
    }

    await logAdminAction({
      request,
      adminUser: { id: null, email: 'wifi-pix-authorize@nexawi.system' },
      action: 'wifi_pix_venda_liberada',
      entity: 'wifi_pix_vendas',
      entityId: venda.id,
      description: 'Venda Wi-Fi no Pix liberada no MikroTik.',
      metadata: {
        hotspotSlug,
        macAddress,
        ipAddress,
        leadId,
        sessionId: authorization?.session?.id || null,
        alreadyAuthorized: Boolean(authorization?.alreadyAuthorized),
        expiraEm,
      },
    })

    return NextResponse.json({
      ok: true,
      venda: updatedVenda,
      authorization: {
        alreadyAuthorized: Boolean(authorization?.alreadyAuthorized),
        sessionId: authorization?.session?.id || null,
      },
    })
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error.message || 'Erro ao liberar acesso.' },
      { status: 400 }
    )
  }
}
