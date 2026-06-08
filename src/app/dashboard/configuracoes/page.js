'use client'

import { useEffect, useState } from 'react'
import { createClient as createBrowserSupabaseClient } from '@/lib/supabase/admin-client'
import {
  Building2,
  Globe,
  Shield,
  Bell,
  Lock,
  Check,
  Save,
  TimerReset,
  BadgeDollarSign,
} from 'lucide-react'

// Cliente Supabase usado apenas para pegar a sessão do admin logado,
// alterar senha e enviar arquivo usando URL assinada.
// As configurações agora passam por /api/admin/configuracoes.
const supabase = createBrowserSupabaseClient()

const HERO_IMAGE_BUCKET = 'landing-assets'

const abas = [
  { id: 'empresa', label: 'Empresa', icon: Building2, desc: 'Dados comerciais' },
  { id: 'portal', label: 'Portal', icon: Globe, desc: 'Aparência, tempos e preços' },
  { id: 'lgpd', label: 'LGPD', icon: Shield, desc: 'Termos de uso' },
  { id: 'notificacoes', label: 'Notificações', icon: Bell, desc: 'Avisos e alertas' },
  { id: 'seguranca', label: 'Segurança', icon: Lock, desc: 'Senha de acesso' },
]

const permissoesIniciais = {
  view: false,
  update: false,
}

const DEFAULT_FORM = {
  nome_empresa: '',
  cnpj: '',
  email_contato: '',
  telefone_contato: '',
  endereco: '',
  titulo_portal: '',
  texto_boas_vindas: '',
  cor_principal: '#22c55e',
  texto_lgpd: '',
  email_notificacoes: '',
  notificar_novos_leads: true,
  notificar_relatorios: true,

  portal_tempo_acesso_horas: '0',
  portal_tempo_acesso_minutos: '20',
  portal_tempo_acesso_segundos: '0',

  portal_tempo_bloqueio_horas: '0',
  portal_tempo_bloqueio_minutos: '10',
  portal_tempo_bloqueio_segundos: '0',

  portal_intervalo_anuncio_horas: '0',
  portal_intervalo_anuncio_minutos: '10',
  portal_intervalo_anuncio_segundos: '0',

  preco_basico_mensal_padrao: '147',
  preco_basico_anual_padrao: '1470',
  preco_comercial_mensal_padrao: '247',
  preco_comercial_anual_padrao: '2470',
  preco_vip_mensal_padrao: '597',
  preco_vip_anual_padrao: '5970',
  mostrar_preco_ancora_padrao: false,
  preco_ancora_basico_mensal_padrao: '',
  preco_ancora_basico_anual_padrao: '',
  preco_ancora_comercial_mensal_padrao: '',
  preco_ancora_comercial_anual_padrao: '',
  preco_ancora_vip_mensal_padrao: '',
  preco_ancora_vip_anual_padrao: '',

  hero_imagem_url_padrao: '',

  hero_titulo_linha_1_padrao: '',
hero_titulo_linha_2_padrao: '',
hero_titulo_linha_3_padrao: '',
hero_subtitulo_linha_1_padrao: '',
hero_subtitulo_linha_2_padrao: '',
hero_titulo_linha_2_estilo_padrao: 'gradiente',

  lp_meta_pixel_id: '',
  lp_ga4_measurement_id: '',
  lp_google_tag_manager_id: '',
  lp_google_ads_id: '',
  lp_google_ads_conversion_label: '',
  lp_meta_conversions_api_enabled: false,
  lp_google_ads_enhanced_conversions_enabled: false,
}

function sanitizeIntegerInput(value) {
  return String(value || '').replace(/\D/g, '')
}

function moneyToNullableNumber(value) {
  const normalized = String(value || '')
    .replace(/\s/g, '')
    .replace(',', '.')
    .trim()

  if (!normalized) return null

  const parsed = Number(normalized)
  if (!Number.isFinite(parsed)) return null
  return parsed
}


function secondsToParts(totalSeconds = 0) {
  const safe = Math.max(0, Number(totalSeconds) || 0)
  const hours = Math.floor(safe / 3600)
  const minutes = Math.floor((safe % 3600) / 60)
  const seconds = safe % 60

  return {
    hours: String(hours),
    minutes: String(minutes),
    seconds: String(seconds),
  }
}

function partsToSeconds(hours, minutes, seconds) {
  const h = Number(hours || 0)
  const m = Number(minutes || 0)
  const s = Number(seconds || 0)
  return Math.max(0, h * 3600 + m * 60 + s)
}

function moneyToString(value, fallback = '0') {
  if (value === null || value === undefined || value === '') return fallback
  return String(value)
}

function moneyToNumber(value, fallback = 0) {
  const normalized = String(value || '')
    .replace(/\s/g, '')
    .replace(',', '.')
    .trim()

  const parsed = Number(normalized)
  if (!Number.isFinite(parsed)) return fallback
  return parsed
}

function InputTempo({ label, prefix, form, setForm }) {
  return (
    <div className="rounded-[2rem] border border-white/[0.05] bg-[#050505] p-6 shadow-inner">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-2xl bg-[#6be12f]/10 border border-[#6be12f]/20 flex items-center justify-center">
          <TimerReset size={18} className="text-[#6be12f]" />
        </div>
        <div>
          <p className="text-sm font-bold text-white tracking-tight">{label}</p>
          <p className="text-xs text-neutral-500 font-medium">Horas, minutos e segundos</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-[11px] font-bold text-neutral-500 mb-2 uppercase tracking-widest">
            Horas
          </label>
          <input
            type="text"
            inputMode="numeric"
            value={form[`${prefix}_horas`]}
            onChange={(e) =>
              setForm({
                ...form,
                [`${prefix}_horas`]: sanitizeIntegerInput(e.target.value),
              })
            }
            className="w-full bg-[#0a0a0a] border border-white/[0.05] rounded-2xl px-4 py-4 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#6be12f]/30 focus:border-[#6be12f]/30 transition-all"
          />
        </div>

        <div>
          <label className="block text-[11px] font-bold text-neutral-500 mb-2 uppercase tracking-widest">
            Minutos
          </label>
          <input
            type="text"
            inputMode="numeric"
            value={form[`${prefix}_minutos`]}
            onChange={(e) =>
              setForm({
                ...form,
                [`${prefix}_minutos`]: sanitizeIntegerInput(e.target.value),
              })
            }
            className="w-full bg-[#0a0a0a] border border-white/[0.05] rounded-2xl px-4 py-4 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#6be12f]/30 focus:border-[#6be12f]/30 transition-all"
          />
        </div>

        <div>
          <label className="block text-[11px] font-bold text-neutral-500 mb-2 uppercase tracking-widest">
            Segundos
          </label>
          <input
            type="text"
            inputMode="numeric"
            value={form[`${prefix}_segundos`]}
            onChange={(e) =>
              setForm({
                ...form,
                [`${prefix}_segundos`]: sanitizeIntegerInput(e.target.value),
              })
            }
            className="w-full bg-[#0a0a0a] border border-white/[0.05] rounded-2xl px-4 py-4 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#6be12f]/30 focus:border-[#6be12f]/30 transition-all"
          />
        </div>
      </div>
    </div>
  )
}

function InputPreco({ label, mensalKey, anualKey, form, setForm }) {
  return (
    <div className="rounded-[2rem] border border-white/[0.05] bg-[#050505] p-6 shadow-inner">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-2xl bg-[#6be12f]/10 border border-[#6be12f]/20 flex items-center justify-center">
          <BadgeDollarSign size={18} className="text-[#6be12f]" />
        </div>
        <div>
          <p className="text-sm font-bold text-white tracking-tight">{label}</p>
          <p className="text-xs text-neutral-500 font-medium">Valores editáveis para campanhas e promoções</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-[11px] font-bold text-neutral-500 mb-2 uppercase tracking-widest">
            Plano Mensal
          </label>
          <input
            type="text"
            inputMode="decimal"
            value={form[mensalKey]}
            onChange={(e) => setForm({ ...form, [mensalKey]: e.target.value })}
            className="w-full bg-[#0a0a0a] border border-white/[0.05] rounded-2xl px-4 py-4 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#6be12f]/30 focus:border-[#6be12f]/30 transition-all"
            placeholder="Ex: 147"
          />
        </div>

        <div>
          <label className="block text-[11px] font-bold text-neutral-500 mb-2 uppercase tracking-widest">
            Plano Anual
          </label>
          <input
            type="text"
            inputMode="decimal"
            value={form[anualKey]}
            onChange={(e) => setForm({ ...form, [anualKey]: e.target.value })}
            className="w-full bg-[#0a0a0a] border border-white/[0.05] rounded-2xl px-4 py-4 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#6be12f]/30 focus:border-[#6be12f]/30 transition-all"
            placeholder="Ex: 1470"
          />
        </div>
      </div>
    </div>
  )
}

// ============================================================
// Chamada padrão para APIs administrativas.
// Essa função pega o token do usuário logado e envia para a API.
// A API valida se o usuário é admin antes de consultar o banco.
// ============================================================

async function adminApiFetch(path, { method = 'GET', body } = {}) {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession()

  if (sessionError || !sessionData?.session?.access_token) {
    throw new Error('Sessão administrativa não encontrada. Faça login novamente.')
  }

  const response = await fetch(path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${sessionData.session.access_token}`,
    },
    cache: 'no-store',
    body: body ? JSON.stringify(body) : undefined,
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error || 'Erro na API administrativa')
  }

  return data
}

function TrackingStatusCards({ form }) {
  const items = [
    {
      label: 'Meta Pixel client-side',
      status: form.lp_meta_pixel_id ? 'ativo' : 'pendente',
      detail: form.lp_meta_pixel_id ? 'Pixel publico aplicado na LP nativa.' : 'Informe o Pixel ID para medir eventos no navegador.',
    },
    {
      label: 'Meta Conversions API',
      status: form.lp_meta_conversions_api_enabled ? 'preparado' : 'pendente',
      detail: 'Depende de META_CONVERSIONS_ACCESS_TOKEN na VPS/Vercel. O painel nao exibe token.',
    },
    {
      label: 'Google Ads client-side',
      status: form.lp_google_ads_id && form.lp_google_ads_conversion_label ? 'ativo' : 'pendente',
      detail: 'Exige Google Ads ID e Conversion Label para cliques/leads da LP.',
    },
    {
      label: 'Google server-side',
      status: form.lp_google_ads_enhanced_conversions_enabled ? 'preparado' : 'pendente',
      detail: 'Depende das credenciais GOOGLE_ADS_* no ambiente seguro.',
    },
  ]

  return (
    <div className="mb-6 grid grid-cols-1 xl:grid-cols-4 gap-3">
      {items.map((item) => {
        const active = item.status === 'ativo'
        const prepared = item.status === 'preparado'
        const style = active
          ? 'border-[#6be12f]/20 bg-[#6be12f]/10 text-[#8cf059]'
          : prepared
            ? 'border-cyan-500/20 bg-cyan-500/10 text-cyan-300'
            : 'border-yellow-500/20 bg-yellow-500/10 text-yellow-300'

        return (
          <div key={item.label} className="rounded-2xl border border-white/[0.05] bg-[#050505] p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-black text-white">{item.label}</p>
              <span className={`rounded-lg border px-2.5 py-1 text-[9px] font-black uppercase tracking-widest ${style}`}>
                {item.status}
              </span>
            </div>
            <p className="mt-3 text-[11px] leading-relaxed text-neutral-500">{item.detail}</p>
          </div>
        )
      })}
    </div>
  )
}
export default function Configuracoes() {
  const [abaAtiva, setAbaAtiva] = useState('empresa')
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [salvo, setSalvo] = useState(false)
  const [configId, setConfigId] = useState(null)

  const [permissions, setPermissions] = useState(permissoesIniciais)

const canUpdate = Boolean(permissions.update)

  const [novaSenha, setNovaSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [erroSenha, setErroSenha] = useState('')
  const [salvandoSenha, setSalvandoSenha] = useState(false)
  const [senhaOk, setSenhaOk] = useState(false)

  const [form, setForm] = useState(DEFAULT_FORM)

  const [uploadingHeroImage, setUploadingHeroImage] = useState(false)

  useEffect(() => {
    buscarConfiguracoes()
  }, [])

    async function buscarConfiguracoes() {
    setCarregando(true)

    try {
      // Agora as configurações não são lidas direto pelo navegador.
      // A API admin busca a configuração mais recente com service_role.
      const resposta = await adminApiFetch('/api/admin/configuracoes')
      const data = resposta.config
      setPermissions({
  ...permissoesIniciais,
  ...(resposta.permissions || {}),
})

      if (data) {
        setConfigId(data.id)

        const acesso = secondsToParts(data.portal_tempo_acesso_segundos ?? 1200)
        const bloqueio = secondsToParts(data.portal_tempo_bloqueio_segundos ?? 600)
        const anuncio = secondsToParts(data.portal_intervalo_anuncio_segundos ?? 600)

        setForm({
          nome_empresa: data.nome_empresa || '',
          cnpj: data.cnpj || '',
          email_contato: data.email_contato || '',
          telefone_contato: data.telefone_contato || '',
          endereco: data.endereco || '',
          titulo_portal: data.titulo_portal || '',
          texto_boas_vindas: data.texto_boas_vindas || '',
          cor_principal: data.cor_principal || '#22c55e',

          // LGPD sempre vem do banco.
          // Se estiver vazio, mantém vazio; se você salvou texto, ele volta aqui.
          texto_lgpd: data.texto_lgpd || '',

          email_notificacoes: data.email_notificacoes || '',
          notificar_novos_leads: data.notificar_novos_leads ?? true,
          notificar_relatorios: data.notificar_relatorios ?? true,

          portal_tempo_acesso_horas: acesso.hours,
          portal_tempo_acesso_minutos: acesso.minutes,
          portal_tempo_acesso_segundos: acesso.seconds,

          portal_tempo_bloqueio_horas: bloqueio.hours,
          portal_tempo_bloqueio_minutos: bloqueio.minutes,
          portal_tempo_bloqueio_segundos: bloqueio.seconds,

          portal_intervalo_anuncio_horas: anuncio.hours,
          portal_intervalo_anuncio_minutos: anuncio.minutes,
          portal_intervalo_anuncio_segundos: anuncio.seconds,

          preco_basico_mensal_padrao: moneyToString(data.preco_basico_mensal_padrao, '147'),
          preco_basico_anual_padrao: moneyToString(data.preco_basico_anual_padrao, '1470'),
          preco_comercial_mensal_padrao: moneyToString(data.preco_comercial_mensal_padrao, '247'),
          preco_comercial_anual_padrao: moneyToString(data.preco_comercial_anual_padrao, '2470'),
          preco_vip_mensal_padrao: moneyToString(data.preco_vip_mensal_padrao, '597'),
          preco_vip_anual_padrao: moneyToString(data.preco_vip_anual_padrao, '5970'),
          mostrar_preco_ancora_padrao: data.mostrar_preco_ancora_padrao ?? false,

          preco_ancora_basico_mensal_padrao: moneyToString(data.preco_ancora_basico_mensal_padrao, ''),
          preco_ancora_basico_anual_padrao: moneyToString(data.preco_ancora_basico_anual_padrao, ''),
          preco_ancora_comercial_mensal_padrao: moneyToString(data.preco_ancora_comercial_mensal_padrao, ''),
          preco_ancora_comercial_anual_padrao: moneyToString(data.preco_ancora_comercial_anual_padrao, ''),
          preco_ancora_vip_mensal_padrao: moneyToString(data.preco_ancora_vip_mensal_padrao, ''),
          preco_ancora_vip_anual_padrao: moneyToString(data.preco_ancora_vip_anual_padrao, ''),

          hero_imagem_url_padrao: data.hero_imagem_url_padrao || '',

          hero_titulo_linha_1_padrao: data.hero_titulo_linha_1_padrao || '',
          hero_titulo_linha_2_padrao: data.hero_titulo_linha_2_padrao || '',
          hero_titulo_linha_3_padrao: data.hero_titulo_linha_3_padrao || '',
          hero_subtitulo_linha_1_padrao: data.hero_subtitulo_linha_1_padrao || '',
          hero_subtitulo_linha_2_padrao: data.hero_subtitulo_linha_2_padrao || '',
          hero_titulo_linha_2_estilo_padrao: data.hero_titulo_linha_2_estilo_padrao || 'gradiente',
          lp_meta_pixel_id: data.lp_meta_pixel_id || '',
          lp_ga4_measurement_id: data.lp_ga4_measurement_id || '',
          lp_google_tag_manager_id: data.lp_google_tag_manager_id || '',
          lp_google_ads_id: data.lp_google_ads_id || '',
          lp_google_ads_conversion_label: data.lp_google_ads_conversion_label || '',
          lp_meta_conversions_api_enabled: Boolean(data.lp_meta_conversions_api_enabled),
          lp_google_ads_enhanced_conversions_enabled: Boolean(data.lp_google_ads_enhanced_conversions_enabled),
        })
      }
    } catch (error) {
      console.error('Erro ao buscar configurações:', error)
      alert(`Erro ao buscar configurações: ${error.message || 'erro desconhecido'}`)
    } finally {
      setCarregando(false)
    }
  }

    async function salvarConfiguracoes() {
    try {
      if (!canUpdate) {
  alert('Você não tem permissão para alterar configurações.')
  return
}
      setSalvando(true)
      setSalvo(false)

      const payload = {
        nome_empresa: form.nome_empresa,
        cnpj: form.cnpj,
        email_contato: form.email_contato,
        telefone_contato: form.telefone_contato,
        endereco: form.endereco,
        titulo_portal: form.titulo_portal,
        texto_boas_vindas: form.texto_boas_vindas,
        cor_principal: form.cor_principal,

        // LGPD sempre enviada para a API.
        // Isso garante que, ao salvar, o texto fique persistido.
        texto_lgpd: form.texto_lgpd,

        email_notificacoes: form.email_notificacoes,
        notificar_novos_leads: form.notificar_novos_leads,
        notificar_relatorios: form.notificar_relatorios,

        portal_tempo_acesso_segundos: partsToSeconds(
          form.portal_tempo_acesso_horas,
          form.portal_tempo_acesso_minutos,
          form.portal_tempo_acesso_segundos
        ),
        portal_tempo_bloqueio_segundos: partsToSeconds(
          form.portal_tempo_bloqueio_horas,
          form.portal_tempo_bloqueio_minutos,
          form.portal_tempo_bloqueio_segundos
        ),
        portal_intervalo_anuncio_segundos: partsToSeconds(
          form.portal_intervalo_anuncio_horas,
          form.portal_intervalo_anuncio_minutos,
          form.portal_intervalo_anuncio_segundos
        ),

        preco_basico_mensal_padrao: moneyToNumber(form.preco_basico_mensal_padrao, 147),
        preco_basico_anual_padrao: moneyToNumber(form.preco_basico_anual_padrao, 1470),
        preco_comercial_mensal_padrao: moneyToNumber(form.preco_comercial_mensal_padrao, 247),
        preco_comercial_anual_padrao: moneyToNumber(form.preco_comercial_anual_padrao, 2470),
        preco_vip_mensal_padrao: moneyToNumber(form.preco_vip_mensal_padrao, 597),
        preco_vip_anual_padrao: moneyToNumber(form.preco_vip_anual_padrao, 5970),
        mostrar_preco_ancora_padrao: form.mostrar_preco_ancora_padrao,

        preco_ancora_basico_mensal_padrao: moneyToNullableNumber(form.preco_ancora_basico_mensal_padrao),
        preco_ancora_basico_anual_padrao: moneyToNullableNumber(form.preco_ancora_basico_anual_padrao),
        preco_ancora_comercial_mensal_padrao: moneyToNullableNumber(form.preco_ancora_comercial_mensal_padrao),
        preco_ancora_comercial_anual_padrao: moneyToNullableNumber(form.preco_ancora_comercial_anual_padrao),
        preco_ancora_vip_mensal_padrao: moneyToNullableNumber(form.preco_ancora_vip_mensal_padrao),
        preco_ancora_vip_anual_padrao: moneyToNullableNumber(form.preco_ancora_vip_anual_padrao),

        hero_imagem_url_padrao: form.hero_imagem_url_padrao || null,
        hero_titulo_linha_1_padrao: form.hero_titulo_linha_1_padrao || null,
        hero_titulo_linha_2_padrao: form.hero_titulo_linha_2_padrao || null,
        hero_titulo_linha_3_padrao: form.hero_titulo_linha_3_padrao || null,
        hero_subtitulo_linha_1_padrao: form.hero_subtitulo_linha_1_padrao || null,
        hero_subtitulo_linha_2_padrao: form.hero_subtitulo_linha_2_padrao || null,
        hero_titulo_linha_2_estilo_padrao: form.hero_titulo_linha_2_estilo_padrao || 'gradiente',
        lp_meta_pixel_id: form.lp_meta_pixel_id || null,
        lp_ga4_measurement_id: form.lp_ga4_measurement_id || null,
        lp_google_tag_manager_id: form.lp_google_tag_manager_id || null,
        lp_google_ads_id: form.lp_google_ads_id || null,
        lp_google_ads_conversion_label: form.lp_google_ads_conversion_label || null,
        lp_meta_conversions_api_enabled: form.lp_meta_conversions_api_enabled,
        lp_google_ads_enhanced_conversions_enabled: form.lp_google_ads_enhanced_conversions_enabled,
      }

      // Salva pela API admin.
      // A API decide se atualiza a config existente ou cria uma nova.
      const resposta = await adminApiFetch('/api/admin/configuracoes', {
        method: 'POST',
        body: {
          configId,
          config: payload,
        },
      })

      if (resposta.config?.id) {
        setConfigId(resposta.config.id)
      }

      setSalvo(true)
      setTimeout(() => setSalvo(false), 3000)
    } catch (error) {
      console.error('Erro ao salvar configurações:', error)
      alert(`Erro ao salvar configurações: ${error.message || 'erro desconhecido'}`)
    } finally {
      setSalvando(false)
    }
  }

  // Upload seguro da imagem do Hero usando URL assinada.
  // O navegador não faz upload público direto; ele pede autorização temporária à API admin.
  async function uploadHeroImagePadrao(file) {
    if (!file) return

    try {
      setUploadingHeroImage(true)

      if (!canUpdate) {
  alert('Você não tem permissão para alterar configurações.')
  return
}

const uploadInfo = await adminApiFetch('/api/admin/configuracoes/upload-hero-url', {
  method: 'POST',
  body: {
    filename: file.name,
    contentType: file.type,
    sizeBytes: file.size,
  },
})

      const { error: uploadError } = await supabase.storage
        .from(HERO_IMAGE_BUCKET)
        .uploadToSignedUrl(uploadInfo.path, uploadInfo.token, file, {
          contentType: file.type || undefined,
          upsert: false,
        })

      if (uploadError) {
        throw uploadError
      }

      setForm((prev) => ({
        ...prev,
        hero_imagem_url_padrao: uploadInfo.publicUrl,
      }))
    } catch (error) {
      console.error('Erro ao enviar imagem do hero:', error)
      alert(`Erro ao enviar imagem: ${error.message || 'erro desconhecido'}`)
    } finally {
      setUploadingHeroImage(false)
    }
  }

  async function alterarSenha() {
    setErroSenha('')
    setSenhaOk(false)

    if (novaSenha.length < 6) {
      setErroSenha('A nova senha deve ter pelo menos 6 caracteres.')
      return
    }

    if (novaSenha !== confirmarSenha) {
      setErroSenha('As senhas não coincidem.')
      return
    }

    setSalvandoSenha(true)

    const { error } = await supabase.auth.updateUser({ password: novaSenha })

    setSalvandoSenha(false)

    if (error) {
      setErroSenha('Erro ao alterar senha. Tente novamente.')
    } else {
      setSenhaOk(true)
      setNovaSenha('')
      setConfirmarSenha('')
      setTimeout(() => setSenhaOk(false), 3000)
    }
  }

  if (carregando) {
    return (
      <div className="flex-1 flex items-center justify-center py-32">
        <div className="relative w-16 h-16 flex items-center justify-center">
          <div className="absolute inset-0 border-t-2 border-[#6be12f]/50 rounded-full animate-spin"></div>
          <Save className="text-[#6be12f] animate-pulse" size={24} />
        </div>
      </div>
    )
  }

  return (
    <main className="flex-1 p-4 sm:p-6 md:p-8 overflow-y-auto custom-scrollbar relative z-10 animate-fade-in-up">
      <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-[#6be12f]/5 rounded-full blur-[120px] pointer-events-none z-0"></div>

      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-10 relative z-10">
        <div>
          <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-neutral-500 tracking-tight">
            Configurações
          </h1>
          <p className="text-sm text-neutral-500 mt-2 font-medium">
            Gerencie preferências, tempos do portal e preços padrão
          </p>
          {!canUpdate && (
  <div className="mt-4 inline-flex items-center gap-2 bg-white/[0.03] border border-white/[0.06] rounded-2xl px-4 py-2 text-xs font-bold text-neutral-400">
    <Lock size={14} className="text-neutral-500" />
    Modo leitura: você pode visualizar, mas não alterar configurações.
  </div>
)}
        </div>

        {abaAtiva !== 'seguranca' && canUpdate && (
          <button
            onClick={salvarConfiguracoes}
            disabled={salvando}
            className="w-full sm:w-auto bg-[#6be12f] hover:bg-[#8cf059] disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold px-8 py-4 rounded-2xl transition-all duration-300 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(34,197,94,0.2)] hover:shadow-[0_0_30px_rgba(34,197,94,0.4)] hover:-translate-y-1"
          >
            {salvando ? (
              <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
            ) : salvo ? (
              <>
                <Check size={18} strokeWidth={2.5} /> Salvo com sucesso!
              </>
            ) : (
              <>
                <Save size={18} strokeWidth={2.5} /> Salvar Alterações
              </>
            )}
          </button>
        )}
      </header>

      <div className="bg-[#0a0a0a] border border-white/[0.05] rounded-[2.5rem] overflow-hidden flex flex-col md:flex-row shadow-[0_20px_40px_rgba(0,0,0,0.5)] backdrop-blur-xl relative z-10">
        <div className="w-full md:w-80 flex-shrink-0 bg-white/[0.01] border-b md:border-b-0 md:border-r border-white/[0.05] p-6 space-y-3">
          {abas.map((aba) => {
            const Icon = aba.icon
            const ativo = abaAtiva === aba.id

            return (
              <button
                key={aba.id}
                onClick={() => setAbaAtiva(aba.id)}
                className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-left transition-all duration-300 group ${
                  ativo
                    ? 'bg-white/[0.05] border border-white/[0.05] shadow-sm'
                    : 'hover:bg-white/[0.02] border border-transparent'
                }`}
              >
                <div
                  className={`p-3 rounded-xl transition-colors duration-300 ${
                    ativo
                      ? 'bg-[#6be12f]/10 text-[#6be12f] border border-[#6be12f]/20 shadow-inner'
                      : 'bg-[#050505] text-neutral-500 border border-white/[0.05] group-hover:text-neutral-300 shadow-inner'
                  }`}
                >
                  <Icon size={20} />
                </div>
                <div>
                  <p
                    className={`text-sm font-bold tracking-wide ${
                      ativo ? 'text-white' : 'text-neutral-500 group-hover:text-neutral-300'
                    }`}
                  >
                    {aba.label}
                  </p>
                  <p className="text-xs text-neutral-600 mt-1 font-medium">{aba.desc}</p>
                </div>
              </button>
            )
          })}
        </div>

        <div className="flex-1 p-8 sm:p-12">
          {abaAtiva === 'empresa' && (
            <div className="space-y-8 max-w-3xl animate-fade-in-up">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">Dados da Empresa</h2>
                <p className="text-sm text-neutral-500 font-medium">
                  Informações comerciais que aparecerão nos relatórios e rodapés.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-neutral-500 mb-3 uppercase tracking-widest">
                    Nome da Empresa
                  </label>
                  <input
                    type="text"
                    value={form.nome_empresa}
                    onChange={(e) => setForm({ ...form, nome_empresa: e.target.value })}
                    className="w-full bg-[#050505] border border-white/[0.05] rounded-2xl px-5 py-4 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#6be12f]/30 focus:border-[#6be12f]/30 transition-all shadow-inner"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-500 mb-3 uppercase tracking-widest">
                    CNPJ
                  </label>
                  <input
                    type="text"
                    value={form.cnpj}
                    onChange={(e) => setForm({ ...form, cnpj: e.target.value })}
                    className="w-full bg-[#050505] border border-white/[0.05] rounded-2xl px-5 py-4 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#6be12f]/30 focus:border-[#6be12f]/30 transition-all shadow-inner"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-500 mb-3 uppercase tracking-widest">
                    Telefone de Contato
                  </label>
                  <input
                    type="text"
                    value={form.telefone_contato}
                    onChange={(e) => setForm({ ...form, telefone_contato: e.target.value })}
                    className="w-full bg-[#050505] border border-white/[0.05] rounded-2xl px-5 py-4 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#6be12f]/30 focus:border-[#6be12f]/30 transition-all shadow-inner"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-neutral-500 mb-3 uppercase tracking-widest">
                    E-mail de Contato
                  </label>
                  <input
                    type="email"
                    value={form.email_contato}
                    onChange={(e) => setForm({ ...form, email_contato: e.target.value })}
                    className="w-full bg-[#050505] border border-white/[0.05] rounded-2xl px-5 py-4 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#6be12f]/30 focus:border-[#6be12f]/30 transition-all shadow-inner"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-neutral-500 mb-3 uppercase tracking-widest">
                    Endereço Completo
                  </label>
                  <input
                    type="text"
                    value={form.endereco}
                    onChange={(e) => setForm({ ...form, endereco: e.target.value })}
                    className="w-full bg-[#050505] border border-white/[0.05] rounded-2xl px-5 py-4 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#6be12f]/30 focus:border-[#6be12f]/30 transition-all shadow-inner"
                  />
                </div>
              </div>
            </div>
          )}

          {abaAtiva === 'portal' && (
            <div className="space-y-8 max-w-5xl animate-fade-in-up">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">Portal Wi-Fi e Ofertas</h2>
                <p className="text-sm text-neutral-500 font-medium">
                  Edite aparência, tempos do portal e preços padrão da landing.
                </p>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-bold text-neutral-500 mb-3 uppercase tracking-widest">
                    Título do Portal
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Wi-Fi Grátis - Minha Empresa"
                    value={form.titulo_portal}
                    onChange={(e) => setForm({ ...form, titulo_portal: e.target.value })}
                    className="w-full bg-[#050505] border border-white/[0.05] rounded-2xl px-5 py-4 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#6be12f]/30 focus:border-[#6be12f]/30 transition-all shadow-inner"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-500 mb-3 uppercase tracking-widest">
                    Texto de Boas-vindas
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Ex: Cadastre-se para acessar a internet gratuitamente."
                    value={form.texto_boas_vindas}
                    onChange={(e) => setForm({ ...form, texto_boas_vindas: e.target.value })}
                    className="w-full bg-[#050505] border border-white/[0.05] rounded-2xl px-5 py-4 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#6be12f]/30 focus:border-[#6be12f]/30 transition-all resize-none shadow-inner"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-500 mb-3 uppercase tracking-widest">
                    Cor Principal (Botões e Destaques)
                  </label>
                  <div className="flex items-center gap-5">
                    <div className="relative w-14 h-14 rounded-2xl overflow-hidden border border-white/[0.1] shadow-inner flex-shrink-0 bg-[#050505]">
                      <input
                        type="color"
                        value={form.cor_principal}
                        onChange={(e) => setForm({ ...form, cor_principal: e.target.value })}
                        className="absolute -top-4 -left-4 w-24 h-24 cursor-pointer"
                      />
                    </div>
                    <input
                      type="text"
                      value={form.cor_principal}
                      onChange={(e) => setForm({ ...form, cor_principal: e.target.value })}
                      className="w-36 bg-[#050505] border border-white/[0.05] rounded-2xl px-5 py-4 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#6be12f]/30 focus:border-[#6be12f]/30 transition-all uppercase shadow-inner font-mono"
                    />
                  </div>
                </div>
              </div>

              {/*Adiçao de imagem*/}
              <div className="pt-4 border-t border-white/[0.05]">
  <h3 className="text-lg font-bold text-white mb-6 tracking-tight">Imagem lateral do Hero</h3>

  <div className="rounded-[2rem] border border-white/[0.05] bg-[#050505] p-6 shadow-inner">
    <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-6 items-start">
      <div className="rounded-3xl border border-white/[0.08] bg-[#0a0a0a] p-4 flex items-center justify-center min-h-[260px]">
        <img
          src={form.hero_imagem_url_padrao || '/mockup-celular.png'}
          alt="Preview Hero"
          className="w-full max-w-[180px] h-auto object-contain drop-shadow-2xl"
        />
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-neutral-500 mb-3 uppercase tracking-widest">
            URL da imagem
          </label>
          <input
            type="text"
            value={form.hero_imagem_url_padrao}
            onChange={(e) => setForm({ ...form, hero_imagem_url_padrao: e.target.value })}
            className="w-full bg-[#0a0a0a] border border-white/[0.05] rounded-2xl px-5 py-4 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#6be12f]/30 focus:border-[#6be12f]/30 transition-all"
            placeholder="https://..."
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <label className="inline-flex items-center justify-center px-5 py-4 rounded-2xl bg-[#6be12f] text-black font-bold cursor-pointer hover:bg-[#8cf059] transition-all">
            {uploadingHeroImage ? 'Enviando imagem...' : 'Enviar nova imagem'}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) uploadHeroImagePadrao(file)
              }}
            />
          </label>

          <button
            type="button"
            onClick={() => setForm({ ...form, hero_imagem_url_padrao: '' })}
            className="px-5 py-4 rounded-2xl border border-white/[0.08] text-white font-bold hover:bg-white/[0.03] transition-all"
          >
            Remover imagem customizada
          </button>
        </div>

        <p className="text-sm text-neutral-500 leading-relaxed">
          Essa é a imagem lateral da landing principal. No próximo CRUD de cidades, cada cidade também poderá ter a própria imagem.
        </p>
      </div>
    </div>
  </div>
</div>

{/*Responsável por criar a seleção do estilo do titulo*/}

<div className="pt-4 border-t border-white/[0.05]">
  <h3 className="text-lg font-bold text-white mb-6 tracking-tight">
    Título e subtítulo do Hero
  </h3>

  <div className="grid grid-cols-1 gap-4">
    <input
      type="text"
      value={form.hero_titulo_linha_1_padrao}
      onChange={(e) => setForm({ ...form, hero_titulo_linha_1_padrao: e.target.value })}
      className="w-full bg-[#0a0a0a] border border-white/[0.05] rounded-2xl px-5 py-4 text-sm text-white"
      placeholder="Título 01 - branco"
    />

    <input
      type="text"
      value={form.hero_titulo_linha_2_padrao}
      onChange={(e) => setForm({ ...form, hero_titulo_linha_2_padrao: e.target.value })}
      className="w-full bg-[#0a0a0a] border border-white/[0.05] rounded-2xl px-5 py-4 text-sm text-white"
      placeholder="Título 02"
    />


<div>
  <label className="block text-[11px] font-bold text-neutral-500 mb-2 uppercase tracking-widest">
    Estilo do Título 02
  </label>

  <select
    value={form.hero_titulo_linha_2_estilo_padrao}
    onChange={(e) =>
      setForm({ ...form, hero_titulo_linha_2_estilo_padrao: e.target.value })
    }
   className="w-full bg-[#0a0a0a] border border-white/[0.05] rounded-2xl px-5 py-4 text-sm text-white"
  >
    <option value="gradiente">Verde com gradiente</option>
    <option value="faixa">Texto preto com faixa verde</option>
  </select>
</div>


    <input
      type="text"
      value={form.hero_titulo_linha_3_padrao}
      onChange={(e) => setForm({ ...form, hero_titulo_linha_3_padrao: e.target.value })}
      className="w-full bg-[#0a0a0a] border border-white/[0.05] rounded-2xl px-5 py-4 text-sm text-white"
      placeholder="Título 03 - branco"
    />

    <textarea
      rows={3}
      value={form.hero_subtitulo_linha_1_padrao}
      onChange={(e) => setForm({ ...form, hero_subtitulo_linha_1_padrao: e.target.value })}
      className="w-full bg-[#0a0a0a] border border-white/[0.05] rounded-2xl px-5 py-4 text-sm text-white resize-none"
      placeholder="Subtítulo 01 - branco sólido"
    />

    <textarea
      rows={3}
      value={form.hero_subtitulo_linha_2_padrao}
      onChange={(e) => setForm({ ...form, hero_subtitulo_linha_2_padrao: e.target.value })}
      className="w-full bg-[#0a0a0a] border border-white/[0.05] rounded-2xl px-5 py-4 text-sm text-white resize-none"
      placeholder="Subtítulo 02 - branco com transparência"
    />
  </div>
</div>


              <div className="pt-4 border-t border-white/[0.05]">
                <h3 className="text-lg font-bold text-white mb-2 tracking-tight">
                  Integrações da LP nativa
                </h3>
                <p className="text-sm text-neutral-500 mb-6">
                  IDs públicos usados em www.nexawi.com.br para campanhas de Meta, Google Ads, GA4 e GTM.
                </p>

                <TrackingStatusCards form={form} />

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-neutral-500 mb-2 uppercase tracking-widest">
                      Meta Pixel ID
                    </label>
                    <input
                      type="text"
                      value={form.lp_meta_pixel_id}
                      onChange={(e) => setForm({ ...form, lp_meta_pixel_id: e.target.value.replace(/\D/g, '') })}
                      className="w-full bg-[#0a0a0a] border border-white/[0.05] rounded-2xl px-5 py-4 text-sm text-white"
                      placeholder="Ex: 123456789012345"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-neutral-500 mb-2 uppercase tracking-widest">
                      GA4 Measurement ID
                    </label>
                    <input
                      type="text"
                      value={form.lp_ga4_measurement_id}
                      onChange={(e) => setForm({ ...form, lp_ga4_measurement_id: e.target.value.toUpperCase() })}
                      className="w-full bg-[#0a0a0a] border border-white/[0.05] rounded-2xl px-5 py-4 text-sm text-white"
                      placeholder="Ex: G-XXXXXXXXXX"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-neutral-500 mb-2 uppercase tracking-widest">
                      Google Tag Manager ID
                    </label>
                    <input
                      type="text"
                      value={form.lp_google_tag_manager_id}
                      onChange={(e) => setForm({ ...form, lp_google_tag_manager_id: e.target.value.toUpperCase() })}
                      className="w-full bg-[#0a0a0a] border border-white/[0.05] rounded-2xl px-5 py-4 text-sm text-white"
                      placeholder="Ex: GTM-XXXXXXX"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-neutral-500 mb-2 uppercase tracking-widest">
                      Google Ads ID
                    </label>
                    <input
                      type="text"
                      value={form.lp_google_ads_id}
                      onChange={(e) => setForm({ ...form, lp_google_ads_id: e.target.value.toUpperCase() })}
                      className="w-full bg-[#0a0a0a] border border-white/[0.05] rounded-2xl px-5 py-4 text-sm text-white"
                      placeholder="Ex: AW-123456789"
                    />
                  </div>

                  <div className="xl:col-span-2">
                    <label className="block text-[11px] font-bold text-neutral-500 mb-2 uppercase tracking-widest">
                      Google Ads Conversion Label
                    </label>
                    <input
                      type="text"
                      value={form.lp_google_ads_conversion_label}
                      onChange={(e) => setForm({ ...form, lp_google_ads_conversion_label: e.target.value })}
                      className="w-full bg-[#0a0a0a] border border-white/[0.05] rounded-2xl px-5 py-4 text-sm text-white"
                      placeholder="Label da conversão de clique/lead"
                    />
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-1 xl:grid-cols-2 gap-4">
                  <label className="flex items-center justify-between gap-4 rounded-2xl border border-white/[0.05] bg-[#050505] p-5 cursor-pointer">
                    <span>
                      <span className="block text-sm font-bold text-white">Preparar Meta Conversions API</span>
                      <span className="block text-xs text-neutral-500 mt-1">Flag operacional; token server-side será configurado em etapa segura.</span>
                    </span>
                    <input
                      type="checkbox"
                      checked={form.lp_meta_conversions_api_enabled}
                      onChange={(e) => setForm({ ...form, lp_meta_conversions_api_enabled: e.target.checked })}
                      className="h-4 w-4 accent-[#6be12f]"
                    />
                  </label>

                  <label className="flex items-center justify-between gap-4 rounded-2xl border border-white/[0.05] bg-[#050505] p-5 cursor-pointer">
                    <span>
                      <span className="block text-sm font-bold text-white">Preparar Enhanced Conversions</span>
                      <span className="block text-xs text-neutral-500 mt-1">Flag operacional para Google Ads server-side futuro.</span>
                    </span>
                    <input
                      type="checkbox"
                      checked={form.lp_google_ads_enhanced_conversions_enabled}
                      onChange={(e) => setForm({ ...form, lp_google_ads_enhanced_conversions_enabled: e.target.checked })}
                      className="h-4 w-4 accent-[#6be12f]"
                    />
                  </label>
                </div>
              </div>


              <div className="pt-4 border-t border-white/[0.05]">
                <h3 className="text-lg font-bold text-white mb-6 tracking-tight">Tempos do Portal</h3>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                  <InputTempo
                    label="Tempo de acesso à internet"
                    prefix="portal_tempo_acesso"
                    form={form}
                    setForm={setForm}
                  />
                  <InputTempo
                    label="Tempo de bloqueio / cooldown"
                    prefix="portal_tempo_bloqueio"
                    form={form}
                    setForm={setForm}
                  />
                  <InputTempo
                    label="Intervalo para novo anúncio"
                    prefix="portal_intervalo_anuncio"
                    form={form}
                    setForm={setForm}
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-white/[0.05]">
                <h3 className="text-lg font-bold text-white mb-6 tracking-tight">Preços Padrão da Landing</h3>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                  <InputPreco
                    label="Plano Básico"
                    mensalKey="preco_basico_mensal_padrao"
                    anualKey="preco_basico_anual_padrao"
                    form={form}
                    setForm={setForm}
                  />
                  <InputPreco
                    label="Plano Comercial"
                    mensalKey="preco_comercial_mensal_padrao"
                    anualKey="preco_comercial_anual_padrao"
                    form={form}
                    setForm={setForm}
                  />
                  <InputPreco
                    label="Plano VIP / Exclusividade"
                    mensalKey="preco_vip_mensal_padrao"
                    anualKey="preco_vip_anual_padrao"
                    form={form}
                    setForm={setForm}
                  />
                </div>
              </div>


              <div className="pt-4 border-t border-white/[0.05]">
  <h3 className="text-lg font-bold text-white mb-6 tracking-tight">Preço Âncora</h3>

  <div
    onClick={() =>
      setForm({ ...form, mostrar_preco_ancora_padrao: !form.mostrar_preco_ancora_padrao })
    }
    className="flex items-center justify-between p-6 bg-[#050505] border border-white/[0.05] rounded-2xl cursor-pointer hover:border-white/[0.1] transition-all shadow-inner group mb-6"
  >
    <div>
      <p className="text-base font-bold text-white group-hover:text-[#8cf059] transition-colors tracking-tight">
        Exibir preço âncora na landing
      </p>
      <p className="text-sm text-neutral-500 mt-1 font-medium">
        Ative para mostrar o preço riscado acima do valor principal
      </p>
    </div>

    <div
      className={`w-14 h-7 rounded-full transition-colors duration-300 relative shadow-inner ${
        form.mostrar_preco_ancora_padrao ? 'bg-[#6be12f]' : 'bg-neutral-800'
      }`}
    >
      <div
        className={`w-5 h-5 bg-white rounded-full absolute top-1 transition-all duration-300 shadow-md ${
          form.mostrar_preco_ancora_padrao ? 'left-8' : 'left-1'
        }`}
      />
    </div>
  </div>

  <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
    <InputPreco
      label="Âncora Plano Básico"
      mensalKey="preco_ancora_basico_mensal_padrao"
      anualKey="preco_ancora_basico_anual_padrao"
      form={form}
      setForm={setForm}
    />
    <InputPreco
      label="Âncora Plano Comercial"
      mensalKey="preco_ancora_comercial_mensal_padrao"
      anualKey="preco_ancora_comercial_anual_padrao"
      form={form}
      setForm={setForm}
    />
    <InputPreco
      label="Âncora Plano VIP / Exclusividade"
      mensalKey="preco_ancora_vip_mensal_padrao"
      anualKey="preco_ancora_vip_anual_padrao"
      form={form}
      setForm={setForm}
    />
  </div>
</div>



            </div>
          )}

          {abaAtiva === 'lgpd' && (
            <div className="space-y-8 max-w-4xl flex flex-col h-full animate-fade-in-up">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">Termos de Uso e LGPD</h2>
                <p className="text-sm text-neutral-500 font-medium">
                  Defina o texto legal que os usuários precisam aceitar para usar a rede.
                </p>
              </div>

              <div className="flex-1 flex flex-col">
                <label className="block text-xs font-bold text-neutral-500 mb-3 uppercase tracking-widest">
                  Texto Completo dos Termos
                </label>
                <textarea
                  value={form.texto_lgpd}
                  onChange={(e) => setForm({ ...form, texto_lgpd: e.target.value })}
                  className="w-full flex-1 min-h-[400px] bg-[#050505] border border-white/[0.05] rounded-2xl px-6 py-6 text-sm text-neutral-300 focus:outline-none focus:ring-1 focus:ring-[#6be12f]/30 focus:border-[#6be12f]/30 transition-all resize-none custom-scrollbar leading-relaxed shadow-inner"
                  placeholder="Insira aqui os termos de uso, política de privacidade e adequação à LGPD..."
                />
              </div>
            </div>
          )}

          {abaAtiva === 'notificacoes' && (
            <div className="space-y-8 max-w-3xl animate-fade-in-up">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">Alertas e Notificações</h2>
                <p className="text-sm text-neutral-500 font-medium">
                  Configure como e quando você deseja ser avisado pelo sistema.
                </p>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-bold text-neutral-500 mb-3 uppercase tracking-widest">
                    E-mail para Receber Alertas
                  </label>
                  <input
                    type="email"
                    placeholder="seu@email.com"
                    value={form.email_notificacoes}
                    onChange={(e) => setForm({ ...form, email_notificacoes: e.target.value })}
                    className="w-full bg-[#050505] border border-white/[0.05] rounded-2xl px-5 py-4 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#6be12f]/30 focus:border-[#6be12f]/30 transition-all shadow-inner"
                  />
                </div>

                <div className="pt-4 space-y-4">
                  <div
                    onClick={() =>
                      setForm({ ...form, notificar_novos_leads: !form.notificar_novos_leads })
                    }
                    className="flex items-center justify-between p-6 bg-[#050505] border border-white/[0.05] rounded-2xl cursor-pointer hover:border-white/[0.1] transition-all shadow-inner group"
                  >
                    <div>
                      <p className="text-base font-bold text-white group-hover:text-[#8cf059] transition-colors tracking-tight">
                        Novos leads capturados
                      </p>
                      <p className="text-sm text-neutral-500 mt-1 font-medium">
                        Receber um resumo diário de novos cadastros na rede
                      </p>
                    </div>
                    <div
                      className={`w-14 h-7 rounded-full transition-colors duration-300 relative shadow-inner ${
                        form.notificar_novos_leads ? 'bg-[#6be12f]' : 'bg-neutral-800'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 bg-white rounded-full absolute top-1 transition-all duration-300 shadow-md ${
                          form.notificar_novos_leads ? 'left-8' : 'left-1'
                        }`}
                      />
                    </div>
                  </div>

                  <div
                    onClick={() =>
                      setForm({ ...form, notificar_relatorios: !form.notificar_relatorios })
                    }
                    className="flex items-center justify-between p-6 bg-[#050505] border border-white/[0.05] rounded-2xl cursor-pointer hover:border-white/[0.1] transition-all shadow-inner group"
                  >
                    <div>
                      <p className="text-base font-bold text-white group-hover:text-[#8cf059] transition-colors tracking-tight">
                        Relatórios automáticos
                      </p>
                      <p className="text-sm text-neutral-500 mt-1 font-medium">
                        Receber relatórios de desempenho conforme o intervalo do plano
                      </p>
                    </div>
                    <div
                      className={`w-14 h-7 rounded-full transition-colors duration-300 relative shadow-inner ${
                        form.notificar_relatorios ? 'bg-[#6be12f]' : 'bg-neutral-800'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 bg-white rounded-full absolute top-1 transition-all duration-300 shadow-md ${
                          form.notificar_relatorios ? 'left-8' : 'left-1'
                        }`}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {abaAtiva === 'seguranca' && (
            <div className="space-y-8 max-w-md animate-fade-in-up">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">Segurança da Conta</h2>
                <p className="text-sm text-neutral-500 font-medium">
                  Atualize sua senha de acesso ao painel administrativo.
                </p>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-bold text-neutral-500 mb-3 uppercase tracking-widest">
                    Nova senha
                  </label>
                  <input
                    type="password"
                    placeholder="Mínimo 6 caracteres"
                    value={novaSenha}
                    onChange={(e) => setNovaSenha(e.target.value)}
                    className="w-full bg-[#050505] border border-white/[0.05] rounded-2xl px-5 py-4 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#6be12f]/30 focus:border-[#6be12f]/30 transition-all shadow-inner"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-500 mb-3 uppercase tracking-widest">
                    Confirmar nova senha
                  </label>
                  <input
                    type="password"
                    placeholder="Repita a nova senha"
                    value={confirmarSenha}
                    onChange={(e) => setConfirmarSenha(e.target.value)}
                    className="w-full bg-[#050505] border border-white/[0.05] rounded-2xl px-5 py-4 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#6be12f]/30 focus:border-[#6be12f]/30 transition-all shadow-inner"
                  />
                </div>

                {erroSenha && (
                  <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl">
                    <p className="text-sm font-bold text-red-400 text-center">{erroSenha}</p>
                  </div>
                )}

                {senhaOk && (
                  <div className="p-4 bg-[#6be12f]/10 border border-[#6be12f]/20 rounded-2xl">
                    <p className="text-sm font-bold text-[#8cf059] text-center">
                      Senha alterada com sucesso!
                    </p>
                  </div>
                )}

                <button
                  onClick={alterarSenha}
                  disabled={salvandoSenha || !novaSenha || !confirmarSenha}
                  className="w-full bg-white/[0.02] hover:bg-white/[0.05] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-2xl transition-all duration-300 flex items-center justify-center gap-2 mt-4 border border-white/[0.05] hover:border-white/[0.1] shadow-inner"
                >
                  {salvandoSenha ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Lock size={18} /> Atualizar Senha
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }

        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .animate-fade-in-up {
          animation: fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          opacity: 0;
        }
      `,
        }}
      />
    </main>
  )
}
