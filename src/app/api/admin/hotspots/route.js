// src/app/api/admin/hotspots/route.js
// ============================================================
// API administrativa segura para a aba Hotspots.
// Substitui o acesso direto do navegador à tabela hotspots.
//
// Agora:
// Dashboard → API admin → valida admin → service_role → Supabase
// ============================================================

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireAdmin } from '@/lib/admin-api-auth'

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
  const auth = await requireAdmin(request)

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
  const auth = await requireAdmin(request)

  if (auth.errorResponse) {
    return auth.errorResponse
  }

  try {
    const body = await request.json()
    const action = String(body.action || '').trim()

    if (action === 'delete') {
      const id = String(body.id || '').trim()

      if (!id) {
        return NextResponse.json(
          { ok: false, error: 'ID do hotspot é obrigatório' },
          { status: 400 }
        )
      }

      const { error } = await supabaseAdmin
        .from('hotspots')
        .delete()
        .eq('id', id)

      if (error) throw error

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
      const id = String(body.id || '').trim()

      if (!id) {
        return NextResponse.json(
          { ok: false, error: 'ID do hotspot é obrigatório' },
          { status: 400 }
        )
      }

      // Atualiza o hotspot pelo servidor.
      const { data, error } = await supabaseAdmin
        .from('hotspots')
        .update(payload)
        .eq('id', id)
        .select('*')
        .single()

      if (error) throw error

      return NextResponse.json({
        ok: true,
        hotspot: data,
        message: 'Hotspot atualizado com sucesso',
      })
    }

    if (action === 'create') {
      // Cria o hotspot pelo servidor.
      const { data, error } = await supabaseAdmin
        .from('hotspots')
        .insert([payload])
        .select('*')
        .single()

      if (error) throw error

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