import { randomUUID } from 'crypto'
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-api-auth'
import { logAdminAction } from '@/lib/admin-audit-log'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { normalizeQrTargetUrl } from '@/lib/qr-security'
import { checkRateLimit } from '@/lib/rate-limit'

export const runtime = 'nodejs'

const DESTINATION_TYPES = new Set([
  'link',
  'wifi',
  'google_review',
  'whatsapp',
  'instagram',
  'maps',
  'cardapio',
  'campanha',
])
const WIFI_SECURITY = new Set(['nopass', 'WPA'])
const RATE_LIMIT = { keyPrefix: 'admin:qrcodes:v2', limit: 120, windowMs: 60_000 }
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const RESERVED_PUBLIC_SLUGS = new Set([
  'admin', 'api', 'cliente', 'dashboard', 'go', 'login', 'logout', 'q', 'qr', 'r',
])

function cleanUuid(value) {
  const text = String(value || '').trim()
  return UUID_PATTERN.test(text) ? text : ''
}

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
    .slice(0, 80)
}

function siteUrl() {
  return String(process.env.NEXT_PUBLIC_SITE_URL || 'https://www.nexawi.com.br').replace(/\/$/, '')
}

function qrPublicBaseUrl() {
  return String(process.env.QR_PUBLIC_BASE_URL || siteUrl()).replace(/\/$/, '')
}

function publicStatsUrl(slug) {
  return `${qrPublicBaseUrl()}/${slug}`
}

function parseLimit(value, fallback = 100) {
  const parsed = Number.parseInt(String(value || ''), 10)
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(Math.max(parsed, 1), 200)
}

function adminActor(auth) {
  return {
    id: auth.user?.id || null,
    email: auth.adminProfile?.email || auth.user?.email || '',
  }
}

async function resolveEmpresaId(body, auth) {
  const provided = cleanUuid(body.empresa_id || body.empresaId)
  const empresaId = provided || auth.activeEmpresaId || auth.allowedEmpresaIds?.[0] || ''

  if (!empresaId) {
    throw new Error('Selecione uma empresa para criar o ativo QR/NFC.')
  }

  if (!auth.isMaster && !auth.allowedEmpresaIds.includes(empresaId)) {
    throw new Error('Empresa fora do escopo do usuário.')
  }

  const { data, error } = await supabaseAdmin
    .from('empresas')
    .select('id, nome_empresa')
    .eq('id', empresaId)
    .maybeSingle()

  if (error) throw error
  if (!data) throw new Error('Empresa não encontrada.')

  return data
}

async function resolveOptionalRelation(table, idValue, empresaId, fields) {
  const id = cleanUuid(idValue)
  if (!id) return null

  const { data, error } = await supabaseAdmin
    .from(table)
    .select(fields)
    .eq('id', id)
    .eq('empresa_id', empresaId)
    .maybeSingle()

  if (error) throw error
  if (!data) throw new Error(`${table === 'clientes' ? 'Cliente' : 'Hotspot'} fora do escopo da empresa.`)

  return data
}

export async function GET(request) {
  if (!checkRateLimit(request, RATE_LIMIT).allowed) {
    return NextResponse.json({ ok: false, error: 'Muitas requisições.' }, { status: 429 })
  }
  const auth = await requireAdmin(request, { module: 'qrcodes', action: 'view' })
  if (auth.errorResponse) return auth.errorResponse

  try {
    const url = new URL(request.url)
    const limit = parseLimit(url.searchParams.get('limit'))
    const offset = Math.max(Number.parseInt(url.searchParams.get('offset') || '0', 10) || 0, 0)
    const search = String(url.searchParams.get('search') || '').trim().slice(0, 100)

    let query = supabaseAdmin
      .from('qr_code_stats')
      .select(`
        id, name, slug, type, destination_type, target_url, status,
        customer_name, location_name, campaign_name, empresa_id, cliente_id,
        hotspot_id, google_place_id, google_review_url, public_token,
        created_at, updated_at, total_scans, scans_today, scans_7d, scans_30d,
        qr_scans, nfc_scans, legacy_scans, last_scan_at
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    query = auth.applyEmpresaScope(query)
    if (search) {
      const safeSearch = search.replace(/[%(),]/g, ' ')
      query = query.or(`name.ilike.%${safeSearch}%,slug.ilike.%${safeSearch}%,customer_name.ilike.%${safeSearch}%`)
    }

    let empresasQuery = supabaseAdmin
      .from('empresas')
      .select('id, nome_empresa, status')
      .order('nome_empresa', { ascending: true })
    empresasQuery = auth.applyEmpresaScope(empresasQuery, 'id')

    let clientesQuery = supabaseAdmin
      .from('clientes')
      .select('id, empresa_id, nome, nome_empresa, status')
      .order('nome', { ascending: true })
    clientesQuery = auth.applyEmpresaScope(clientesQuery)

    let hotspotsQuery = supabaseAdmin
      .from('hotspots')
      .select('id, empresa_id, nome, cidade, status')
      .order('nome', { ascending: true })
    hotspotsQuery = auth.applyEmpresaScope(hotspotsQuery)

    const [itemsResult, empresasResult, clientesResult, hotspotsResult] = await Promise.all([
      query,
      empresasQuery,
      clientesQuery,
      hotspotsQuery,
    ])

    const firstError = itemsResult.error || empresasResult.error || clientesResult.error || hotspotsResult.error
    if (firstError) throw firstError

    const qrCodeIds = (itemsResult.data || []).map((item) => item.id)
    let assets = []
    if (qrCodeIds.length > 0) {
      let assetsQuery = supabaseAdmin
        .from('qr_assets')
        .select('id, qr_code_id, empresa_id, serial_number, status, nfc_status, location_label, installed_at')
        .in('qr_code_id', qrCodeIds)
      assetsQuery = auth.applyEmpresaScope(assetsQuery)
      const assetsResult = await assetsQuery
      if (assetsResult.error) throw assetsResult.error
      assets = assetsResult.data || []
    }
    const assetsByQrCode = new Map(assets.map((asset) => [asset.qr_code_id, asset]))

    return NextResponse.json({
      ok: true,
      items: (itemsResult.data || []).map((item) => {
        const asset = assetsByQrCode.get(item.id) || null
        const dynamicUrl = `${siteUrl()}/q/${item.slug}`

        return {
          ...item,
          asset,
          dynamic_url: dynamicUrl,
          qr_url: asset ? `${qrPublicBaseUrl()}/r/${item.public_token}/qr` : dynamicUrl,
          nfc_url: asset ? `${qrPublicBaseUrl()}/r/${item.public_token}/nfc` : null,
          public_stats_url: publicStatsUrl(item.slug),
        }
      }),
      empresas: empresasResult.data || [],
      clientes: clientesResult.data || [],
      hotspots: hotspotsResult.data || [],
      scope: {
        activeEmpresaId: auth.activeEmpresaId || null,
        isMaster: auth.isMaster,
      },
    })
  } catch (error) {
    console.error('Erro ao listar QR Codes multiempresa:', error)
    return NextResponse.json({ ok: false, error: 'Não foi possível carregar os ativos QR/NFC.' }, { status: 500 })
  }
}

export async function POST(request) {
  if (!checkRateLimit(request, RATE_LIMIT).allowed) {
    return NextResponse.json({ ok: false, error: 'Muitas requisições.' }, { status: 429 })
  }
  const auth = await requireAdmin(request, { module: 'qrcodes', action: 'create' })
  if (auth.errorResponse) return auth.errorResponse

  try {
    const body = await request.json()
    const name = String(body.name || '').trim().slice(0, 160)
    const destinationType = String(body.destination_type || body.type || 'link').trim()
    const wifiSsid = String(body.wifi_ssid || '').trim().slice(0, 128)
    const wifiSecurity = String(body.wifi_security || 'nopass').trim()
    const wifiPassword = String(body.wifi_password || '').slice(0, 255)
    const targetInput = destinationType === 'google_review'
      ? body.google_review_url || body.target_url
      : body.target_url
    const targetUrl = destinationType === 'wifi' ? null : normalizeQrTargetUrl(targetInput)

    if (!name) {
      return NextResponse.json({ ok: false, error: 'Nome é obrigatório.' }, { status: 400 })
    }
    if (!DESTINATION_TYPES.has(destinationType)) {
      return NextResponse.json({ ok: false, error: 'Tipo de destino inválido.' }, { status: 400 })
    }
    if (destinationType === 'wifi' && !wifiSsid) {
      return NextResponse.json({ ok: false, error: 'Nome da rede Wi-Fi é obrigatório.' }, { status: 400 })
    }
    if (destinationType === 'wifi' && !WIFI_SECURITY.has(wifiSecurity)) {
      return NextResponse.json({ ok: false, error: 'Segurança Wi-Fi inválida.' }, { status: 400 })
    }
    if (destinationType === 'wifi' && wifiSecurity === 'WPA' && !wifiPassword) {
      return NextResponse.json({ ok: false, error: 'Senha Wi-Fi obrigatória para WPA.' }, { status: 400 })
    }
    if (destinationType !== 'wifi' && !targetUrl) {
      return NextResponse.json({ ok: false, error: 'Destino deve usar HTTP, HTTPS ou um caminho interno.' }, { status: 400 })
    }
    if (destinationType === 'google_review' && !String(targetUrl).startsWith('https://')) {
      return NextResponse.json({ ok: false, error: 'A avaliação do Google deve usar um endereço HTTPS.' }, { status: 400 })
    }

    const empresa = await resolveEmpresaId(body, auth)
    const cliente = await resolveOptionalRelation(
      'clientes',
      body.cliente_id || body.clienteId,
      empresa.id,
      'id, empresa_id, nome, nome_empresa'
    )
    const hotspot = await resolveOptionalRelation(
      'hotspots',
      body.hotspot_id || body.hotspotId,
      empresa.id,
      'id, empresa_id, nome'
    )
    const slug = slugify(body.slug || name) || randomUUID().slice(0, 8)
    if (RESERVED_PUBLIC_SLUGS.has(slug)) {
      return NextResponse.json({ ok: false, error: 'Este endereço público é reservado. Escolha outro nome.' }, { status: 400 })
    }
    const requestedSerialNumber = String(body.serial_number || '')
      .trim()
      .toUpperCase()
      .slice(0, 64)
    const serialNumber = requestedSerialNumber || `NX${randomUUID().replaceAll('-', '').slice(0, 8).toUpperCase()}`

    const { data: created, error: createError } = await supabaseAdmin
      .rpc('create_qr_asset', {
        p_qr: {
          name,
          slug,
          type: destinationType === 'wifi' ? 'wifi' : 'link',
          destination_type: destinationType,
          target_url: targetUrl,
          google_place_id: destinationType === 'google_review'
            ? String(body.google_place_id || '').trim().slice(0, 255) || null
            : null,
          google_review_url: destinationType === 'google_review' ? targetUrl : null,
          wifi_ssid: destinationType === 'wifi' ? wifiSsid : null,
          wifi_security: destinationType === 'wifi' ? wifiSecurity : null,
          wifi_password: destinationType === 'wifi' && wifiSecurity !== 'nopass' ? wifiPassword : null,
          wifi_hidden: destinationType === 'wifi' ? Boolean(body.wifi_hidden) : false,
          empresa_id: empresa.id,
          cliente_id: cliente?.id || null,
          hotspot_id: hotspot?.id || null,
          customer_name: cliente?.nome_empresa || cliente?.nome || String(body.customer_name || '').trim() || null,
          location_name: hotspot?.nome || String(body.location_name || '').trim() || null,
          campaign_name: String(body.campaign_name || '').trim() || null,
          created_by: auth.user.id,
          updated_by: auth.user.id,
          status: 'active',
        },
        p_asset: {
          serial_number: serialNumber,
          location_label: hotspot?.nome || String(body.location_name || '').trim() || null,
          status: 'production',
          nfc_status: 'unprogrammed',
          metadata: {},
        },
      })

    if (createError) {
      if (createError.code === '23505') {
        return NextResponse.json({ ok: false, error: 'Slug ou serial já cadastrado.' }, { status: 409 })
      }
      throw createError
    }

    const qrCode = created?.qr_code
    const asset = created?.asset
    if (!qrCode?.id || !asset?.id) throw new Error('A criação transacional não retornou o ativo completo.')

    await logAdminAction({
      request,
      adminUser: adminActor(auth),
      action: 'create',
      entity: 'qr_asset',
      entityId: asset.id,
      description: `Ativo QR/NFC ${serialNumber} criado para ${empresa.nome_empresa}.`,
      metadata: {
        empresa_id: empresa.id,
        cliente_id: cliente?.id || null,
        hotspot_id: hotspot?.id || null,
        qr_code_id: qrCode.id,
        destination_type: destinationType,
      },
    })

    return NextResponse.json({
      ok: true,
      qr_code: qrCode,
      asset,
      dynamic_url: `${siteUrl()}/q/${qrCode.slug}`,
      qr_url: `${qrPublicBaseUrl()}/r/${qrCode.public_token}/qr`,
      nfc_url: `${qrPublicBaseUrl()}/r/${qrCode.public_token}/nfc`,
      public_stats_url: publicStatsUrl(qrCode.slug),
    }, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar ativo QR/NFC:', error)
    const message = error instanceof SyntaxError
      ? 'Corpo da requisição inválido.'
      : error.message || 'Não foi possível criar o ativo QR/NFC.'
    const isValidationError = error instanceof SyntaxError || /empresa|cliente|hotspot|escopo|selecione/i.test(message)
    return NextResponse.json({
      ok: false,
      error: isValidationError ? message : 'Não foi possível criar o ativo QR/NFC.',
    }, { status: isValidationError ? 400 : 500 })
  }
}
