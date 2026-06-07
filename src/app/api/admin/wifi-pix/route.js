import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-api-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'

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
    .order('ordem', { ascending: true })
    .order('valor', { ascending: true })

  query = auth.applyEmpresaScope(query)

  const { data, error } = await query
  if (error) throw error

  return data || []
}

async function loadWifiPixRelatorio(auth, { periodo = 'ultimos_30' } = {}) {
  const dataInicio = getDataInicio(periodo)

  let vendasQuery = supabaseAdmin
    .from('wifi_pix_vendas')
    .select('id, hotspot_id, plano_id, cliente_id, empresa_id, telefone, nome, metodo_pagamento, valor, duracao_minutos, status, pago_em, autorizado_em, expira_em, created_at')
    .order('created_at', { ascending: false })
    .limit(500)

  vendasQuery = auth.applyEmpresaScope(vendasQuery)

  if (dataInicio) {
    vendasQuery = vendasQuery.gte('created_at', dataInicio)
  }

  const { data: vendasData, error: vendasError } = await vendasQuery
  if (vendasError) throw vendasError

  const vendas = vendasData || []
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
      ? supabaseAdmin.from('clientes').select('id, nome').in('id', clienteIds)
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

  vendas.forEach((venda) => {
    const status = venda.status || 'pendente'
    const metodo = venda.metodo_pagamento || 'PIX'
    const hotspot = hotspotsById.get(venda.hotspot_id)
    const hotspotNome = hotspot?.nome || 'Sem hotspot'

    porStatus.set(status, (porStatus.get(status) || 0) + 1)
    porMetodo.set(metodo, (porMetodo.get(metodo) || 0) + 1)

    const atual = porHotspot.get(venda.hotspot_id || 'sem_hotspot') || {
      hotspot_id: venda.hotspot_id || null,
      hotspot_nome: hotspotNome,
      total_vendas: 0,
      receita_confirmada: 0,
    }

    atual.total_vendas += 1
    if (statusesPagos.has(status)) {
      atual.receita_confirmada += Number(venda.valor || 0)
    }

    porHotspot.set(venda.hotspot_id || 'sem_hotspot', atual)
  })

  return {
    periodo,
    resumo: {
      totalVendas: vendas.length,
      vendasConfirmadas,
      pendentes: vendas.filter((item) => item.status === 'pendente').length,
      autorizadas: vendas.filter((item) => item.status === 'autorizado').length,
      erros: vendas.filter((item) => item.status === 'erro').length,
      receitaConfirmada,
      ticketMedio: vendasConfirmadas > 0 ? receitaConfirmada / vendasConfirmadas : 0,
      porStatus: [...porStatus.entries()].map(([status, total]) => ({ status, total })),
      porMetodo: [...porMetodo.entries()].map(([metodo, total]) => ({ metodo, total })),
      porHotspot: [...porHotspot.values()].sort((a, b) => b.receita_confirmada - a.receita_confirmada),
    },
    vendas: vendas.slice(0, 100).map((venda) => ({
      ...venda,
      hotspot_nome: hotspotsById.get(venda.hotspot_id)?.nome || '',
      hotspot_slug: hotspotsById.get(venda.hotspot_id)?.slug || '',
      plano_nome: planosById.get(venda.plano_id)?.nome || 'Plano removido',
      cliente_nome: clientesById.get(venda.cliente_id)?.nome || '',
    })),
  }
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
    const [hotspots, planos] = await Promise.all([
      loadHotspots(auth),
      loadPlanos(auth),
    ])
    const relatorio = await loadWifiPixRelatorio(auth, { periodo })

    return NextResponse.json({
      ok: true,
      hotspots,
      planos,
      relatorio,
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
      if (!hotspotId) throw new Error('Hotspot invalido.')

      let query = supabaseAdmin
        .from('hotspots')
        .update({
          portal_modo_acesso: sanitizeModo(body.portalModoAcesso),
          wifi_pix_ativo: Boolean(body.wifiPixAtivo),
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

      if (!hotspotId) throw new Error('Hotspot invalido.')

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
        ordem: Math.max(0, Math.round(numberValue(body.ordem, 0))),
        updated_at: new Date().toISOString(),
      }

      if (!payload.nome) throw new Error('Nome do plano e obrigatorio.')
      if (payload.valor <= 0) throw new Error('Valor do plano deve ser maior que zero.')

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

    if (action === 'arquivar_plano') {
      const planoId = sanitizeUuid(body.id)
      if (!planoId) throw new Error('Plano invalido.')

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

    throw new Error('Acao invalida.')
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error.message || 'Erro ao salvar Wi-Fi no Pix.' },
      { status: 400 }
    )
  }
}
