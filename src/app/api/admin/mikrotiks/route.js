// src/app/api/admin/mikrotiks/route.js
// ============================================================
// API administrativa para cadastro de MikroTiks / roteadores.
// Usa a tabela network_routers.
// Segurança:
// - Não retorna password na listagem.
// - Usa permissões do módulo hotspots por enquanto.
// - Testa conexão chamando a Control API com routerConfig.
// ============================================================

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireAdmin } from '@/lib/admin-api-auth'
import { logAdminAction } from '@/lib/admin-audit-log'
import { getNexawiNetworkPolicyStatus } from '@/lib/routeros-rest'

export const runtime = 'nodejs'

const STATUS_VALIDOS = ['Ativo', 'Inativo', 'Manutenção']

function limparTexto(value = '') {
  return String(value || '').trim()
}

function slugify(value = '') {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function sanitizeBusca(value = '') {
  return String(value || '')
    .trim()
    .replace(/[%,()]/g, ' ')
    .replace(/\s+/g, ' ')
}

function permissaoNegada(acao) {
  return NextResponse.json(
    {
      ok: false,
      error: `Sem permissão para ${acao} MikroTiks`,
    },
    { status: 403 }
  )
}

function sanitizeRouterPayload(router = {}, { keepPasswordOptional = false } = {}) {
  const nome = limparTexto(router.nome)
  const slug = router.slug ? limparTexto(router.slug) : slugify(nome)

  const payload = {
    nome,
    slug,
    base_url: limparTexto(router.base_url || router.baseUrl),
    username: limparTexto(router.username),
    hotspot_server: limparTexto(router.hotspot_server || router.hotspotServer) || 'hotspot1',
    status: STATUS_VALIDOS.includes(router.status) ? router.status : 'Ativo',
    localizacao: limparTexto(router.localizacao),
    observacoes: limparTexto(router.observacoes),
    updated_at: new Date().toISOString(),
  }

  const password = limparTexto(router.password)

  if (password) {
    payload.password = password
  } else if (!keepPasswordOptional) {
    payload.password = ''
  }

  return payload
}

function validarRouter(payload, { isUpdate = false } = {}) {
  if (!payload.nome) return 'Nome do MikroTik é obrigatório'
  if (payload.nome.length < 3) return 'Nome deve ter pelo menos 3 caracteres'
  if (!payload.slug) return 'Slug é obrigatório'
  if (!payload.base_url) return 'Base URL é obrigatória'
  if (!payload.username) return 'Usuário é obrigatório'
  if (!isUpdate && !payload.password) return 'Senha é obrigatória'
  return ''
}

async function callControlApi(path, { method = 'POST', body } = {}) {
  const baseUrl = (process.env.CONTROL_API_BASE_URL || '').replace(/\/$/, '')
  const secret = process.env.NEXAWI_CONTROL_SECRET || process.env.NEXAWI_CRON_SECRET
  const controlSecret = process.env.NEXAWI_CONTROL_SECRET || secret
  const cronSecret = process.env.NEXAWI_CRON_SECRET || secret

  if (!baseUrl) throw new Error('CONTROL_API_BASE_URL não configurado')
  if (!secret) throw new Error('NEXAWI_CRON_SECRET não configurado')

  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'x-control-secret': controlSecret,
      'x-cron-secret': cronSecret,
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  })

  const text = await response.text()

  let data = null

  try {
    data = text ? JSON.parse(text) : null
  } catch {
    throw new Error(`Control API não retornou JSON. Status: ${response.status}`)
  }

  if (!response.ok) {
    throw new Error(data?.error || 'Erro ao chamar Control API')
  }

  return data
}

async function getHotspotCountsByRouter() {
  const { data, error } = await supabaseAdmin
    .from('hotspots')
    .select('router_id')
    .not('router_id', 'is', null)

  if (error) throw error

  const map = new Map()

  for (const row of data || []) {
    const current = map.get(row.router_id) || 0
    map.set(row.router_id, current + 1)
  }

  return map
}

async function getRouterById(id) {
  const { data, error } = await supabaseAdmin
    .from('network_routers')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) throw error
  if (!data) throw new Error('MikroTik não encontrado')

  return data
}

function publicRouter(router, hotspotCount = 0) {
  return {
    id: router.id,
    nome: router.nome,
    slug: router.slug,
    base_url: router.base_url,
    username: router.username,
    hotspot_server: router.hotspot_server,
    status: router.status,
    localizacao: router.localizacao,
    observacoes: router.observacoes,
    created_at: router.created_at,
    updated_at: router.updated_at,
    password_configured: Boolean(router.password),
    hotspots_count: hotspotCount,
  }
}

export async function GET(request) {
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

    let query = supabaseAdmin
      .from('network_routers')
      .select('*')
      .order('created_at', { ascending: false })

    if (status !== 'Todos') {
      query = query.eq('status', status)
    }

    if (busca) {
      query = query.or(
        `nome.ilike.%${busca}%,slug.ilike.%${busca}%,base_url.ilike.%${busca}%,localizacao.ilike.%${busca}%`
      )
    }

    const { data, error } = await query

    if (error) throw error

    const hotspotCounts = await getHotspotCountsByRouter()

    const routers = (data || []).map((router) =>
      publicRouter(router, hotspotCounts.get(router.id) || 0)
    )

    return NextResponse.json({
      ok: true,
      routers,
      permissions: auth.permissions?.hotspots || {},
      totals: {
        routers: routers.length,
        ativos: routers.filter((item) => item.status === 'Ativo').length,
        vinculados: routers.filter((item) => item.hotspots_count > 0).length,
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error.message || 'Erro ao listar MikroTiks',
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

    if (action === 'test') {
      if (!auth.canAccess('hotspots', 'view')) {
        return permissaoNegada('testar')
      }

      const id = limparTexto(body.id)
      if (!id) {
        return NextResponse.json(
          { ok: false, error: 'ID do MikroTik é obrigatório' },
          { status: 400 }
        )
      }

      const router = await getRouterById(id)

      const routerConfig = {
        baseUrl: router.base_url,
        username: router.username,
        password: router.password,
        hotspotServer: router.hotspot_server || 'hotspot1',
      }

      let result = null

      try {
        result = await callControlApi('/api/control/router/policy/status', {
          method: 'POST',
          body: {
            routerConfig,
          },
        })
      } catch (controlError) {
        try {
          result = await getNexawiNetworkPolicyStatus({ routerConfig })
        } catch (directError) {
          throw new Error(`${directError.message || 'Falha direta no MikroTik'} | Control API: ${controlError.message || 'falhou'}`)
        }
      }

      await logAdminAction({
        request,
        adminUser: auth.user,
        action: 'test',
        entity: 'network_routers',
        entityId: router.id,
        description: 'Testou conexão com MikroTik',
        metadata: {
          router_id: router.id,
          router_slug: router.slug,
          ok: Boolean(result?.ok),
        },
      })

      return NextResponse.json({
        ok: true,
        router: publicRouter(router),
        result,
      })
    }

    if (action === 'delete') {
      if (!auth.canAccess('hotspots', 'delete')) {
        return permissaoNegada('excluir')
      }

      const id = limparTexto(body.id)
      if (!id) {
        return NextResponse.json(
          { ok: false, error: 'ID do MikroTik é obrigatório' },
          { status: 400 }
        )
      }

      const { count, error: countError } = await supabaseAdmin
        .from('hotspots')
        .select('id', { count: 'exact', head: true })
        .eq('router_id', id)

      if (countError) throw countError

      if (count > 0) {
        return NextResponse.json(
          {
            ok: false,
            error: `Este MikroTik está vinculado a ${count} hotspot(s). Desvincule antes de excluir.`,
          },
          { status: 409 }
        )
      }

      const routerAntes = await getRouterById(id)

      const { error } = await supabaseAdmin
        .from('network_routers')
        .delete()
        .eq('id', id)

      if (error) throw error

      await logAdminAction({
        request,
        adminUser: auth.user,
        action: 'delete',
        entity: 'network_routers',
        entityId: id,
        description: 'Excluiu um MikroTik',
        metadata: {
          router_id: id,
          nome: routerAntes.nome,
          slug: routerAntes.slug,
          base_url: routerAntes.base_url,
        },
      })

      return NextResponse.json({
        ok: true,
        message: 'MikroTik excluído com sucesso',
      })
    }

    if (action === 'update') {
      if (!auth.canAccess('hotspots', 'update')) {
        return permissaoNegada('editar')
      }

      const id = limparTexto(body.id)
      if (!id) {
        return NextResponse.json(
          { ok: false, error: 'ID do MikroTik é obrigatório' },
          { status: 400 }
        )
      }

      const payload = sanitizeRouterPayload(body.router || {}, {
        keepPasswordOptional: true,
      })

      const erroValidacao = validarRouter(payload, { isUpdate: true })

      if (erroValidacao) {
        return NextResponse.json(
          { ok: false, error: erroValidacao },
          { status: 400 }
        )
      }

      const routerAntes = await getRouterById(id)

      const { data, error } = await supabaseAdmin
        .from('network_routers')
        .update(payload)
        .eq('id', id)
        .select('*')
        .single()

      if (error) throw error

      await supabaseAdmin
        .from('network_policies')
        .update({
          router_id: data.id,
          updated_at: new Date().toISOString(),
        })
        .eq('router_id', data.id)

      await logAdminAction({
        request,
        adminUser: auth.user,
        action: 'update',
        entity: 'network_routers',
        entityId: data.id,
        description: 'Atualizou um MikroTik',
        metadata: {
          router_id: data.id,
          nome_anterior: routerAntes.nome,
          nome_atual: data.nome,
          slug_anterior: routerAntes.slug,
          slug_atual: data.slug,
          base_url_anterior: routerAntes.base_url,
          base_url_atual: data.base_url,
          alterou_senha: Boolean(payload.password),
        },
      })

      return NextResponse.json({
        ok: true,
        router: publicRouter(data),
        message: 'MikroTik atualizado com sucesso',
      })
    }

    if (action === 'create') {
      if (!auth.canAccess('hotspots', 'create')) {
        return permissaoNegada('criar')
      }

      const payload = sanitizeRouterPayload(body.router || {}, {
        keepPasswordOptional: false,
      })

      const erroValidacao = validarRouter(payload, { isUpdate: false })

      if (erroValidacao) {
        return NextResponse.json(
          { ok: false, error: erroValidacao },
          { status: 400 }
        )
      }

      const { data, error } = await supabaseAdmin
        .from('network_routers')
        .insert([payload])
        .select('*')
        .single()

      if (error) throw error

      await logAdminAction({
        request,
        adminUser: auth.user,
        action: 'create',
        entity: 'network_routers',
        entityId: data.id,
        description: 'Criou um novo MikroTik',
        metadata: {
          router_id: data.id,
          nome: data.nome,
          slug: data.slug,
          base_url: data.base_url,
          hotspot_server: data.hotspot_server,
        },
      })

      return NextResponse.json({
        ok: true,
        router: publicRouter(data),
        message: 'MikroTik criado com sucesso',
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
        error: error.message || 'Erro ao salvar MikroTik',
      },
      { status: 500 }
    )
  }
}
