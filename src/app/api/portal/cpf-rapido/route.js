// src/app/api/portal/cpf-rapido/route.js
// ============================================================
// API segura para validar CPF rápido.
// O CPF é comparado no servidor e nunca exposto para o navegador.
// ============================================================

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const runtime = 'nodejs'

function normalizeMac(value = '') {
  return String(value || '')
    .trim()
    .toUpperCase()
    .replace(/-/g, ':')
}

function somenteNumeros(value = '') {
  return String(value || '').replace(/\D/g, '')
}

function getMesAtualRange() {
  const agora = new Date()
  const inicio = new Date(agora.getFullYear(), agora.getMonth(), 1, 0, 0, 0, 0)
  const fim = new Date(agora.getFullYear(), agora.getMonth() + 1, 1, 0, 0, 0, 0)

  return {
    inicio: inicio.toISOString(),
    fim: fim.toISOString(),
  }
}

export async function POST(request) {
  try {
    const body = await request.json()

    const hotspotId = String(body.hotspotId || '').trim()
    const macAddress = normalizeMac(body.macAddress || '')
    const cpf = somenteNumeros(body.cpf)

    if (!hotspotId) throw new Error('hotspotId é obrigatório')
    if (!macAddress) throw new Error('MAC é obrigatório')
    if (cpf.length !== 11) throw new Error('CPF inválido')

    const { inicio, fim } = getMesAtualRange()

    const { data, error } = await supabaseAdmin
      .from('leads')
      .select('id')
      .eq('hotspot_id', hotspotId)
      .eq('mac_address', macAddress)
      .eq('cpf', cpf)
      .gte('created_at', inicio)
      .lt('created_at', fim)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) throw error

    if (!data) {
      return NextResponse.json(
        {
          ok: false,
          error: 'CPF não confere com este dispositivo',
        },
        { status: 404 }
      )
    }

    return NextResponse.json({
      ok: true,
      leadId: data.id,
    })
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error.message || 'Erro ao validar CPF rápido',
      },
      { status: 400 }
    )
  }
}