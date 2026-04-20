import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const { mac } = await req.json()

    if (!mac) {
      return NextResponse.json({ error: 'MAC não enviado' }, { status: 400 })
    }

    // 🔥 Autenticação no IronWiFi (RADIUS)
    const response = await fetch('https://api.ironwifi.com/v1/authenticate', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.IRONWIFI_API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: mac,
        password: mac
      })
    })

    const data = await response.json()

    return NextResponse.json({ success: true, data })

  } catch (error) {
    console.error('Erro ao liberar internet:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}