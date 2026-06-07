// src/app/api/portal/lead/route.js
// ============================================================
// API segura para salvar lead.
// O CPF, telefone, e-mail, MAC e IP não são mais enviados direto
// do navegador para a tabela leads.
// ============================================================

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { checkRateLimit } from '@/lib/rate-limit'

export const runtime = 'nodejs'

const RATE_LIMIT = {
  keyPrefix: 'portal:lead',
  limit: 20,
  windowMs: 60_000,
}

function normalizeMac(value = '') {
  return String(value || '')
    .trim()
    .toUpperCase()
    .replace(/-/g, ':')
}

function somenteNumeros(value = '') {
  return String(value || '').replace(/\D/g, '')
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

function getMesAtualRange() {
  const agora = new Date()
  const inicio = new Date(agora.getFullYear(), agora.getMonth(), 1, 0, 0, 0, 0)
  const fim = new Date(agora.getFullYear(), agora.getMonth() + 1, 1, 0, 0, 0, 0)

  return {
    inicio: inicio.toISOString(),
    fim: fim.toISOString(),
  }
}

function cpfObrigatorioNoHotspot(hotspot = {}) {
  const slug = String(hotspot.slug || '').trim().toLowerCase()

  if (slug === 'candido-sales') return false

  return hotspot.portal_cpf_visivel !== false && hotspot.portal_cpf_obrigatorio !== false
}

export async function POST(request) {
  const rate = checkRateLimit(request, RATE_LIMIT)

  if (!rate.allowed) {
    return NextResponse.json({ ok: false, error: 'Muitas tentativas. Aguarde um instante.' }, { status: 429 })
  }

  try {
    const body = await request.json()

    const hotspotId = String(body.hotspotId || '').trim()
    const nome = String(body.nome || '').trim()
    const email = String(body.email || '').trim().toLowerCase()
    const telefone = somenteNumeros(body.telefone)
    const cpf = somenteNumeros(body.cpf)
    const aceiteLgpd = Boolean(body.aceiteLgpd)
    const aceitouPromocoes = Boolean(body.aceitouPromocoes || body.aceitou_promocoes)
    const anuncioId = body.anuncioId ? String(body.anuncioId).trim() : null
    const macAddress = normalizeMac(body.macAddress || '')
    const ipAddress = String(body.ipAddress || '').trim()

    if (!hotspotId) throw new Error('hotspotId é obrigatório')

    const { data: hotspot, error: hotspotError } = await supabaseAdmin
      .from('hotspots')
      .select('id, slug, portal_cpf_visivel, portal_cpf_obrigatorio')
      .eq('id', hotspotId)
      .maybeSingle()

    if (hotspotError) throw hotspotError
    if (!hotspot) throw new Error('hotspot não encontrado')

    const exigirCpf = cpfObrigatorioNoHotspot(hotspot)

    if (!nome) throw new Error('nome é obrigatório')
    if (!email) throw new Error('email é obrigatório')
    if (telefone.length !== 11) throw new Error('telefone inválido')
    if (exigirCpf && cpf.length !== 11) throw new Error('cpf inválido')
    if (!exigirCpf && cpf && cpf.length !== 11) throw new Error('cpf inválido')
    if (!aceiteLgpd) throw new Error('aceite LGPD é obrigatório')
    if (!macAddress) throw new Error('MAC do cliente é obrigatório')

    const { radiusUsername, radiusPassword } = gerarCredenciaisRadius(macAddress)
    const { inicio, fim } = getMesAtualRange()

    const { data: existingLead, error: existingError } = await supabaseAdmin
      .from('leads')
      .select('id')
      .eq('hotspot_id', hotspotId)
      .eq('mac_address', macAddress)
      .eq('telefone', telefone)
      .gte('created_at', inicio)
      .lt('created_at', fim)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (existingError) throw existingError

    if (existingLead?.id) {
      const { error: updateError } = await supabaseAdmin
        .from('leads')
        .update({
          nome,
          email,
          telefone,
          ...(cpf ? { cpf } : {}),
          aceite_lgpd: aceiteLgpd,
          aceitou_promocoes: aceitouPromocoes,
          data_aceite_promocoes: aceitouPromocoes ? new Date().toISOString() : null,
          anuncio_id: anuncioId,
          ip_address: ipAddress || null,
        })
        .eq('id', existingLead.id)

      if (updateError) throw updateError

      return NextResponse.json({
        ok: true,
        leadId: existingLead.id,
        reused: true,
      })
    }

    const { data, error } = await supabaseAdmin
      .from('leads')
      .insert([{
        hotspot_id: hotspotId,
        nome,
        email,
        telefone,
        cpf: cpf || null,
        aceite_lgpd: aceiteLgpd,
        aceitou_promocoes: aceitouPromocoes,
        data_aceite_promocoes: aceitouPromocoes ? new Date().toISOString() : null,
        anuncio_id: anuncioId,
        mac_address: macAddress || null,
        ip_address: ipAddress || null,
        radius_username: radiusUsername,
        radius_password: radiusPassword,
        radius_used: false,
      }])
      .select('id')
      .single()

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
