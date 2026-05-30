// src/app/api/portal/bootstrap/route.js
// ============================================================
// API pública segura para carregar o portal.
// Ela devolve apenas dados mínimos do hotspot e anúncios ativos.
// O navegador não consulta mais as tabelas diretamente.
// ============================================================

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getSaasFinanceContext } from '@/lib/saas-finance'

export const runtime = 'nodejs'

const TIPOS_DESTINO_VALIDOS = ['externo', 'lp_interna', 'site_nexawi']

function sanitizeSlug(value = '') {
  return String(value || '').trim()
}

function publicHotspot(hotspot = {}) {
  return {
    id: hotspot.id,
    nome: hotspot.nome,
    slug: hotspot.slug,
    status: hotspot.status,
    portal_rules: {
      email_obrigatorio: hotspot.portal_email_obrigatorio !== false,
      cpf_visivel: hotspot.portal_cpf_visivel !== false,
      cpf_obrigatorio: hotspot.portal_cpf_obrigatorio !== false,
      promocoes_optin_ativo: Boolean(hotspot.portal_promocoes_optin_ativo),
      promocoes_texto: hotspot.portal_promocoes_texto || 'Quero receber ofertas, cupons e novidades dos anunciantes parceiros da NexaWi por WhatsApp, SMS ou e-mail.',
    },
  }
}

function publicAnuncio(anuncio = {}) {
  const tipoDestino = TIPOS_DESTINO_VALIDOS.includes(anuncio.tipo_destino) ? anuncio.tipo_destino
    : 'externo'

  return {
    id: anuncio.id,
    titulo: anuncio.titulo,
    descricao: anuncio.descricao,
    url_destino: anuncio.url_destino,
    tipo_destino: tipoDestino,
    lp_slug: anuncio.lp_slug || '',
    tempo_liberacao_lp: Number(anuncio.tempo_liberacao_lp || 10),
    duracao_segundos: anuncio.duracao_segundos,
    ativo: anuncio.ativo,
    media_url: anuncio.media_url,
    tipo_media: anuncio.tipo_media,
  }
}

async function filtrarAnunciosPorContaAtiva(anuncios = []) {
  if (!anuncios.length) return []

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
      } catch (error) {
        console.error('Erro ao validar financeiro do anunciante no portal:', error)
        cache.set(key, false)
      }
    }

    if (cache.get(key)) {
      filtrados.push(anuncio)
    }
  }

  return filtrados
}

export async function POST(request) {
  try {
    const body = await request.json()
    const slug = sanitizeSlug(body.slug)

    if (!slug) {
      return NextResponse.json(
        { ok: false, error: 'slug é obrigatório' },
        { status: 400 }
      )
    }

    // Busca o hotspot por slug.
    let { data: hotspot, error: hotspotError } = await supabaseAdmin
      .from('hotspots')
      .select(`
        id,
        empresa_id,
        cliente_id,
        nome,
        slug,
        status,
        portal_email_obrigatorio,
        portal_cpf_visivel,
        portal_cpf_obrigatorio,
        portal_promocoes_optin_ativo,
        portal_promocoes_texto
      `)
      .eq('slug', slug)
      .maybeSingle()

    if (hotspotError) throw hotspotError

    // Fallback: busca por nome, porque seu sistema já usa essa lógica.
    if (!hotspot) {
      const result = await supabaseAdmin
        .from('hotspots')
        .select(`
          id,
          empresa_id,
          cliente_id,
          nome,
          slug,
          status,
          portal_email_obrigatorio,
          portal_cpf_visivel,
          portal_cpf_obrigatorio,
          portal_promocoes_optin_ativo,
          portal_promocoes_texto
        `)
        .eq('nome', slug)
        .maybeSingle()

      if (result.error) throw result.error
      hotspot = result.data
    }

    if (!hotspot || hotspot.status !== 'Ativo') {
      return NextResponse.json(
        { ok: false, error: 'Hotspot não encontrado ou inativo' },
        { status: 404 }
      )
    }

    // Busca vínculos de anúncios para este hotspot.
    const { data: vinculos, error: vinculosError } = await supabaseAdmin
      .from('anuncio_hotspots')
      .select('anuncio_id')
      .eq('hotspot_id', hotspot.id)

    if (vinculosError) throw vinculosError

    const anuncioIds = (vinculos || [])
      .map((v) => v.anuncio_id)
      .filter(Boolean)

    let anuncios = []

    if (anuncioIds.length > 0) {
      const { data: anunciosData, error: anunciosError } = await supabaseAdmin
        .from('anuncios')
        .select(`
          id,
          titulo,
          descricao,
          url_destino,
          tipo_destino,
          lp_slug,
          tempo_liberacao_lp,
          duracao_segundos,
          ativo,
          media_url,
          tipo_media,
          empresa_id,
          cliente_id
        `)
        .in('id', anuncioIds)
        .eq('ativo', true)

      if (anunciosError) throw anunciosError
      anuncios = await filtrarAnunciosPorContaAtiva(anunciosData || [])
    }

    return NextResponse.json({
      ok: true,
      hotspot: publicHotspot(hotspot),
      anuncios: anuncios.map(publicAnuncio),
    })
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error.message || 'Erro ao carregar portal',
      },
      { status: 500 }
    )
  }
}
