// src/app/api/cliente/me/route.js
// ============================================================
// API segura para retornar o cliente logado.
// Usada pelo login e pela dashboard do cliente.
// ============================================================

import { NextResponse } from 'next/server'
import { requireCliente } from '@/lib/cliente-api-auth'

export const runtime = 'nodejs'

export async function GET(request) {
  const auth = await requireCliente(request)

  if (auth.errorResponse) {
    return auth.errorResponse
  }

  const { user, cliente } = auth

  return NextResponse.json({
    ok: true,
    user: {
      id: user.id,
      email: user.email || '',
    },
    cliente: {
      id: cliente.id,
      nome: cliente.nome || '',
      nome_empresa: cliente.nome_empresa || '',
      email: cliente.email || '',
      telefone: cliente.telefone || '',
      cidade: cliente.cidade || '',
      estado: cliente.estado || '',
      status: cliente.status || '',
      plano_nome: cliente.planos?.nome || 'Sem plano',
      onboarding_status: cliente.onboarding_status || '',
      onboarding_travado: Boolean(cliente.onboarding_travado),
    },
  })
}