import { createHash } from 'node:crypto'
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getSaasFinanceContext } from '@/lib/saas-finance'
import { checkRateLimit } from '@/lib/rate-limit'

export const runtime = 'nodejs'

const RATE_LIMIT = {
  keyPrefix: 'portal:ad-next',
  limit: 60,
  windowMs: 60_000,
}

function limparTexto(value = '') {
  return String(value || '').trim()
}

function normalizeMac(value = '') {
  return limparTexto(value).toUpperCase().replace(/-/g, ':')
}

function somenteNumeros(value = '') {
  return String(value || '').replace(/\D/g, '')
}

function userKey({ hotspotId, macAddress, telefone }) {
  const raw = [
    limparTexto(hotspotId),
    normalizeMac(macAddress),
    somenteNumeros(telefone),
  ].join('|')

  return createHash('sha256').update(raw).digest('hex')
}

const TIPOS_DESTINO_VALIDOS = ['externo', 'lp_interna', 'site_nexawi']

function publicAd(ad = {}) {
  return {
    id: ad.id,
    titulo: ad.titulo,
    descricao: ad.descricao,
    url_destino: ad.url_destino,
    tipo_destino: TIPOS_DESTINO_VALIDOS.includes(ad.tipo_destino) ? ad.tipo_destino : 'externo',
    lp_slug: ad.lp_slug || '',
    tempo_liberacao_lp: Number(ad.tempo_liberacao_lp || 10),
    duracao_segundos: Number(ad.duracao_segundos || 15),
    ativo: ad.ativo,
    media_url: ad.media_url,
    tipo_media: ad.tipo_media,
  }
}

async function filtrarContaAtiva(anuncios = []) {
  const cache = new Map()
  const filtrados = []

  for (const anuncio of anuncios) {
    const key = `${anuncio.empresa_id || ''}:${anuncio.cliente_id || ''}`

    if (!cache.has(key)) {
      try {
        const context = await getSaasFinanceContext({
          empresaId: anuncio.empresa_id || '',
          clienteId: anuncio.cliente_id || '',
        })

        cache.set(key, !context.bloqueado)
      } catch {
        cache.set(key, false)
      }
    }

    if (cache.get(key)) filtrados.push(anuncio)
  }

  return filtrados
}

async function getActiveAdsForHotspot(hotspotId) {
  const { data: vinculos, error: vinculosError } = await supabaseAdmin
    .from('anuncio_hotspots')
    .select('anuncio_id')
    .eq('hotspot_id', hotspotId)

  if (vinculosError) throw vinculosError

  const anuncioIds = (vinculos || [])
    .map((item) => item.anuncio_id)
    .filter(Boolean)

  if (anuncioIds.length === 0) return []

  const { data, error } = await supabaseAdmin
    .from('anuncios')
    .select('id, titulo, descricao, url_destino, tipo_destino, lp_slug, tempo_liberacao_lp, duracao_segundos, ativo, media_url, tipo_media, empresa_id, cliente_id, created_at')
    .in('id', anuncioIds)
    .eq('ativo', true)
    .is('arquivado_em', null)
    .order('created_at', { ascending: true })

  if (error) throw error

  return filtrarContaAtiva(data || [])
}

async function clearLeadAd(leadId) {
  if (!leadId) return

  await supabaseAdmin
    .from('leads')
    .update({ anuncio_id: null })
    .eq('id', leadId)
}

export async function POST(request) {
  const rate = checkRateLimit(request, RATE_LIMIT)

  if (!rate.allowed) {
    return NextResponse.json({ ok: false, error: 'Muitas tentativas. Aguarde um instante.' }, { status: 429 })
  }

  try {
    const body = await request.json().catch(() => ({}))
    const hotspotId = limparTexto(body.hotspotId || body.hotspot_id)
    const leadId = limparTexto(body.leadId || body.lead_id)
    const macAddress = normalizeMac(body.macAddress || body.mac_address)
    const telefone = somenteNumeros(body.telefone)

    if (!hotspotId) throw new Error('hotspotId e obrigatorio')
    if (!leadId) throw new Error('leadId e obrigatorio')
    if (!macAddress) throw new Error('MAC e obrigatorio')
    if (telefone.length !== 11) throw new Error('telefone e obrigatorio')

    const anuncios = await getActiveAdsForHotspot(hotspotId)

    if (anuncios.length === 0) {
      await clearLeadAd(leadId)

      return NextResponse.json({
        ok: true,
        anuncio: null,
        adSessionId: null,
        cycle: 0,
      })
    }

    const key = userKey({ hotspotId, macAddress, telefone })
    const adIds = anuncios.map((ad) => ad.id)

    const { data: sessionRows, error: claimError } = await supabaseAdmin
      .rpc('claim_next_portal_ad', {
        p_hotspot_id: hotspotId,
        p_user_key: key,
        p_lead_id: leadId,
        p_ad_ids: adIds,
      })

    if (claimError) throw claimError

    const claimedSession = sessionRows?.[0]
    const nextAd = anuncios.find((ad) => ad.id === claimedSession?.anuncio_id)

    if (!claimedSession || !nextAd) {
      await clearLeadAd(leadId)

      return NextResponse.json({
        ok: true,
        anuncio: null,
        adSessionId: null,
        cycle: 0,
      })
    }

    await supabaseAdmin
      .from('leads')
      .update({ anuncio_id: nextAd.id })
      .eq('id', leadId)

    return NextResponse.json({
      ok: true,
      anuncio: publicAd(nextAd),
      adSessionId: claimedSession.id,
      eligibleAt: claimedSession.eligible_at,
      durationSeconds: Number(claimedSession.duration_seconds || 15),
      cycle: Number(claimedSession.cycle || 1),
    })
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error.message || 'Erro ao selecionar proximo anuncio',
      },
      { status: 400 }
    )
  }
}
