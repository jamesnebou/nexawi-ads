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

    const { data: cliente, error: clienteError } = await supabaseAdmin
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
      `)
      .eq('email', email)
      .maybeSingle()

    if (clienteError) {
      throw clienteError
    }

    if (!cliente) {
      return {
        errorResponse: NextResponse.json(
          { ok: false, error: 'Perfil de cliente não encontrado' },
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