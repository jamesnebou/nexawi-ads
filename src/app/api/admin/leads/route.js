// src/app/api/admin/leads/route.js
// ============================================================
// API administrativa segura para a aba Leads.
// Substitui o acesso direto do navegador às tabelas:
// - leads
// - hotspots
// - anuncios
//
// Permissões aplicadas:
// - GET leads: leads.view
// - Excluir lead: leads.delete
// - Exportar leads: leads.export fica no front, porque o CSV é gerado no navegador
// ============================================================

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireAdmin } from '@/lib/admin-api-auth'
import { logAdminAction } from '@/lib/admin-audit-log'

export const runtime = 'nodejs'

function sanitizeBusca(value = '') {
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

export async function GET(request) {
  const auth = await requireAdmin(request, {
    module: 'leads',
    action: 'view',
  })

  if (auth.errorResponse) {
    return auth.errorResponse
  }

  try {
    const { searchParams } = new URL(request.url)

    const busca = sanitizeBusca(searchParams.get('busca') || '')
    const filtroHotspot = searchParams.get('hotspot') || 'Todos'
    const filtroLgpd = searchParams.get('lgpd') || 'Todos'

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
      permissions: auth.permissions?.leads || {},
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

export async function POST(request) {
  const auth = await requireAdmin(request)

  if (auth.errorResponse) {
    return auth.errorResponse
  }

  try {
    const body = await request.json()
    const action = String(body.action || '').trim()

    if (action === 'delete') {
      if (!auth.canAccess('leads', 'delete')) {
        return permissaoNegada('leads', 'delete')
      }

      const id = String(body.id || '').trim()

      if (!id) {
        return NextResponse.json(
          { ok: false, error: 'ID do lead é obrigatório' },
          { status: 400 }
        )
      }

      const { data: leadAntes, error: leadAntesError } = await supabaseAdmin
        .from('leads')
        .select('id, nome, email, hotspot_id, anuncio_id, aceite_lgpd, created_at')
        .eq('id', id)
        .maybeSingle()

      if (leadAntesError) throw leadAntesError

      const { error } = await supabaseAdmin
        .from('leads')
        .delete()
        .eq('id', id)

      if (error) throw error

      await logAdminAction({
        request,
        adminUser: auth.user,
        action: 'delete',
        entity: 'leads',
        entityId: id,
        description: 'Excluiu um lead capturado',
        metadata: {
          lead_id: id,
          nome: leadAntes?.nome || '',
          email: leadAntes?.email || '',
          hotspot_id: leadAntes?.hotspot_id || null,
          anuncio_id: leadAntes?.anuncio_id || null,
          aceite_lgpd: leadAntes?.aceite_lgpd ?? null,
          created_at: leadAntes?.created_at || null,
        },
      })

      return NextResponse.json({
        ok: true,
        message: 'Lead excluído com sucesso',
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
        error: error.message || 'Erro ao salvar lead',
      },
      { status: 500 }
    )
  }
}