import { supabaseAdmin } from './supabase-admin'

export const DEFAULT_PORTAL_RUNTIME_CONFIG = {
  portal_tempo_acesso_segundos: 1200,
  portal_tempo_bloqueio_segundos: 600,
  portal_intervalo_anuncio_segundos: 600,

  preco_basico_mensal_padrao: 147,
  preco_basico_anual_padrao: 1470,
  preco_comercial_mensal_padrao: 247,
  preco_comercial_anual_padrao: 2470,
  preco_vip_mensal_padrao: 597,
  preco_vip_anual_padrao: 5970,

  mostrar_preco_ancora_padrao: false,
  preco_ancora_basico_mensal_padrao: null,
  preco_ancora_basico_anual_padrao: null,
  preco_ancora_comercial_mensal_padrao: null,
  preco_ancora_comercial_anual_padrao: null,
  preco_ancora_vip_mensal_padrao: null,
  preco_ancora_vip_anual_padrao: null,

  hero_titulo_linha_1_padrao: 'Você está ignorando',
  hero_titulo_linha_2_padrao: 'O ÚNICO CLIENTE',
  hero_titulo_linha_3_padrao: 'na porta do seu negócio.',
  hero_subtitulo_linha_1_padrao: 'O cliente usa a internet, a sua marca aparece na tela dele.',
  hero_subtitulo_linha_2_padrao: 'Simples, inevitável e 100% local.',

  hero_imagem_url_padrao: '/mockup-celular.png',
  hero_titulo_linha_2_estilo_padrao: 'gradiente',

  lp_meta_pixel_id: '',
  lp_ga4_measurement_id: '',
  lp_google_tag_manager_id: '',
  lp_google_ads_id: '',
  lp_google_ads_conversion_label: '',
  lp_meta_conversions_api_enabled: false,
  lp_google_ads_enhanced_conversions_enabled: false,
}

function toNonNegativeInteger(value, fallback = 0) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < 0) return fallback
  return Math.floor(parsed)
}

function toMoney(value, fallback = 0) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < 0) return fallback
  return Number(parsed)
}

export function secondsToParts(totalSeconds = 0) {
  const safe = Math.max(0, toNonNegativeInteger(totalSeconds, 0))
  const hours = Math.floor(safe / 3600)
  const minutes = Math.floor((safe % 3600) / 60)
  const seconds = safe % 60

  return { hours, minutes, seconds }
}

export function partsToSeconds(hours = 0, minutes = 0, seconds = 0) {
  const h = Math.max(0, toNonNegativeInteger(hours, 0))
  const m = Math.max(0, toNonNegativeInteger(minutes, 0))
  const s = Math.max(0, toNonNegativeInteger(seconds, 0))
  return h * 3600 + m * 60 + s
}

export function formatDurationLabel(totalSeconds = 0) {
  const safe = Math.max(0, toNonNegativeInteger(totalSeconds, 0))
  const { hours, minutes, seconds } = secondsToParts(safe)

  const parts = []
  if (hours > 0) parts.push(`${hours}h`)
  if (minutes > 0) parts.push(`${minutes}min`)
  if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`)

  return parts.join(' ')
}

export async function getGlobalRuntimeConfig() {
  const { data, error } = await supabaseAdmin
    .from('configuracoes')
    .select('*')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (error) {
    throw error
  }

  return {
    portal_tempo_acesso_segundos: toNonNegativeInteger(
      data?.portal_tempo_acesso_segundos,
      DEFAULT_PORTAL_RUNTIME_CONFIG.portal_tempo_acesso_segundos
    ),
    portal_tempo_bloqueio_segundos: toNonNegativeInteger(
      data?.portal_tempo_bloqueio_segundos,
      DEFAULT_PORTAL_RUNTIME_CONFIG.portal_tempo_bloqueio_segundos
    ),
    portal_intervalo_anuncio_segundos: toNonNegativeInteger(
      data?.portal_intervalo_anuncio_segundos,
      DEFAULT_PORTAL_RUNTIME_CONFIG.portal_intervalo_anuncio_segundos
    ),

    preco_basico_mensal_padrao: toMoney(
      data?.preco_basico_mensal_padrao,
      DEFAULT_PORTAL_RUNTIME_CONFIG.preco_basico_mensal_padrao
    ),
    preco_basico_anual_padrao: toMoney(
      data?.preco_basico_anual_padrao,
      DEFAULT_PORTAL_RUNTIME_CONFIG.preco_basico_anual_padrao
    ),
    preco_comercial_mensal_padrao: toMoney(
      data?.preco_comercial_mensal_padrao,
      DEFAULT_PORTAL_RUNTIME_CONFIG.preco_comercial_mensal_padrao
    ),
    preco_comercial_anual_padrao: toMoney(
      data?.preco_comercial_anual_padrao,
      DEFAULT_PORTAL_RUNTIME_CONFIG.preco_comercial_anual_padrao
    ),
    preco_vip_mensal_padrao: toMoney(
      data?.preco_vip_mensal_padrao,
      DEFAULT_PORTAL_RUNTIME_CONFIG.preco_vip_mensal_padrao
    ),
    preco_vip_anual_padrao: toMoney(
      data?.preco_vip_anual_padrao,
      DEFAULT_PORTAL_RUNTIME_CONFIG.preco_vip_anual_padrao
    ),

    mostrar_preco_ancora_padrao: Boolean(
      data?.mostrar_preco_ancora_padrao ?? DEFAULT_PORTAL_RUNTIME_CONFIG.mostrar_preco_ancora_padrao
    ),

    preco_ancora_basico_mensal_padrao:      data?.preco_ancora_basico_mensal_padrao ?? DEFAULT_PORTAL_RUNTIME_CONFIG.preco_ancora_basico_mensal_padrao,
    preco_ancora_basico_anual_padrao:      data?.preco_ancora_basico_anual_padrao ?? DEFAULT_PORTAL_RUNTIME_CONFIG.preco_ancora_basico_anual_padrao,
    preco_ancora_comercial_mensal_padrao:      data?.preco_ancora_comercial_mensal_padrao ?? DEFAULT_PORTAL_RUNTIME_CONFIG.preco_ancora_comercial_mensal_padrao,
    preco_ancora_comercial_anual_padrao:      data?.preco_ancora_comercial_anual_padrao ?? DEFAULT_PORTAL_RUNTIME_CONFIG.preco_ancora_comercial_anual_padrao,
    preco_ancora_vip_mensal_padrao:      data?.preco_ancora_vip_mensal_padrao ?? DEFAULT_PORTAL_RUNTIME_CONFIG.preco_ancora_vip_mensal_padrao,
    preco_ancora_vip_anual_padrao:      data?.preco_ancora_vip_anual_padrao ?? DEFAULT_PORTAL_RUNTIME_CONFIG.preco_ancora_vip_anual_padrao,

    hero_imagem_url_padrao:      data?.hero_imagem_url_padrao || DEFAULT_PORTAL_RUNTIME_CONFIG.hero_imagem_url_padrao,


      hero_titulo_linha_1_padrao:  data?.hero_titulo_linha_1_padrao || DEFAULT_PORTAL_RUNTIME_CONFIG.hero_titulo_linha_1_padrao,
hero_titulo_linha_2_padrao:  data?.hero_titulo_linha_2_padrao || DEFAULT_PORTAL_RUNTIME_CONFIG.hero_titulo_linha_2_padrao,
hero_titulo_linha_3_padrao:  data?.hero_titulo_linha_3_padrao || DEFAULT_PORTAL_RUNTIME_CONFIG.hero_titulo_linha_3_padrao,
hero_subtitulo_linha_1_padrao:  data?.hero_subtitulo_linha_1_padrao || DEFAULT_PORTAL_RUNTIME_CONFIG.hero_subtitulo_linha_1_padrao,
hero_subtitulo_linha_2_padrao:   data?.hero_subtitulo_linha_2_padrao || DEFAULT_PORTAL_RUNTIME_CONFIG.hero_subtitulo_linha_2_padrao,

  hero_titulo_linha_2_estilo_padrao:  data?.hero_titulo_linha_2_estilo_padrao || DEFAULT_PORTAL_RUNTIME_CONFIG.hero_titulo_linha_2_estilo_padrao,

  lp_meta_pixel_id: data?.lp_meta_pixel_id || DEFAULT_PORTAL_RUNTIME_CONFIG.lp_meta_pixel_id,
  lp_ga4_measurement_id: data?.lp_ga4_measurement_id || DEFAULT_PORTAL_RUNTIME_CONFIG.lp_ga4_measurement_id,
  lp_google_tag_manager_id: data?.lp_google_tag_manager_id || DEFAULT_PORTAL_RUNTIME_CONFIG.lp_google_tag_manager_id,
  lp_google_ads_id: data?.lp_google_ads_id || DEFAULT_PORTAL_RUNTIME_CONFIG.lp_google_ads_id,
  lp_google_ads_conversion_label: data?.lp_google_ads_conversion_label || DEFAULT_PORTAL_RUNTIME_CONFIG.lp_google_ads_conversion_label,
  lp_meta_conversions_api_enabled: Boolean(data?.lp_meta_conversions_api_enabled ?? DEFAULT_PORTAL_RUNTIME_CONFIG.lp_meta_conversions_api_enabled),
  lp_google_ads_enhanced_conversions_enabled: Boolean(data?.lp_google_ads_enhanced_conversions_enabled ?? DEFAULT_PORTAL_RUNTIME_CONFIG.lp_google_ads_enhanced_conversions_enabled),
  }
}
