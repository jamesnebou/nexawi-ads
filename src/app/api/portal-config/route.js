import { NextResponse } from 'next/server'
import { getGlobalRuntimeConfig } from '@/lib/portal-runtime-config'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const config = await getGlobalRuntimeConfig()

    return NextResponse.json({
      ok: true,
      config: {
        portal_tempo_acesso_segundos: config.portal_tempo_acesso_segundos,
        portal_tempo_bloqueio_segundos: config.portal_tempo_bloqueio_segundos,
        portal_intervalo_anuncio_segundos: config.portal_intervalo_anuncio_segundos,
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error.message || 'Erro ao carregar configuração pública do portal',
      },
      { status: 500 }
    )
  }
}