// src/app/api/portal/lead/route.js
// ============================================================
// API segura para salvar lead.
// O CPF, telefone, e-mail, MAC e IP não são mais enviados direto
// do navegador para a tabela leads.
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

function getPortalRules(hotspot = {}) {
  return {
    emailObrigatorio: hotspot.portal_email_obrigatorio !== false,
    cpfVisivel: hotspot.portal_cpf_visivel !== false,
    cpfObrigatorio: hotspot.portal_cpf_obrigatorio !== false,
  }
}

function isMissingColumnError(error) {
  const message = `${error?.message || ''} ${error?.details || ''}`
  return error?.code === '42703' || error?.code === 'PGRST204' || message.includes('column')
}

function gerarStringAleatoria(tamanho = 24) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let resultado = ''

  for (let i = 0; i < tamanho; i++) {
    resultado += chars[Math.floor(Math.random() * chars.length)]
  }

  return resultado
}

function gerarCredenciaisRadius(macAddress = '') {
  const macLimpo = String(macAddress || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
  const sufixo = gerarStringAleatoria(6).toUpperCase()

  return {
    radiusUsername: `NXW${macLimpo || 'SEMMA'}${Date.now()}${sufixo}`,
    radiusPassword: gerarStringAleatoria(32),
  }
}

export async function POST(request) {
  try {
    const body = await request.json()

    const hotspotId = String(body.hotspotId || '').trim()
    const nome = String(body.nome || '').trim()
    const email = String(body.email || '').trim().toLowerCase()
    const telefone = somenteNumeros(body.telefone)
    const cpf = somenteNumeros(body.cpf)
    const aceiteLgpd = Boolean(body.aceiteLgpd)
    const aceitouPromocoes = Boolean(body.aceitouPromocoes)
    const anuncioId = body.anuncioId ? String(body.anuncioId).trim() : null
    const macAddress = normalizeMac(body.macAddress || '')
    const ipAddress = String(body.ipAddress || '').trim()

    if (!hotspotId) throw new Error('hotspotId obrigatorio')

    let { data: hotspot, error: hotspotError } = await supabaseAdmin
      .from('hotspots')
      .select(`
        id,
        portal_email_obrigatorio,
        portal_cpf_visivel,
        portal_cpf_obrigatorio
      `)
      .eq('id', hotspotId)
      .maybeSingle()

    if (isMissingColumnError(hotspotError)) {
      const fallback = await supabaseAdmin
        .from('hotspots')
        .select('id')
        .eq('id', hotspotId)
        .maybeSingle()

      hotspot = fallback.data
      hotspotError = fallback.error
    }

    if (hotspotError) throw hotspotError
    if (!hotspot) throw new Error('hotspot nao encontrado')

    const portalRules = getPortalRules(hotspot)

    if (!nome) throw new Error('nome obrigatorio')
    if (portalRules.emailObrigatorio && !email) throw new Error('email obrigatorio')
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('email invalido')
    if (telefone.length !== 11) throw new Error('telefone invalido')
    if (portalRules.cpfVisivel && portalRules.cpfObrigatorio && cpf.length !== 11) throw new Error('cpf invalido')
    if (!aceiteLgpd) throw new Error('aceite LGPD obrigatorio')
    if (!macAddress) throw new Error('MAC do cliente obrigatorio')

    const { radiusUsername, radiusPassword } = gerarCredenciaisRadius(macAddress)

    const insertPayload = {
      hotspot_id: hotspotId,
      nome,
      email: email || null,
      telefone,
      cpf: portalRules.cpfVisivel ? cpf : null,
      aceite_lgpd: aceiteLgpd,
      anuncio_id: anuncioId,
      mac_address: macAddress || null,
      ip_address: ipAddress || null,
      radius_username: radiusUsername,
      radius_password: radiusPassword,
      radius_used: false,
      aceitou_promocoes: aceitouPromocoes,
      data_aceite_promocoes: aceitouPromocoes ? new Date().toISOString() : null,
    }

    let { data, error } = await supabaseAdmin
      .from('leads')
      .insert([insertPayload])
      .select('id')
      .single()

    if (isMissingColumnError(error)) {
      const fallbackPayload = { ...insertPayload }
      delete fallbackPayload.aceitou_promocoes
      delete fallbackPayload.data_aceite_promocoes

      const fallback = await supabaseAdmin
        .from('leads')
        .insert([fallbackPayload])
        .select('id')
        .single()

      data = fallback.data
      error = fallback.error
    }

    if (error) throw error

    return NextResponse.json({
      ok: true,
      leadId: data.id,
    })
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error.message || 'Erro ao salvar lead',
      },
      { status: 400 }
    )
  }
}
