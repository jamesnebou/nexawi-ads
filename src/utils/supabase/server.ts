// src/utils/supabase/server.ts
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers' // Importa a função cookies diretamente de next/headers

export function createClient() {
  const cookieStore = cookies() // Obtém o cookieStore usando a função cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          // Usa await para resolver a Promise antes de acessar 'get'
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            // Usa await para resolver a Promise antes de acessar 'set'
            cookieStore.set({ name, value, ...options })
          } catch (error) {
            // The `cookies().set()` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            // Usa await para resolver a Promise antes de acessar 'set' (para remover)
            cookieStore.set({ name, value: '', ...options })
          } catch (error) {
            // The `cookies().set()` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}