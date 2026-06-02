'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import {
  User,
  Mail,
  Smartphone,
  FileText,
  ShieldCheck,
  Wifi,
  Loader2,
  ArrowRight,
  CheckCircle2,
  Clock,
  X,
  Shield,
} from 'lucide-react'
import { controlApiFetch } from '@/lib/control-api-client'


const ETAPAS = {
  LOADING: 'loading',
  CPF_RAPIDO: 'cpf_rapido',
  CADASTRO: 'cadastro',
  ANUNCIO: 'anuncio',
  CTA: 'cta',
  ABRIR_CLIENTE: 'abrir_cliente',
  ACESSO: 'acesso',
  BLOQUEADO: 'bloqueado',
  ERRO: 'erro',
}

function normalizeMac(value = '') {
  return String(value || '')
    .trim()
    .toUpperCase()
    .replace(/-/g, ':')
}


function extrairLpSlug(value = '') {
  const raw = String(value || '').trim()

  if (!raw) return ''

  try {
    const url = raw.startsWith('http://') || raw.startsWith('https://') ? new URL(raw)
      : new URL(raw, 'https://www.nexawi.com.br')

    const partes = url.pathname.split('/').filter(Boolean)
    const lpIndex = partes.indexOf('lp')

    if (lpIndex >= 0 && partes[lpIndex + 1]) {
      return decodeURIComponent(partes[lpIndex + 1])
    }
  } catch {}

  return raw
    .replace(/^https?:\/\/[^/]+/i, '')
    .replace(/^\/lp\//i, '')
    .replace(/^\//, '')
    .split('?')[0]
    .trim()
}

function salvarAutorizacaoPendenteLp(payload = {}) {
  if (typeof window === 'undefined') return

  try {
    window.sessionStorage.setItem('nexawi_pending_auth', JSON.stringify({
      ...payload,
      createdAt: Date.now(),
      expiresAt: Date.now() + 5 * 60 * 1000,
    }))
  } catch {}
}

function montarUrlLpInterna(anuncio = {}, contexto = {}) {
  const caminhoInterno = String(anuncio.lp_slug || '').trim()
  const base = typeof window !== 'undefined' ? window.location.origin : 'https://www.nexawi.com.br'

  if (!caminhoInterno.startsWith('/') || caminhoInterno.startsWith('//') || caminhoInterno.includes('\\\\')) {
    return ''
  }

  let destino

  try {
    destino = new URL(caminhoInterno, base)

    if (destino.origin !== base) {
      return ''
    }
  } catch {
    return ''
  }

  const payload = {
    pendingAuth: '1',
    hotspotSlug: contexto.hotspotSlug || '',
    leadId: contexto.leadId || '',
    clientMac: contexto.clientMac || '',
    clientIp: contexto.clientIp || '',
    anuncioId: anuncio.id || '',
    delaySeconds: String(anuncio.tempo_liberacao_lp || 10),
    internalPath: caminhoInterno,
  }

  salvarAutorizacaoPendenteLp(payload)

  Object.entries(payload).forEach(([key, value]) => {
    destino.searchParams.set(key, String(value || ''))
  })

  return destino.toString()
}

function montarUrlSiteNexawi(anuncio = {}, contexto = {}) {
  const base = typeof window !== 'undefined' ? window.location.origin : 'https://www.nexawi.com.br'
  const destino = new URL('/', base)

  const payload = {
    pendingAuth: '1',
    hotspotSlug: contexto.hotspotSlug || '',
    leadId: contexto.leadId || '',
    clientMac: contexto.clientMac || '',
    clientIp: contexto.clientIp || '',
    anuncioId: anuncio.id || '',
    delaySeconds: String(anuncio.tempo_liberacao_lp || 10),
    internalPath: '/',
  }

  salvarAutorizacaoPendenteLp(payload)

  Object.entries(payload).forEach(([key, value]) => {
    destino.searchParams.set(key, String(value || ''))
  })

  return destino.toString()
}

function normalizarUrlDestino(url = '') {
  const valor = String(url || '').trim()

  if (!valor) return ''

  if (
    valor.startsWith('http://') ||
    valor.startsWith('https://') ||
    valor.startsWith('mailto:') ||
    valor.startsWith('tel:')
  ) {
    return valor
  }

  if (valor.startsWith('wa.me/') || valor.startsWith('api.whatsapp.com/')) {
    return `https://${valor}`
  }

  const somenteNumeros = valor.replace(/\D/g, '')

  if (/^\d{10,15}$/.test(somenteNumeros)) {
    const telefoneComPais = somenteNumeros.startsWith('55') ? somenteNumeros
      : `55${somenteNumeros}`

    return `https://wa.me/${telefoneComPais}`
  }

  return `https://${valor}`
}


// Chamada padrão para as APIs seguras do portal.
// Assim o componente público não acessa mais tabelas sensíveis direto no Supabase.
async function portalApiFetch(path, payload = {}) {
  const response = await fetch(path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
    body: JSON.stringify(payload),
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error || `Falha na API ${path}`)
  }

  return data
}


function gerarStringAleatoria(tamanho = 24) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  const bytes = new Uint32Array(tamanho)
  window.crypto.getRandomValues(bytes)

  let resultado = ''
  for (let i = 0; i < tamanho; i++) {
    resultado += chars[bytes[i] % chars.length]
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

function AvisoAcessoPorInatividade() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-[#6be12f]/20 bg-[#0a0a0a] px-4 py-4 mt-6">
      <div className="absolute inset-0 bg-gradient-to-r from-[#6be12f]/[0.06] via-transparent to-[#6be12f]/[0.04] pointer-events-none" />

      <div className="relative flex items-start gap-3">
        <div className="mt-0.5 flex-shrink-0">
          <div className="relative w-3 h-3">
            <div className="absolute inset-0 rounded-full bg-[#6be12f] animate-ping opacity-40" />
            <div className="relative w-3 h-3 rounded-full bg-[#6be12f] shadow-[0_0_12px_rgba(107,225,47,0.9)]" />
          </div>
        </div>

        <div className="flex-1">
          <p className="text-[11px] uppercase tracking-[0.22em] text-[#6be12f] font-bold mb-2">
            Acesso liberado após o anúncio
          </p>

          <p className="text-sm text-gray-300 leading-relaxed">
            <br />
            Caso fique sem internet após um período parado, basta desligar e ligar o Wi-Fi e entrar novamente.
          </p>
        </div>
      </div>
    </div>
  )
}

export default function Portal() {
  const { slug } = useParams()
  const searchParams = useSearchParams()

  const macParam = normalizeMac(searchParams.get('mac') || '')
  const [etapa, setEtapa] = useState(ETAPAS.LOADING)
  const [hotspot, setHotspot] = useState(null)
  const [leadRapido, setLeadRapido] = useState(null)
  const [anuncioAtual, setAnuncioAtual] = useState(null)
  const [anuncios, setAnuncios] = useState([])
  const [anunciosExibidos, setAnunciosExibidos] = useState([])
  const [contador, setContador] = useState(0)
  const [salvando, setSalvando] = useState(false)
  const [salvandoCpfRapido, setSalvandoCpfRapido] = useState(false)
  const [leadId, setLeadId] = useState(null)
  const [ipAddress, setIpAddress] = useState('0.0.0.0')
  const [macAddress, setMacAddress] = useState('')
  const [modalAberto, setModalAberto] = useState(null)
  const [cpfRapido, setCpfRapido] = useState('')
  const [erroCpfRapido, setErroCpfRapido] = useState('')
  const [internetLiberadaNaCta, setInternetLiberadaNaCta] = useState(false)
  const [loadingTexto, setLoadingTexto] = useState('Conectando à rede...')
  const [erroDetalhe, setErroDetalhe] = useState('')
  const [urlCliente, setUrlCliente] = useState('')
  const [linkCopiado, setLinkCopiado] = useState(false)
  const [copiandoLink, setCopiandoLink] = useState(false)
  const [videoAdStarted, setVideoAdStarted] = useState(false)
  const [videoAdLoading, setVideoAdLoading] = useState(false)
  const [videoAdError, setVideoAdError] = useState('')

  
  const [form, setForm] = useState({
    nome: '',
    email: '',
    telefone: '',
    cpf: '',
    aceite_lgpd: false,
    aceitou_promocoes: false,
  })

  const [erros, setErros] = useState({})
  const intervaloAnuncioRef = useRef(null)
  const leadIdRef = useRef(null)
  const hotspotIdRef = useRef('')
  const sessaoAutorizadaRef = useRef(false)
  const autorizacaoPromiseRef = useRef(null)
  const liberacaoCtaTimerRef = useRef(null)
  const videoAdRef = useRef(null)
  const videoAdBufferingRef = useRef(false)

  const portalRules = hotspot?.portal_rules || {}
  const emailObrigatorio = portalRules.email_obrigatorio !== false
  const cpfVisivel = portalRules.cpf_visivel !== false
  const cpfObrigatorio = portalRules.cpf_obrigatorio !== false
  const promocoesOptinAtivo = Boolean(portalRules.promocoes_optin_ativo)
  const promocoesTexto = portalRules.promocoes_texto || 'Quero receber ofertas, cupons e novidades dos anunciantes parceiros da NexaWi por WhatsApp, SMS ou e-mail.'

  useEffect(() => {
    leadIdRef.current = leadId
  }, [leadId])

  const DEV_CLIENT_MAC = '8A:B7:BF:86:72:4D'
  const DEV_CLIENT_IP = '192.168.88.252'

  const isLocalhost =
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1')

  function getClientMac(customMac = '') {
    return normalizeMac(customMac || macAddress || macParam || (isLocalhost ? DEV_CLIENT_MAC : ''))
  }

  function getClientIp(customIp = '') {
    return String(customIp || ipAddress || (isLocalhost ? DEV_CLIENT_IP : '')).trim()
  }

  function isVideoAd(ad = anuncioAtual) {
    return Boolean(ad?.media_url && ad?.tipo_media === 'video')
  }

  function setVideoBuffering(value) {
    videoAdBufferingRef.current = Boolean(value)
    setVideoAdLoading(Boolean(value))
  }

  async function tentarIniciarVideoAutomatico() {
    const video = videoAdRef.current

    if (!video || !isVideoAd()) return

    setVideoAdError('')
    setVideoBuffering(true)

    try {
      video.muted = false
      video.defaultMuted = false
      video.volume = 1

      const playPromise = video.play()

      if (playPromise && typeof playPromise.then === 'function') {
        await playPromise
      }

      setVideoAdStarted(true)
      setVideoBuffering(false)
    } catch (error) {
      console.warn('Autoplay com áudio bloqueado ou falhou:', error)
      setVideoBuffering(false)
      setVideoAdStarted(false)
      setVideoAdError('O vídeo ainda não iniciou. O tempo está pausado.')
    }
  }

  function falhar(etiqueta, erro = '') {
    const detalhe =
      typeof erro === 'string' ? erro
        : erro?.message || JSON.stringify(erro) || 'Erro desconhecido'

    console.error(etiqueta, erro)
    setErroDetalhe(`${etiqueta}${detalhe ?`: ${detalhe}` : ''}`)
    setEtapa(ETAPAS.ERRO)
  }

  async function carregarHotspotEAnuncios() {
  try {
    const data = await portalApiFetch('/api/portal/bootstrap', {
      slug,
    })

    if (!data.hotspot) {
      falhar('Hotspot não encontrado', `slug recebido: ${slug}`)
      return null
    }

    setHotspot(data.hotspot || null)
    hotspotIdRef.current = data.hotspot?.id || ''
    setAnuncios(data.anuncios || [])

    return data.hotspot
  } catch (error) {
    falhar('Erro ao carregar hotspot', error)
    return null
  }
}

  async function buscarLeadRapidoDoMes(hotspotId, mac) {
  try {
    if (!hotspotId || !mac) return null

    const data = await portalApiFetch('/api/portal/lead/quick', {
      hotspotId,
      macAddress: mac,
    })

    if (!data.found || !data.lead) return null

    return {
      id: data.lead.id,
      nome: data.lead.nome || '',
    }
  } catch (error) {
    console.error('Erro ao buscar lead rápido:', error)
    return null
  }
}

  async function consultarStatusSessao(hotspotSlug, clientMac = '') {
    try {
      const resolvedMac = getClientMac(clientMac)

      if (!hotspotSlug || !resolvedMac) {
        return { state: 'idle', remainingSeconds: 0 }
      }

      const response = await controlApiFetch('/api/control/session/status', {
        method: 'POST',
        body: JSON.stringify({
          hotspotSlug,
          clientMac: resolvedMac,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Falha ao consultar status da sessão')
      }

      return data.status || { state: 'idle', remainingSeconds: 0 }
    } catch (error) {
      throw error
    }
  }

  async function autorizarSessaoNoBackend(explicitLeadId = null) {
    const hotspotSlug = hotspot?.slug || slug
    const resolvedMac = getClientMac()
    const resolvedIp = getClientIp()
    const resolvedLeadId =
      explicitLeadId ||
      leadIdRef.current ||
      leadId ||
      leadRapido?.id ||
      null

    if (!hotspotSlug) {
      throw new Error('Hotspot não carregado')
    }

    if (!resolvedLeadId) {
      throw new Error('leadId não encontrado para autorizar')
    }

    if (!resolvedMac) {
      throw new Error('MAC do cliente não encontrado')
    }

    if (!resolvedIp) {
      throw new Error('IP do cliente não encontrado')
    }

    const response = await controlApiFetch('/api/control/session/authorize', {
      method: 'POST',
      body: JSON.stringify({
        hotspotSlug,
        leadId: resolvedLeadId,
        clientMac: resolvedMac,
        clientIp: resolvedIp,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      if (response.status === 409 && data?.status?.state === 'cooldown') {
        setEtapa(ETAPAS.BLOQUEADO)
        return null
      }

      throw new Error(data.error || 'Falha ao autorizar sessão')
    }

    return data
  }

  async function buscarProximoAnuncioObrigatorio(explicitLeadId = null) {
    const hotspotId = hotspot?.id || hotspotIdRef.current || ''
    const mac = getClientMac()

    if (!hotspotId || !mac) return null

    const data = await portalApiFetch('/api/portal/next-ad', {
      hotspotId,
      macAddress: mac,
      leadId: explicitLeadId || leadIdRef.current || leadId || leadRapido?.id || '',
    })

    return data.anuncio || null
  }

  async function registrarVisualizacao(anuncioId, ip) {
    try {
      await portalApiFetch('/api/portal/view', {
        anuncioId,
        hotspotId: hotspot?.id || hotspotIdRef.current || '',
        ipAddress: ip,
      })
    } catch (error) {
      console.error('Erro ao registrar visualização:', error)
    }
  }

  async function registrarClique(anuncioId, ip, tipoAcao = 'open', urlDestino = '') {
    try {
      await portalApiFetch('/api/portal/click', {
        anuncioId,
        hotspotId: hotspot?.id || hotspotIdRef.current || '',
        ipAddress: ip,
        tipoAcao,
        urlDestino,
      })
    } catch (error) {
      console.error('Erro ao registrar clique:', error)
    }
  }

  const validatePhoneNumber = (phone) => {
    const cleanedPhone = String(phone).replace(/\D/g, '')
    return cleanedPhone.length === 11
  }

  const validateCpf = (cpf) => {
    const cleanedCpf = String(cpf).replace(/\D/g, '')
    const cpfRepeatedDigitsRegex = new RegExp('^(\\d)\\1{10}$')

    if (cleanedCpf.length !== 11 || cpfRepeatedDigitsRegex.test(cleanedCpf)) return false

    let sum = 0
    let remainder

    for (let i = 1; i <= 9; i++) {
      sum += parseInt(cleanedCpf.substring(i - 1, i), 10) * (11 - i)
    }

    remainder = (sum * 10) % 11
    if (remainder === 10 || remainder === 11) remainder = 0
    if (remainder !== parseInt(cleanedCpf.substring(9, 10), 10)) return false

    sum = 0
    for (let i = 1; i <= 10; i++) {
      sum += parseInt(cleanedCpf.substring(i - 1, i), 10) * (12 - i)
    }

    remainder = (sum * 10) % 11
    if (remainder === 10 || remainder === 11) remainder = 0
    if (remainder !== parseInt(cleanedCpf.substring(10, 11), 10)) return false

    return true
  }

  function validarForm() {
    const novosErros = {}

    if (!form.nome.trim()) novosErros.nome = 'Nome obrigat?rio'
    if (emailObrigatorio && !form.email.trim()) {
      novosErros.email = 'E-mail obrigat?rio'
    } else if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      novosErros.email = 'E-mail inv?lido'
    }
    if (!validatePhoneNumber(form.telefone)) novosErros.telefone = 'Telefone inv?lido (11 d?gitos)'
    if (cpfVisivel && cpfObrigatorio && !validateCpf(form.cpf)) novosErros.cpf = 'CPF inv?lido'
    if (!form.aceite_lgpd) novosErros.aceite_lgpd = 'Voc? precisa aceitar os termos'

    setErros(novosErros)
    return Object.keys(novosErros).length === 0
  }
  function autorizarSessaoEmBackground(explicitLeadId = null) {
    const resolvedLeadId =
      explicitLeadId ||
      leadIdRef.current ||
      leadId ||
      leadRapido?.id ||
      null

    if (!resolvedLeadId) return Promise.resolve(null)

    if (sessaoAutorizadaRef.current) return Promise.resolve(null)

    if (autorizacaoPromiseRef.current) {
      return autorizacaoPromiseRef.current
    }

    autorizacaoPromiseRef.current = autorizarSessaoNoBackend(resolvedLeadId)
      .then((result) => {
        sessaoAutorizadaRef.current = true
        setInternetLiberadaNaCta(true)
        return result
      })
      .catch((error) => {
        console.error('Erro ao autorizar sessão em background:', error)
        throw error
      })
      .finally(() => {
        autorizacaoPromiseRef.current = null
      })

    return autorizacaoPromiseRef.current
  }

  async function concluirAnuncioComAutorizacao(explicitLeadId = null) {
    try {
      const resolvedLeadId =
        explicitLeadId ||
        leadIdRef.current ||
        leadId ||
        leadRapido?.id ||
        null

      if (!resolvedLeadId) {
        throw new Error('leadId ausente ao finalizar o anúncio')
      }

      setInternetLiberadaNaCta(true)
      setEtapa(ETAPAS.CTA)
    } catch (error) {
      falhar('Erro ao finalizar anúncio', error)
    }
  }

  async function handleCadastro(e) {
    e.preventDefault()
    if (!validarForm()) return

    setSalvando(true)

    try {
      const telefoneLimpo = String(form.telefone).replace(/\D/g, '')
      const cpfLimpo = String(form.cpf).replace(/\D/g, '')
      const resolvedMac = getClientMac()
      const resolvedIp = getClientIp()
      const { radiusUsername, radiusPassword } = gerarCredenciaisRadius(resolvedMac)

      // Salva o lead por API server-side.
// Assim CPF, telefone, e-mail, MAC e IP não dependem mais de permissão pública na tabela leads.
const data = await portalApiFetch('/api/portal/lead', {
  hotspotId: hotspot.id,
  nome: form.nome,
  email: form.email,
  telefone: telefoneLimpo,
  cpf: cpfLimpo,
  aceiteLgpd: form.aceite_lgpd,
  aceitouPromocoes: form.aceitou_promocoes,
  anuncioId: null,
  macAddress: resolvedMac || null,
  ipAddress: resolvedIp || null,
})

      setLeadId(data.leadId)
leadIdRef.current = data.leadId

      const anuncioSorteado = await buscarProximoAnuncioObrigatorio(data.leadId)

      if (anuncioSorteado) {
        setAnuncioAtual(anuncioSorteado)
        setInternetLiberadaNaCta(false)
        setVideoAdStarted(false)
        setVideoAdLoading(false)
        setVideoAdError('')
        videoAdBufferingRef.current = false
        setEtapa(ETAPAS.ANUNCIO)
        registrarVisualizacao(anuncioSorteado.id, resolvedIp)
      } else {
       const autorizacao = await autorizarSessaoNoBackend(data.leadId)
       if (autorizacao) {
          setEtapa(ETAPAS.ACESSO)
        }
      }
    } catch (error) {
      falhar('Erro ao salvar lead', error)
    } finally {
      setSalvando(false)
    }
  }

    async function handleCpfRapido(e) {
    e.preventDefault()

    // Limpa mensagens antigas antes de validar novamente.
    setErroCpfRapido('')

    // Remove tudo que não for número.
    // Importante: CPF precisa continuar como string para não perder zero à esquerda.
    const cpfLimpo = String(cpfRapido).replace(/\D/g, '')

    // Validação básica feita no navegador só para evitar envio de CPF inválido.
    // A comparação com o CPF salvo no banco acontece somente no servidor.
    if (!validateCpf(cpfLimpo)) {
      setErroCpfRapido('CPF inválido')
      return
    }

    // Se não existe lead rápido encontrado para este MAC/hotspot,
    // não faz sentido tentar validar CPF rápido.
    if (!leadRapido?.id) {
      setErroCpfRapido('Cadastro não encontrado para este dispositivo')
      return
    }

    setSalvandoCpfRapido(true)

    try {
      // Validação segura server-side:
      // O CPF é enviado para a API, comparado no servidor e não fica exposto no front-end.
      const validacao = await portalApiFetch('/api/portal/cpf-rapido', {
        hotspotId: hotspot.id,
        macAddress: getClientMac(),
        cpf: cpfLimpo,
      })

      if (!validacao.ok || !validacao.leadId) {
        setErroCpfRapido('CPF não confere com este dispositivo')
        return
      }

      // A partir daqui usamos somente o leadId validado pelo servidor.
      setLeadId(validacao.leadId)
      leadIdRef.current = validacao.leadId

      const anuncioSorteado = await buscarProximoAnuncioObrigatorio(validacao.leadId)
      const resolvedIp = getClientIp()

      if (anuncioSorteado) {
        setAnuncioAtual(anuncioSorteado)
        setInternetLiberadaNaCta(false)
        setVideoAdStarted(false)
        setVideoAdLoading(false)
        setVideoAdError('')
        videoAdBufferingRef.current = false
        setEtapa(ETAPAS.ANUNCIO)

        // Registro de visualização agora deve passar pela API segura.
        registrarVisualizacao(anuncioSorteado.id, resolvedIp)
      } else {
        const autorizacao = await autorizarSessaoNoBackend(validacao.leadId)

        if (autorizacao) {
          setEtapa(ETAPAS.ACESSO)
        }
      }
    } catch (error) {
      const mensagem = error?.message || ''

      // Mensagem amigável para o usuário quando o CPF não bate com o cadastro.
      if (mensagem.includes('CPF') || mensagem.includes('confere')) {
        setErroCpfRapido('CPF não confere com este dispositivo')
        return
      }

      falhar('Erro no CPF rápido', error)
    } finally {
      setSalvandoCpfRapido(false)
    }
  }

  function liberarInternetAposDelay(explicitLeadId = null, delayMs = 5000) {
    const resolvedLeadId =
      explicitLeadId ||
      leadIdRef.current ||
      leadId ||
      leadRapido?.id ||
      null

    if (!resolvedLeadId) return

    if (liberacaoCtaTimerRef.current) {
      clearTimeout(liberacaoCtaTimerRef.current)
    }

    liberacaoCtaTimerRef.current = setTimeout(() => {
      autorizarSessaoEmBackground(resolvedLeadId).catch((error) => {
        console.error('Erro ao liberar internet após delay do CTA:', error)
      })
    }, delayMs)
  }

  async function handleCopiarLinkCliente() {
    if (!urlCliente) return

    setCopiandoLink(true)

    try {
      await navigator.clipboard.writeText(urlCliente)
      setLinkCopiado(true)

      if (anuncioAtual) {
        registrarClique(anuncioAtual.id, getClientIp(), 'copy', urlCliente).catch((error) => {
          console.error('Erro ao registrar cópia do link:', error)
        })
      }

      setTimeout(() => {
        setLinkCopiado(false)
      }, 2500)
    } catch (error) {
      console.error('Erro ao copiar link:', error)
      window.prompt('Copie o link abaixo:', urlCliente)
    } finally {
      setCopiandoLink(false)
    }
  }

  async function copiarLinkSilencioso(texto = '') {
    if (!texto) return false

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(texto)
        setLinkCopiado(true)
        return true
      }
    } catch {}

    try {
      const textarea = document.createElement('textarea')
      textarea.value = texto
      textarea.setAttribute('readonly', '')
      textarea.style.position = 'fixed'
      textarea.style.left = '-9999px'
      textarea.style.top = '-9999px'
      document.body.appendChild(textarea)
      textarea.focus()
      textarea.select()
      const copied = document.execCommand('copy')
      document.body.removeChild(textarea)

      if (copied) {
        setLinkCopiado(true)
        return true
      }
    } catch {}

    return false
  }

  async function handleCtaClick(clicou, destinoExterno = '') {
    try {
      const resolvedIp = getClientIp()
      const resolvedLeadId =
        leadIdRef.current ||
        leadId ||
        leadRapido?.id ||
        null

      if (clicou && anuncioAtual) {
        const tipoDestino = anuncioAtual?.tipo_destino || 'externo'
        const contextoInterno = {
          hotspotSlug: hotspot?.slug || slug,
          leadId: resolvedLeadId || '',
          clientMac: getClientMac(),
          clientIp: getClientIp(),
        }
        const urlNormalizada = tipoDestino === 'lp_interna'
          ? montarUrlLpInterna(anuncioAtual, contextoInterno)
          : tipoDestino === 'site_nexawi'
            ? montarUrlSiteNexawi(anuncioAtual, contextoInterno)
            : normalizarUrlDestino(destinoExterno || anuncioAtual.url_destino || '')

        setUrlCliente(urlNormalizada)
        setLinkCopiado(false)

        if (tipoDestino === 'lp_interna') {
          registrarClique(anuncioAtual.id, resolvedIp, 'open_attempt', urlNormalizada).catch((error) => {
            console.error('Erro ao registrar interesse no CTA interno:', error)
          })

          window.location.href = urlNormalizada
          return
        }

        if (tipoDestino === 'site_nexawi') {
          registrarClique(anuncioAtual.id, resolvedIp, 'open_attempt', urlNormalizada).catch((error) => {
            console.error('Erro ao registrar interesse no site NexaWi:', error)
          })

          window.location.href = urlNormalizada
          return
        }

        // FLUXO EXTERNO PROFISSIONAL:
        // Não mostra mais a tela intermediária de 3 botões.
        // O clique em "Quero aproveitar" já copia, registra, libera e tenta abrir.
        await copiarLinkSilencioso(urlNormalizada)

        registrarClique(anuncioAtual.id, resolvedIp, 'open', urlNormalizada).catch((error) => {
          console.error('Erro ao registrar clique externo:', error)
        })

        setLoadingTexto('Liberando internet e abrindo oferta...')
        setEtapa(ETAPAS.LOADING)

        try {
          await autorizarSessaoEmBackground(resolvedLeadId)
        } catch (error) {
          console.error('Erro ao liberar internet antes do link externo:', error)
        }

        window.setTimeout(() => {
          window.location.href = urlNormalizada
        }, 250)

        return
      }

      await autorizarSessaoEmBackground(resolvedLeadId)
      setEtapa(ETAPAS.ACESSO)
    } catch (error) {
      falhar('Erro na CTA', error)
    }
  }


async function handleCopiarLinkCliente() {
  try {
    if (!urlCliente) return

    setCopiandoLink(true)

    try {
      await navigator.clipboard.writeText(urlCliente)
    } catch {
      const textarea = document.createElement('textarea')
      textarea.value = urlCliente
      textarea.style.position = 'fixed'
      textarea.style.left = '-9999px'
      document.body.appendChild(textarea)
      textarea.focus()
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
    }

    if (anuncioAtual) {
      await registrarClique(anuncioAtual.id, getClientIp(), 'copy', urlCliente)
    }

    setLinkCopiado(true)

    setTimeout(() => {
      setLinkCopiado(false)
    }, 3000)
  } catch (error) {
    falhar('Erro ao copiar link do cliente', error)
  } finally {
    setCopiandoLink(false)
  }
}

  useEffect(() => {
    let isMounted = true


 

    async function inicializarPortal() {
   try {
    if (!isMounted) return

    setLoadingTexto('Conectando à rede...')

    const resolvedMac = getClientMac()
    const resolvedIp = getClientIp()

    setMacAddress(resolvedMac)

    if (isLocalhost) {
      setIpAddress(resolvedIp)
    } else {
      try {
        const res = await fetch('https://api.ipify.org?format=json')
        const data = await res.json()
        if (isMounted) setIpAddress(data.ip)
      } catch {
        if (isMounted) setIpAddress('')
      }
    }

    const hotspotData = await carregarHotspotEAnuncios()
    if (!hotspotData || !isMounted) return

    const hotspotSlug = hotspotData.slug || slug

    let statusAtual = { state: 'idle', remainingSeconds: 0 }

    try {
      statusAtual = await consultarStatusSessao(hotspotSlug, resolvedMac)
    } catch (error) {
      console.warn('Falha ao consultar status da sessão na inicialização:', error)
    }

    if (statusAtual.state === 'cooldown') {
      setEtapa(ETAPAS.BLOQUEADO)
      return
    }

    const leadDoMes = await buscarLeadRapidoDoMes(hotspotData.id, resolvedMac)

    if (leadDoMes) {
      setLeadRapido(leadDoMes)
      setLeadId(leadDoMes.id)
      leadIdRef.current = leadDoMes.id

      const regrasPortal = hotspotData.portal_rules || {}
      const deveValidarCpfRapido =
        regrasPortal.cpf_visivel !== false &&
        regrasPortal.cpf_obrigatorio !== false

      if (!deveValidarCpfRapido) {
        setLeadRapido(null)
        setLeadId(null)
        leadIdRef.current = null
        setEtapa(ETAPAS.CADASTRO)
        return
      }

      // Mesmo que exista sessão authorized antiga,
      // se o portal abriu de novo, o usuário precisa validar CPF rápido.
      setEtapa(ETAPAS.CPF_RAPIDO)
      return
    }

    // Sem lead do mês, volta para cadastro.
    setEtapa(ETAPAS.CADASTRO)
  } catch (error) {
    if (isMounted) falhar('Erro na inicialização do portal', error)
  }
}

    inicializarPortal()

    return () => {
      isMounted = false
    }
  }, [slug, macParam])

  useEffect(() => {
    if (etapa === ETAPAS.ANUNCIO && anuncioAtual) {
      const duracao = anuncioAtual.duracao_segundos || 15
      setContador(duracao)

      if (isVideoAd(anuncioAtual) && !videoAdStarted) {
        return
      }

      intervaloAnuncioRef.current = setInterval(() => {
        setContador((prev) => {
          if (isVideoAd(anuncioAtual) && videoAdBufferingRef.current) {
            return prev
          }

          if (prev <= 1) {
            clearInterval(intervaloAnuncioRef.current)
            concluirAnuncioComAutorizacao(leadIdRef.current || leadRapido?.id || null)
            return 0
          }

          return prev - 1
        })
      }, 1000)
    }

    return () => {
      if (intervaloAnuncioRef.current) clearInterval(intervaloAnuncioRef.current)
    }
  }, [etapa, anuncioAtual, leadRapido, videoAdStarted])

  useEffect(() => {
    if (etapa !== ETAPAS.ANUNCIO || !isVideoAd(anuncioAtual)) return

    const timer = window.setTimeout(() => {
      tentarIniciarVideoAutomatico()
    }, 250)

    return () => window.clearTimeout(timer)
  }, [etapa, anuncioAtual?.id])

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-[#6be12f]/30 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-[#6be12f]/5 rounded-full blur-[150px] pointer-events-none"></div>

      {etapa === ETAPAS.LOADING && (
        <div className="relative z-10 flex flex-col items-center justify-center animate-fade-in-up">
          <div className="relative w-20 h-20 flex items-center justify-center mb-4">
            <div className="absolute inset-0 border-t-2 border-[#6be12f]/50 rounded-full animate-spin"></div>
            <Wifi className="text-[#6be12f] animate-pulse" size={30} />
          </div>
          <p className="text-gray-500 font-medium tracking-wide">{loadingTexto}</p>
        </div>
      )}

      {etapa === ETAPAS.BLOQUEADO && (
        <div className="relative z-10 w-full max-w-sm text-center animate-fade-in-up">
          <div className="bg-white/[0.02] backdrop-blur-3xl rounded-[2.5rem] p-12 border border-white/[0.05] shadow-[0_20px_40px_rgba(0,0,0,0.4)]">
            <div className="flex justify-center mb-8">
              <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20">
                <Clock size={32} className="text-red-500" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-white mb-3 tracking-tight">Acesso pausado</h1>
            <p className="text-gray-400 text-sm mb-8 leading-relaxed">
              Sua conexão precisa ser renovada. Desligue e ligue seu Wi-Fi, acesse a rede novamente e siga o fluxo do portal.
            </p>
            <div className="bg-[#0a0a0a] rounded-2xl p-4 border border-white/[0.05]">
              <p className="text-xs text-gray-500 uppercase tracking-widest font-bold mb-1">Orientação</p>
              <p className="text-sm font-medium text-white leading-relaxed">
                Volte para o Wi-Fi NexaWi para liberar uma nova conexão.
              </p>
            </div>
          </div>
        </div>
      )}

      {etapa === ETAPAS.ERRO && (
        <div className="relative z-10 text-center animate-fade-in-up max-w-md px-6">
          <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/20">
            <ShieldCheck className="text-red-500" size={24} />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Rede Indisponível</h2>
          <p className="text-gray-500 mb-3">Não foi possível carregar as configurações deste ponto de acesso.</p>

          {erroDetalhe ?(
            <div className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-left">
              <p className="text-[11px] uppercase tracking-[0.2em] text-red-400 font-bold mb-2">
                Detalhe técnico
              </p>
              <p className="text-sm text-red-200 break-words">
                {erroDetalhe}
              </p>
            </div>
          ) : null}
        </div>
      )}

      {etapa === ETAPAS.CPF_RAPIDO && (
        <div className="relative z-10 w-full max-w-md animate-fade-in-up">
          <div className="bg-white/[0.02] backdrop-blur-3xl rounded-[2.5rem] p-8 sm:p-10 border border-white/[0.05] shadow-[0_20px_40px_rgba(0,0,0,0.4)]">
            <div className="flex justify-center mb-8 group cursor-pointer">
              <div className="relative">
                <div className="absolute inset-0 bg-[#6be12f]/30 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-all duration-700"></div>
                <img
                  src="/Nexa-logo.png"
                  alt="Nexa Logo"
                  className="h-14 relative z-10 object-contain transition-all duration-500 group-hover:scale-105"
                  onError={(e) => { e.target.style.display = 'none' }}
                />
              </div>
            </div>

            <div className="text-center mb-10">
              <h1 className="text-2xl font-bold text-white mb-2 tracking-tight">Bom ter você novamente...</h1>
              <p className="text-gray-500 text-sm leading-relaxed">
                Identificamos este dispositivo em <strong className="text-gray-300">{hotspot?.nome}</strong>.
                Digite apenas seu CPF para continuar.
              </p>

              <AvisoAcessoPorInatividade />
            </div>

            <form onSubmit={handleCpfRapido} className="space-y-4">
              <div className="relative group/input">
                <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                  <FileText size={18} className="text-gray-600 group-focus-within/input:text-[#6be12f] transition-colors duration-300" />
                </div>
                <input
                  type="text"
                  value={cpfRapido}
                  onChange={(e) => setCpfRapido(e.target.value)}
                  className="w-full pl-12 pr-5 py-4 rounded-2xl bg-[#0a0a0a] text-white border border-white/[0.05] focus:border-[#6be12f]/30 focus:ring-1 focus:ring-[#6be12f]/30 transition-all duration-300 outline-none placeholder-gray-600 text-sm font-medium"
                  placeholder="Digite seu CPF"
                />
                {erroCpfRapido && <span className="text-red-400 text-xs mt-1 ml-2 block">{erroCpfRapido}</span>}
              </div>

              <button
                type="submit"
                disabled={salvandoCpfRapido}
                className="w-full mt-6 bg-[#6be12f] hover:bg-[#8cf059] text-black font-bold py-4 rounded-2xl transition-all duration-300 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(34,197,94,0.2)] hover:shadow-[0_0_30px_rgba(34,197,94,0.4)] hover:-translate-y-1 disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:translate-y-0"
              >
                {salvandoCpfRapido ?<Loader2 size={20} className="animate-spin" /> : <>Continuar <ArrowRight size={18} /></>}
              </button>
            </form>
          </div>
        </div>
      )}

      {etapa === ETAPAS.CADASTRO && (
        <div className="relative z-10 w-full max-w-md animate-fade-in-up">
          <div className="bg-white/[0.02] backdrop-blur-3xl rounded-[2.5rem] p-8 sm:p-10 border border-white/[0.05] shadow-[0_20px_40px_rgba(0,0,0,0.4)]">
            <div className="flex justify-center mb-8 group cursor-pointer">
              <div className="relative">
                <div className="absolute inset-0 bg-[#6be12f]/30 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-all duration-700"></div>
                <img
                  src="/Nexa-logo.png"
                  alt="Nexa Logo"
                  className="h-14 relative z-10 object-contain transition-all duration-500 group-hover:scale-105"
                  onError={(e) => { e.target.style.display = 'none' }}
                />
              </div>
            </div>

            <div className="text-center mb-10">
              <h1 className="text-2xl font-bold text-white mb-2 tracking-tight">Wi-Fi Grátis</h1>
              <p className="text-gray-500 text-sm leading-relaxed">
                Preencha os dados abaixo para liberar seu acesso à internet em <strong className="text-gray-300">{hotspot?.nome}</strong>.
              </p>

              <AvisoAcessoPorInatividade />
            </div>

            <form onSubmit={handleCadastro} className="space-y-4">
              <div className="relative group/input">
                <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                  <User size={18} className="text-gray-600 group-focus-within/input:text-[#6be12f] transition-colors duration-300" />
                </div>
                <input
                  type="text"
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  className="w-full pl-12 pr-5 py-4 rounded-2xl bg-[#0a0a0a] text-white border border-white/[0.05] focus:border-[#6be12f]/30 focus:ring-1 focus:ring-[#6be12f]/30 transition-all duration-300 outline-none placeholder-gray-600 text-sm font-medium"
                  placeholder="Nome completo"
                />
                {erros.nome && <span className="text-red-400 text-xs mt-1 ml-2 block">{erros.nome}</span>}
              </div>

              <div className="relative group/input">
                <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                  <Mail size={18} className="text-gray-600 group-focus-within/input:text-[#6be12f] transition-colors duration-300" />
                </div>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full pl-12 pr-5 py-4 rounded-2xl bg-[#0a0a0a] text-white border border-white/[0.05] focus:border-[#6be12f]/30 focus:ring-1 focus:ring-[#6be12f]/30 transition-all duration-300 outline-none placeholder-gray-600 text-sm font-medium"
                  placeholder="E-mail"
                />
                {erros.email && <span className="text-red-400 text-xs mt-1 ml-2 block">{erros.email}</span>}
              </div>

              <div className="relative group/input">
                <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                  <Smartphone size={18} className="text-gray-600 group-focus-within/input:text-[#6be12f] transition-colors duration-300" />
                </div>
                <input
                  type="tel"
                  value={form.telefone}
                  onChange={(e) => setForm({ ...form, telefone: e.target.value })}
                  className="w-full pl-12 pr-5 py-4 rounded-2xl bg-[#0a0a0a] text-white border border-white/[0.05] focus:border-[#6be12f]/30 focus:ring-1 focus:ring-[#6be12f]/30 transition-all duration-300 outline-none placeholder-gray-600 text-sm font-medium"
                  placeholder="WhatsApp (com DDD)"
                />
                {erros.telefone && <span className="text-red-400 text-xs mt-1 ml-2 block">{erros.telefone}</span>}
              </div>

              {cpfVisivel && (
                <div className="relative group/input">
                  <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                    <FileText size={18} className="text-gray-600 group-focus-within/input:text-[#6be12f] transition-colors duration-300" />
                  </div>
                  <input
                    type="text"
                    value={form.cpf}
                    onChange={(e) => setForm({ ...form, cpf: e.target.value })}
                    className="w-full pl-12 pr-5 py-4 rounded-2xl bg-[#0a0a0a] text-white border border-white/[0.05] focus:border-[#6be12f]/30 focus:ring-1 focus:ring-[#6be12f]/30 transition-all duration-300 outline-none placeholder-gray-600 text-sm font-medium"
                    placeholder={cpfObrigatorio ?'CPF' : 'CPF (opcional)'}
                  />
                  {erros.cpf && <span className="text-red-400 text-xs mt-1 ml-2 block">{erros.cpf}</span>}
                </div>
              )}

              <div className="pt-2">
                <label className="flex items-start gap-3 cursor-pointer group">
                  <div className="relative flex items-center justify-center mt-0.5">
                    <input
                      type="checkbox"
                      checked={form.aceite_lgpd}
                      onChange={(e) => setForm({ ...form, aceite_lgpd: e.target.checked })}
                      className="peer sr-only"
                    />
                    <div className="w-5 h-5 rounded border border-white/[0.1] bg-[#0a0a0a] peer-checked:bg-[#6be12f] peer-checked:border-[#6be12f] transition-all duration-300 flex items-center justify-center">
                      <CheckCircle2 size={14} className="text-black opacity-0 peer-checked:opacity-100 transition-opacity duration-300" />
                    </div>
                  </div>
                  <span className="text-xs text-gray-500 leading-relaxed group-hover:text-gray-400 transition-colors">
                    Concordo com os{' '}
                    <button type="button" onClick={() => setModalAberto('termos')} className="text-[#6be12f] hover:underline">
                      Termos de Uso
                    </button>{' '}
                    e{' '}
                    <button type="button" onClick={() => setModalAberto('privacidade')} className="text-[#6be12f] hover:underline">
                      Política de Privacidade
                    </button>.
                  </span>
                </label>
                {erros.aceite_lgpd && <span className="text-red-400 text-xs mt-2 ml-8 block">{erros.aceite_lgpd}</span>}
              </div>

              {promocoesOptinAtivo && (
                <div className="pt-1">
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <div className="relative flex items-center justify-center mt-0.5">
                      <input
                        type="checkbox"
                        checked={form.aceitou_promocoes}
                        onChange={(e) => setForm({ ...form, aceitou_promocoes: e.target.checked })}
                        className="peer sr-only"
                      />
                      <div className="w-5 h-5 rounded border border-white/[0.1] bg-[#0a0a0a] peer-checked:bg-[#6be12f] peer-checked:border-[#6be12f] transition-all duration-300 flex items-center justify-center">
                        <CheckCircle2 size={14} className="text-black opacity-0 peer-checked:opacity-100 transition-opacity duration-300" />
                      </div>
                    </div>
                    <span className="text-xs text-gray-500 leading-relaxed group-hover:text-gray-400 transition-colors">
                      {promocoesTexto}
                    </span>
                  </label>
                </div>
              )}

              <button
                type="submit"
                disabled={salvando}
                className="w-full mt-6 bg-[#6be12f] hover:bg-[#8cf059] text-black font-bold py-4 rounded-2xl transition-all duration-300 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(34,197,94,0.2)] hover:shadow-[0_0_30px_rgba(34,197,94,0.4)] hover:-translate-y-1 disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:translate-y-0"
              >
                {salvando ?<Loader2 size={20} className="animate-spin" /> : <>Conectar Agora <ArrowRight size={18} /></>}
              </button>
            </form>
          </div>
        </div>
      )}

      {etapa === ETAPAS.ANUNCIO && anuncioAtual && (
        <div className="fixed inset-0 z-50 bg-[#050505] flex flex-col items-center justify-center animate-fade-in-up">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-white/[0.05] z-30">
            <div
              className="h-full bg-[#6be12f] transition-all duration-1000 ease-linear shadow-[0_0_15px_rgba(34,197,94,0.8)]"
              style={{ width: `${((anuncioAtual.duracao_segundos - contador) / anuncioAtual.duracao_segundos) * 100}%` }}
            />
          </div>

          <div className="relative w-full h-full max-w-[calc(100vh*(9/16))] bg-[#0a0a0a] shadow-2xl flex items-center justify-center overflow-hidden">
            {anuncioAtual.media_url && anuncioAtual.tipo_media === 'video' ?(
              <div className="relative w-full h-full">
                <video
                  ref={videoAdRef}
                  src={anuncioAtual.media_url}
                  className="w-full h-full object-cover"
                  autoPlay
                  playsInline
                  preload="auto"
                  onLoadedMetadata={tentarIniciarVideoAutomatico}
                  onCanPlay={tentarIniciarVideoAutomatico}
                  onPlay={() => {
                    setVideoAdStarted(true)
                    setVideoBuffering(false)
                  }}
                  onPlaying={() => {
                    setVideoAdStarted(true)
                    setVideoBuffering(false)
                  }}
                  onWaiting={() => setVideoBuffering(true)}
                  onStalled={() => setVideoBuffering(true)}
                  onSeeking={() => setVideoBuffering(true)}
                  onSeeked={() => setVideoBuffering(false)}
                  onError={() => {
                    setVideoBuffering(false)
                    setVideoAdStarted(false)
                    setVideoAdError('Não foi possível carregar este vídeo.')
                  }}
                />

                {!videoAdStarted && (
                  <div className="absolute inset-x-4 bottom-24 z-20 rounded-2xl border border-white/10 bg-black/75 px-4 py-3 text-center text-xs font-bold text-white backdrop-blur-xl">
                    {videoAdError || 'Carregando vídeo com áudio... tempo pausado.'}
                  </div>
                )}

                {videoAdStarted && videoAdLoading && (
                  <div className="absolute inset-x-4 bottom-24 z-20 rounded-2xl border border-white/10 bg-black/75 px-4 py-3 text-center text-xs font-bold text-white backdrop-blur-xl">
                    Vídeo carregando... tempo pausado.
                  </div>
                )}
              </div>
            ) : anuncioAtual.media_url && anuncioAtual.tipo_media === 'imagem' ?(
              <img src={anuncioAtual.media_url} alt="Anúncio" className="w-full h-full object-cover" />
            ) : (
              <div className="text-gray-600 text-sm">Mídia não disponível</div>
            )}
            <div className="absolute bottom-0 left-0 w-full h-1/3 bg-gradient-to-t from-[#050505] to-transparent pointer-events-none" />
          </div>

          <div className="absolute top-6 right-6 z-20">
            <div className="bg-black/40 backdrop-blur-xl border border-white/[0.05] px-4 py-2 rounded-full flex items-center gap-2 shadow-lg">
              <Loader2 size={14} className="text-[#6be12f] animate-spin" />
              <span className="text-white text-sm font-medium tracking-wide">Aguarde {contador}s</span>
            </div>
          </div>
        </div>
      )}

      {etapa === ETAPAS.CTA && anuncioAtual && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-[#050505]/80 backdrop-blur-xl p-4">
          <div className="absolute inset-0 opacity-20 pointer-events-none">
            {anuncioAtual.media_url && anuncioAtual.tipo_media === 'video' ?(
              <video src={anuncioAtual.media_url} className="w-full h-full object-cover blur-3xl" autoPlay muted loop playsInline />
            ) : anuncioAtual.media_url && anuncioAtual.tipo_media === 'imagem' ?(
              <img src={anuncioAtual.media_url} className="w-full h-full object-cover blur-3xl" alt="Fundo anúncio" />
            ) : null}
          </div>

          <div className="relative z-20 w-full max-w-sm animate-fade-in-up">
            <div className="bg-white/[0.02] backdrop-blur-3xl rounded-[2.5rem] p-10 text-center border border-white/[0.05] shadow-[0_20px_40px_rgba(0,0,0,0.4)]">
              <div className="flex justify-center mb-8 group cursor-pointer">
                <div className="relative">
                  <div className="absolute inset-0 bg-[#6be12f]/30 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-all duration-700"></div>
                  <img
                    src="/Nexa-logo.png"
                    alt="Nexa Logo"
                    className="h-14 relative z-10 object-contain transition-all duration-500 group-hover:scale-105"
                    onError={(e) => { e.target.style.display = 'none' }}
                  />
                </div>
              </div>

              <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-500 mb-3 tracking-tight">
                Oferta Especial!
              </h2>

              <p className="text-gray-400 text-sm mb-10 leading-relaxed">{anuncioAtual.titulo}</p>

              <div className="flex flex-col gap-4">
                {(anuncioAtual.url_destino || anuncioAtual.tipo_destino === 'lp_interna' || anuncioAtual.tipo_destino === 'site_nexawi') && (
                  <button
                    type="button"
                    disabled={!internetLiberadaNaCta}
                    onClick={() => handleCtaClick(true, anuncioAtual.url_destino)}
                    className="w-full py-4 rounded-2xl font-bold text-black text-base transition-all duration-300 hover:-translate-y-1 bg-[#6be12f] shadow-[0_0_20px_rgba(34,197,94,0.2)] hover:shadow-[0_0_30px_rgba(34,197,94,0.4)] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                  >
                    Quero aproveitar
                  </button>
                )}

                <button
                  type="button"
                  disabled={!internetLiberadaNaCta}
                  onClick={() => handleCtaClick(false)}
                  className="w-full py-4 rounded-2xl font-medium text-sm text-gray-500 hover:text-white hover:bg-white/[0.02] transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  Não, obrigado. Ir para o Wi-Fi
                </button>
              </div>
            </div>
          </div>
        </div>
      )}



      {etapa === ETAPAS.ABRIR_CLIENTE && (
        <div className="relative z-10 w-full max-w-sm text-center animate-fade-in-up">
          <div className="bg-white/[0.02] backdrop-blur-3xl rounded-[2.5rem] p-10 border border-white/[0.05] shadow-[0_20px_40px_rgba(0,0,0,0.4)]">
            <div className="flex justify-center mb-8 group cursor-pointer">
              <div className="relative">
                <div className="absolute inset-0 bg-[#6be12f]/30 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-all duration-700"></div>
                <img
                  src="/Nexa-logo.png"
                  alt="Nexa Logo"
                  className="h-14 relative z-10 object-contain transition-all duration-500 group-hover:scale-105"
                  onError={(e) => { e.target.style.display = 'none' }}
                />
              </div>
            </div>

            <div className="relative w-20 h-20 mx-auto mb-8">
              <div className="absolute inset-0 rounded-full animate-ping opacity-20 bg-[#6be12f]"></div>
              <div className="relative w-full h-full rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(34,197,94,0.3)] bg-gradient-to-br from-[#8cf059] to-[#46a31a]">
                <ArrowRight size={34} className="text-black" />
              </div>
            </div>

            <h1 className="text-2xl font-bold text-white mb-3 tracking-tight">
              Oferta liberada!
            </h1>

            <p className="text-gray-500 text-sm mb-8 leading-relaxed">
              Sua internet já foi conectada. Toque no botão abaixo para copiar o link e abrir a página do anunciante.
            </p>

            {urlCliente ?(
              <button
                type="button"
                onClick={() => {
                  if (!urlCliente) return

                  try {
                    navigator.clipboard?.writeText(urlCliente)
                      .then(() => setLinkCopiado(true))
                      .catch(() => {})
                  } catch {}

                  if (anuncioAtual) {
                    registrarClique(anuncioAtual.id, getClientIp(), 'open', urlCliente)
                  }

                  window.location.href = urlCliente
                }}
                className="w-full bg-[#6be12f] hover:bg-[#8cf059] text-black font-bold py-4 rounded-2xl transition-all duration-300 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(34,197,94,0.2)] hover:shadow-[0_0_30px_rgba(34,197,94,0.4)] hover:-translate-y-1"
              >
                Copiar link / abrir página <ArrowRight size={18} />
              </button>
            ) : null}

            <button
              type="button"
              onClick={() => setEtapa(ETAPAS.ACESSO)}
              className="w-full mt-4 py-4 rounded-2xl font-medium text-sm text-gray-500 hover:text-white hover:bg-white/[0.02] transition-all duration-300"
            >
              Continuar usando o Wi-Fi
            </button>

            <p className="text-[11px] text-gray-600 mt-6 leading-relaxed">
              Se a página não abrir automaticamente, o link já foi enviado para a área de transferência do celular.
            </p>
          </div>
        </div>
      )}



      {etapa === ETAPAS.ACESSO && (
        <div className="relative z-10 w-full max-w-sm text-center animate-fade-in-up">
          <div className="bg-white/[0.02] backdrop-blur-3xl rounded-[2.5rem] p-12 border border-white/[0.05] shadow-[0_20px_40px_rgba(0,0,0,0.4)]">
            <div className="flex justify-center mb-10 group cursor-pointer">
              <div className="relative">
                <div className="absolute inset-0 bg-[#6be12f]/30 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-all duration-700"></div>
                <img
                  src="/Nexa-logo.png"
                  alt="Nexa Logo"
                  className="h-14 relative z-10 object-contain transition-all duration-500 group-hover:scale-105"
                  onError={(e) => { e.target.style.display = 'none' }}
                />
              </div>
            </div>

            <div className="relative w-24 h-24 mx-auto mb-8">
              <div className="absolute inset-0 rounded-full animate-ping opacity-20 bg-[#6be12f]"></div>
              <div className="relative w-full h-full rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(34,197,94,0.3)] bg-gradient-to-br from-[#8cf059] to-[#46a31a]">
                <Wifi size={40} className="text-black" />
              </div>
            </div>

            <h1 className="text-3xl font-bold text-white mb-3 tracking-tight">Conectado!</h1>
            <p className="text-gray-500 text-sm mb-6 leading-relaxed">
              Sua internet foi liberada com sucesso. Aproveite a conexão em <strong className="text-gray-300">{hotspot?.nome}</strong>.
            </p>

            <div className="relative overflow-hidden rounded-2xl border border-[#6be12f]/25 bg-[#6be12f]/[0.06] px-4 py-4 mb-8 text-left">
              <div className="absolute inset-0 bg-gradient-to-r from-[#6be12f]/[0.08] via-transparent to-transparent pointer-events-none" />
              <div className="relative flex items-start gap-3">
                <div className="mt-0.5 w-8 h-8 rounded-full bg-[#6be12f]/10 border border-[#6be12f]/20 flex items-center justify-center flex-shrink-0">
                  <ShieldCheck size={16} className="text-[#6be12f]" />
                </div>

                <div>
                  <p className="text-[11px] uppercase tracking-[0.22em] text-[#6be12f] font-bold mb-2">
                    Observação importante
                  </p>
                  <p className="text-sm text-white leading-relaxed font-medium">
                    Se ficar sem internet, é porque ficou inativo. Desligue e ligue seu Wi-Fi e entre novamente.
                  </p>
                </div>
              </div>
            </div>

            <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/[0.02] border border-white/[0.05]">
              <div className="w-2 h-2 rounded-full animate-pulse bg-[#6be12f] shadow-[0_0_10px_rgba(34,197,94,0.8)]" />
              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Status: Online</span>
            </div>
          </div>
        </div>
      )}

      {modalAberto && (
        <div className="fixed inset-0 z-[60] bg-[#050505]/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-[#0a0a0a] border border-white/[0.05] rounded-[2rem] w-full max-w-lg max-h-[80vh] flex flex-col shadow-[0_20px_40px_rgba(0,0,0,0.5)]">
            <div className="flex items-center justify-between p-6 border-b border-white/[0.05]">
              <div className="flex items-center gap-3">
                {modalAberto === 'termos' ?<FileText className="text-[#6be12f]" size={24} /> : <Shield className="text-[#6be12f]" size={24} />}
                <h2 className="text-xl font-bold text-white">
                  {modalAberto === 'termos' ?'Termos de Uso' : 'Política de Privacidade'}
                </h2>
              </div>

              <button
                onClick={() => setModalAberto(null)}
                className="p-2 text-gray-500 hover:text-white hover:bg-white/[0.05] rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto text-sm text-gray-400 space-y-4 custom-scrollbar">
              {modalAberto === 'termos' ?(
                <>
                  <p><strong>1. Aceitação dos Termos:</strong> Ao acessar a rede Wi-Fi patrocinada pela NexaWi ADS, você concorda com estes termos. O acesso é fornecido de forma gratuita mediante a visualização de anúncios publicitários.</p>
                  <p><strong>2. Uso da Rede:</strong> A rede deve ser utilizada para fins lícitos. É estritamente proibido o uso para download de conteúdo ilegal, pirataria, ataques cibernéticos, spam ou qualquer atividade que viole as leis brasileiras.</p>
                  <p><strong>3. Exibição de Anúncios:</strong> O acesso gratuito à internet pode ser condicionado à visualização de anúncios no momento de entrada ou retorno à rede. A NexaWi ADS não interrompe intencionalmente a navegação ativa para exibir campanhas no meio do uso.</p>
                  <p><strong>4. Renovação de Acesso:</strong> Para garantir a qualidade da rede para todos os usuários, a sessão poderá ser encerrada em casos de inatividade, perda de alcance do sinal ou necessidade técnica do ponto de acesso. Nesses casos, uma nova autenticação poderá ser exigida.</p>
                  <p><strong>5. Isenção de Responsabilidade:</strong> A NexaWi ADS e o estabelecimento parceiro não se responsabilizam por falhas na conexão, perda de dados ou danos causados por malwares durante o uso da rede aberta. Recomendamos o uso de conexões seguras (HTTPS) para transações sensíveis.</p>
                </>
              ) : (
                <>
                  <p><strong>1. Coleta de Dados:</strong> A NexaWi ADS coleta os dados fornecidos no momento do cadastro (Nome, E-mail, Telefone, CPF), bem como dados técnicos de conexão (Endereço IP, MAC Address e tempo de sessão) para fins de autenticação e segurança.</p>
                  <p><strong>2. Finalidade do Uso (LGPD):</strong> Os dados coletados são utilizados para: (a) Liberar o acesso à rede Wi-Fi; (b) Cumprir obrigações legais do Marco Civil da Internet (registro de logs); (c) Direcionar campanhas publicitárias relevantes durante a sua navegação; (d) Comunicações de marketing do estabelecimento parceiro.</p>
                  <p><strong>3. Compartilhamento:</strong> Seus dados não são vendidos a terceiros. Eles podem ser compartilhados exclusivamente com o estabelecimento onde você está acessando a rede e com autoridades competentes mediante ordem judicial.</p>
                  <p><strong>4. Segurança:</strong> Adotamos medidas técnicas e administrativas para proteger seus dados pessoais contra acessos não autorizados, destruição ou alteração, armazenando-os em servidores seguros.</p>
                  <p><strong>5. Seus Direitos:</strong> Conforme a Lei Geral de Proteção de Dados (Lei nº 13.709/2018), você tem o direito de solicitar a exclusão, alteração ou visualização dos seus dados a qualquer momento, entrando em contato com o suporte da NexaWi ADS.</p>
                </>
              )}
            </div>

            <div className="p-6 border-t border-white/[0.05]">
              <button
                onClick={() => setModalAberto(null)}
                className="w-full py-3 bg-white/[0.05] hover:bg-white/[0.1] text-white font-medium rounded-xl transition-colors"
              >
                Entendi e concordo
              </button>
            </div>
          </div>
        </div>
      )}

      <style
        dangerouslySetInnerHTML={{
          __html: `
            @keyframes fadeInUp {
              from { opacity: 0; transform: translateY(30px); }
              to { opacity: 1; transform: translateY(0); }
            }
            .animate-fade-in-up {
              animation: fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
              opacity: 0;
            }
            .custom-scrollbar::-webkit-scrollbar {
              width: 6px;
            }
            .custom-scrollbar::-webkit-scrollbar-track {
              background: transparent;
            }
            .custom-scrollbar::-webkit-scrollbar-thumb {
              background: rgba(255, 255, 255, 0.1);
              border-radius: 10px;
            }
            .custom-scrollbar::-webkit-scrollbar-thumb:hover {
              background: rgba(255, 255, 255, 0.2);
            }
          `
        }}
      />
    </div>
  )
}


