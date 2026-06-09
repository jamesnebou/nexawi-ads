import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-api-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { logAdminAction } from '@/lib/admin-audit-log'
import { asaasRequest } from '@/lib/asaas'
import { markWifiPixPaymentStatus, normalizeMacAddress, refreshWifiPixEfiPaymentStatus } from '@/lib/wifi-pix'

export const runtime = 'nodejs'

function clean(value = '') {
  return String(value || '').trim()
}

function numberValue(value, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function sanitizeUuid(value = '') {
  const uuid = clean(value)
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(uuid)
    ? uuid
    : ''
}

function sanitizeModo(value = '') {
  return ['anuncios', 'pix', 'hibrido'].includes(value) ? value : 'anuncios'
}

function isMissingRecommendedColumn(error) {
  const message = String(error?.message || '')
  return /recomendado/i.test(message) && (/schema cache/i.test(message) || /column/i.test(message))
}

async function countActivePlansForHotspot(auth, hotspotId) {
  let query = supabaseAdmin
    .from('wifi_pix_planos')
    .select('id', { count: 'exact', head: true })
    .eq('hotspot_id', hotspotId)
    .eq('ativo', true)

  query = auth.applyEmpresaScope(query)

  const { count, error } = await query
  if (error) throw error

  return count || 0
}

function getDataInicio(periodo = 'ultimos_30') {
  const agora = new Date()

  if (periodo === 'hoje') {
    agora.setHours(0, 0, 0, 0)
    return agora.toISOString()
  }

  if (periodo === 'ultimos_7') {
    agora.setDate(agora.getDate() - 7)
    return agora.toISOString()
  }

  if (periodo === 'ultimos_30') {
    agora.setDate(agora.getDate() - 30)
    return agora.toISOString()
  }

  if (periodo === 'mes_atual') {
    return new Date(agora.getFullYear(), agora.getMonth(), 1).toISOString()
  }

  return null
}

function sumBy(rows = [], predicate = () => true) {
  return rows.reduce((acc, row) => {
    if (!predicate(row)) return acc
    return acc + Number(row.valor || 0)
  }, 0)
}

async function loadHotspots(auth) {
  let query = supabaseAdmin
    .from('hotspots')
    .select('id, empresa_id, cliente_id, nome, slug, status, portal_modo_acesso, wifi_pix_ativo')
    .order('nome', { ascending: true })

  query = auth.applyEmpresaScope(query)

  const { data, error } = await query
  if (error) throw error

  return data || []
}

async function loadPlanos(auth) {
  let query = supabaseAdmin
    .from('wifi_pix_planos')
    .select('*')
    .order('recomendado', { ascending: false })
    .order('ordem', { ascending: true })
    .order('valor', { ascending: true })

  query = auth.applyEmpresaScope(query)

  const { data, error } = await query
  if (error) {
    if (!isMissingRecommendedColumn(error)) throw error

    let fallbackQuery = supabaseAdmin
      .from('wifi_pix_planos')
      .select('*')
      .order('ordem', { ascending: true })
      .order('valor', { ascending: true })

    fallbackQuery = auth.applyEmpresaScope(fallbackQuery)

    const { data: fallbackData, error: fallbackError } = await fallbackQuery
    if (fallbackError) throw fallbackError

    return (fallbackData || []).map((plano) => ({ ...plano, recomendado: false }))
  }

  return data || []
}


async function loadWifiPixAlertas(hotspots = [], planos = []) {
  const alertas = []
  const planosAtivosPorHotspot = new Map()

  planos.forEach((plano) => {
    if (plano.ativo === false) return
    planosAtivosPorHotspot.set(plano.hotspot_id, (planosAtivosPorHotspot.get(plano.hotspot_id) || 0) + 1)
  })

  hotspots
    .filter((hotspot) => ['pix', 'hibrido'].includes(hotspot.portal_modo_acesso) || hotspot.wifi_pix_ativo)
    .filter((hotspot) => (planosAtivosPorHotspot.get(hotspot.id) || 0) <= 0)
    .forEach((hotspot) => {
      alertas.push({
        type: 'hotspot_sem_plano',
        severity: 'critical',
        title: 'Hotspot pago sem plano ativo',
        message: (hotspot.nome || 'Hotspot') + ' esta em modo Pix/Hibrido ou com Wi-Fi no Pix ativo, mas nao tem plano ativo.',
        hotspotId: hotspot.id,
        hotspotNome: hotspot.nome,
      })
    })

  if (String(process.env.WIFI_PIX_GATEWAY || '').toLowerCase() === 'efi') {
    const { data, error } = await supabaseAdmin
      .from('admin_audit_logs')
      .select('id, action, created_at')
      .in('action', ['wifi_pix_payment_paid', 'wifi_pix_payment_synced'])
      .order('created_at', { ascending: false })
      .limit(1)

    if (!error) {
      const last = data?.[0] || null
      const lastAt = last?.created_at ? new Date(last.created_at).getTime() : 0
      const stale = !lastAt || Date.now() - lastAt > 24 * 60 * 60 * 1000

      if (stale) {
        alertas.push({
          type: 'efi_webhook_sem_evento_recente',
          severity: 'warning',
          title: 'Webhook Efi sem evento recente',
          message: lastAt
            ? 'Nenhum evento Efi recebido nas ultimas 24 horas. Se houve venda paga nesse periodo, verifique o webhook.'
            : 'Nenhum evento Efi registrado ainda. Depois da primeira venda paga, confirme se o webhook esta chegando.',
          lastEventAt: last?.created_at || null,
        })
      }
    }
  }

  return alertas
}

async function loadWifiPixRelatorio(auth, { periodo = 'ultimos_30', hotspotId = '', status = '', search = '' } = {}) {
  const dataInicio = getDataInicio(periodo)
  const filtroHotspot = sanitizeUuid(hotspotId)
  const filtroStatus = ['pendente', 'pago', 'autorizado', 'expirado', 'cancelado', 'erro'].includes(status) ? status : ''
  const termoBusca = clean(search).toLowerCase()

  let vendasQuery = supabaseAdmin
    .from('wifi_pix_vendas')
    .select('id, hotspot_id, plano_id, cliente_id, empresa_id, telefone, nome, cpf_cnpj, metodo_pagamento, valor, duracao_minutos, velocidade_download, velocidade_upload, status, pago_em, autorizado_em, expira_em, created_at, updated_at, mac_address, ip_address, asaas_payment_id, asaas_invoice_url, external_reference, erro_autorizacao, gateway_pagamento, efi_txid')
    .order('created_at', { ascending: false })
    .limit(1000)

  vendasQuery = auth.applyEmpresaScope(vendasQuery)

  if (dataInicio) vendasQuery = vendasQuery.gte('created_at', dataInicio)
  if (filtroHotspot) vendasQuery = vendasQuery.eq('hotspot_id', filtroHotspot)
  if (filtroStatus) vendasQuery = vendasQuery.eq('status', filtroStatus)

  const { data: vendasData, error: vendasError } = await vendasQuery
  if (vendasError) throw vendasError

  let vendas = vendasData || []

  if (termoBusca) {
    vendas = vendas.filter((item) => {
      const campos = [
        item.nome,
        item.telefone,
        item.cpf_cnpj,
        item.mac_address,
        item.ip_address,
        item.asaas_payment_id,
        item.efi_txid,
      ].map((value) => String(value || '').toLowerCase())

      return campos.some((campo) => campo.includes(termoBusca))
    })
  }

  const hotspotIds = [...new Set(vendas.map((item) => item.hotspot_id).filter(Boolean))]
  const planoIds = [...new Set(vendas.map((item) => item.plano_id).filter(Boolean))]
  const clienteIds = [...new Set(vendas.map((item) => item.cliente_id).filter(Boolean))]

  const [hotspotsResult, planosResult, clientesResult] = await Promise.all([
    hotspotIds.length
      ? supabaseAdmin.from('hotspots').select('id, nome, slug').in('id', hotspotIds)
      : Promise.resolve({ data: [], error: null }),
    planoIds.length
      ? supabaseAdmin.from('wifi_pix_planos').select('id, nome').in('id', planoIds)
      : Promise.resolve({ data: [], error: null }),
    clienteIds.length
      ? supabaseAdmin.from('clientes').select('id, nome, nome_empresa').in('id', clienteIds)
      : Promise.resolve({ data: [], error: null }),
  ])

  if (hotspotsResult.error) throw hotspotsResult.error
  if (planosResult.error) throw planosResult.error
  if (clientesResult.error) throw clientesResult.error

  const hotspotsById = new Map((hotspotsResult.data || []).map((item) => [item.id, item]))
  const planosById = new Map((planosResult.data || []).map((item) => [item.id, item]))
  const clientesById = new Map((clientesResult.data || []).map((item) => [item.id, item]))

  const statusesPagos = new Set(['pago', 'autorizado'])
  const receitaConfirmada = sumBy(vendas, (item) => statusesPagos.has(item.status))
  const vendasConfirmadas = vendas.filter((item) => statusesPagos.has(item.status)).length
  const porStatus = new Map()
  const porMetodo = new Map()
  const porHotspot = new Map()
  const porPlano = new Map()

  vendas.forEach((venda) => {
    const statusAtual = venda.status || 'pendente'
    const metodo = venda.metodo_pagamento || 'PIX'
    const hotspot = hotspotsById.get(venda.hotspot_id)
    const plano = planosById.get(venda.plano_id)
    const hotspotNome = hotspot?.nome || 'Sem hotspot'
    const planoNome = plano?.nome || 'Plano removido'

    porStatus.set(statusAtual, (porStatus.get(statusAtual) || 0) + 1)
    porMetodo.set(metodo, (porMetodo.get(metodo) || 0) + 1)

    const atualHotspot = porHotspot.get(venda.hotspot_id || 'sem_hotspot') || {
      hotspot_id: venda.hotspot_id || null,
      hotspot_nome: hotspotNome,
      total_vendas: 0,
      receita_confirmada: 0,
    }

    atualHotspot.total_vendas += 1
    if (statusesPagos.has(statusAtual)) atualHotspot.receita_confirmada += Number(venda.valor || 0)
    porHotspot.set(venda.hotspot_id || 'sem_hotspot', atualHotspot)

    const atualPlano = porPlano.get(venda.plano_id || 'sem_plano') || {
      plano_id: venda.plano_id || null,
      plano_nome: planoNome,
      total_vendas: 0,
      receita_confirmada: 0,
    }

    atualPlano.total_vendas += 1
    if (statusesPagos.has(statusAtual)) atualPlano.receita_confirmada += Number(venda.valor || 0)
    porPlano.set(venda.plano_id || 'sem_plano', atualPlano)
  })

  const rankingPlanos = [...porPlano.values()].sort((a, b) => {
    if (b.total_vendas !== a.total_vendas) return b.total_vendas - a.total_vendas
    return b.receita_confirmada - a.receita_confirmada
  })

  return {
    periodo,
    filtros: {
      hotspotId: filtroHotspot,
      status: filtroStatus,
      search: termoBusca,
    },
    resumo: {
      totalVendas: vendas.length,
      vendasConfirmadas,
      pendentes: vendas.filter((item) => item.status === 'pendente').length,
      pagas: vendas.filter((item) => item.status === 'pago').length,
      autorizadas: vendas.filter((item) => item.status === 'autorizado').length,
      expiradas: vendas.filter((item) => item.status === 'expirado').length,
      canceladas: vendas.filter((item) => item.status === 'cancelado').length,
      erros: vendas.filter((item) => item.status === 'erro').length,
      receitaConfirmada,
      ticketMedio: vendasConfirmadas > 0 ? receitaConfirmada / vendasConfirmadas : 0,
      planoMaisVendido: rankingPlanos[0] || null,
      porStatus: [...porStatus.entries()].map(([statusItem, total]) => ({ status: statusItem, total })),
      porMetodo: [...porMetodo.entries()].map(([metodo, total]) => ({ metodo, total })),
      porPlano: rankingPlanos,
      porHotspot: [...porHotspot.values()].sort((a, b) => b.receita_confirmada - a.receita_confirmada),
    },
    vendas: vendas.slice(0, 250).map((venda) => ({
      ...venda,
      hotspot_nome: hotspotsById.get(venda.hotspot_id)?.nome || '',
      hotspot_slug: hotspotsById.get(venda.hotspot_id)?.slug || '',
      plano_nome: planosById.get(venda.plano_id)?.nome || 'Plano removido',
      cliente_nome: clientesById.get(venda.cliente_id)?.nome_empresa || clientesById.get(venda.cliente_id)?.nome || '',
    })),
  }
}

async function loadVendaForAction(auth, vendaId) {
  const id = sanitizeUuid(vendaId)
  if (!id) throw new Error('Venda inválida.')

  let query = supabaseAdmin
    .from('wifi_pix_vendas')
    .select('*, hotspots(id, nome, slug, status), wifi_pix_planos(id, nome)')
    .eq('id', id)

  query = auth.applyEmpresaScope(query)

  const { data, error } = await query.maybeSingle()
  if (error) throw error
  if (!data?.id) throw new Error('Venda não encontrada ou fora do seu escopo.')

  return data
}

async function verificarVendaPagamento(venda) {
  const gateway = String(venda.gateway_pagamento || venda.asaas_payload?.provider || '').toLowerCase()

  if (gateway === 'efi') {
    return refreshWifiPixEfiPaymentStatus(venda)
  }

  if (!venda.asaas_payment_id) {
    return { venda, refreshed: false, paid: ['pago', 'autorizado'].includes(venda.status) }
  }

  const payment = await asaasRequest('/payments/' + venda.asaas_payment_id)
  const result = await markWifiPixPaymentStatus(payment)

  return {
    venda: result.venda || venda,
    refreshed: true,
    paid: Boolean(result.paid || ['pago', 'autorizado'].includes(result.venda?.status)),
    payment,
  }
}

async function liberarVendaManual(request, venda, body = {}) {
  if (!['pago', 'autorizado'].includes(venda.status)) {
    throw new Error('A venda precisa estar paga antes da liberação manual.')
  }

  const hotspotSlug = clean(body.hotspotSlug || venda.hotspots?.slug)
  const macAddress = normalizeMacAddress(body.macAddress || venda.mac_address)
  const ipAddress = clean(body.ipAddress || venda.ip_address)

  if (!hotspotSlug) throw new Error('Hotspot da venda sem slug.')
  if (!macAddress) throw new Error('Informe o MAC do aparelho para liberar no MikroTik.')

  const origin = new URL(request.url).origin
  const response = await fetch(origin + '/api/portal/pix/authorize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
    body: JSON.stringify({
      vendaId: venda.id,
      hotspotSlug,
      macAddress,
      ipAddress,
    }),
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data?.error || 'Falha ao liberar acesso (' + response.status + ').')
  }

  return data
}

export async function GET(request) {
  const auth = await requireAdmin(request, {
    module: 'hotspots',
    action: 'view',
  })

  if (auth.errorResponse) return auth.errorResponse

  try {
    const { searchParams } = new URL(request.url)
    const periodo = clean(searchParams.get('periodo')) || 'ultimos_30'
    const hotspotId = clean(searchParams.get('hotspotId'))
    const status = clean(searchParams.get('status'))
    const search = clean(searchParams.get('search'))
    const [hotspots, planos] = await Promise.all([
      loadHotspots(auth),
      loadPlanos(auth),
    ])
    const [relatorio, alertas] = await Promise.all([
      loadWifiPixRelatorio(auth, { periodo, hotspotId, status, search }),
      loadWifiPixAlertas(hotspots, planos),
    ])

    return NextResponse.json({
      ok: true,
      hotspots,
      planos,
      relatorio: {
        ...relatorio,
        alertas,
      },
    })
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error.message || 'Erro ao carregar Wi-Fi no Pix.' },
      { status: 500 }
    )
  }
}

export async function POST(request) {
  const auth = await requireAdmin(request, {
    module: 'hotspots',
    action: 'edit',
  })

  if (auth.errorResponse) return auth.errorResponse

  try {
    const body = await request.json()
    const action = clean(body.action)

    if (action === 'hotspot') {
      const hotspotId = sanitizeUuid(body.hotspotId)
      if (!hotspotId) throw new Error('Hotspot inválido.')
      const modo = sanitizeModo(body.portalModoAcesso)

      if (modo !== 'anuncios') {
        const activePlans = await countActivePlansForHotspot(auth, hotspotId)

        if (activePlans <= 0) {
          throw new Error('Cadastre e ative pelo menos um plano antes de publicar o hotspot em Pix ou Híbrido.')
        }
      }

      let query = supabaseAdmin
        .from('hotspots')
        .update({
          portal_modo_acesso: modo,
          wifi_pix_ativo: modo === 'anuncios' ? Boolean(body.wifiPixAtivo) : true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', hotspotId)
        .select('id, nome, slug, portal_modo_acesso, wifi_pix_ativo')

      query = auth.applyEmpresaScope(query)

      const { data, error } = await query.single()
      if (error) throw error

      return NextResponse.json({ ok: true, hotspot: data })
    }

    if (action === 'plano') {
      const hotspotId = sanitizeUuid(body.hotspotId)
      const planoId = sanitizeUuid(body.id)

      if (!hotspotId) throw new Error('Hotspot inválido.')

      const hotspot = (await loadHotspots(auth)).find((item) => item.id === hotspotId)
      if (!hotspot) throw new Error('Hotspot fora do seu escopo.')

      const payload = {
        hotspot_id: hotspotId,
        empresa_id: hotspot.empresa_id || null,
        cliente_id: hotspot.cliente_id || null,
        nome: clean(body.nome),
        descricao: clean(body.descricao),
        valor: numberValue(body.valor),
        duracao_minutos: Math.max(1, Math.min(10080, Math.round(numberValue(body.duracaoMinutos, 60)))),
        velocidade_download: clean(body.velocidadeDownload) || '15M',
        velocidade_upload: clean(body.velocidadeUpload) || '15M',
        ativo: body.ativo !== false,
        recomendado: Boolean(body.recomendado),
        ordem: Math.max(0, Math.round(numberValue(body.ordem, 0))),
        updated_at: new Date().toISOString(),
      }

      if (!payload.nome) throw new Error('Nome do plano é obrigatório.')
      if (payload.valor <= 0) throw new Error('Valor do plano deve ser maior que zero.')

      if (payload.recomendado) {
        let resetQuery = supabaseAdmin
          .from('wifi_pix_planos')
          .update({
            recomendado: false,
            updated_at: new Date().toISOString(),
          })
          .eq('hotspot_id', hotspotId)

        resetQuery = auth.applyEmpresaScope(resetQuery)

        const { error: resetError } = await resetQuery
        if (resetError) throw resetError
      }

      if (planoId) {
        let query = supabaseAdmin
          .from('wifi_pix_planos')
          .update(payload)
          .eq('id', planoId)
          .select('*')

        query = auth.applyEmpresaScope(query)

        const { data, error } = await query.single()
        if (error) throw error

        return NextResponse.json({ ok: true, plano: data })
      }

      const { data, error } = await supabaseAdmin
        .from('wifi_pix_planos')
        .insert([payload])
        .select('*')
        .single()

      if (error) throw error

      return NextResponse.json({ ok: true, plano: data })
    }

    if (action === 'verificar_venda') {
      const venda = await loadVendaForAction(auth, body.vendaId)
      const result = await verificarVendaPagamento(venda)

      await logAdminAction({
        request,
        adminUser: { id: auth.user?.id, email: auth.adminProfile?.email || auth.user?.email },
        action: 'wifi_pix_verificar_pagamento',
        entity: 'wifi_pix_vendas',
        entityId: venda.id,
        description: 'Verificação manual de pagamento Wi-Fi no Pix.',
        metadata: {
          statusAnterior: venda.status,
          statusAtual: result.venda?.status || venda.status,
          gateway: venda.gateway_pagamento || venda.asaas_payload?.provider || 'asaas',
        },
      })

      return NextResponse.json({ ok: true, venda: result.venda || venda, result })
    }

    if (action === 'liberar_venda') {
      const venda = await loadVendaForAction(auth, body.vendaId)
      const result = await liberarVendaManual(request, venda, body)

      await logAdminAction({
        request,
        adminUser: { id: auth.user?.id, email: auth.adminProfile?.email || auth.user?.email },
        action: 'wifi_pix_liberar_manual',
        entity: 'wifi_pix_vendas',
        entityId: venda.id,
        description: 'Liberação manual de venda Wi-Fi no Pix pelo suporte.',
        metadata: {
          hotspotSlug: body.hotspotSlug || venda.hotspots?.slug || '',
          macAddress: normalizeMacAddress(body.macAddress || venda.mac_address),
          ipAddress: clean(body.ipAddress || venda.ip_address),
        },
      })

      return NextResponse.json({ ok: true, result })
    }

    if (action === 'cancelar_venda' || action === 'expirar_venda') {
      const venda = await loadVendaForAction(auth, body.vendaId)
      const statusDestino = action === 'cancelar_venda' ? 'cancelado' : 'expirado'

      if (venda.status === 'autorizado' && statusDestino === 'cancelado') {
        throw new Error('Venda autorizada não deve ser cancelada. Use expirar se precisar encerrar o registro.')
      }

      const now = new Date().toISOString()
      const update = {
        status: statusDestino,
        updated_at: now,
      }

      if (statusDestino === 'expirado') {
        update.expira_em = now
      }

      let query = supabaseAdmin
        .from('wifi_pix_vendas')
        .update(update)
        .eq('id', venda.id)
        .select('*')

      query = auth.applyEmpresaScope(query)

      const { data, error } = await query.single()
      if (error) throw error

      await logAdminAction({
        request,
        adminUser: { id: auth.user?.id, email: auth.adminProfile?.email || auth.user?.email },
        action: 'wifi_pix_' + statusDestino + '_manual',
        entity: 'wifi_pix_vendas',
        entityId: venda.id,
        description: 'Venda Wi-Fi no Pix marcada manualmente como ' + statusDestino + '.',
        metadata: {
          statusAnterior: venda.status,
          statusDestino,
        },
      })

      return NextResponse.json({ ok: true, venda: data })
    }

    if (action === 'arquivar_plano') {
      const planoId = sanitizeUuid(body.id)
      if (!planoId) throw new Error('Plano inválido.')

      let query = supabaseAdmin
        .from('wifi_pix_planos')
        .update({
          ativo: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', planoId)
        .select('id, ativo')

      query = auth.applyEmpresaScope(query)

      const { data, error } = await query.single()
      if (error) throw error

      return NextResponse.json({ ok: true, plano: data })
    }

    throw new Error('Ação inválida.')
  } catch (error) {
    if (isMissingRecommendedColumn(error)) {
      return NextResponse.json(
        { ok: false, error: 'Aplique a migration 20260607050000_wifi_pix_planos_recomendado.sql para salvar plano recomendado.' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { ok: false, error: error.message || 'Erro ao salvar Wi-Fi no Pix.' },
      { status: 400 }
    )
  }
}
