import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-api-auth'
import { logAdminAction } from '@/lib/admin-audit-log'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { normalizeQrTargetUrl } from '@/lib/qr-security'
import { checkRateLimit } from '@/lib/rate-limit'

export const runtime = 'nodejs'

const DESTINATION_TYPES = new Set([
  'link', 'wifi', 'google_review', 'whatsapp', 'instagram', 'maps', 'cardapio', 'campanha',
])
const STATUSES = new Set(['active', 'inactive'])
const NFC_STATUSES = new Set(['unprogrammed', 'programmed', 'verified', 'locked'])
const RATE_LIMIT = { keyPrefix: 'admin:qrcodes:v2', limit: 120, windowMs: 60_000 }

function adminActor(auth) {
  return {
    id: auth.user?.id || null,
    email: auth.adminProfile?.email || auth.user?.email || '',
  }
}

export async function PATCH(request, context) {
  if (!checkRateLimit(request, RATE_LIMIT).allowed) {
    return NextResponse.json({ ok: false, error: 'Muitas requisições.' }, { status: 429 })
  }
  const auth = await requireAdmin(request, { module: 'qrcodes', action: 'update' })
  if (auth.errorResponse) return auth.errorResponse

  try {
    const { id } = await context.params
    const body = await request.json()

    let currentQuery = supabaseAdmin
      .from('qr_codes')
      .select(`
        id, empresa_id, cliente_id, name, slug, type, destination_type,
        target_url, google_review_url, wifi_ssid, wifi_security,
        wifi_password, wifi_hidden, status
      `)
      .eq('id', id)
    currentQuery = auth.applyEmpresaScope(currentQuery)

    const { data: current, error: currentError } = await currentQuery.maybeSingle()
    if (currentError) throw currentError
    if (!current) {
      return NextResponse.json({ ok: false, error: 'QR Code não encontrado no escopo atual.' }, { status: 404 })
    }

    let requestedNfcStatus = null
    if (body.nfc_status !== undefined) {
      if (!auth.canAccess('qrcodes', 'provision')) {
        return NextResponse.json({ ok: false, error: 'Sem permissão para provisionar NFC.' }, { status: 403 })
      }

      requestedNfcStatus = String(body.nfc_status || '').trim()
      if (!NFC_STATUSES.has(requestedNfcStatus)) {
        return NextResponse.json({ ok: false, error: 'Status NFC inválido.' }, { status: 400 })
      }
    }

    const updates = { updated_by: auth.user.id }

    if (body.name !== undefined) {
      const name = String(body.name || '').trim().slice(0, 160)
      if (!name) {
        return NextResponse.json({ ok: false, error: 'Nome não pode ficar vazio.' }, { status: 400 })
      }
      updates.name = name
    }

    if (body.status !== undefined) {
      const status = String(body.status || '').trim()
      if (!STATUSES.has(status)) {
        return NextResponse.json({ ok: false, error: 'Status inválido.' }, { status: 400 })
      }
      updates.status = status
    }

    if (body.destination_type !== undefined || body.type !== undefined) {
      const destinationType = String(body.destination_type || body.type || '').trim()
      if (!DESTINATION_TYPES.has(destinationType)) {
        return NextResponse.json({ ok: false, error: 'Tipo de destino inválido.' }, { status: 400 })
      }
      updates.destination_type = destinationType
      updates.type = destinationType === 'wifi' ? 'wifi' : 'link'
    }

    const effectiveType = updates.destination_type || current.destination_type || current.type
    if (body.target_url !== undefined || body.google_review_url !== undefined) {
      const input = effectiveType === 'google_review'
        ? body.google_review_url || body.target_url
        : body.target_url
      const targetUrl = normalizeQrTargetUrl(input)
      if (!targetUrl) {
        return NextResponse.json({ ok: false, error: 'Destino deve usar HTTP, HTTPS ou um caminho interno.' }, { status: 400 })
      }
      if (effectiveType === 'google_review' && !targetUrl.startsWith('https://')) {
        return NextResponse.json({ ok: false, error: 'A avaliação do Google deve usar HTTPS.' }, { status: 400 })
      }
      updates.target_url = targetUrl
      updates.google_review_url = effectiveType === 'google_review' ? targetUrl : null
    }

    if (body.google_place_id !== undefined) {
      updates.google_place_id = String(body.google_place_id || '').trim().slice(0, 255) || null
    }
    if (body.customer_name !== undefined) {
      updates.customer_name = String(body.customer_name || '').trim().slice(0, 160) || null
    }
    if (body.location_name !== undefined) {
      updates.location_name = String(body.location_name || '').trim().slice(0, 160) || null
    }
    if (body.campaign_name !== undefined) {
      updates.campaign_name = String(body.campaign_name || '').trim().slice(0, 160) || null
    }

    if (effectiveType === 'wifi') {
      if (body.wifi_ssid !== undefined) {
        const ssid = String(body.wifi_ssid || '').trim().slice(0, 128)
        if (!ssid) {
          return NextResponse.json({ ok: false, error: 'Nome da rede Wi-Fi é obrigatório.' }, { status: 400 })
        }
        updates.wifi_ssid = ssid
      }
      if (body.wifi_security !== undefined) {
        const security = String(body.wifi_security || '')
        if (!['nopass', 'WPA'].includes(security)) {
          return NextResponse.json({ ok: false, error: 'Segurança Wi-Fi inválida.' }, { status: 400 })
        }
        updates.wifi_security = security
      }
      if (body.wifi_password !== undefined) {
        updates.wifi_password = String(body.wifi_password || '').slice(0, 255) || null
      }
      if (body.wifi_hidden !== undefined) updates.wifi_hidden = Boolean(body.wifi_hidden)
    }

    const effectiveTargetUrl = updates.target_url !== undefined ? updates.target_url : current.target_url
    const effectiveWifiSsid = updates.wifi_ssid !== undefined ? updates.wifi_ssid : current.wifi_ssid
    const effectiveWifiSecurity = updates.wifi_security !== undefined
      ? updates.wifi_security
      : current.wifi_security || 'nopass'
    const effectiveWifiPassword = updates.wifi_password !== undefined
      ? updates.wifi_password
      : current.wifi_password

    if (effectiveType === 'wifi') {
      if (!effectiveWifiSsid) {
        return NextResponse.json({ ok: false, error: 'Nome da rede Wi-Fi é obrigatório.' }, { status: 400 })
      }
      if (effectiveWifiSecurity === 'WPA' && !effectiveWifiPassword) {
        return NextResponse.json({ ok: false, error: 'Senha Wi-Fi obrigatória para WPA.' }, { status: 400 })
      }
    } else {
      if (!effectiveTargetUrl) {
        return NextResponse.json({ ok: false, error: 'Destino é obrigatório para este tipo de QR Code.' }, { status: 400 })
      }
      if (effectiveType === 'google_review' && !String(effectiveTargetUrl).startsWith('https://')) {
        return NextResponse.json({ ok: false, error: 'A avaliação do Google deve usar HTTPS.' }, { status: 400 })
      }
    }

    if (updates.destination_type) {
      if (effectiveType === 'wifi') {
        updates.target_url = null
        updates.google_place_id = null
        updates.google_review_url = null
      } else {
        updates.wifi_ssid = null
        updates.wifi_security = null
        updates.wifi_password = null
        updates.wifi_hidden = false
        updates.google_review_url = effectiveType === 'google_review' ? effectiveTargetUrl : null
        if (effectiveType !== 'google_review') updates.google_place_id = null
      }
    }

    const meaningfulUpdates = Object.keys(updates).filter((key) => key !== 'updated_by')
    if (meaningfulUpdates.length === 0 && body.nfc_status === undefined) {
      return NextResponse.json({ ok: false, error: 'Nenhum campo válido para atualizar.' }, { status: 400 })
    }
    if (meaningfulUpdates.length > 0 && requestedNfcStatus) {
      return NextResponse.json({
        ok: false,
        error: 'Atualize os dados do QR Code e o provisionamento NFC em operações separadas.',
      }, { status: 400 })
    }

    let updated = current
    if (meaningfulUpdates.length > 0) {
      let updateQuery = supabaseAdmin
        .from('qr_codes')
        .update(updates)
        .eq('id', current.id)
        .select('*')
      updateQuery = current.empresa_id
        ? updateQuery.eq('empresa_id', current.empresa_id)
        : updateQuery.is('empresa_id', null)
      const { data, error } = await updateQuery.single()
      if (error) throw error
      updated = data
    }

    let asset = null
    if (requestedNfcStatus) {
      const timestampUpdates = requestedNfcStatus === 'programmed'
        ? { nfc_programmed_at: new Date().toISOString() }
        : requestedNfcStatus === 'verified'
          ? { nfc_verified_at: new Date().toISOString() }
          : {}
      let assetUpdateQuery = supabaseAdmin
        .from('qr_assets')
        .update({ nfc_status: requestedNfcStatus, ...timestampUpdates })
        .eq('qr_code_id', current.id)
        .select('*')
      assetUpdateQuery = current.empresa_id
        ? assetUpdateQuery.eq('empresa_id', current.empresa_id)
        : assetUpdateQuery.is('empresa_id', null)
      const { data, error } = await assetUpdateQuery
        .single()
      if (error) throw error
      asset = data
    }

    await logAdminAction({
      request,
      adminUser: adminActor(auth),
      action: 'update',
      entity: 'qr_code',
      entityId: current.id,
      description: `QR Code ${current.slug} atualizado.`,
      metadata: {
        empresa_id: current.empresa_id,
        fields: meaningfulUpdates,
        nfc_status: requestedNfcStatus,
      },
    })

    return NextResponse.json({ ok: true, qr_code: updated, asset })
  } catch (error) {
    console.error('Erro ao atualizar QR Code multiempresa:', error)
    return NextResponse.json({ ok: false, error: 'Não foi possível atualizar o QR Code.' }, { status: 500 })
  }
}
