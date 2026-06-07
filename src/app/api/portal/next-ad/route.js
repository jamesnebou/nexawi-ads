import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getSaasFinanceContext } from '@/lib/saas-finance'
import { checkRateLimit } from '@/lib/rate-limit'

export const runtime = 'nodejs'

const RATE_LIMIT = {
  keyPrefix: 'portal:next-ad',
  limit: 60,
  windowMs: 60_000,
}

const TIPOS_DESTINO_VALIDOS = ['externo', 'lp_interna', 'site_nexawi']

function clean(value = '') {
  return String(value || '').trim()
}

function normalizeMac(value = '') {
  return clean(value).toUpperCase().replace(/-/g, ':')
}

function publicAd(ad = {}) {
  return {
    id: ad.id,
    titulo: ad.titulo,
    descricao: ad.descricao,
    url_destino: ad.url_destino,
    tipo_destino: TIPOS_DESTINO_VALIDOS.includes(ad.tipo_destino) ? ad.tipo_destino : 'externo',
    lp_slug: ad.lp_slug || '',
    tempo_liberacao_lp: Number(ad.tempo_liberacao_lp || 30),
    duracao_segundos: ad.duracao_segundos,
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

function escolherProximo({ anuncios = [], historico = [] }) {
  if (!anuncios.length) return null
  if (anuncios.length === 1) return anuncios[0]

  const ativos = anuncios.map((ad) => ad.id)
  const ativosSet = new Set(ativos)
  const cicloAtual = new Set()

  for (const item of historico) {
    const id = item.anuncio_id
    if (!ativosSet.has(id)) continue
    if (cicloAtual.has(id)) break
    cicloAtual.add(id)
    if (cicloAtual.size >= ativos.length) break
  }

  if (cicloAtual.size >= ativos.length) cicloAtual.clear()

  return anuncios.find((ad) => !cicloAtual.has(ad.id)) || anuncios[0]
}

export async function POST(request) {
  const rate = checkRateLimit(request, RATE_LIMIT)

  if (!rate.allowed) {
    return NextResponse.json({ ok: false, error: 'Muitas tentativas. Aguarde um instante.' }, { status: 429 })
  }

  try {
    const body = await request.json().catch(() => ({}))
    const hotspotId = clean(body.hotspotId || body.hotspot_id)
    const macAddress = normalizeMac(body.macAddress || body.mac_address || body.clientMac)
    const leadId = clean(body.leadId || body.lead_id)

    if (!hotspotId) throw new Error('hotspotId é obrigatório')
    if (!macAddress) throw new Error('MAC do aparelho é obrigatório')

    const { data: vinculos, error: vinculosError } = await supabaseAdmin
      .from('anuncio_hotspots')
      .select('anuncio_id')
      .eq('hotspot_id', hotspotId)

    if (vinculosError) throw vinculosError

    const ids = (vinculos || []).map((item) => item.anuncio_id).filter(Boolean)

    if (!ids.length) {
      return NextResponse.json({ ok: true, anuncio: null, totalAnuncios: 0 })
    }

    const { data: anunciosData, error: anunciosError } = await supabaseAdmin
      .from('anuncios')
      .select('id,titulo,descricao,url_destino,tipo_destino,lp_slug,tempo_liberacao_lp,duracao_segundos,ativo,media_url,tipo_media,empresa_id,cliente_id,created_at')
      .in('id', ids)
      .eq('ativo', true)
      .order('created_at', { ascending: true })

    if (anunciosError) throw anunciosError

    const anuncios = await filtrarContaAtiva(anunciosData || [])

    if (!anuncios.length) {
      return NextResponse.json({ ok: true, anuncio: null, totalAnuncios: 0 })
    }

    const activeIds = anuncios.map((ad) => ad.id)

    const { data: historico, error: historicoError } = await supabaseAdmin
      .from('anuncio_device_history')
      .select('anuncio_id,created_at')
      .eq('hotspot_id', hotspotId)
      .eq('mac_address', macAddress)
      .in('anuncio_id', activeIds)
      .order('created_at', { ascending: false })
      .limit(200)

    if (historicoError) throw historicoError

    const anuncio = escolherProximo({ anuncios, historico: historico || [] })

    if (!anuncio) {
      return NextResponse.json({ ok: true, anuncio: null, totalAnuncios: anuncios.length })
    }

    const { error: insertError } = await supabaseAdmin
      .from('anuncio_device_history')
      .insert({
        hotspot_id: hotspotId,
        anuncio_id: anuncio.id,
        mac_address: macAddress,
        lead_id: leadId || null,
      })

    if (insertError) throw insertError

    if (leadId) {
      await supabaseAdmin
        .from('leads')
        .update({ anuncio_id: anuncio.id })
        .eq('id', leadId)
    }

    return NextResponse.json({
      ok: true,
      anuncio: publicAd(anuncio),
      totalAnuncios: anuncios.length,
    })
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error.message || 'Erro ao selecionar próximo anúncio' },
      { status: 500 }
    )
  }
}
