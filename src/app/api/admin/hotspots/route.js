// src/app/api/admin/hotspots/route.js
// ============================================================
// API administrativa segura para a aba Hotspots.
// Substitui o acesso direto do navegador à tabela hotspots.
//
// Agora:
// Dashboard → API admin → valida admin → valida permissão → service_role → Supabase
//
// Permissões aplicadas:
// - GET hotspots: hotspots.view
// - Criar hotspot: hotspots.create
// - Editar hotspot: hotspots.update
// - Excluir hotspot: hotspots.delete
//
// Auditoria:
// - Registra criação, edição e exclusão de hotspots.
// ============================================================

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireAdmin } from '@/lib/admin-api-auth'
import { logAdminAction } from '@/lib/admin-audit-log'

export const runtime = 'nodejs'

const STATUS_VALIDOS = ['Ativo', 'Inativo', 'Manutenção']

function limparTexto(value = '') {
  return String(value || '').trim()
}

function sanitizeBusca(value = '') {
  // Evita quebrar a sintaxe do filtro .or do PostgREST.
  return String(value || '')
    .trim()
    .replace(/[%,()]/g, ' ')
    .replace(/\s+/g, ' ')
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

function slugify(value = '') {
  // Gera um slug simples caso o banco/tela precise usar slug no portal.
  // Se seu banco já tiver trigger de slug, isso não atrapalha.
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function sanitizarHotspotPayload(hotspot = {}) {
  const nome = limparTexto(hotspot.nome)

  return {
    nome,
    slug: hotspot.slug ? limparTexto(hotspot.slug) : slugify(nome),
    estado: limparTexto(hotspot.estado).toUpperCase(),
    cidade: limparTexto(hotspot.cidade),
    endereco: limparTexto(hotspot.endereco),
    parceiro: limparTexto(hotspot.parceiro),
    status: STATUS_VALIDOS.includes(hotspot.status) ? hotspot.status : 'Ativo',
  }
}

function validarHotspot(payload) {
  if (!payload.nome) return 'Nome do hotspot é obrigatório'
  if (payload.nome.length < 3) return 'Nome do hotspot deve ter pelo menos 3 caracteres'
  return ''
}

export async function GET(request) {
  // Para listar hotspots, o admin precisa ter permissão de visualização.
  const auth = await requireAdmin(request, {
    module: 'hotspots',
    action: 'view',
  })

  if (auth.errorResponse) {
    return auth.errorResponse
  }

  try {
    const { searchParams } = new URL(request.url)

    const busca = sanitizeBusca(searchParams.get('busca') || '')
    const status = searchParams.get('status') || 'Todos'

    // Busca os hotspots com filtros da tela.
    let query = supabaseAdmin
      .from('hotspots')
      .select('*')
      .order('created_at', { ascending: false })

    if (status !== 'Todos') {
      query = query.eq('status', status)
    }

    if (busca) {
      query = query.or(
        `nome.ilike.%${busca}%,cidade.ilike.%${busca}%,parceiro.ilike.%${busca}%,endereco.ilike.%${busca}%`
      )
    }

    const { data, error } = await query

    if (error) throw error

    return NextResponse.json({
      ok: true,
      hotspots: data || [],
      permissions: auth.permissions?.hotspots || {},
    })
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error.message || 'Erro ao buscar hotspots',
      },
      { status: 500 }
    )
  }
}

export async function POST(request) {
  // Primeiro valida se é admin ativo.
  // A permissão específica será validada conforme a ação: create/update/delete.
  const auth = await requireAdmin(request)

  if (auth.errorResponse) {
    return auth.errorResponse
  }

  try {
    const body = await request.json()
    const action = String(body.action || '').trim()

    if (action === 'delete') {
      // Para excluir hotspot, precisa de hotspots.delete.
      if (!auth.canAccess('hotspots', 'delete')) {
        return permissaoNegada('hotspots', 'delete')
      }

      const id = String(body.id || '').trim()

      if (!id) {
        return NextResponse.json(
          { ok: false, error: 'ID do hotspot é obrigatório' },
          { status: 400 }
        )
      }

      // Busca dados básicos antes de excluir para registrar auditoria.
      const { data: hotspotAntes, error: hotspotAntesError } = await supabaseAdmin
        .from('hotspots')
        .select('id, nome, slug, status, cidade, estado, endereco, parceiro')
        .eq('id', id)
        .maybeSingle()

      if (hotspotAntesError) throw hotspotAntesError

      const { error } = await supabaseAdmin
        .from('hotspots')
        .delete()
        .eq('id', id)

      if (error) throw error

      await logAdminAction({
        request,
        adminUser: auth.user,
        action: 'delete',
        entity: 'hotspots',
        entityId: id,
        description: 'Excluiu um hotspot',
        metadata: {
          hotspot_id: id,
          nome: hotspotAntes?.nome || '',
          slug: hotspotAntes?.slug || '',
          status_anterior: hotspotAntes?.status || '',
          cidade: hotspotAntes?.cidade || '',
          estado: hotspotAntes?.estado || '',
          parceiro: hotspotAntes?.parceiro || '',
        },
      })

      return NextResponse.json({
        ok: true,
        message: 'Hotspot excluído com sucesso',
      })
    }

    const payload = sanitizarHotspotPayload(body.hotspot || {})
    const erroValidacao = validarHotspot(payload)

    if (erroValidacao) {
      return NextResponse.json(
        { ok: false, error: erroValidacao },
        { status: 400 }
      )
    }

    if (action === 'update') {
      // Para editar hotspot, precisa de hotspots.update.
      if (!auth.canAccess('hotspots', 'update')) {
        return permissaoNegada('hotspots', 'update')
      }

      const id = String(body.id || '').trim()

      if (!id) {
        return NextResponse.json(
          { ok: false, error: 'ID do hotspot é obrigatório' },
          { status: 400 }
        )
      }

      // Busca dados básicos antes da alteração para comparação no log.
      const { data: hotspotAntes, error: hotspotAntesError } = await supabaseAdmin
        .from('hotspots')
        .select('id, nome, slug, status, cidade, estado, endereco, parceiro')
        .eq('id', id)
        .maybeSingle()

      if (hotspotAntesError) throw hotspotAntesError

      // Atualiza o hotspot pelo servidor.
      const { data, error } = await supabaseAdmin
        .from('hotspots')
        .update(payload)
        .eq('id', id)
        .select('*')
        .single()

      if (error) throw error

      await logAdminAction({
        request,
        adminUser: auth.user,
        action: 'update',
        entity: 'hotspots',
        entityId: data.id,
        description: 'Atualizou um hotspot',
        metadata: {
          hotspot_id: data.id,
          nome_anterior: hotspotAntes?.nome || '',
          nome_atual: data.nome,
          slug_anterior: hotspotAntes?.slug || '',
          slug_atual: data.slug,
          status_anterior: hotspotAntes?.status || '',
          status_atual: data.status,
          cidade_anterior: hotspotAntes?.cidade || '',
          cidade_atual: data.cidade,
          estado_anterior: hotspotAntes?.estado || '',
          estado_atual: data.estado,
          parceiro_anterior: hotspotAntes?.parceiro || '',
          parceiro_atual: data.parceiro,
        },
      })

      return NextResponse.json({
        ok: true,
        hotspot: data,
        message: 'Hotspot atualizado com sucesso',
      })
    }

    if (action === 'create') {
      // Para criar hotspot, precisa de hotspots.create.
      if (!auth.canAccess('hotspots', 'create')) {
        return permissaoNegada('hotspots', 'create')
      }

      // Cria o hotspot pelo servidor.
      const { data, error } = await supabaseAdmin
        .from('hotspots')
        .insert([payload])
        .select('*')
        .single()

      if (error) throw error

      await logAdminAction({
        request,
        adminUser: auth.user,
        action: 'create',
        entity: 'hotspots',
        entityId: data.id,
        description: 'Criou um novo hotspot',
        metadata: {
          hotspot_id: data.id,
          nome: data.nome,
          slug: data.slug,
          status: data.status,
          cidade: data.cidade,
          estado: data.estado,
          parceiro: data.parceiro,
        },
      })

      return NextResponse.json({
        ok: true,
        hotspot: data,
        message: 'Hotspot criado com sucesso',
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
        error: error.message || 'Erro ao salvar hotspot',
      },
      { status: 500 }
    )
  }
}