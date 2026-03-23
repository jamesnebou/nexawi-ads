// src/utils/supabase/server.ts
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { type ReadonlyRequestCookies } from 'next/dist/server/web/spec-extension/cookies';
import { type ResponseCookie } from 'next/dist/compiled/@edge-runtime/cookies';

export function createClient(cookieStore: ReadonlyRequestCookies) {
  console.log('--- createClient (com cookieStore): Iniciando ---');
  console.log('--- createClient (com cookieStore): cookieStore recebido:', cookieStore);

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          console.log('--- cookies.get: Chamado para o cookie:', name);
          console.log('--- cookies.get: Usando cookieStore recebido:', cookieStore);
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            console.log('--- cookies.set: Chamado para o cookie:', name);
            console.log('--- cookies.set: Usando cookieStore recebido:', cookieStore);
            cookieStore.set(name, value, options as Partial<ResponseCookie>);
          } catch (error) {
            console.warn('Could not set cookie from server client:', error);
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            console.log('--- cookies.remove: Chamado para o cookie:', name);
            console.log('--- cookies.remove: Usando cookieStore recebido:', cookieStore);
            cookieStore.set(name, '', options as Partial<ResponseCookie>);
          } catch (error) {
            console.warn('Could not remove cookie from server client:', error);
          }
        },
      },
    }
  );
}