// src/app/api/public/stats/route.js
// ============================================================
// API pública segura de estatísticas comerciais da landing.
// Retorna apenas dados agregados:
// - pessoas online agora
// - leads capturados hoje
// - conexões/sessões do mês
//
// Não expõe IP, MAC, CPF, e-mail, telefone ou dados sensíveis.
// ============================================================

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { countOnlineHotspotClients } from '@/lib/routeros-rest'

export const runtime = 'nodejs'

const CONTROL_API_MODE = process.env.CONTROL_API_MODE || 'direct'
const CONTROL_API_BASE_URL = (process.env.CONTROL_API_BASE_URL || '').replace(/\/$/, '')

function inicioDoDiaISO() {
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  return hoje.toISOString()
}

function inicioDoMesISO() {
  const hoje = new Date()
  return new Date(hoje.getFullYear(), hoje.getMonth(), 1, 0, 0, 0, 0).toISOString()
}

async function buscarOnlineReal() {
  try {
    if (CONTROL_API_MODE === 'proxy') {
      if (!CONTROL_API_BASE_URL) {
        throw new Error('CONTROL_API_BASE_URL não configurado')
      }

      const response = await fetch(`${CONTROL_API_BASE_URL}/api/control/router/online`, {
        method: 'GET',
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()

      if (!response.ok || !data?.ok) {
        throw new Error(data?.error || 'Control API não retornou online real')
      }

      return {
        online: Number(data.online || 0),
        reliable: Boolean(data.reliable),
        source: 'control-api-routeros',
        checkedAt: data.checkedAt || new Date().toISOString(),
      }
    }

    const result = await countOnlineHotspotClients()

    return {
      online: Number(result.count || 0),
      reliable: true,
      source: 'routeros',
      checkedAt: result.checkedAt || new Date().toISOString(),
    }
  } catch (error) {
    console.error('Erro ao buscar online real para stats públicas:', error)

    return {
      online: 0,
      reliable: false,
      source: 'routeros',
      checkedAt: new Date().toISOString(),
    }
  }
}

export async function GET() {
  try {
    const inicioHoje = inicioDoDiaISO()
    const inicioMes = inicioDoMesISO()

    const [
      onlineResult,
      { count: leadsTodayCount, error: leadsTodayError },
      { count: monthlyConnectionsCount, error: monthlyConnectionsError },
    ] = await Promise.all([
      buscarOnlineReal(),

      supabaseAdmin
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', inicioHoje),

      supabaseAdmin
        .from('auth_sessions')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', inicioMes),
    ])

    if (leadsTodayError) throw leadsTodayError
    if (monthlyConnectionsError) throw monthlyConnectionsError

    return NextResponse.json(
      {
        ok: true,
        online: onlineResult.online,
        onlineReliable: onlineResult.reliable,
        onlineSource: onlineResult.source,
        onlineCheckedAt: onlineResult.checkedAt,
        leadsToday: leadsTodayCount || 0,
        monthlyConnections: monthlyConnectionsCount || 0,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=30',
        },
      }
    )
  } catch (error) {
    console.error('Erro na API pública de stats:', error)

    return NextResponse.json(
      {
        ok: true,
        online: 0,
        onlineReliable: false,
        onlineSource: 'unavailable',
        onlineCheckedAt: new Date().toISOString(),
        leadsToday: 0,
        monthlyConnections: 0,
        status: 'partial_unavailable',
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'public, s-maxage=5, stale-while-revalidate=10',
        },
      }
    )
  }
}