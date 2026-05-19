import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-api-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'
import {
  buildNexawiContractFields,
  renderNexawiContractHtml,
  updateContractFields,
} from '@/lib/nexawi-contract-generator'

export const runtime = 'nodejs'

function limparTexto(value = '') {
  return String(value || '').trim()
}

function limparUuid(value = '') {
  const text = limparTexto(value)
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(text)
    ? text
    : ''
}

function erro(message, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status })
}

async function buscarEmpresa(id, auth) {
  let query = supabaseAdmin
    .from('empresas')
    .select(`
      id,
      cliente_id,
      plano_id,
      nome_empresa,
      nome_responsavel,
      email,
      telefone,
      cpf_cnpj,
      cidade,
      estado,
      endereco,
      status,
      metadata,
      planos(nome, preco)
    `)
    .eq('id', id)

  if (!auth.isMaster) {
    query = auth.allowedEmpresaIds?.length
      ? query.in('id', auth.allowedEmpresaIds)
      : query.eq('id', '00000000-0000-0000-0000-000000000000')
  }

  const { data, error } = await query.maybeSingle()
  if (error) throw error
  return data
}

async function buscarCliente(id, auth) {
  let query = supabaseAdmin
    .from('clientes')
    .select(`
      id,
      empresa_id,
      plano_id,
      nome,
      nome_empresa,
      nome_responsavel,
      email,
      telefone,
      cpf_cnpj,
      cidade,
      estado,
      endereco,
      status,
      crm_valor_potencial,
      planos(nome, preco)
    `)
    .eq('id', id)

  query = auth.applyEmpresaScope(query)

  const { data, error } = await query.maybeSingle()
  if (error) throw error
  return data
}

async function buscarEmpresaPorCliente(cliente, auth) {
  if (!cliente?.empresa_id) return null
  return buscarEmpresa(cliente.empresa_id, auth)
}

export async function POST(request) {
  const auth = await requireAdmin(request, {
    module: 'empresas',
    action: 'view',
  })

  if (auth.errorResponse) return auth.errorResponse

  try {
    const body = await request.json().catch(() => ({}))
    const source = limparTexto(body.source || 'empresa')
    const id = limparUuid(body.id || body.empresa_id || body.cliente_id)

    if (!id) return erro('ID da empresa ou cliente é obrigatório.')

    let empresa = null
    let cliente = null

    if (source === 'cliente') {
      cliente = await buscarCliente(id, auth)
      if (!cliente) return erro('Cliente não encontrado ou fora do escopo permitido.', 404)
      empresa = await buscarEmpresaPorCliente(cliente, auth)
    } else {
      empresa = await buscarEmpresa(id, auth)
      if (!empresa) return erro('Empresa não encontrada ou fora do escopo permitido.', 404)

      if (empresa.cliente_id) {
        cliente = await buscarCliente(empresa.cliente_id, auth).catch(() => null)
      }
    }

    let fields = buildNexawiContractFields({
      empresa,
      cliente,
      source,
    })

    if (body.updates && typeof body.updates === 'object') {
      fields = updateContractFields(fields, body.updates)
    }

    const html = renderNexawiContractHtml(fields)

    return NextResponse.json({
      ok: true,
      source,
      empresa,
      cliente,
      fields,
      html,
    })
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error.message || 'Erro ao gerar contrato.' },
      { status: 500 }
    )
  }
}
