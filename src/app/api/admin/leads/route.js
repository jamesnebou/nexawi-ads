// src/app/api/admin/leads/route.js
// ============================================================
// API administrativa segura para a aba Leads.
// Sprint 5 Multiempresa:
// - Lista leads por empresa
// - Lista filtros de hotspots/anúncios por empresa
// - Exclui lead somente dentro do escopo permitido
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
        empresa_id,
        nome,
        email,
        telefone,
        cpf,
        hotspot_id,
        anuncio_id,
        aceite_lgpd,
        aceitou_promocoes,
        data_aceite_promocoes,
        created_at,
        mac_address,
        ip_address
      `)
      .order('created_at', { ascending: false })

    leadsQuery = auth.applyEmpresaScope(leadsQuery)

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

    let hotspotsQuery = supabaseAdmin
      .from('hotspots')
      .select('id, empresa_id, nome')
      .order('nome')

    let anunciosQuery = supabaseAdmin
      .from('anuncios')
      .select('id, empresa_id, titulo')
      .order('titulo')

    hotspotsQuery = auth.applyEmpresaScope(hotspotsQuery)
    anunciosQuery = auth.applyEmpresaScope(anunciosQuery)

    const [
      { data: leadsData, error: leadsError },
      { data: hotspotsData, error: hotspotsError },
      { data: anunciosData, error: anunciosError },
    ] = await Promise.all([
      leadsQuery,
      hotspotsQuery,
      anunciosQuery,
    ])

    if (leadsError) throw leadsError
    if (hotspotsError) throw hotspotsError
    if (anunciosError) throw anunciosError

    return NextResponse.json({
      ok: true,
      leads: leadsData || [],
      hotspots: hotspotsData || [],
      anuncios: anunciosData || [],
      empresaScope: auth.empresaScope,
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

      let leadAntesQuery = supabaseAdmin
        .from('leads')
        .select('id, empresa_id, nome, email, hotspot_id, anuncio_id, aceite_lgpd, created_at')
        .eq('id', id)

      leadAntesQuery = auth.applyEmpresaScope(leadAntesQuery)

      const { data: leadAntes, error: leadAntesError } = await leadAntesQuery.maybeSingle()

      if (leadAntesError) throw leadAntesError

      if (!leadAntes) {
        return NextResponse.json(
          { ok: false, error: 'Lead não encontrado ou fora do escopo da empresa.' },
          { status: 404 }
        )
      }

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
          empresa_id: leadAntes?.empresa_id || '',
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
