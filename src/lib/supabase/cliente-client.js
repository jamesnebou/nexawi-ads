'use client'

// src/lib/supabase/cliente-client.js
// ============================================================
// Supabase Browser Client exclusivo para o portal do CLIENTE.
// Usa storageKey próprio para não misturar sessão cliente
// com sessão administrativa.
// ============================================================

import { createClient as createSupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

let clienteClient = null

export function createClient() {
  if (clienteClient) return clienteClient

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Variáveis do Supabase não configuradas para o Cliente.')
  }

  clienteClient = createSupabaseClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      storageKey: 'nexawi-cliente-session',
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  })

  return clienteClient
}

export { createClient as createBrowserSupabaseClient }

export default createClient