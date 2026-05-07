// src/app/api/admin/configuracoes/route.js
// ============================================================
// API administrativa segura para Configurações.
// Substitui o acesso direto do navegador à tabela configuracoes.
//
// Agora:
// Dashboard → API admin → valida admin → service_role → Supabase
//
// Correção importante:
// - GET apenas busca a configuração global.
// - POST cria/atualiza a configuração global.
// - A variável payload só existe dentro do POST.
// - O texto LGPD sempre é salvo e recuperado.
// ============================================================

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireAdmin } from '@/lib/admin-api-auth'

export const runtime = 'nodejs'

function limparTexto(value = '') {
  return String(value || '').trim()
}

function nullableTexto(value = '') {
  const text = limparTexto(value)
  return text || null
}

function numeroOuPadrao(value, fallback = 0) {
  const parsed = Number(value)

  if (!Number.isFinite(parsed)) {
    return fallback
  }

  return parsed
}

function numeroOuNull(value) {
  if (value === null || value === undefined || value === '') {
    return null
  }

  const parsed = Number(value)

  if (!Number.isFinite(parsed)) {
    return null
  }

  return parsed
}

function booleano(value, fallback = false) {
  if (typeof value === 'boolean') {
    return value
  }

  return fallback
}

function sanitizarPayload(config = {}) {
  return {
    // Chave fixa para garantir que exista apenas uma configuração principal.
    config_key: 'global',

    nome_empresa: limparTexto(config.nome_empresa),
    cnpj: limparTexto(config.cnpj),
    email_contato: limparTexto(config.email_contato),
    telefone_contato: limparTexto(config.telefone_contato),
    endereco: limparTexto(config.endereco),

    titulo_portal: limparTexto(config.titulo_portal),
    texto_boas_vindas: limparTexto(config.texto_boas_vindas),
    cor_principal: limparTexto(config.cor_principal) || '#22c55e',

    // LGPD:
    // Mantemos como string completa para preservar exatamente o texto salvo.
    texto_lgpd: String(config.texto_lgpd || ''),

    email_notificacoes: limparTexto(config.email_notificacoes),
    notificar_novos_leads: booleano(config.notificar_novos_leads, true),
    notificar_relatorios: booleano(config.notificar_relatorios, true),

    portal_tempo_acesso_segundos: numeroOuPadrao(config.portal_tempo_acesso_segundos, 1200),
    portal_tempo_bloqueio_segundos: numeroOuPadrao(config.portal_tempo_bloqueio_segundos, 600),
    portal_intervalo_anuncio_segundos: numeroOuPadrao(config.portal_intervalo_anuncio_segundos, 600),

    preco_basico_mensal_padrao: numeroOuPadrao(config.preco_basico_mensal_padrao, 147),
    preco_basico_anual_padrao: numeroOuPadrao(config.preco_basico_anual_padrao, 1470),
    preco_comercial_mensal_padrao: numeroOuPadrao(config.preco_comercial_mensal_padrao, 247),
    preco_comercial_anual_padrao: numeroOuPadrao(config.preco_comercial_anual_padrao, 2470),
    preco_vip_mensal_padrao: numeroOuPadrao(config.preco_vip_mensal_padrao, 597),
    preco_vip_anual_padrao: numeroOuPadrao(config.preco_vip_anual_padrao, 5970),

    mostrar_preco_ancora_padrao: booleano(config.mostrar_preco_ancora_padrao, false),

    preco_ancora_basico_mensal_padrao: numeroOuNull(config.preco_ancora_basico_mensal_padrao),
    preco_ancora_basico_anual_padrao: numeroOuNull(config.preco_ancora_basico_anual_padrao),
    preco_ancora_comercial_mensal_padrao: numeroOuNull(config.preco_ancora_comercial_mensal_padrao),
    preco_ancora_comercial_anual_padrao: numeroOuNull(config.preco_ancora_comercial_anual_padrao),
    preco_ancora_vip_mensal_padrao: numeroOuNull(config.preco_ancora_vip_mensal_padrao),
    preco_ancora_vip_anual_padrao: numeroOuNull(config.preco_ancora_vip_anual_padrao),

    hero_imagem_url_padrao: nullableTexto(config.hero_imagem_url_padrao),
    hero_titulo_linha_1_padrao: nullableTexto(config.hero_titulo_linha_1_padrao),
    hero_titulo_linha_2_padrao: nullableTexto(config.hero_titulo_linha_2_padrao),
    hero_titulo_linha_3_padrao: nullableTexto(config.hero_titulo_linha_3_padrao),
    hero_subtitulo_linha_1_padrao: nullableTexto(config.hero_subtitulo_linha_1_padrao),
    hero_subtitulo_linha_2_padrao: nullableTexto(config.hero_subtitulo_linha_2_padrao),

    hero_titulo_linha_2_estilo_padrao:
      ['gradiente', 'faixa'].includes(config.hero_titulo_linha_2_estilo_padrao)
        ? config.hero_titulo_linha_2_estilo_padrao
        : 'gradiente',
  }
}

async function buscarConfiguracaoGlobal() {
  // Busca sempre a configuração global.
  // Se a tabela ainda tiver linhas antigas sem config_key, fazemos fallback para a mais recente.
  const { data: configGlobal, error: globalError } = await supabaseAdmin
    .from('configuracoes')
    .select('*')
    .eq('config_key', 'global')
    .maybeSingle()

  if (globalError) {
    throw globalError
  }

  if (configGlobal) {
    return configGlobal
  }

  // Fallback para projetos que ainda tenham configuração antiga sem config_key.
  const { data: configAntiga, error: antigaError } = await supabaseAdmin
    .from('configuracoes')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (antigaError) {
    throw antigaError
  }

  return configAntiga || null
}

export async function GET(request) {
  const auth = await requireAdmin(request)

  if (auth.errorResponse) {
    return auth.errorResponse
  }

  try {
    const config = await buscarConfiguracaoGlobal()

    return NextResponse.json({
      ok: true,
      config,
    })
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error.message || 'Erro ao buscar configurações',
      },
      { status: 500 }
    )
  }
}

export async function POST(request) {
  const auth = await requireAdmin(request)

  if (auth.errorResponse) {
    return auth.errorResponse
  }

  try {
    const body = await request.json()

    // payload existe somente aqui dentro do POST.
    const payload = sanitizarPayload(body.config || {})

    const { data, error } = await supabaseAdmin
      .from('configuracoes')
      .upsert(payload, { onConflict: 'config_key' })
      .select('*')
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({
      ok: true,
      config: data,
      message: 'Configurações salvas com sucesso',
    })
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error.message || 'Erro ao salvar configurações',
      },
      { status: 500 }
    )
  }
}