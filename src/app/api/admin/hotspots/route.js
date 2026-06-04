// src/app/api/admin/hotspots/route.js
// ============================================================
// API administrativa segura para a aba Hotspots.
// Sprint 5 Multiempresa:
// - Lista hotspots por escopo de empresa
// - Vincula hotspot à empresa ativa
// - Restringe teste/edição/exclusão ao tenant permitido
// - Propaga empresa_id para política de rede
// ============================================================

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireAdmin } from '@/lib/admin-api-auth'
import { logAdminAction } from '@/lib/admin-audit-log'
import { getNexawiNetworkPolicyStatus } from '@/lib/routeros-rest'
import {
  assertSaasAccountActive,
  getSaasFinanceContext,
} from '@/lib/saas-finance'

export const runtime = 'nodejs'

const STATUS_VALIDOS = ['Ativo', 'Inativo', 'Manutenção']

function limparTexto(value = '') {
  return String(value || '').trim()
}

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

function slugify(value = '') {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function sanitizeUuid(value = '') {
  const clean = limparTexto(value)

  if (!clean) return null

  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

  return uuidRegex.test(clean) ? clean : null
}

function resolveEmpresaIdForWrite(auth, providedEmpresaId = '') {
  const provided = sanitizeUuid(providedEmpresaId)

  if (auth.isMaster) {
    return provided || auth.activeEmpresaId || null
  }

  if (provided && !auth.allowedEmpresaIds?.includes(provided)) {
    throw new Error('Você não tem acesso a esta empresa.')
  }

  const empresaId = provided || auth.activeEmpresaId || auth.allowedEmpresaIds?.[0] || null

  if (!empresaId) {
    throw new Error('Nenhuma empresa vinculada ao usuário para criar/editar hotspot.')
  }

  return empresaId
}

function sanitizarHotspotPayload(hotspot = {}, { forUpdate = false } = {}) {
  const nome = limparTexto(hotspot.nome)
  const payload = {
    nome,
    estado: limparTexto(hotspot.estado).toUpperCase(),
    cidade: limparTexto(hotspot.cidade),
    endereco: limparTexto(hotspot.endereco),
    parceiro: limparTexto(hotspot.parceiro),
    status: STATUS_VALIDOS.includes(hotspot.status) ? hotspot.status : 'Ativo',
    router_id: sanitizeUuid(hotspot.router_id || hotspot.routerId),
    portal_email_obrigatorio: hotspot.portal_email_obrigatorio !== false,
    portal_cpf_visivel: hotspot.portal_cpf_visivel !== false,
    portal_cpf_obrigatorio: hotspot.portal_cpf_visivel === false ? false : hotspot.portal_cpf_obrigatorio !== false,
    portal_promocoes_optin_ativo: Boolean(hotspot.portal_promocoes_optin_ativo),
    portal_promocoes_texto: limparTexto(hotspot.portal_promocoes_texto) || 'Quero receber ofertas, cupons e novidades dos anunciantes parceiros da NexaWi por WhatsApp, SMS ou e-mail.',
  }

  if (!forUpdate || hotspot.slug) {
    payload.slug = hotspot.slug ? limparTexto(hotspot.slug) : slugify(nome)
  }

  return payload
}

function validarHotspot(payload) {
  if (!payload.nome) return 'Nome do hotspot é obrigatório'
  if (payload.nome.length < 3) return 'Nome do hotspot deve ter pelo menos 3 caracteres'
  return ''
}

async function getRouterOptions(auth) {
  let query = supabaseAdmin
    .from('network_routers')
    .select('id, empresa_id, nome, slug, base_url, username, hotspot_server, status, localizacao')
    .order('nome', { ascending: true })

  query = auth.applyEmpresaScope(query)

  const { data, error } = await query

  if (error) throw error

  return data || []
}

async function ensureRouterInScope({ auth, routerId }) {
  if (!routerId) return null

  let query = supabaseAdmin
    .from('network_routers')
    .select('id, empresa_id')
    .eq('id', routerId)

  query = auth.applyEmpresaScope(query)

  const { data, error } = await query.maybeSingle()

  if (error) throw error
  if (!data) throw new Error('MikroTik não encontrado ou fora do escopo da empresa.')

  return data
}

async function ensureNetworkPolicyForHotspot({ hotspotId, routerId, empresaId }) {
  if (!hotspotId) return null

  if (!routerId) {
    await supabaseAdmin
      .from('network_policies')
      .update({
        active: false,
        empresa_id: empresaId || null,
        updated_at: new Date().toISOString(),
      })
      .eq('hotspot_id', hotspotId)

    return null
  }

  const payload = {
    hotspot_id: hotspotId,
    router_id: routerId,
    empresa_id: empresaId || null,
    hotspot_subnet: '192.168.88.0/24',
    force_dns: true,
    block_quic: true,
    block_torrent: true,
    block_games: true,
    block_tls_games: true,
    download_limit: '10M',
    upload_limit: '3M',
    active: true,
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await supabaseAdmin
    .from('network_policies')
    .upsert([payload], {
      onConflict: 'hotspot_id',
    })
    .select('*')
    .single()

  if (error) throw error

  return data
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

async function resolveHotspotRouterContext(hotspotId, auth) {
  let hotspotQuery = supabaseAdmin
    .from('hotspots')
    .select('id, empresa_id, nome, slug, status, router_id')
    .eq('id', hotspotId)

  hotspotQuery = auth.applyEmpresaScope(hotspotQuery)

  const { data: hotspot, error: hotspotError } = await hotspotQuery.maybeSingle()

  if (hotspotError) throw hotspotError
  if (!hotspot) throw new Error('Hotspot não encontrado ou fora do escopo da empresa.')
  if (!hotspot.router_id) throw new Error('Este hotspot ainda não tem MikroTik vinculado')

  let routerQuery = supabaseAdmin
    .from('network_routers')
    .select('*')
    .eq('id', hotspot.router_id)

  routerQuery = auth.applyEmpresaScope(routerQuery)

  const { data: router, error: routerError } = await routerQuery.maybeSingle()

  if (routerError) throw routerError
  if (!router) throw new Error('MikroTik vinculado não encontrado ou fora do escopo da empresa.')

  return {
    hotspot,
    router,
    routerConfig: {
      baseUrl: router.base_url,
      username: router.username,
      password: router.password,
      hotspotServer: router.hotspot_server || 'hotspot1',
    },
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
      .from('hotspots')
      .select(`
        id,
        empresa_id,
        nome,
        slug,
        estado,
        cidade,
        endereco,
        parceiro,
        status,
        router_id,
        portal_email_obrigatorio,
        portal_cpf_visivel,
        portal_cpf_obrigatorio,
        portal_promocoes_optin_ativo,
        portal_promocoes_texto,
        created_at,
        updated_at
      `)
      .order('created_at', { ascending: false })

    query = auth.applyEmpresaScope(query)

    if (status !== 'Todos') {
      query = query.eq('status', status)
    }

    if (busca) {
      query = query.or(
        `nome.ilike.%${busca}%,cidade.ilike.%${busca}%,parceiro.ilike.%${busca}%,endereco.ilike.%${busca}%,slug.ilike.%${busca}%`
      )
    }

    const { data: hotspots, error: hotspotsError } = await query

    if (hotspotsError) throw hotspotsError

    const hotspotList = hotspots || []
    const hotspotIds = hotspotList.map((h) => h.id)

    const routers = await getRouterOptions(auth)

    const routersById = new Map(routers.map((router) => [router.id, router]))

    let policies = []

    if (hotspotIds.length > 0) {
      let policyQuery = supabaseAdmin
        .from('network_policies')
        .select('*')
        .in('hotspot_id', hotspotIds)

      policyQuery = auth.applyEmpresaScope(policyQuery)

      const { data: policyData, error: policyError } = await policyQuery

      if (policyError) throw policyError
      policies = policyData || []
    }

    const policiesByHotspotId = new Map(policies.map((policy) => [policy.hotspot_id, policy]))
    const policyIds = policies.map((policy) => policy.id)

    let domains = []

    if (policyIds.length > 0) {
      const { data: domainData, error: domainError } = await supabaseAdmin
        .from('network_policy_domains')
        .select('id, policy_id, domain, type, enabled, created_at')
        .in('policy_id', policyIds)
        .order('created_at', { ascending: false })

      if (domainError) throw domainError
      domains = domainData || []
    }

    const domainsByPolicyId = new Map()

    for (const domain of domains) {
      if (!domainsByPolicyId.has(domain.policy_id)) {
        domainsByPolicyId.set(domain.policy_id, [])
      }

      domainsByPolicyId.get(domain.policy_id).push(domain)
    }

    const onlineByHotspotId = new Map()

    if (hotspotIds.length > 0) {
      let sessionsQuery = supabaseAdmin
        .from('auth_sessions')
        .select('hotspot_id')
        .in('hotspot_id', hotspotIds)
        .eq('session_state', 'authorized')

      sessionsQuery = auth.applyEmpresaScope(sessionsQuery)

      const { data: sessionsData } = await sessionsQuery

      for (const session of sessionsData || []) {
        const current = onlineByHotspotId.get(session.hotspot_id) || 0
        onlineByHotspotId.set(session.hotspot_id, current + 1)
      }
    }

    const anuncioCountByHotspotId = new Map()

    if (hotspotIds.length > 0) {
      const { data: vinculosData } = await supabaseAdmin
        .from('anuncio_hotspots')
        .select('hotspot_id')
        .in('hotspot_id', hotspotIds)

      for (const vinculo of vinculosData || []) {
        const current = anuncioCountByHotspotId.get(vinculo.hotspot_id) || 0
        anuncioCountByHotspotId.set(vinculo.hotspot_id, current + 1)
      }
    }

    const items = hotspotList.map((hotspot) => {
      const router = hotspot.router_id ? routersById.get(hotspot.router_id) : null
      const policy = policiesByHotspotId.get(hotspot.id) || null
      const policyDomains = policy ? domainsByPolicyId.get(policy.id) || [] : []

      const blockedDomains = policyDomains.filter(
        (domain) => domain.type === 'blocked' && domain.enabled
      )

      const allowedDomains = policyDomains.filter(
        (domain) => domain.type === 'allowed' && domain.enabled
      )

      return {
        ...hotspot,
        router: router
          ? {
              id: router.id,
              empresa_id: router.empresa_id,
              nome: router.nome,
              slug: router.slug,
              base_url: router.base_url,
              username: router.username,
              hotspot_server: router.hotspot_server,
              status: router.status,
              localizacao: router.localizacao,
            }
          : null,
        policy,
        domains: policyDomains,
        metrics: {
          onlineNow: onlineByHotspotId.get(hotspot.id) || 0,
          anunciosVinculados: anuncioCountByHotspotId.get(hotspot.id) || 0,
          blockedDomainsCount: blockedDomains.length,
          allowedDomainsCount: allowedDomains.length,
          hasRouter: Boolean(router),
          hasPolicy: Boolean(policy?.active),
        },
      }
    })

    return NextResponse.json({
      ok: true,
      hotspots: items,
      routers,
      empresaScope: auth.empresaScope,
      permissions: auth.permissions?.hotspots || {},
      totals: {
        hotspots: items.length,
        ativos: items.filter((item) => item.status === 'Ativo').length,
        comRouter: items.filter((item) => item.metrics.hasRouter).length,
        comPolitica: items.filter((item) => item.metrics.hasPolicy).length,
        onlineNow: items.reduce((sum, item) => sum + Number(item.metrics.onlineNow || 0), 0),
      },
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

    if (action === 'test_router') {
      if (!auth.canAccess('hotspots', 'view')) {
        return permissaoNegada('hotspots', 'view')
      }

      const id = String(body.id || '').trim()

      if (!id) {
        return NextResponse.json(
          { ok: false, error: 'ID do hotspot é obrigatório' },
          { status: 400 }
        )
      }

      const context = await resolveHotspotRouterContext(id, auth)

      let result = null

      try {
        result = await callControlApi('/api/control/router/policy/status', {
          method: 'POST',
          body: {
            routerConfig: context.routerConfig,
          },
        })
      } catch (controlError) {
        try {
          result = await getNexawiNetworkPolicyStatus({
            routerConfig: context.routerConfig,
          })
        } catch (directError) {
          throw new Error(`${directError.message || 'Falha direta no MikroTik'} | Control API: ${controlError.message || 'falhou'}`)
        }
      }

      await logAdminAction({
        request,
        adminUser: auth.user,
        action: 'test_router',
        entity: 'hotspots',
        entityId: context.hotspot.id,
        description: 'Testou conexão do MikroTik vinculado ao hotspot',
        metadata: {
          empresa_id: context.hotspot.empresa_id || '',
          hotspot_id: context.hotspot.id,
          hotspot_slug: context.hotspot.slug,
          router_id: context.router.id,
          router_slug: context.router.slug,
          ok: Boolean(result?.ok),
        },
      })

      return NextResponse.json({
        ok: true,
        hotspot: context.hotspot,
        router: {
          id: context.router.id,
          empresa_id: context.router.empresa_id,
          nome: context.router.nome,
          slug: context.router.slug,
          base_url: context.router.base_url,
          hotspot_server: context.router.hotspot_server,
          status: context.router.status,
        },
        result,
      })
    }

    if (action === 'delete') {
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

      let hotspotAntesQuery = supabaseAdmin
        .from('hotspots')
        .select('id, empresa_id, cliente_id, nome, slug, status, cidade, estado, endereco, parceiro, router_id')
        .eq('id', id)

      hotspotAntesQuery = auth.applyEmpresaScope(hotspotAntesQuery)

      const { data: hotspotAntes, error: hotspotAntesError } = await hotspotAntesQuery.maybeSingle()

      if (hotspotAntesError) throw hotspotAntesError

      if (!hotspotAntes) {
        return NextResponse.json(
          { ok: false, error: 'Hotspot não encontrado ou fora do escopo da empresa.' },
          { status: 404 }
        )
      }

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
          empresa_id: hotspotAntes?.empresa_id || '',
          hotspot_id: id,
          nome: hotspotAntes?.nome || '',
          slug: hotspotAntes?.slug || '',
          status_anterior: hotspotAntes?.status || '',
          cidade: hotspotAntes?.cidade || '',
          estado: hotspotAntes?.estado || '',
          parceiro: hotspotAntes?.parceiro || '',
          router_id: hotspotAntes?.router_id || '',
        },
      })

      return NextResponse.json({
        ok: true,
        message: 'Hotspot excluído com sucesso',
      })
    }

    if (action === 'update') {
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

      let hotspotAntesQuery = supabaseAdmin
        .from('hotspots')
        .select('id, empresa_id, cliente_id, nome, slug, status, cidade, estado, endereco, parceiro, router_id')
        .eq('id', id)

      hotspotAntesQuery = auth.applyEmpresaScope(hotspotAntesQuery)

      const { data: hotspotAntes, error: hotspotAntesError } = await hotspotAntesQuery.maybeSingle()

      if (hotspotAntesError) throw hotspotAntesError

      if (!hotspotAntes) {
        return NextResponse.json(
          { ok: false, error: 'Hotspot não encontrado ou fora do escopo da empresa.' },
          { status: 404 }
        )
      }

      const payload = sanitizarHotspotPayload(body.hotspot || {}, { forUpdate: true })
      const empresaId = resolveEmpresaIdForWrite(auth, body.hotspot?.empresa_id || hotspotAntes.empresa_id)
      payload.empresa_id = empresaId

      if (payload.status === 'Ativo') {
        const saasContext = await getSaasFinanceContext({
          empresaId,
          clienteId: hotspotAntes.cliente_id,
        })

        assertSaasAccountActive(saasContext)
      }

      if (payload.router_id) {
        await ensureRouterInScope({ auth, routerId: payload.router_id })
      }

      const erroValidacao = validarHotspot(payload)

      if (erroValidacao) {
        return NextResponse.json(
          { ok: false, error: erroValidacao },
          { status: 400 }
        )
      }

      const { data, error } = await supabaseAdmin
        .from('hotspots')
        .update(payload)
        .eq('id', id)
        .select('*')
        .single()

      if (error) throw error

      await ensureNetworkPolicyForHotspot({
        hotspotId: data.id,
        routerId: data.router_id,
        empresaId: data.empresa_id,
      })

      await logAdminAction({
        request,
        adminUser: auth.user,
        action: 'update',
        entity: 'hotspots',
        entityId: data.id,
        description: 'Atualizou um hotspot',
        metadata: {
          empresa_id: data.empresa_id || '',
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
          router_id_anterior: hotspotAntes?.router_id || '',
          router_id_atual: data.router_id || '',
        },
      })

      return NextResponse.json({
        ok: true,
        hotspot: data,
        message: 'Hotspot atualizado com sucesso',
      })
    }

    if (action === 'create') {
      if (!auth.canAccess('hotspots', 'create')) {
        return permissaoNegada('hotspots', 'create')
      }

      const payload = sanitizarHotspotPayload(body.hotspot || {}, { forUpdate: false })
      const empresaId = resolveEmpresaIdForWrite(auth, body.hotspot?.empresa_id)
      payload.empresa_id = empresaId

      const saasContext = await getSaasFinanceContext({
        empresaId,
        clienteId: payload.cliente_id,
      })

      assertSaasAccountActive(saasContext)

      if (payload.router_id) {
        await ensureRouterInScope({ auth, routerId: payload.router_id })
      }

      const erroValidacao = validarHotspot(payload)

      if (erroValidacao) {
        return NextResponse.json(
          { ok: false, error: erroValidacao },
          { status: 400 }
        )
      }

      const { data, error } = await supabaseAdmin
        .from('hotspots')
        .insert([payload])
        .select('*')
        .single()

      if (error) throw error

      await ensureNetworkPolicyForHotspot({
        hotspotId: data.id,
        routerId: data.router_id,
        empresaId: data.empresa_id,
      })

      await logAdminAction({
        request,
        adminUser: auth.user,
        action: 'create',
        entity: 'hotspots',
        entityId: data.id,
        description: 'Criou um novo hotspot',
        metadata: {
          empresa_id: data.empresa_id || '',
          hotspot_id: data.id,
          nome: data.nome,
          slug: data.slug,
          status: data.status,
          cidade: data.cidade,
          estado: data.estado,
          parceiro: data.parceiro,
          router_id: data.router_id || '',
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
        code: error.code || null,
      },
      { status: error.status || 500 }
    )
  }
}
