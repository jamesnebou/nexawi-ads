// src/lib/cliente-api-auth.js
// ============================================================
// Helper de autenticação para APIs do cliente.
// Objetivo:
// - Ler o token enviado pelo navegador.
// - Validar o usuário no Supabase Auth.
// - Encontrar o cliente pelo e-mail logado.
// - Garantir que o cliente só veja os próprios dados.
// ============================================================

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

const CLIENTE_SELECT = `
  id,
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
  planos(nome)
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

  // 1. Busca exata case-insensitive.
  const { data: clientesDiretos, error: clienteDiretoError } = await supabaseAdmin
    .from('clientes')
    .select(CLIENTE_SELECT)
    .ilike('email', emailNormalizado)
    .limit(1)

  if (clienteDiretoError) throw clienteDiretoError

  if (clientesDiretos?.[0]) {
    return clientesDiretos[0]
  }

  // 2. Fallback seguro para casos com espaço invisível no banco.
  // Busca candidatos e confirma igualdade normalizada em JS.
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

    const cliente = await buscarClientePorEmail(email)

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

    return {
      user,
      cliente,
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
