// src/app/api/admin/cidades/route.js
// ============================================================
// API administrativa segura para Cidades.
// Substitui o acesso direto do navegador à tabela:
// - landing_pages_cidades
//
// Permissões aplicadas:
// - GET cidades: configuracoes.view
// - Criar/editar cidade: configuracoes.update
// - Ativar/inativar cidade: configuracoes.update
//
// Como Cidades faz parte da configuração comercial da landing,
// ela usa o módulo configuracoes.
// ============================================================

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireAdmin } from '@/lib/admin-api-auth'
import { logAdminAction } from '@/lib/admin-audit-log'

export const runtime = 'nodejs'

function limparTexto(value = '') {
  return String(value || '').trim()
}

function slugify(value = '') {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function numeroOuNull(value) {
  if (value === null || value === undefined || value === '') {
    return null
  }

  const normalized = String(value)
    .replace(/\s/g, '')
    .replace(',', '.')
    .trim()

  if (!normalized) return null

  const parsed = Number(normalized)

  if (!Number.isFinite(parsed)) {
    return null
  }

  return parsed
}

function booleano(value, fallback = false) {
  if (typeof value === 'boolean') {
    return value
  }

  return fallback
}

function nullableTexto(value = '') {
  const text = limparTexto(value)
  return text || null
}

function permissaoNegada(modulo, acao) {
  return NextResponse.json(
    {
      ok: false,
      error: `Sem permissão para ${acao} em ${modulo}`,
    },
    { status: 403 }
  )
}

function sanitizarCidadePayload(cidade = {}) {
  const cidadeNome = limparTexto(cidade.cidade_nome)
  const slug = slugify(cidade.slug || cidadeNome)

  return {
    slug,
    cidade_nome: cidadeNome,
    ativa: booleano(cidade.ativa, true),

    badge_topo: nullableTexto(cidade.badge_topo),
    headline: nullableTexto(cidade.headline),
    subheadline: nullableTexto(cidade.subheadline),
    cta_primaria: nullableTexto(cidade.cta_primaria),
    cta_secundaria: nullableTexto(cidade.cta_secundaria),
    whatsapp_destino: nullableTexto(cidade.whatsapp_destino),
    observacao_precos: nullableTexto(cidade.observacao_precos),

    preco_basico_mensal: numeroOuNull(cidade.preco_basico_mensal),
    preco_basico_anual: numeroOuNull(cidade.preco_basico_anual),
    preco_comercial_mensal: numeroOuNull(cidade.preco_comercial_mensal),
    preco_comercial_anual: numeroOuNull(cidade.preco_comercial_anual),
    preco_vip_mensal: numeroOuNull(cidade.preco_vip_mensal),
    preco_vip_anual: numeroOuNull(cidade.preco_vip_anual),

    mostrar_preco_ancora: booleano(cidade.mostrar_preco_ancora, false),
    preco_ancora_basico_mensal: numeroOuNull(cidade.preco_ancora_basico_mensal),
    preco_ancora_basico_anual: numeroOuNull(cidade.preco_ancora_basico_anual),
    preco_ancora_comercial_mensal: numeroOuNull(cidade.preco_ancora_comercial_mensal),
    preco_ancora_comercial_anual: numeroOuNull(cidade.preco_ancora_comercial_anual),
    preco_ancora_vip_mensal: numeroOuNull(cidade.preco_ancora_vip_mensal),
    preco_ancora_vip_anual: numeroOuNull(cidade.preco_ancora_vip_anual),

    hero_imagem_url: nullableTexto(cidade.hero_imagem_url),

    hero_titulo_linha_1: nullableTexto(cidade.hero_titulo_linha_1),
    hero_titulo_linha_2: nullableTexto(cidade.hero_titulo_linha_2),
    hero_titulo_linha_3: nullableTexto(cidade.hero_titulo_linha_3),
    hero_subtitulo_linha_1: nullableTexto(cidade.hero_subtitulo_linha_1),
    hero_subtitulo_linha_2: nullableTexto(cidade.hero_subtitulo_linha_2),

    hero_titulo_linha_2_estilo:
      ['gradiente', 'faixa'].includes(cidade.hero_titulo_linha_2_estilo)
        ? cidade.hero_titulo_linha_2_estilo
        : 'gradiente',
  }
}

function validarCidade(payload) {
  if (!payload.cidade_nome) return 'Nome da cidade é obrigatório'
  if (!payload.slug) return 'Slug da cidade é obrigatório'
  if (payload.cidade_nome.length < 2) return 'Nome da cidade precisa ter pelo menos 2 caracteres'
  if (payload.slug.length < 2) return 'Slug precisa ter pelo menos 2 caracteres'

  return ''
}

async function buscarCidadeBasica(id) {
  const { data, error } = await supabaseAdmin
    .from('landing_pages_cidades')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) throw error

  return data || null
}

export async function GET(request) {
  const auth = await requireAdmin(request, {
    module: 'configuracoes',
    action: 'view',
  })

  if (auth.errorResponse) {
    return auth.errorResponse
  }

  try {
    const { searchParams } = new URL(request.url)
    const busca = String(searchParams.get('busca') || '').trim()

    let query = supabaseAdmin
      .from('landing_pages_cidades')
      .select('*')
      .order('updated_at', { ascending: false })

    if (busca) {
      const safeBusca = busca
        .replace(/[%,()]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()

      query = query.or(
        `cidade_nome.ilike.%${safeBusca}%,slug.ilike.%${safeBusca}%,headline.ilike.%${safeBusca}%`
      )
    }

    const { data, error } = await query

    if (error) throw error

    return NextResponse.json({
      ok: true,
      cidades: data || [],
      permissions: auth.permissions?.configuracoes || {},
    })
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error.message || 'Erro ao buscar cidades',
      },
      { status: 500 }
    )
  }
}

export async function POST(request) {
  const auth = await requireAdmin(request)

  if (auth.errorResponse) {
    return auth.errorResponse
  }

  if (!auth.canAccess('configuracoes', 'update')) {
    return permissaoNegada('configuracoes', 'update')
  }

  try {
    const body = await request.json()
    const action = String(body.action || 'save').trim()

    if (action === 'toggle') {
      const id = String(body.id || '').trim()

      if (!id) {
        return NextResponse.json(
          { ok: false, error: 'ID da cidade é obrigatório' },
          { status: 400 }
        )
      }

      const cidadeAntes = await buscarCidadeBasica(id)
      const novoStatus =
        typeof body.ativa === 'boolean'
          ? body.ativa
          : !(cidadeAntes?.ativa ?? true)

      const { data, error } = await supabaseAdmin
        .from('landing_pages_cidades')
        .update({ ativa: novoStatus })
        .eq('id', id)
        .select('*')
        .single()

      if (error) throw error

      await logAdminAction({
        request,
        adminUser: auth.user,
        action: 'update',
        entity: 'landing_pages_cidades',
        entityId: data.id,
        description: novoStatus ? 'Ativou uma cidade' : 'Inativou uma cidade',
        metadata: {
          cidade_id: data.id,
          cidade_nome: data.cidade_nome,
          slug: data.slug,
          ativa_anterior: cidadeAntes?.ativa ?? null,
          ativa_atual: data.ativa,
        },
      })

      return NextResponse.json({
        ok: true,
        cidade: data,
        message: novoStatus ? 'Cidade ativada com sucesso' : 'Cidade inativada com sucesso',
      })
    }

    if (action === 'save') {
      const id = body.id ? String(body.id).trim() : ''
      const payload = sanitizarCidadePayload(body.cidade || {})
      const erroValidacao = validarCidade(payload)

      if (erroValidacao) {
        return NextResponse.json(
          { ok: false, error: erroValidacao },
          { status: 400 }
        )
      }

      let cidadeAntes = null
      let data = null
      let error = null

      if (id) {
        cidadeAntes = await buscarCidadeBasica(id)

        const result = await supabaseAdmin
          .from('landing_pages_cidades')
          .update(payload)
          .eq('id', id)
          .select('*')
          .single()

        data = result.data
        error = result.error
      } else {
        const result = await supabaseAdmin
          .from('landing_pages_cidades')
          .insert([payload])
          .select('*')
          .single()

        data = result.data
        error = result.error
      }

      if (error) throw error

      await logAdminAction({
        request,
        adminUser: auth.user,
        action: id ? 'update' : 'create',
        entity: 'landing_pages_cidades',
        entityId: data.id,
        description: id ? 'Atualizou uma cidade' : 'Criou uma nova cidade',
        metadata: {
          cidade_id: data.id,
          cidade_nome_anterior: cidadeAntes?.cidade_nome || null,
          cidade_nome_atual: data.cidade_nome,
          slug_anterior: cidadeAntes?.slug || null,
          slug_atual: data.slug,
          ativa_anterior: cidadeAntes?.ativa ?? null,
          ativa_atual: data.ativa,
          alterou_precos: true,
          alterou_hero: Boolean(payload.hero_imagem_url),
          alterou_textos: true,
        },
      })

      return NextResponse.json({
        ok: true,
        cidade: data,
        message: id ? 'Cidade atualizada com sucesso' : 'Cidade criada com sucesso',
      })
    }

    return NextResponse.json(
      { ok: false, error: 'Ação inválida' },
      { status: 400 }
    )
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error.message || 'Erro ao salvar cidade',
      },
      { status: 500 }
    )
  }
}