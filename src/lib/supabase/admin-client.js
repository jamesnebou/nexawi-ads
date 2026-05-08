'use client'

// src/lib/supabase/admin-client.js
// ============================================================
// Supabase Browser Client exclusivo para o painel ADMIN.
// Usa storageKey próprio para não misturar sessão admin
// com sessão do cliente.
// ============================================================

import { createClient as createSupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

let adminClient = null

export function createClient() {
  if (adminClient) return adminClient

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Variáveis do Supabase não configuradas para o Admin.')
  }

  adminClient = createSupabaseClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      storageKey: 'nexawi-admin-session',
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  })

  return adminClient
}

export { createClient as createBrowserSupabaseClient }

export default createClient