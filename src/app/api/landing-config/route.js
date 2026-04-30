import { NextResponse } from 'next/server'
import { getLandingPageConfig } from '@/lib/landing-page-config'

export const runtime = 'nodejs'

export async function GET(request) {
  try {
    const slug = request.nextUrl.searchParams.get('slug') || ''
    const config = await getLandingPageConfig(slug)

    return NextResponse.json({
      ok: true,
      config,
    })
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error.message || 'Erro ao carregar configuração da landing',
      },
      { status: 500 }
    )
  }
}