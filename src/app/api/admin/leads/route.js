// src/app/api/admin/leads/route.js
// ============================================================
// API administrativa segura para a aba Leads.
// Substitui o acesso direto do navegador às tabelas:
// - leads
// - hotspots
// - anuncios
//
// Agora:
// Dashboard → API admin → valida admin → service_role → Supabase
// ============================================================

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireAdmin } from '@/lib/admin-api-auth'

export const runtime = 'nodejs'

function sanitizeBusca(value = '') {
  // Evita quebrar a sintaxe do filtro .or do PostgREST.
  return String(value || '')
    .trim()
    .replace(/[%,()]/g, ' ')
    .replace(/\s+/g, ' ')
}

export async function GET(request) {
  const auth = await requireAdmin(request)

  if (auth.errorResponse) {
    return auth.errorResponse
  }

  try {
    const { searchParams } = new URL(request.url)

    const busca = sanitizeBusca(searchParams.get('busca') || '')
    const filtroHotspot = searchParams.get('hotspot') || 'Todos'
    const filtroLgpd = searchParams.get('lgpd') || 'Todos'

    // Busca os leads com filtros aplicados no servidor.
    // Assim o front não consulta mais a tabela leads diretamente.
    let leadsQuery = supabaseAdmin
      .from('leads')
      .select(`
        id,
        nome,
        email,
        telefone,
        cpf,
        hotspot_id,
        anuncio_id,
        aceite_lgpd,
        created_at,
        mac_address,
        ip_address
      `)
      .order('created_at', { ascending: false })

    if (filtroHotspot !== 'Todos') {
      leadsQuery = leadsQuery.eq('hotspot_id', filtroHotspot)
    }

    if (filtroLgpd === 'Aceito') {
      leadsQuery = leadsQuery.eq('aceite_lgpd', true)
    }

    if (filtroLgpd === 'Não aceito') {
      leadsQuery = leadsQuery.eq('aceite_lgpd', false)
    }

    if (busca) {
      leadsQuery = leadsQuery.or(
        `nome.ilike.%${busca}%,email.ilike.%${busca}%,telefone.ilike.%${busca}%,cpf.ilike.%${busca}%`
      )
    }

    const [
      { data: leadsData, error: leadsError },
      { data: hotspotsData, error: hotspotsError },
      { data: anunciosData, error: anunciosError },
    ] = await Promise.all([
      leadsQuery,
      supabaseAdmin.from('hotspots').select('id, nome').order('nome'),
      supabaseAdmin.from('anuncios').select('id, titulo').order('titulo'),
    ])

    if (leadsError) throw leadsError
    if (hotspotsError) throw hotspotsError
    if (anunciosError) throw anunciosError

    return NextResponse.json({
      ok: true,
      leads: leadsData || [],
      hotspots: hotspotsData || [],
      anuncios: anunciosData || [],
    })
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error.message || 'Erro ao buscar leads',
      },
      { status: 500 }
    )
  }
}