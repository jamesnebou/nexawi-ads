import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-api-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const runtime = 'nodejs'

export async function GET(request) {
  const auth = await requireAdmin(request)

  if (auth.errorResponse) {
    return auth.errorResponse
  }

  if (!auth.isMaster && !auth.permissions?.hotspots?.view) {
    return NextResponse.json(
      { ok: false, error: 'Sem permissão para visualizar hotspots' },
      { status: 403 }
    )
  }

  try {
    const { data: hotspots, error: hotspotsError } = await supabaseAdmin
      .from('hotspots')
      .select('id, nome, slug, status, router_id')
      .order('nome', { ascending: true })

    if (hotspotsError) throw hotspotsError

    const routerIds = [...new Set((hotspots || []).map((h) => h.router_id).filter(Boolean))]
    const hotspotIds = (hotspots || []).map((h) => h.id)

    const { data: routers, error: routersError } = await supabaseAdmin
      .from('network_routers')
      .select('id, nome, slug, base_url, username, hotspot_server, status, localizacao')
      .in('id', routerIds.length ? routerIds : ['00000000-0000-0000-0000-000000000000'])

    if (routersError) throw routersError

    const { data: policies, error: policiesError } = await supabaseAdmin
      .from('network_policies')
      .select('*')
      .in('hotspot_id', hotspotIds.length ? hotspotIds : ['00000000-0000-0000-0000-000000000000'])

    if (policiesError) throw policiesError

    const policyIds = (policies || []).map((p) => p.id)

    const { data: domains, error: domainsError } = await supabaseAdmin
      .from('network_policy_domains')
      .select('id, policy_id, domain, type, enabled, created_at')
      .in('policy_id', policyIds.length ? policyIds : ['00000000-0000-0000-0000-000000000000'])
      .order('created_at', { ascending: false })

    if (domainsError) throw domainsError

    const routersById = new Map((routers || []).map((r) => [r.id, r]))
    const policiesByHotspotId = new Map((policies || []).map((p) => [p.hotspot_id, p]))

    const domainsByPolicyId = new Map()

    for (const domain of domains || []) {
      if (!domainsByPolicyId.has(domain.policy_id)) {
        domainsByPolicyId.set(domain.policy_id, [])
      }

      domainsByPolicyId.get(domain.policy_id).push(domain)
    }

    const items = (hotspots || []).map((hotspot) => {
      const router = hotspot.router_id ? routersById.get(hotspot.router_id) : null
      const policy = policiesByHotspotId.get(hotspot.id) || null
      const policyDomains = policy ? domainsByPolicyId.get(policy.id) || [] : []

      return {
        ...hotspot,
        router,
        policy,
        domains: policyDomains,
      }
    })

    return NextResponse.json({
      ok: true,
      hotspots: items,
    })
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error.message || 'Erro ao listar hotspots de rede',
      },
      { status: 500 }
    )
  }
}