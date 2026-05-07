// src/lib/supabase-admin.js
// ============================================================
// Cliente Supabase administrativo.
// IMPORTANTE:
// - Este arquivo só pode ser usado no servidor/API routes.
// - Nunca importe este arquivo em componente 'use client'.
// - A chave SUPABASE_SERVICE_ROLE_KEY nunca pode ter NEXT_PUBLIC.
// ============================================================

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl) {
  throw new Error('SUPABASE_URL ou NEXT_PUBLIC_SUPABASE_URL não configurado')
}

if (!serviceRoleKey) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY não configurado')
}

export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
})