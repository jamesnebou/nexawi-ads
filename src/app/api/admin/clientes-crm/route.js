import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-api-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const runtime = 'nodejs'

const CRM_ETAPAS = [
  'novo_lead',
  'em_contato',
  'reuniao_agendada',
  'proposta_enviada',
  'negociacao',
  'cliente_fechado',
  'perdido',
]

const CRM_TEMPERATURAS = ['Frio', 'Morno', 'Quente']

function limparTexto(value = '') {
  return String(value || '').trim()
}

function limparBusca(value = '') {
  return String(value || '')
    .trim()
    .replace(/[%,()]/g, ' ')
    .replace(/\s+/g, ' ')
}

function normalizarEtapa(value = '') {
  const etapa = limparTexto(value)
  return CRM_ETAPAS.includes(etapa) ? etapa : 'novo_lead'
}

function normalizarTemperatura(value = '') {
  const temperatura = limparTexto(value)
  return CRM_TEMPERATURAS.includes(temperatura) ? temperatura : 'Morno'
}

function calcularResumo(clientes = []) {
  const porEtapa = CRM_ETAPAS.reduce((acc, etapa) => {
    acc[etapa] = 0
    return acc
  }, {})

  clientes.forEach((cliente) => {
    const etapa = normalizarEtapa(cliente.crm_etapa)
    porEtapa[etapa] = (porEtapa[etapa] || 0) + 1
  })

  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)

  const limite7Dias = new Date()
  limite7Dias.setDate(limite7Dias.getDate() + 7)
  limite7Dias.setHours(23, 59, 59, 999)

  const proximosContatos = clientes.filter((cliente) => {
    if (!cliente.crm_proximo_contato) return false

    const data = new Date(`${cliente.crm_proximo_contato}T00:00:00`)
    return data >= hoje && data <= limite7Dias
  }).length

  const valorPotencial = clientes.reduce((acc, cliente) => {
    return acc + Number(cliente.crm_valor_potencial || 0)
  }, 0)

  return {
    total: clientes.length,
    novos: porEtapa.novo_lead || 0,
    emContato: porEtapa.em_contato || 0,
    propostas: porEtapa.proposta_enviada || 0,
    negociacao: porEtapa.negociacao || 0,
    fechados: porEtapa.cliente_fechado || 0,
    perdidos: porEtapa.perdido || 0,
    proximosContatos,
    valorPotencial,
    porEtapa,
  }
}

export async function GET(request) {
  const auth = await requireAdmin(request, {
    module: 'clientes',
    action: 'view',
  })

  if (auth.errorResponse) {
    return auth.errorResponse
  }

  try {
    const { searchParams } = new URL(request.url)

    const etapa = limparTexto(searchParams.get('etapa') || '')
    const temperatura = limparTexto(searchParams.get('temperatura') || '')
    const origem = limparTexto(searchParams.get('origem') || '')
    const busca = limparBusca(searchParams.get('busca') || '')

    let query = supabaseAdmin
      .from('clientes')
      .select(`
        id,
        nome,
        nome_empresa,
        nome_responsavel,
        email,
        telefone,
        cidade,
        estado,
        status,
        created_at,
        crm_etapa,
        crm_origem,
        crm_temperatura,
        crm_proximo_contato,
        crm_valor_potencial,
        crm_observacoes,
        crm_responsavel,
        crm_updated_at,
        planos(nome)
      `)
      .order('created_at', { ascending: false })

    if (etapa && CRM_ETAPAS.includes(etapa)) {
      query = query.eq('crm_etapa', etapa)
    }

    if (temperatura && CRM_TEMPERATURAS.includes(temperatura)) {
      query = query.eq('crm_temperatura', temperatura)
    }

    if (origem) {
      query = query.ilike('crm_origem', `%${origem}%`)
    }

    if (busca) {
      query = query.or(
        `nome.ilike.%${busca}%,nome_empresa.ilike.%${busca}%,nome_responsavel.ilike.%${busca}%,email.ilike.%${busca}%,telefone.ilike.%${busca}%`
      )
    }

    const { data, error } = await query

    if (error) throw error

    const clientes = (data || []).map((cliente) => ({
      ...cliente,
      crm_etapa: normalizarEtapa(cliente.crm_etapa),
      crm_temperatura: normalizarTemperatura(cliente.crm_temperatura),
      crm_origem: cliente.crm_origem || 'Manual',
    }))

    const origens = [
      ...new Set(
        clientes
          .map((cliente) => cliente.crm_origem)
          .filter(Boolean)
      ),
    ].sort()

    return NextResponse.json({
      ok: true,
      clientes,
      resumo: calcularResumo(clientes),
      filtros: {
        etapa,
        temperatura,
        origem,
        busca,
      },
      options: {
        etapas: CRM_ETAPAS,
        temperaturas: CRM_TEMPERATURAS,
        origens,
      },
      permissions: auth.permissions?.clientes || {},
    })
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error.message || 'Erro ao carregar CRM de clientes',
      },
      { status: 500 }
    )
  }
}

export async function PATCH(request) {
  const auth = await requireAdmin(request, {
    module: 'clientes',
    action: 'update',
  })

  if (auth.errorResponse) {
    return auth.errorResponse
  }

  try {
    const body = await request.json().catch(() => ({}))

    const id = limparTexto(body.id || body.clienteId || '')

    if (!id) {
      return NextResponse.json(
        { ok: false, error: 'ID do cliente é obrigatório' },
        { status: 400 }
      )
    }

    const updatePayload = {
      crm_etapa: normalizarEtapa(body.crm_etapa),
      crm_origem: limparTexto(body.crm_origem) || 'Manual',
      crm_temperatura: normalizarTemperatura(body.crm_temperatura),
      crm_proximo_contato: limparTexto(body.crm_proximo_contato) || null,
      crm_valor_potencial: body.crm_valor_potencial === '' || body.crm_valor_potencial == null
        ? null
        : Number(body.crm_valor_potencial),
      crm_observacoes: limparTexto(body.crm_observacoes) || null,
      crm_responsavel: limparTexto(body.crm_responsavel) || null,
      crm_updated_at: new Date().toISOString(),
    }

    const { data, error } = await supabaseAdmin
      .from('clientes')
      .update(updatePayload)
      .eq('id', id)
      .select(`
        id,
        nome,
        nome_empresa,
        nome_responsavel,
        email,
        telefone,
        cidade,
        estado,
        status,
        created_at,
        crm_etapa,
        crm_origem,
        crm_temperatura,
        crm_proximo_contato,
        crm_valor_potencial,
        crm_observacoes,
        crm_responsavel,
        crm_updated_at,
        planos(nome)
      `)
      .single()

    if (error) throw error

    return NextResponse.json({
      ok: true,
      cliente: {
        ...data,
        crm_etapa: normalizarEtapa(data.crm_etapa),
        crm_temperatura: normalizarTemperatura(data.crm_temperatura),
        crm_origem: data.crm_origem || 'Manual',
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error.message || 'Erro ao atualizar CRM do cliente',
      },
      { status: 500 }
    )
  }
}
