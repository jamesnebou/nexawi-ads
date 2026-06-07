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

export async function GET(request) {
  const auth = await requireAdmin(request, {
    module: 'hotspots',
    action: 'view',
  })

  if (auth.errorResponse) return auth.errorResponse

  try {
    const [hotspots, planos] = await Promise.all([
      loadHotspots(auth),
      loadPlanos(auth),
    ])

    return NextResponse.json({
      ok: true,
      hotspots,
      planos,
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
