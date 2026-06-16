import { supabaseAdmin } from './supabase-admin'
import { getGlobalRuntimeConfig } from './portal-runtime-config'

function mergeMoney(cityValue, defaultValue) {
  const parsed = Number(cityValue)
  if (Number.isFinite(parsed) && parsed >= 0) return parsed
  return Number(defaultValue || 0)
}

function mergeNullableMoney(cityValue, defaultValue = null) {
  const parsedCity = Number(cityValue)
  if (Number.isFinite(parsedCity) && parsedCity >= 0) return parsedCity

  const parsedDefault = Number(defaultValue)
  if (Number.isFinite(parsedDefault) && parsedDefault >= 0) return parsedDefault

  return null
}

function mergeBoolean(cityValue, defaultValue = false) {
  if (typeof cityValue === 'boolean') return cityValue
  return Boolean(defaultValue)
}

export async function getLandingCityRecordBySlug(slug = '') {
  const normalizedSlug = String(slug || '').trim().toLowerCase()
  if (!normalizedSlug) return null

  const { data, error } = await supabaseAdmin
    .from('landing_pages_cidades')
    .select('*')
    .ilike('slug', normalizedSlug)
    .maybeSingle()

  if (error) {
    throw error
  }

  if (!data) return null
  if (data.ativa === false) return null

  return data
}

export async function getLandingPageConfig(slug = '') {
  const globalConfig = await getGlobalRuntimeConfig()
  const cityRecord = await getLandingCityRecordBySlug(slug)

  const defaultConfig = {
    slug: '',
    cidade_nome: '',
    ativa: true,
    badge_topo: 'O seu novo Outdoor Digital',
    headline: 'Você está ignorando O ÚNICO CLIENTE na porta do seu negócio.',
    subheadline:
      'Enquanto você briga por atenção na internet, nós fazemos você aparecer exatamente para quem já está perto do seu negócio.',
    cta_primaria: 'Quero ser visto pelo meu cliente',
    cta_secundaria: 'Como funciona isso?',
    whatsapp_destino: 'https://wa.me/77988656394',
    observacao_precos: 'Planos mensais com fidelidade de 3 meses.',

    preco_basico_mensal: Number(globalConfig.preco_basico_mensal_padrao || 147),
    preco_basico_anual: Number(globalConfig.preco_basico_anual_padrao || 1470),
    preco_comercial_mensal: Number(globalConfig.preco_comercial_mensal_padrao || 247),
    preco_comercial_anual: Number(globalConfig.preco_comercial_anual_padrao || 2470),
    preco_vip_mensal: Number(globalConfig.preco_vip_mensal_padrao || 597),
    preco_vip_anual: Number(globalConfig.preco_vip_anual_padrao || 5970),

    mostrar_preco_ancora: Boolean(globalConfig.mostrar_preco_ancora_padrao || false),
    preco_ancora_basico_mensal: globalConfig.preco_ancora_basico_mensal_padrao ?? null,
    preco_ancora_basico_anual: globalConfig.preco_ancora_basico_anual_padrao ?? null,
    preco_ancora_comercial_mensal: globalConfig.preco_ancora_comercial_mensal_padrao ?? null,
    preco_ancora_comercial_anual: globalConfig.preco_ancora_comercial_anual_padrao ?? null,
    preco_ancora_vip_mensal: globalConfig.preco_ancora_vip_mensal_padrao ?? null,
    preco_ancora_vip_anual: globalConfig.preco_ancora_vip_anual_padrao ?? null,

    hero_imagem_url: globalConfig.hero_imagem_url_padrao || '/mockup-celular.png',
    hero_titulo_linha_1: globalConfig.hero_titulo_linha_1_padrao || 'Você está ignorando',
    hero_titulo_linha_2: globalConfig.hero_titulo_linha_2_padrao || 'O ÚNICO CLIENTE',
    hero_titulo_linha_3: globalConfig.hero_titulo_linha_3_padrao || 'na porta do seu negócio.',
    hero_subtitulo_linha_1: globalConfig.hero_subtitulo_linha_1_padrao || 'O cliente usa a internet, a sua marca aparece na tela dele.',
    hero_subtitulo_linha_2: globalConfig.hero_subtitulo_linha_2_padrao || 'Simples, inevitável e 100% local.',

    hero_titulo_linha_2_estilo:
  globalConfig.hero_titulo_linha_2_estilo_padrao || 'gradiente',

    video_explicativo: {
      ativo: Boolean(globalConfig.lp_video_explicativo_ativo),
      url: globalConfig.lp_video_explicativo_url || '',
      titulo: globalConfig.lp_video_explicativo_titulo || 'Veja como a NexaWi funciona na prática',
      descricao: globalConfig.lp_video_explicativo_descricao || 'Entenda em poucos segundos como o Wi-Fi vira mídia local, captura leads e entrega métricas para anunciantes.',
    },

    integracoes: {
      metaPixelId: globalConfig.lp_meta_pixel_id || '',
      ga4MeasurementId: globalConfig.lp_ga4_measurement_id || '',
      googleTagManagerId: globalConfig.lp_google_tag_manager_id || '',
      googleAdsId: globalConfig.lp_google_ads_id || '',
      googleAdsConversionLabel: globalConfig.lp_google_ads_conversion_label || '',
      metaConversionsApiEnabled: Boolean(globalConfig.lp_meta_conversions_api_enabled),
      googleAdsEnhancedConversionsEnabled: Boolean(globalConfig.lp_google_ads_enhanced_conversions_enabled),
    },
  }

  if (!cityRecord) {
    return defaultConfig
  }

  return {
    slug: cityRecord.slug,
    cidade_nome: cityRecord.cidade_nome || '',
    ativa: cityRecord.ativa ?? true,
    badge_topo: cityRecord.badge_topo || defaultConfig.badge_topo,
    headline: cityRecord.headline || defaultConfig.headline,
    subheadline: cityRecord.subheadline || defaultConfig.subheadline,
    cta_primaria: cityRecord.cta_primaria || defaultConfig.cta_primaria,
    cta_secundaria: cityRecord.cta_secundaria || defaultConfig.cta_secundaria,
    whatsapp_destino: cityRecord.whatsapp_destino || defaultConfig.whatsapp_destino,
    observacao_precos: cityRecord.observacao_precos || defaultConfig.observacao_precos,

    preco_basico_mensal: mergeMoney(cityRecord.preco_basico_mensal, defaultConfig.preco_basico_mensal),
    preco_basico_anual: mergeMoney(cityRecord.preco_basico_anual, defaultConfig.preco_basico_anual),
    preco_comercial_mensal: mergeMoney(cityRecord.preco_comercial_mensal, defaultConfig.preco_comercial_mensal),
    preco_comercial_anual: mergeMoney(cityRecord.preco_comercial_anual, defaultConfig.preco_comercial_anual),
    preco_vip_mensal: mergeMoney(cityRecord.preco_vip_mensal, defaultConfig.preco_vip_mensal),
    preco_vip_anual: mergeMoney(cityRecord.preco_vip_anual, defaultConfig.preco_vip_anual),

    mostrar_preco_ancora: mergeBoolean(cityRecord.mostrar_preco_ancora, defaultConfig.mostrar_preco_ancora),
    preco_ancora_basico_mensal: mergeNullableMoney(cityRecord.preco_ancora_basico_mensal, defaultConfig.preco_ancora_basico_mensal),
    preco_ancora_basico_anual: mergeNullableMoney(cityRecord.preco_ancora_basico_anual, defaultConfig.preco_ancora_basico_anual),
    preco_ancora_comercial_mensal: mergeNullableMoney(cityRecord.preco_ancora_comercial_mensal, defaultConfig.preco_ancora_comercial_mensal),
    preco_ancora_comercial_anual: mergeNullableMoney(cityRecord.preco_ancora_comercial_anual, defaultConfig.preco_ancora_comercial_anual),
    preco_ancora_vip_mensal: mergeNullableMoney(cityRecord.preco_ancora_vip_mensal, defaultConfig.preco_ancora_vip_mensal),
    preco_ancora_vip_anual: mergeNullableMoney(cityRecord.preco_ancora_vip_anual, defaultConfig.preco_ancora_vip_anual),

    hero_imagem_url: cityRecord.hero_imagem_url || defaultConfig.hero_imagem_url,

    hero_titulo_linha_1:  cityRecord.hero_titulo_linha_1 || defaultConfig.hero_titulo_linha_1,
    hero_titulo_linha_2:  cityRecord.hero_titulo_linha_2 || defaultConfig.hero_titulo_linha_2,
    hero_titulo_linha_3:  cityRecord.hero_titulo_linha_3 || defaultConfig.hero_titulo_linha_3,
    hero_subtitulo_linha_1:  cityRecord.hero_subtitulo_linha_1 || defaultConfig.hero_subtitulo_linha_1,
    hero_subtitulo_linha_2:  cityRecord.hero_subtitulo_linha_2 || defaultConfig.hero_subtitulo_linha_2,

    hero_titulo_linha_2_estilo:
  cityRecord.hero_titulo_linha_2_estilo || defaultConfig.hero_titulo_linha_2_estilo,

    video_explicativo: defaultConfig.video_explicativo,

    integracoes: defaultConfig.integracoes,
    
  }
}
