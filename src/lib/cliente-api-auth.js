// src/lib/cliente-api-auth.js
// ============================================================
// Helper de autenticação para APIs do cliente.
// Sprint 5 Multiempresa:
// - Localiza cliente pelo e-mail logado
// - Inclui empresa_id e dados da empresa quando existir
// - Garante que a área /cliente continue funcionando com dados antigos
// ============================================================

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

const CLIENTE_SELECT = `
  id,
  empresa_id,
  nome,
  nome_empresa,
  nome_responsavel,
  email,
  telefone,
  cidade,
  estado,
  endereco,
  status,
  plano_id,
  onboarding_status,
  onboarding_checklist,
  onboarding_travado,
  onboarding_motivo_trava,
  onboarding_updated_at,
  created_at,
  planos(nome),
  empresa:empresas!clientes_empresa_id_fkey(id, nome_empresa, email, telefone, cidade, estado, status)
`

function getBearerToken(request) {
  const authHeader = request.headers.get('authorization') || ''

  if (!authHeader.toLowerCase().startsWith('bearer ')) {
    return ''
  }

  return authHeader.slice(7).trim()
}

function limparEmail(value = '') {
  return String(value || '').trim().toLowerCase()
}

async function buscarClientePorEmail(email = '') {
  const emailNormalizado = limparEmail(email)

  if (!emailNormalizado) return null

  const { data: clientesDiretos, error: clienteDiretoError } = await supabaseAdmin
    .from('clientes')
    .select(CLIENTE_SELECT)
    .ilike('email', emailNormalizado)
    .limit(1)

  if (clienteDiretoError) throw clienteDiretoError

  if (clientesDiretos?.[0]) {
    return clientesDiretos[0]
  }

  const { data: candidatos, error: candidatosError } = await supabaseAdmin
    .from('clientes')
    .select(CLIENTE_SELECT)
    .ilike('email', `%${emailNormalizado}%`)
    .limit(20)

  if (candidatosError) throw candidatosError

  return (candidatos || []).find((cliente) => {
    return limparEmail(cliente.email) === emailNormalizado
  }) || null
}

async function buscarEmpresaPorUsuario({ userId, email }) {
  if (userId) {
    const { data, error } = await supabaseAdmin
      .from('empresa_usuarios')
      .select('empresa_id, role, empresas(id, nome_empresa, email, telefone, cidade, estado, status)')
      .eq('user_id', userId)
      .eq('active', true)
      .limit(1)
      .maybeSingle()

    if (error) throw error
    if (data?.empresa_id) return data
  }

  const emailNormalizado = limparEmail(email)

  if (!emailNormalizado) return null

  const { data, error } = await supabaseAdmin
    .from('empresa_usuarios')
    .select('empresa_id, role, empresas(id, nome_empresa, email, telefone, cidade, estado, status)')
    .ilike('email', emailNormalizado)
    .eq('active', true)
    .limit(1)
    .maybeSingle()

  if (error) throw error

  return data || null
}

async function buscarClientePorEmpresa(empresaId = '') {
  if (!empresaId) return null

  const { data, error } = await supabaseAdmin
    .from('clientes')
    .select(CLIENTE_SELECT)
    .eq('empresa_id', empresaId)
    .limit(1)
    .maybeSingle()

  if (error) throw error

  return data || null
}

export async function requireCliente(request) {
  try {
    const token = getBearerToken(request)

    if (!token) {
      return {
        errorResponse: NextResponse.json(
          { ok: false, error: 'Sessão do cliente não encontrada' },
          { status: 401 }
        ),
      }
    }

    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token)

    if (userError || !userData?.user) {
      return {
        errorResponse: NextResponse.json(
          { ok: false, error: 'Sessão inválida ou expirada' },
          { status: 401 }
        ),
      }
    }

    const user = userData.user
    const email = limparEmail(user.email)

    if (!email) {
      return {
        errorResponse: NextResponse.json(
          { ok: false, error: 'Usuário sem e-mail vinculado' },
          { status: 403 }
        ),
      }
    }

    let cliente = await buscarClientePorEmail(email)
    let membership = null

    if (!cliente) {
      membership = await buscarEmpresaPorUsuario({ userId: user.id, email })
      cliente = await buscarClientePorEmpresa(membership?.empresa_id)
    }

    if (!cliente) {
      return {
        errorResponse: NextResponse.json(
          {
            ok: false,
            error: `Perfil de cliente não encontrado para o e-mail logado: ${email}`,
            authEmail: email,
          },
          { status: 403 }
        ),
      }
    }

    if (cliente.status === 'Cancelado') {
      return {
        errorResponse: NextResponse.json(
          { ok: false, error: 'Conta de cliente cancelada' },
          { status: 403 }
        ),
      }
    }

    const empresaId = cliente.empresa_id || membership?.empresa_id || null
    const empresa = cliente.empresa || membership?.empresas || null

    return {
      user,
      cliente: {
        ...cliente,
        empresa_id: empresaId,
        empresa,
      },
      empresaId,
      empresa,
      membership,
      errorResponse: null,
    }
  } catch (error) {
    return {
      errorResponse: NextResponse.json(
        { ok: false, error: error.message || 'Erro ao validar cliente' },
        { status: 500 }
      ),
    }
  }
}
