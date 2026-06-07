// src/app/api/admin/configuracoes/route.js
// ============================================================
// API administrativa segura para Configurações.
// Substitui o acesso direto do navegador à tabela configuracoes.
//
// Permissões aplicadas:
// - GET configurações: configuracoes.view
// - POST configurações: configuracoes.update
//
// Correção importante:
// - GET apenas busca a configuração global.
// - POST cria/atualiza a configuração global.
// - O texto LGPD sempre é salvo e recuperado.
// - A alteração é registrada em admin_audit_logs.
// ============================================================

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireAdmin } from '@/lib/admin-api-auth'
import { logAdminAction } from '@/lib/admin-audit-log'

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

function permissaoNegada(modulo, acao) {
  return NextResponse.json(
    {
      ok: false,
      error: `Sem permissão para ${acao} em ${modulo}`,
    },
    { status: 403 }
  )
}

function sanitizarPayload(config = {}) {
  return {
    config_key: 'global',

    nome_empresa: limparTexto(config.nome_empresa),
    cnpj: limparTexto(config.cnpj),
    email_contato: limparTexto(config.email_contato),
    telefone_contato: limparTexto(config.telefone_contato),
    endereco: limparTexto(config.endereco),

    titulo_portal: limparTexto(config.titulo_portal),
    texto_boas_vindas: limparTexto(config.texto_boas_vindas),
    cor_principal: limparTexto(config.cor_principal) || '#22c55e',

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

    lp_meta_pixel_id: nullableTexto(config.lp_meta_pixel_id),
    lp_ga4_measurement_id: nullableTexto(config.lp_ga4_measurement_id),
    lp_google_tag_manager_id: nullableTexto(config.lp_google_tag_manager_id),
    lp_google_ads_id: nullableTexto(config.lp_google_ads_id),
    lp_google_ads_conversion_label: nullableTexto(config.lp_google_ads_conversion_label),
    lp_meta_conversions_api_enabled: booleano(config.lp_meta_conversions_api_enabled, false),
    lp_google_ads_enhanced_conversions_enabled: booleano(config.lp_google_ads_enhanced_conversions_enabled, false),
  }
}

async function buscarConfiguracaoGlobal() {
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
  const auth = await requireAdmin(request, {
    module: 'configuracoes',
    action: 'view',
  })

  if (auth.errorResponse) {
    return auth.errorResponse
  }

  try {
    const config = await buscarConfiguracaoGlobal()

    return NextResponse.json({
      ok: true,
      config,
      permissions: auth.permissions?.configuracoes || {},
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

  if (!auth.canAccess('configuracoes', 'update')) {
    return permissaoNegada('configuracoes', 'update')
  }

  try {
    const body = await request.json()
    const payload = sanitizarPayload(body.config || {})

    const { data, error } = await supabaseAdmin
      .from('configuracoes')
      .upsert(payload, { onConflict: 'config_key' })
      .select('*')
      .single()

    if (error) {
      throw error
    }

    await logAdminAction({
      request,
      adminUser: auth.user,
      action: 'update',
      entity: 'configuracoes',
      entityId: data.id,
      description: 'Atualizou as configurações globais do sistema',
      metadata: {
        config_key: data.config_key,
        alterou_lgpd: typeof payload.texto_lgpd === 'string',
        tamanho_lgpd: payload.texto_lgpd?.length || 0,
        titulo_portal: payload.titulo_portal,
        nome_empresa: payload.nome_empresa,
        alterou_tempos_portal: true,
        alterou_precos_padrao: true,
        alterou_hero: Boolean(payload.hero_imagem_url_padrao),
        alterou_tracking_lp: Boolean(
          payload.lp_meta_pixel_id ||
          payload.lp_ga4_measurement_id ||
          payload.lp_google_tag_manager_id ||
          payload.lp_google_ads_id
        ),
      },
    })

    return NextResponse.json({
      ok: true,
      config: data,
      message: 'Configurações salvas com sucesso',
      permissions: auth.permissions?.configuracoes || {},
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
