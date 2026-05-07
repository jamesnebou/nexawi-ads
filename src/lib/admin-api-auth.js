// src/lib/admin-api-auth.js
// ============================================================
// Helper de autenticação para APIs administrativas.
// Objetivo:
// - Ler o token enviado pelo navegador.
// - Validar o usuário no Supabase Auth.
// - Confirmar se ele está na tabela public.admin_users.
// - Bloquear qualquer chamada não autenticada ou não-admin.
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

export async function requireAdmin(request) {
  try {
    const token = getBearerToken(request)

    if (!token) {
      return {
        errorResponse: NextResponse.json(
          { ok: false, error: 'Sessão não encontrada' },
          { status: 401 }
        ),
      }
    }

    // Valida o token JWT do usuário logado.
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

    // Confere se o usuário logado é admin.
    const { data: adminData, error: adminError } = await supabaseAdmin
      .from('admin_users')
      .select('user_id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (adminError) {
      throw adminError
    }

    if (!adminData) {
      return {
        errorResponse: NextResponse.json(
          { ok: false, error: 'Usuário sem permissão administrativa' },
          { status: 403 }
        ),
      }
    }

    return {
      user,
      errorResponse: null,
    }
  } catch (error) {
    return {
      errorResponse: NextResponse.json(
        { ok: false, error: error.message || 'Erro ao validar admin' },
        { status: 500 }
      ),
    }
  }
}