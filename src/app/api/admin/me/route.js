// src/app/api/admin/me/route.js
// ============================================================
// API administrativa para retornar o perfil do admin logado.
// Usada principalmente pela Sidebar e por telas que precisam
// saber quais permissões o admin possui.
// ============================================================

import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-api-auth'

export const runtime = 'nodejs'

export async function GET(request) {
  const auth = await requireAdmin(request)

  if (auth.errorResponse) {
    return auth.errorResponse
  }

  return NextResponse.json({
    ok: true,
    user: {
      id: auth.user?.id || null,
      email: auth.user?.email || '',
    },
    adminProfile: auth.adminProfile,
    role: auth.role,
    isMaster: auth.isMaster,
    permissions: auth.permissions || {},
  })
}