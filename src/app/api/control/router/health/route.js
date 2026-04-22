import { NextResponse } from 'next/server'
import { routerHealth } from '@/lib/routeros-rest'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const data = await routerHealth()
    return NextResponse.json({
      ok: true,
      router: data,
    })
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error.message || 'Falha no health do RouterOS',
      },
      { status: 500 }
    )
  }
}