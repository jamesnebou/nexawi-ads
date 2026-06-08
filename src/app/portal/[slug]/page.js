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
  ArrowLeft,
  CheckCircle2,
  Clock,
  X,
  Shield,
  CreditCard,
  QrCode,
  Star,
} from 'lucide-react'
import { controlApiFetch } from '@/lib/control-api-client'


const ETAPAS = {
  LOADING: 'loading',
  TELEFONE_RAPIDO: 'telefone_rapido',
  WIFI_HIBRIDO: 'wifi_hibrido',
  WIFI_PIX: 'wifi_pix',
  CADASTRO: 'cadastro',
  ANUNCIO: 'anuncio',
  CTA: 'cta',
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

function isMacLike(value = '') {
  return /^([0-9A-F]{2}:){5}[0-9A-F]{2}$/.test(normalizeMac(value))
}

function gerarMacLocalDeNavegador() {
  const bytes = new Uint8Array(6)

  if (typeof window !== 'undefined' && window.crypto?.getRandomValues) {
    window.crypto.getRandomValues(bytes)
  } else {
    for (let i = 0; i < bytes.length; i += 1) {
      bytes[i] = Math.floor(Math.random() * 256)
    }
  }

  bytes[0] = 0x02

  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0').toUpperCase())
    .join(':')
}

function getMacLocalDeNavegador(slug = '') {
  if (typeof window === 'undefined') return ''

  const key = `nexawi_portal_client_mac:${String(slug || 'default').trim().toLowerCase()}`

  try {
    const existente = normalizeMac(window.localStorage.getItem(key) || '')

    if (isMacLike(existente)) return existente

    const criado = gerarMacLocalDeNavegador()
    window.localStorage.setItem(key, criado)
    return criado
  } catch {
    return gerarMacLocalDeNavegador()
  }
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
    const telefoneComPais = somenteNumeros.startsWith('55')
      ? somenteNumeros
      : `55${somenteNumeros}`

    return `https://wa.me/${telefoneComPais}`
  }

  return `https://${valor}`
}

function normalizarUrlInterna(path = '') {
  const valor = String(path || '').trim()

  if (!valor) return ''

  const caminho = valor.startsWith('/') ? valor : `/${valor}`

  if (typeof window === 'undefined') return caminho

  return `${window.location.origin}${caminho}`
}

function resolverDestinoAnuncio(anuncio = {}) {
  if (!anuncio) return ''

  if (anuncio.tipo_destino === 'site_nexawi') return normalizarUrlInterna('/')
  if (anuncio.tipo_destino === 'lp_interna') return normalizarUrlInterna(anuncio.lp_slug || '')

  return normalizarUrlDestino(anuncio.url_destino || '')
}


// Chamada padrÃ£o para as APIs seguras do portal.
// Assim o componente pÃºblico nÃ£o acessa mais tabelas sensÃ­veis direto no Supabase.
function formatWifiPixDuration(minutes = 0) {
  const total = Number(minutes || 0)

  if (total >= 1440 && total % 1440 === 0) return `${total / 1440} dia(s)`
  if (total >= 60 && total % 60 === 0) return `${total / 60} hora(s)`

  return `${total} minuto(s)`
}

function withTimeout(promise, timeoutMs, fallback) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      resolve(fallback)
    }, timeoutMs)

    Promise.resolve(promise)
      .then((value) => {
        clearTimeout(timer)
        resolve(value)
      })
      .catch((error) => {
        clearTimeout(timer)
        reject(error)
      })
  })
}

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
            Acesso liberado apÃ³s o anÃºncio
          </p>

          <p className="text-sm text-gray-300 leading-relaxed">
            <br />
            Caso fique sem internet apÃ³s um perÃ­odo parado, basta desligar e ligar o Wi-Fi e entrar novamente.
          </p>
        </div>
      </div>
    </div>
  )
}

export default function Portal() {
  const { slug } = useParams()
  const searchParams = useSearchParams()

  const macParam = normalizeMac(
    searchParams.get('mac') ||
      searchParams.get('client_mac') ||
      searchParams.get('client-mac') ||
      searchParams.get('username') ||
      ''
  )
  const ipParam = String(
    searchParams.get('ip') ||
      searchParams.get('client_ip') ||
      searchParams.get('client-ip') ||
      ''
  ).trim()
  const [etapa, setEtapa] = useState(ETAPAS.LOADING)
  const [hotspot, setHotspot] = useState(null)
  const [leadRapido, setLeadRapido] = useState(null)
  const [anuncioAtual, setAnuncioAtual] = useState(null)
  const [contador, setContador] = useState(0)
  const [salvando, setSalvando] = useState(false)
  const [leadId, setLeadId] = useState(null)
  const [adSessionId, setAdSessionId] = useState(null)
  const [ipAddress, setIpAddress] = useState('0.0.0.0')
  const [macAddress, setMacAddress] = useState('')
  const [modalAberto, setModalAberto] = useState(null)
  const [telefoneRapido, setTelefoneRapido] = useState('')
  const [erroTelefoneRapido, setErroTelefoneRapido] = useState('')
  const [internetLiberadaNaCta, setInternetLiberadaNaCta] = useState(false)
  const [loadingTexto, setLoadingTexto] = useState('Conectando Ã  rede...')
  const [erroDetalhe, setErroDetalhe] = useState('')
  const [salvandoTelefoneRapido, setSalvandoTelefoneRapido] = useState(false)
  const [videoAnuncioPronto, setVideoAnuncioPronto] = useState(false)
  const [erroVideoAnuncio, setErroVideoAnuncio] = useState('')
  const [wifiPixPlanos, setWifiPixPlanos] = useState([])
  const [wifiPixPlanoId, setWifiPixPlanoId] = useState('')
  const [wifiPixMetodo, setWifiPixMetodo] = useState('PIX')
  const [wifiPixNome, setWifiPixNome] = useState('')
  const [wifiPixTelefone, setWifiPixTelefone] = useState('')
  const [wifiPixCpfCnpj, setWifiPixCpfCnpj] = useState('')
  const [wifiPixCheckout, setWifiPixCheckout] = useState(null)
  const [wifiPixMensagem, setWifiPixMensagem] = useState('')
  const [wifiPixProcessando, setWifiPixProcessando] = useState(false)

  
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
  const adSessionIdRef = useRef(null)
  const hotspotIdRef = useRef('')
  const sessaoAutorizadaRef = useRef(false)
  const autorizacaoPromiseRef = useRef(null)
  const videoAnuncioRef = useRef(null)
  const acessoHibridoGratisRef = useRef(false)

  useEffect(() => {
    leadIdRef.current = leadId
  }, [leadId])

  useEffect(() => {
    adSessionIdRef.current = adSessionId
  }, [adSessionId])

  const DEV_CLIENT_MAC = '8A:B7:BF:86:72:4D'
  const DEV_CLIENT_IP = '192.168.88.252'

  const isLocalhost =
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1')

  function getClientMac(customMac = '') {
    return normalizeMac(
      customMac ||
        macAddress ||
        macParam ||
        (isLocalhost ? DEV_CLIENT_MAC : getMacLocalDeNavegador(slug))
    )
  }

  function getClientIp(customIp = '') {
    return String(customIp || ipParam || ipAddress || (isLocalhost ? DEV_CLIENT_IP : '')).trim()
  }

  const hotspotSlugAtual = String(hotspot?.slug || slug || '').trim().toLowerCase()
  const portalRules = hotspot?.portal_rules || {}
  const cpfSolicitado = hotspotSlugAtual !== 'candido-sales' && portalRules.cpf_visivel !== false
  const cpfObrigatorio = cpfSolicitado && portalRules.cpf_obrigatorio !== false
  const promocoesOptinAtivo = Boolean(portalRules.promocoes_optin_ativo)
  const textoPromocoes =
    portalRules.promocoes_texto ||
    'Quero receber ofertas, cupons e novidades dos anunciantes parceiros da NexaWi por WhatsApp, SMS ou e-mail.'

  function falhar(etiqueta, erro = '') {
    const detalhe =
      typeof erro === 'string'
        ? erro
        : erro?.message || JSON.stringify(erro) || 'Erro desconhecido'

    console.error(etiqueta, erro)
    setErroDetalhe(`${etiqueta}${detalhe ? `: ${detalhe}` : ''}`)
    setEtapa(ETAPAS.ERRO)
  }

  async function carregarHotspotEAnuncios() {
  try {
    const data = await portalApiFetch('/api/portal/bootstrap', {
      slug,
    })

    if (!data.hotspot) {
      falhar('Hotspot nÃ£o encontrado', `slug recebido: ${slug}`)
      return null
    }

    setHotspot(data.hotspot || null)
    setWifiPixPlanos(Array.isArray(data.wifiPixPlanos) ? data.wifiPixPlanos : [])
    setWifiPixPlanoId(data.wifiPixPlanos?.[0]?.id || '')
    hotspotIdRef.current = data.hotspot?.id || ''
    return {
      ...data.hotspot,
      wifiPixPlanos: Array.isArray(data.wifiPixPlanos) ? data.wifiPixPlanos : [],
    }
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
      telefoneMascarado: data.lead.telefoneMascarado || '',
    }
  } catch (error) {
    console.error('Erro ao buscar lead rÃ¡pido:', error)
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
        throw new Error(data.error || 'Falha ao consultar status da sessÃ£o')
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
      throw new Error('Hotspot nÃ£o carregado')
    }

    if (!resolvedLeadId) {
      throw new Error('leadId nÃ£o encontrado para autorizar')
    }

    if (!resolvedMac) {
      throw new Error('MAC do cliente nÃ£o encontrado')
    }

    if (!resolvedIp) {
      console.warn('IP do cliente ausente na autorizacao; backend tentara localizar pelo MAC.')
    }

    const response = await controlApiFetch('/api/control/session/authorize', {
      method: 'POST',
      body: JSON.stringify({
        hotspotSlug,
        leadId: resolvedLeadId,
        clientMac: resolvedMac,
        clientIp: resolvedIp,
        adSessionId: adSessionIdRef.current || null,
        ...(acessoHibridoGratisRef.current
          ? {
              authorizationReason: 'hybrid_ad_30m',
              sessionSecondsOverride: 30 * 60,
            }
          : {}),
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      if (response.status === 409 && data?.status?.state === 'cooldown') {
        setEtapa(ETAPAS.BLOQUEADO)
        return null
      }

      throw new Error(data.error || 'Falha ao autorizar sessÃ£o')
    }

    return data
  }

  async function buscarProximoAnuncio({ leadId: targetLeadId, telefone }) {
    const data = await portalApiFetch('/api/portal/ad-next', {
      hotspotId: hotspot?.id || hotspotIdRef.current || '',
      leadId: targetLeadId,
      macAddress: getClientMac(),
      telefone,
    })

    return {
      anuncio: data.anuncio || null,
      adSessionId: data.adSessionId || null,
      eligibleAt: data.eligibleAt || null,
    }
  }

  async function concluirAnuncioNoServidor(explicitLeadId = null) {
    const resolvedLeadId =
      explicitLeadId ||
      leadIdRef.current ||
      leadId ||
      leadRapido?.id ||
      null

    const resolvedAdSessionId = adSessionIdRef.current || adSessionId

    if (!resolvedLeadId) {
      throw new Error('leadId ausente ao concluir anuncio')
    }

    if (!resolvedAdSessionId) {
      throw new Error('sessao do anuncio ausente')
    }

    await portalApiFetch('/api/portal/ad-complete', {
      adSessionId: resolvedAdSessionId,
      leadId: resolvedLeadId,
      hotspotId: hotspot?.id || hotspotIdRef.current || '',
      macAddress: getClientMac(),
    })
  }

  async function registrarVisualizacao(anuncioId, ip) {
    try {
      await portalApiFetch('/api/portal/view', {
        anuncioId,
        hotspotId: hotspot?.id || hotspotIdRef.current || '',
        ipAddress: ip,
      })
    } catch (error) {
      console.error('Erro ao registrar visualizaÃ§Ã£o:', error)
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
    const cpfLimpo = String(form.cpf).replace(/\D/g, '')

    if (!form.nome.trim()) novosErros.nome = 'Nome Ã© obrigatÃ³rio'
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      novosErros.email = 'E-mail invÃ¡lido'
    }
    if (!validatePhoneNumber(form.telefone)) novosErros.telefone = 'Telefone invÃ¡lido (11 dÃ­gitos)'
    if (cpfObrigatorio && !validateCpf(cpfLimpo)) {
      novosErros.cpf = 'CPF invÃ¡lido'
    } else if (!cpfObrigatorio && cpfSolicitado && cpfLimpo && !validateCpf(cpfLimpo)) {
      novosErros.cpf = 'CPF invÃ¡lido'
    }
    if (!form.aceite_lgpd) novosErros.aceite_lgpd = 'VocÃª precisa aceitar os termos'

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
        console.error('Erro ao autorizar sessÃ£o em background:', error)
        throw error
      })
      .finally(() => {
        autorizacaoPromiseRef.current = null
      })

    return autorizacaoPromiseRef.current
  }

  async function iniciarVideoAnuncioComAudio() {
    const video = videoAnuncioRef.current

    if (!video) return

    try {
      setErroVideoAnuncio('')
      video.muted = false
      video.defaultMuted = false
      video.volume = 1
      await video.play()
      setVideoAnuncioPronto(true)
    } catch (error) {
      console.error('Erro ao iniciar video do anuncio com audio:', error)
      setErroVideoAnuncio('Toque novamente para iniciar o anuncio com audio.')
    }
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
        throw new Error('leadId ausente ao finalizar o anÃºncio')
      }

      await concluirAnuncioNoServidor(resolvedLeadId)
      setInternetLiberadaNaCta(true)
      setEtapa(ETAPAS.CTA)
    } catch (error) {
      falhar('Erro ao finalizar anÃºncio', error)
    }
  }

  async function handleCadastro(e) {
    e.preventDefault()
    if (!validarForm()) return

    setSalvando(true)

    try {
      const telefoneLimpo = String(form.telefone).replace(/\D/g, '')
      const cpfLimpo = cpfSolicitado ? String(form.cpf).replace(/\D/g, '') : ''
      const resolvedMac = getClientMac()
      const resolvedIp = getClientIp()

      // Salva o lead por API server-side.
// Assim CPF, telefone, e-mail, MAC e IP nÃ£o dependem mais de permissÃ£o pÃºblica na tabela leads.
const data = await portalApiFetch('/api/portal/lead', {
  hotspotId: hotspot.id,
  nome: form.nome,
  email: form.email,
  telefone: telefoneLimpo,
  cpf: cpfLimpo,
  aceiteLgpd: form.aceite_lgpd,
  aceitouPromocoes: promocoesOptinAtivo ? form.aceitou_promocoes : false,
  anuncioId: null,
  macAddress: resolvedMac || null,
  ipAddress: resolvedIp || null,
})

      setLeadId(data.leadId)
leadIdRef.current = data.leadId

      const proximoAnuncio = await buscarProximoAnuncio({
        leadId: data.leadId,
        telefone: telefoneLimpo,
      })
      const anuncioSorteado = proximoAnuncio.anuncio

      if (anuncioSorteado) {
        setAnuncioAtual(anuncioSorteado)
        setAdSessionId(proximoAnuncio.adSessionId)
        adSessionIdRef.current = proximoAnuncio.adSessionId
        setInternetLiberadaNaCta(false)
        setEtapa(ETAPAS.ANUNCIO)
        registrarVisualizacao(anuncioSorteado.id, resolvedIp)
      } else {
       setAdSessionId(null)
       adSessionIdRef.current = null
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

  async function handleTelefoneRapido(e) {
    e.preventDefault()
    setErroTelefoneRapido('')

    const telefoneLimpo = String(telefoneRapido).replace(/\D/g, '')

    if (!validatePhoneNumber(telefoneLimpo)) {
      setErroTelefoneRapido('Celular invalido')
      return
    }

    if (!leadRapido?.id) {
      setErroTelefoneRapido('Cadastro nao encontrado para este dispositivo')
      return
    }

    setSalvandoTelefoneRapido(true)

    try {
      const validacao = await portalApiFetch('/api/portal/telefone-rapido', {
        hotspotId: hotspot.id,
        macAddress: getClientMac(),
        telefone: telefoneLimpo,
      })

      const validatedLeadId = validacao.lead?.id || leadRapido.id

      setLeadId(validatedLeadId)
      leadIdRef.current = validatedLeadId

      const proximoAnuncio = await buscarProximoAnuncio({
        leadId: validatedLeadId,
        telefone: telefoneLimpo,
      })
      const anuncioSorteado = proximoAnuncio.anuncio

      const resolvedIp = getClientIp()

      if (anuncioSorteado) {
        setAnuncioAtual(anuncioSorteado)
        setAdSessionId(proximoAnuncio.adSessionId)
        adSessionIdRef.current = proximoAnuncio.adSessionId
        setInternetLiberadaNaCta(false)
        setEtapa(ETAPAS.ANUNCIO)
        registrarVisualizacao(anuncioSorteado.id, resolvedIp)
      } else {
        setAdSessionId(null)
        adSessionIdRef.current = null
        const autorizacao = await autorizarSessaoNoBackend(validatedLeadId)

        if (autorizacao) {
          setEtapa(ETAPAS.ACESSO)
        }
      }
    } catch (error) {
      const mensagem = error?.message || ''

      if (mensagem.includes('Celular') || mensagem.includes('telefone')) {
        setErroTelefoneRapido('Celular nao confere com este dispositivo')
        return
      }

      falhar('Erro no celular rapido', error)
    } finally {
      setSalvandoTelefoneRapido(false)
    }
  }
  function prepararLiberacaoPendente({ leadId: targetLeadId, destino = '' }) {
    if (typeof window === 'undefined' || !targetLeadId) return destino

    const delaySeconds = Math.min(
      120,
      Math.max(5, Math.floor(Number(anuncioAtual?.tempo_liberacao_lp || 10)))
    )

    const payload = {
      pendingAuth: '1',
      hotspotSlug: hotspot?.slug || slug || '',
      leadId: targetLeadId,
      clientMac: getClientMac(),
      clientIp: getClientIp(),
      anuncioId: anuncioAtual?.id || '',
      adSessionId: adSessionIdRef.current || adSessionId || '',
      delaySeconds: String(delaySeconds),
      expiresAt: Date.now() + 5 * 60 * 1000,
      ...(acessoHibridoGratisRef.current
        ? {
            authorizationReason: 'hybrid_ad_30m',
            sessionSecondsOverride: String(30 * 60),
          }
        : {}),
    }

    try {
      window.sessionStorage.setItem('nexawi_pending_auth', JSON.stringify(payload))
    } catch {}

    try {
      const url = new URL(destino, window.location.origin)

      if (url.origin === window.location.origin) {
        url.searchParams.set('pendingAuth', '1')
        url.searchParams.set('hotspotSlug', payload.hotspotSlug)
        url.searchParams.set('leadId', payload.leadId)
        url.searchParams.set('clientMac', payload.clientMac)
        url.searchParams.set('clientIp', payload.clientIp)
        url.searchParams.set('anuncioId', payload.anuncioId)
        url.searchParams.set('adSessionId', payload.adSessionId)
        url.searchParams.set('delaySeconds', payload.delaySeconds)
        if (payload.authorizationReason) {
          url.searchParams.set('authorizationReason', payload.authorizationReason)
          url.searchParams.set('sessionSecondsOverride', payload.sessionSecondsOverride)
        }
        return url.toString()
      }
    } catch {}

    return destino
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
        const urlNormalizada = normalizarUrlDestino(destinoExterno || anuncioAtual.url_destino || '')
        const destinoFinal = prepararLiberacaoPendente({
          leadId: resolvedLeadId,
          destino: urlNormalizada,
        })

        registrarClique(anuncioAtual.id, resolvedIp, 'open', urlNormalizada).catch((error) => {
          console.error('Erro ao registrar clique no CTA:', error)
        })

        window.location.href = destinoFinal
        return
      }

      await autorizarSessaoEmBackground(resolvedLeadId)
      setEtapa(ETAPAS.ACESSO)
    } catch (error) {
      falhar('Erro na CTA', error)
    }
  }

  useEffect(() => {
    let isMounted = true


 

    async function inicializarPortal() {
   try {
    if (!isMounted) return

    setLoadingTexto('Conectando Ã  rede...')

    const resolvedMac = getClientMac()
    const resolvedIp = getClientIp()

    setMacAddress(resolvedMac)

    if (ipParam || isLocalhost) {
      setIpAddress(resolvedIp)
    } else {
      setIpAddress('')

      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 1500)

      fetch('https://api.ipify.org?format=json', {
        cache: 'no-store',
        signal: controller.signal,
      })
        .then((res) => res.json())
        .then((data) => {
          if (isMounted) setIpAddress(data.ip || '')
        })
        .catch(() => {})
        .finally(() => clearTimeout(timer))
    }

    const hotspotData = await carregarHotspotEAnuncios()
    if (!hotspotData || !isMounted) return

    const hotspotSlug = hotspotData.slug || slug

    let statusAtual = { state: 'idle', remainingSeconds: 0 }

    try {
      statusAtual = await withTimeout(
        consultarStatusSessao(hotspotSlug, resolvedMac),
        2500,
        { state: 'idle', remainingSeconds: 0 }
      )
    } catch (error) {
      console.warn('Falha ao consultar status da sessÃ£o na inicializaÃ§Ã£o:', error)
    }

    if (statusAtual.state === 'cooldown') {
      setEtapa(ETAPAS.BLOQUEADO)
      return
    }

    const modoAcesso = hotspotData.portal_modo_acesso || 'anuncios'
    const planosPix = Array.isArray(hotspotData.wifiPixPlanos) ? hotspotData.wifiPixPlanos : []

    if (modoAcesso === 'pix' && planosPix.length > 0) {
      setEtapa(ETAPAS.WIFI_PIX)
      return
    }

    if (modoAcesso === 'hibrido' && planosPix.length > 0) {
      setEtapa(ETAPAS.WIFI_HIBRIDO)
      return
    }

    const leadDoMes = await withTimeout(
      buscarLeadRapidoDoMes(hotspotData.id, resolvedMac),
      3500,
      null
    )

    if (leadDoMes) {
      setLeadRapido(leadDoMes)
      setLeadId(leadDoMes.id)
      leadIdRef.current = leadDoMes.id

      setEtapa(ETAPAS.TELEFONE_RAPIDO)
      return
    }

    // Sem lead do mÃªs, volta para cadastro.
    setEtapa(ETAPAS.CADASTRO)
  } catch (error) {
    if (isMounted) falhar('Erro na inicializaÃ§Ã£o do portal', error)
  }
}

    inicializarPortal()

    return () => {
      isMounted = false
    }
    // Portal bootstrap must run only when the captive URL identity changes.
    // Adding local helper functions here restarts the flow during normal state updates.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, macParam, ipParam])

  useEffect(() => {
    if (etapa !== ETAPAS.ANUNCIO || !anuncioAtual) return

    setContador(anuncioAtual.duracao_segundos || 15)
    setErroVideoAnuncio('')
    setVideoAnuncioPronto(anuncioAtual.tipo_media !== 'video' || !anuncioAtual.media_url)
  }, [etapa, anuncioAtual])

  useEffect(() => {
    if (etapa === ETAPAS.ANUNCIO && anuncioAtual) {
      if (anuncioAtual.tipo_media === 'video' && anuncioAtual.media_url && !videoAnuncioPronto) return
      // Android fecha automaticamente o captive portal quando detecta internet.
      // Por isso nÃ£o liberamos a sessÃ£o durante o anÃºncio.
      // A liberaÃ§Ã£o acontece somente apÃ³s o clique no CTA ou ao recusar.
      setContador(anuncioAtual.duracao_segundos || 15)

      intervaloAnuncioRef.current = setInterval(() => {
        setContador((prev) => {
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
    // Timer is controlled by the current ad and video-start state. The completion
    // callback reads lead/session refs to avoid resetting the timer on each render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [etapa, anuncioAtual, leadRapido, videoAnuncioPronto])

  const anuncioEhVideo = anuncioAtual?.tipo_media === 'video' && Boolean(anuncioAtual?.media_url)
  const duracaoAnuncio = anuncioAtual?.duracao_segundos || 15
  const progressoAnuncio = anuncioAtual
    ? Math.max(0, Math.min(100, ((duracaoAnuncio - contador) / duracaoAnuncio) * 100))
    : 0
  const wifiPixPlanoSelecionado = wifiPixPlanos.find((plano) => plano.id === wifiPixPlanoId) || wifiPixPlanos[0]
  const etapaWifiPixAtiva = etapa === ETAPAS.WIFI_PIX

  async function gerarCheckoutWifiPix(event) {
    event.preventDefault()

    if (!wifiPixPlanoSelecionado?.id) {
      setWifiPixMensagem('Escolha um plano para continuar.')
      return
    }

    setWifiPixProcessando(true)
    setWifiPixMensagem('')

    try {
      const data = await portalApiFetch('/api/portal/pix/checkout', {
        hotspotId: hotspot?.id,
        planoId: wifiPixPlanoSelecionado.id,
        telefone: wifiPixTelefone,
        nome: wifiPixNome,
        cpfCnpj: wifiPixCpfCnpj,
        macAddress: getClientMac(),
        ipAddress: getClientIp(),
        metodoPagamento: wifiPixMetodo,
      })

      setWifiPixCheckout(data.checkout)
      setWifiPixMensagem(
        wifiPixMetodo === 'CREDIT_CARD'
          ? 'Pagamento criado. Abra o link seguro para pagar com cartÃ£o.'
          : 'Pix criado. Abra o link seguro ou copie o cÃ³digo Pix.'
      )
    } catch (error) {
      setWifiPixMensagem(error.message || 'NÃ£o foi possÃ­vel gerar o pagamento.')
    } finally {
      setWifiPixProcessando(false)
    }
  }

  async function verificarPagamentoWifiPix() {
    if (!wifiPixCheckout?.vendaId) return

    setWifiPixProcessando(true)
    setWifiPixMensagem('Verificando pagamento...')

    try {
      const status = await portalApiFetch('/api/portal/pix/status', {
        vendaId: wifiPixCheckout.vendaId,
        macAddress: getClientMac(),
        ipAddress: getClientIp(),
      })

      if (!['pago', 'autorizado'].includes(status.venda?.status)) {
        setWifiPixMensagem('Pagamento ainda nÃ£o confirmado. Aguarde alguns segundos e toque novamente.')
        return
      }

      await portalApiFetch('/api/portal/pix/authorize', {
        vendaId: wifiPixCheckout.vendaId,
        hotspotSlug: hotspot?.slug || slug,
        macAddress: getClientMac(),
        ipAddress: getClientIp(),
      })

      setWifiPixMensagem('Pagamento confirmado. Internet liberada.')
      setEtapa(ETAPAS.ACESSO)
    } catch (error) {
      setWifiPixMensagem(error.message || 'NÃ£o foi possÃ­vel liberar o acesso.')
    } finally {
      setWifiPixProcessando(false)
    }
  }

  async function continuarComAnunciosNoModoHibrido() {
    setSalvando(true)
    setErroDetalhe('')
    acessoHibridoGratisRef.current = true

    try {
      const resolvedMac = getClientMac()
      const leadDoMes = await withTimeout(
        buscarLeadRapidoDoMes(hotspot?.id || hotspotIdRef.current, resolvedMac),
        3500,
        null
      )

      if (leadDoMes) {
        setLeadRapido(leadDoMes)
        setLeadId(leadDoMes.id)
        leadIdRef.current = leadDoMes.id
        setEtapa(ETAPAS.TELEFONE_RAPIDO)
        return
      }

      setEtapa(ETAPAS.CADASTRO)
    } catch (error) {
      falhar('Erro ao iniciar acesso patrocinado', error)
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className={`min-h-screen bg-[#050505] text-white font-sans ${etapaWifiPixAtiva ? 'selection:bg-[#ff7a00]/30' : 'selection:bg-[#6be12f]/30'} flex items-center justify-center p-4 relative overflow-hidden`}>
      <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] ${etapaWifiPixAtiva ? 'bg-[#ff7a00]/8' : 'bg-[#6be12f]/5'} rounded-full blur-[150px] pointer-events-none`}></div>

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
              Sua conexÃ£o precisa ser renovada. Desligue e ligue seu Wi-Fi, acesse a rede novamente e siga o fluxo do portal.
            </p>
            <div className="bg-[#0a0a0a] rounded-2xl p-4 border border-white/[0.05]">
              <p className="text-xs text-gray-500 uppercase tracking-widest font-bold mb-1">OrientaÃ§Ã£o</p>
              <p className="text-sm font-medium text-white leading-relaxed">
                Volte para o Wi-Fi NexaWi para liberar uma nova conexÃ£o.
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
          <h2 className="text-xl font-bold text-white mb-2">Rede IndisponÃ­vel</h2>
          <p className="text-gray-500 mb-3">NÃ£o foi possÃ­vel carregar as configuraÃ§Ãµes deste ponto de acesso.</p>

          {erroDetalhe ? (
            <div className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-left">
              <p className="text-[11px] uppercase tracking-[0.2em] text-red-400 font-bold mb-2">
                Detalhe tÃ©cnico
              </p>
              <p className="text-sm text-red-200 break-words">
                {erroDetalhe}
              </p>
            </div>
          ) : null}
        </div>
      )}

      {etapa === ETAPAS.WIFI_HIBRIDO && (
        <div className="relative z-10 w-full max-w-md animate-fade-in-up">
          <div className="relative overflow-hidden bg-white/[0.02] backdrop-blur-3xl rounded-[2.5rem] p-8 sm:p-10 border border-white/[0.06] shadow-[0_20px_40px_rgba(0,0,0,0.4)]">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#6be12f] via-[#ff7a00] to-[#6be12f]" />

            <div className="flex justify-center mb-7">
              <img
                src="/Nexa-logo.png"
                alt="NexaWi"
                className="h-12 object-contain"
                onError={(e) => { e.target.style.display = 'none' }}
              />
            </div>

            <div className="text-center mb-8">
              <p className="inline-flex items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.04] px-4 py-2 text-[11px] uppercase tracking-[0.22em] text-gray-300 font-black mb-4">
                Escolha como continuar
              </p>
              <h1 className="text-3xl font-black text-white mb-3 tracking-tight leading-tight">
                Wi-Fi gratuito ou acesso premium
              </h1>
              <p className="text-gray-500 text-sm leading-relaxed">
                Escolha assistir ao anuncio patrocinado ou comprar um plano premium direto no Pix.
              </p>
            </div>

            <div className="grid gap-4">
              <button
                type="button"
                onClick={continuarComAnunciosNoModoHibrido}
                disabled={salvando}
                className="group relative overflow-hidden rounded-3xl border border-[#6be12f]/25 bg-[#6be12f]/10 px-5 py-5 text-left transition-all hover:border-[#6be12f]/55 hover:bg-[#6be12f]/15 disabled:opacity-70"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#6be12f] text-black shadow-[0_0_24px_rgba(107,225,47,0.22)]">
                    <Wifi size={22} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-lg font-black text-white">Veja o anÃºncio e ganhe 30 minutos grÃ¡tis</p>
                    <p className="mt-1 text-sm leading-relaxed text-gray-500">
                      Depois desse tempo, a internet deste aparelho sera encerrada automaticamente.
                    </p>
                  </div>
                  <ArrowRight className="ml-auto mt-3 text-[#6be12f] transition-transform group-hover:translate-x-1" size={20} />
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  acessoHibridoGratisRef.current = false
                  setEtapa(ETAPAS.WIFI_PIX)
                }}
                className="group wifi-pix-glass-shine relative overflow-hidden rounded-3xl border border-[#ff7a00]/35 bg-[#ff7a00]/12 px-5 py-5 text-left transition-all hover:border-[#ff7a00]/70 hover:bg-[#ff7a00]/16"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#ff7a00] text-black shadow-[0_0_24px_rgba(255,122,0,0.24)]">
                    <QrCode size={22} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-lg font-black text-white">Comprar acesso premium</p>
                    <p className="mt-1 text-sm leading-relaxed text-gray-500">
                      Escolha um plano, pague no Pix ou cartao e libere este aparelho.
                    </p>
                  </div>
                  <ArrowRight className="ml-auto mt-3 text-[#ff9d2e] transition-transform group-hover:translate-x-1" size={20} />
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {etapa === ETAPAS.WIFI_PIX && (
        <div className="relative z-10 w-full max-w-md animate-fade-in-up">
          <div className="absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-[#ff7a00]/20 blur-[90px] pointer-events-none" />
          <div className="relative overflow-hidden bg-[#080604]/95 backdrop-blur-3xl rounded-[2.5rem] p-8 sm:p-10 border border-[#ff7a00]/25 shadow-[0_24px_80px_rgba(255,122,0,0.16)]">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-[#ff7a00] to-transparent" />
            {(hotspot?.portal_modo_acesso || '') === 'hibrido' ? (
              <button
                type="button"
                onClick={() => {
                  setWifiPixCheckout(null)
                  setWifiPixMensagem('')
                  setWifiPixProcessando(false)
                  setEtapa(ETAPAS.WIFI_HIBRIDO)
                }}
                aria-label="Voltar para escolha"
                className="absolute left-5 top-5 flex h-10 w-10 items-center justify-center rounded-full border border-[#ff7a00]/25 bg-black/30 text-[#ff9d2e] transition-all hover:border-[#ff7a00]/60 hover:bg-[#ff7a00]/10"
              >
                <ArrowLeft size={18} />
              </button>
            ) : null}
            <div className="flex justify-center mb-7">
              <img
                src="/NexaWI-laranja.png"
                alt="NexaWi"
                className="h-12 object-contain"
                onError={(e) => { e.target.style.display = 'none' }}
              />
            </div>

            <div className="text-center mb-7">
              <p className="inline-flex items-center justify-center rounded-full border border-[#ff7a00]/35 bg-[#ff7a00]/12 px-4 py-2 text-[11px] uppercase tracking-[0.22em] text-[#ff9d2e] font-black mb-4 shadow-[0_0_24px_rgba(255,122,0,0.14)]">
                Acesso premium instantaneo
              </p>
              <h1 className="text-4xl font-black text-white mb-3 tracking-tight leading-none">Internet no Pix</h1>
              <p className="text-gray-500 text-sm leading-relaxed">
                Pague com Pix ou cartÃ£o e libere a internet neste aparelho sem esperar atendimento.
              </p>
            </div>

            {!wifiPixCheckout ? (
              <form onSubmit={gerarCheckoutWifiPix} className="space-y-4">
                <div className="grid gap-3">
                  {wifiPixPlanos.map((plano) => {
                    const selected = (wifiPixPlanoSelecionado?.id || wifiPixPlanoId) === plano.id
                    const recommended = Boolean(plano.recomendado)

                    return (
                      <button
                        key={plano.id}
                        type="button"
                        onClick={() => setWifiPixPlanoId(plano.id)}
                        className={`group relative overflow-hidden text-left rounded-3xl border px-5 py-5 transition-all ${
                          selected
                            ? 'wifi-pix-glass-shine border-[#ff7a00]/80 bg-[#ff7a00]/16 shadow-[0_0_34px_rgba(255,122,0,0.14)]'
                            : recommended
                              ? 'border-[#ff7a00]/45 bg-[#ff7a00]/10 shadow-[0_0_24px_rgba(255,122,0,0.10)]'
                              : 'border-white/[0.06] bg-[#0a0a0a]'
                        }`}
                      >
                        {recommended ? (
                          <div className="pointer-events-none absolute inset-0 -translate-x-full animate-[plan-reflex_2.8s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                        ) : null}

                        <div className="relative space-y-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="font-black text-white">{plano.nome}</p>
                                {recommended ? (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-[#ff7a00] px-2 py-1 text-[10px] font-black uppercase text-black">
                                    <Star size={11} fill="currentColor" /> Melhor escolha
                                  </span>
                                ) : null}
                              </div>
                              {plano.descricao ? (
                                <p className="mt-1 text-xs text-gray-500">{plano.descricao}</p>
                              ) : null}
                            </div>
                            <p className="shrink-0 text-[#ff9d2e] font-black text-lg">
                              {Number(plano.valor || 0).toLocaleString('pt-BR', {
                                style: 'currency',
                                currency: 'BRL',
                              })}
                            </p>
                          </div>

                          <div className="grid grid-cols-3 gap-2">
                            <div className="rounded-2xl border border-white/[0.05] bg-black/20 px-3 py-3">
                              <p className="text-[9px] font-black uppercase tracking-[0.14em] text-gray-600">Tempo</p>
                              <p className="mt-1 truncate text-xs font-black text-white">{formatWifiPixDuration(plano.duracao_minutos)}</p>
                            </div>
                            <div className="rounded-2xl border border-white/[0.05] bg-black/20 px-3 py-3">
                              <p className="text-[9px] font-black uppercase tracking-[0.14em] text-gray-600">Download</p>
                              <p className="mt-1 truncate text-xs font-black text-white">{plano.velocidade_download || '15M'}</p>
                            </div>
                            <div className="rounded-2xl border border-white/[0.05] bg-black/20 px-3 py-3">
                              <p className="text-[9px] font-black uppercase tracking-[0.14em] text-gray-600">Upload</p>
                              <p className="mt-1 truncate text-xs font-black text-white">{plano.velocidade_upload || '15M'}</p>
                            </div>
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setWifiPixMetodo('PIX')}
                    className={`rounded-2xl border px-4 py-3 flex items-center justify-center gap-2 font-bold text-sm ${
                      wifiPixMetodo === 'PIX'
                        ? 'border-[#ff7a00]/70 bg-[#ff7a00] text-black shadow-[0_0_24px_rgba(255,122,0,0.22)]'
                        : 'border-white/[0.06] bg-[#0a0a0a] text-gray-300'
                    }`}
                  >
                    <QrCode size={17} /> Pix
                  </button>
                  <button
                    type="button"
                    onClick={() => setWifiPixMetodo('CREDIT_CARD')}
                    className={`rounded-2xl border px-4 py-3 flex items-center justify-center gap-2 font-bold text-sm ${
                      wifiPixMetodo === 'CREDIT_CARD'
                        ? 'border-[#ff7a00]/70 bg-[#ff7a00] text-black shadow-[0_0_24px_rgba(255,122,0,0.22)]'
                        : 'border-white/[0.06] bg-[#0a0a0a] text-gray-300'
                    }`}
                  >
                    <CreditCard size={17} /> CartÃ£o
                  </button>
                </div>

                <input
                  type="text"
                  value={wifiPixNome}
                  onChange={(e) => setWifiPixNome(e.target.value)}
                  className="w-full px-5 py-4 rounded-2xl bg-[#0a0a0a] text-white border border-white/[0.06] focus:border-[#ff7a00]/45 focus:ring-1 focus:ring-[#ff7a00]/30 transition-all duration-300 outline-none placeholder-gray-600 text-sm font-medium"
                  placeholder="Nome"
                />
                <input
                  type="tel"
                  value={wifiPixTelefone}
                  onChange={(e) => setWifiPixTelefone(e.target.value)}
                  className="w-full px-5 py-4 rounded-2xl bg-[#0a0a0a] text-white border border-white/[0.06] focus:border-[#ff7a00]/45 focus:ring-1 focus:ring-[#ff7a00]/30 transition-all duration-300 outline-none placeholder-gray-600 text-sm font-medium"
                  placeholder="WhatsApp com DDD"
                />
                <input
                  type="text"
                  value={wifiPixCpfCnpj}
                  onChange={(e) => setWifiPixCpfCnpj(e.target.value)}
                  className="w-full px-5 py-4 rounded-2xl bg-[#0a0a0a] text-white border border-white/[0.06] focus:border-[#ff7a00]/45 focus:ring-1 focus:ring-[#ff7a00]/30 transition-all duration-300 outline-none placeholder-gray-600 text-sm font-medium"
                  placeholder="CPF ou CNPJ do pagador"
                />

                <button
                  type="submit"
                  disabled={wifiPixProcessando || !wifiPixPlanos.length}
                  className="w-full mt-2 bg-[#ff7a00] hover:bg-[#ff9d2e] text-black font-black py-4 rounded-2xl transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed shadow-[0_0_28px_rgba(255,122,0,0.28)]"
                >
                  {wifiPixProcessando ? <Loader2 size={20} className="animate-spin" /> : <>Gerar pagamento <ArrowRight size={18} /></>}
                </button>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="rounded-2xl border border-[#ff7a00]/25 bg-[#ff7a00]/10 px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-[#ff9d2e] font-bold mb-2">
                    Pagamento gerado
                  </p>
                  <p className="text-sm text-gray-300">
                    Abra o link seguro, conclua o pagamento e volte para liberar o Wi-Fi.
                  </p>
                </div>

                {wifiPixCheckout.invoiceUrl ? (
                  <a
                    href={wifiPixCheckout.invoiceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full bg-[#ff7a00] hover:bg-[#ff9d2e] text-black font-black py-4 rounded-2xl transition-all duration-300 flex items-center justify-center gap-2 shadow-[0_0_28px_rgba(255,122,0,0.25)]"
                  >
                    Abrir pagamento seguro <ArrowRight size={18} />
                  </a>
                ) : null}

                {wifiPixCheckout.pixCopyPaste ? (
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await navigator.clipboard?.writeText(wifiPixCheckout.pixCopyPaste)
                        setWifiPixMensagem('Código Pix copiado. Abra o app do banco e cole no Pix copia e cola.')
                      } catch {
                        setWifiPixMensagem('Não foi possível copiar automaticamente. Toque e segure para selecionar o código.')
                      }
                    }}
                    className="w-full border border-white/[0.08] bg-[#0a0a0a] text-gray-200 font-bold py-4 rounded-2xl transition-all duration-300"
                  >
                    Copiar cÃ³digo Pix
                  </button>
                ) : null}

                <button
                  type="button"
                  onClick={verificarPagamentoWifiPix}
                  disabled={wifiPixProcessando}
                  className="w-full border border-[#ff7a00]/35 bg-[#ff7a00]/10 text-[#ff9d2e] font-bold py-4 rounded-2xl transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-70"
                >
                  {wifiPixProcessando ? <Loader2 size={20} className="animate-spin" /> : <>JÃ¡ paguei, liberar Wi-Fi <CheckCircle2 size={18} /></>}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setWifiPixCheckout(null)
                    setWifiPixMensagem('')
                  }}
                  className="w-full text-gray-500 text-sm font-bold py-2"
                >
                  Escolher outro plano
                </button>
              </div>
            )}

            {wifiPixMensagem ? (
              <p className="mt-5 text-center text-sm text-gray-400 leading-relaxed">
                {wifiPixMensagem}
              </p>
            ) : null}
          </div>
        </div>
      )}

      {etapa === ETAPAS.TELEFONE_RAPIDO && (
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
              <h1 className="text-2xl font-bold text-white mb-2 tracking-tight">Bom ter vocÃª novamente...</h1>
              <p className="text-gray-500 text-sm leading-relaxed">
                Identificamos este dispositivo em <strong className="text-gray-300">{hotspot?.nome}</strong>.
                Digite seu celular para continuar
                {leadRapido?.telefoneMascarado ? ` (${leadRapido.telefoneMascarado}).` : '.'}
              </p>

              <AvisoAcessoPorInatividade />
            </div>

            <form onSubmit={handleTelefoneRapido} className="space-y-4">
              <div className="relative group/input">
                <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                  <Smartphone size={18} className="text-gray-600 group-focus-within/input:text-[#6be12f] transition-colors duration-300" />
                </div>
                <input
                  type="text"
                  value={telefoneRapido}
                  onChange={(e) => setTelefoneRapido(e.target.value)}
                  className="w-full pl-12 pr-5 py-4 rounded-2xl bg-[#0a0a0a] text-white border border-white/[0.05] focus:border-[#6be12f]/30 focus:ring-1 focus:ring-[#6be12f]/30 transition-all duration-300 outline-none placeholder-gray-600 text-sm font-medium"
                  placeholder="DDD + numero"
                />
                {erroTelefoneRapido && <span className="text-red-400 text-xs mt-1 ml-2 block">{erroTelefoneRapido}</span>}
              </div>

              <button
                type="submit"
                disabled={salvandoTelefoneRapido}
                className="w-full mt-6 bg-[#6be12f] hover:bg-[#8cf059] text-black font-bold py-4 rounded-2xl transition-all duration-300 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(34,197,94,0.2)] hover:shadow-[0_0_30px_rgba(34,197,94,0.4)] hover:-translate-y-1 disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:translate-y-0"
              >
                {salvandoTelefoneRapido ? <Loader2 size={20} className="animate-spin" /> : <>Continuar <ArrowRight size={18} /></>}
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
              <h1 className="text-2xl font-bold text-white mb-2 tracking-tight">Wi-Fi GrÃ¡tis</h1>
              <p className="text-gray-500 text-sm leading-relaxed">
                Preencha os dados abaixo para liberar seu acesso Ã  internet em <strong className="text-gray-300">{hotspot?.nome}</strong>.
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

              {cpfSolicitado && (
                <div className="relative group/input">
                  <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                    <FileText size={18} className="text-gray-600 group-focus-within/input:text-[#6be12f] transition-colors duration-300" />
                  </div>
                  <input
                    type="text"
                    value={form.cpf}
                    onChange={(e) => setForm({ ...form, cpf: e.target.value })}
                    className="w-full pl-12 pr-5 py-4 rounded-2xl bg-[#0a0a0a] text-white border border-white/[0.05] focus:border-[#6be12f]/30 focus:ring-1 focus:ring-[#6be12f]/30 transition-all duration-300 outline-none placeholder-gray-600 text-sm font-medium"
                    placeholder={cpfObrigatorio ? 'CPF' : 'CPF (opcional)'}
                  />
                  {erros.cpf && <span className="text-red-400 text-xs mt-1 ml-2 block">{erros.cpf}</span>}
                </div>
              )}

              {promocoesOptinAtivo && (
                <div className="pt-2">
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
                      {textoPromocoes}
                    </span>
                  </label>
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
                      PolÃ­tica de Privacidade
                    </button>.
                  </span>
                </label>
                {erros.aceite_lgpd && <span className="text-red-400 text-xs mt-2 ml-8 block">{erros.aceite_lgpd}</span>}
              </div>

              <button
                type="submit"
                disabled={salvando}
                className="w-full mt-6 bg-[#6be12f] hover:bg-[#8cf059] text-black font-bold py-4 rounded-2xl transition-all duration-300 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(34,197,94,0.2)] hover:shadow-[0_0_30px_rgba(34,197,94,0.4)] hover:-translate-y-1 disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:translate-y-0"
              >
                {salvando ? <Loader2 size={20} className="animate-spin" /> : <>Conectar Agora <ArrowRight size={18} /></>}
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
              style={{ width: `${progressoAnuncio}%` }}
            />
          </div>

          <div className="relative w-full h-full max-w-[calc(100vh*(9/16))] bg-[#0a0a0a] shadow-2xl flex items-center justify-center overflow-hidden">
            {anuncioAtual.media_url && anuncioEhVideo ? (
              <>
                <video
                  ref={videoAnuncioRef}
                  src={anuncioAtual.media_url}
                  className="w-full h-full object-cover"
                  playsInline
                  loop
                  preload="auto"
                />

                {!videoAnuncioPronto && (
                  <button
                    type="button"
                    onClick={iniciarVideoAnuncioComAudio}
                    className="absolute inset-0 z-20 cursor-pointer bg-gradient-to-t from-black/70 via-black/10 to-black/20 text-left"
                    aria-label="Iniciar anuncio com audio"
                  >
                    <div className="absolute inset-x-0 bottom-0 px-6 pb-10 pt-20 text-center">
                      <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[#6be12f] text-black shadow-[0_0_28px_rgba(107,225,47,0.45)]">
                        <ArrowRight size={30} />
                      </div>

                      <p className="text-xl font-bold text-white tracking-tight">Toque para seguir</p>
                      <p className="mx-auto mt-2 max-w-xs text-sm text-gray-200 leading-relaxed">
                        A internet serÃ¡ liberada apÃ³s o anÃºcio breve.
                      </p>

                      {erroVideoAnuncio ? (
                        <p className="mx-auto mt-3 max-w-xs text-xs text-red-200 leading-relaxed">{erroVideoAnuncio}</p>
                      ) : null}
                    </div>
                  </button>
                )}
              </>
            ) : anuncioAtual.media_url && anuncioAtual.tipo_media === 'imagem' ? (
              <img src={anuncioAtual.media_url} alt="AnÃºncio" className="w-full h-full object-cover" />
            ) : (
              <div className="text-gray-600 text-sm">MÃ­dia nÃ£o disponÃ­vel</div>
            )}
          </div>

          <div className="absolute top-6 right-6 z-20">
            <div className="bg-black/40 backdrop-blur-xl border border-white/[0.05] px-4 py-2 rounded-full flex items-center gap-2 shadow-lg">
              <Loader2 size={14} className="text-[#6be12f] animate-spin" />
              <span className="text-white text-sm font-medium tracking-wide">
                {anuncioEhVideo && !videoAnuncioPronto ? 'Toque para iniciar' : `Aguarde ${contador}s`}
              </span>
            </div>
          </div>
        </div>
      )}

      {etapa === ETAPAS.CTA && anuncioAtual && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-[#050505]/80 backdrop-blur-xl p-4">
          <div className="absolute inset-0 opacity-20 pointer-events-none">
            {anuncioAtual.media_url && anuncioAtual.tipo_media === 'video' ? (
              <video src={anuncioAtual.media_url} className="w-full h-full object-cover blur-3xl" autoPlay loop playsInline />
            ) : anuncioAtual.media_url && anuncioAtual.tipo_media === 'imagem' ? (
              <img src={anuncioAtual.media_url} className="w-full h-full object-cover blur-3xl" alt="Fundo anÃºncio" />
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
                {anuncioAtual.titulo || 'Oferta liberada!'}
              </h2>

              <p className="text-gray-400 text-sm mb-10 leading-relaxed">
                {anuncioAtual.descricao || 'Toque no botÃ£o abaixo para abrir a oferta do anunciante.'}
              </p>

              <div className="flex flex-col gap-4">
                {resolverDestinoAnuncio(anuncioAtual) && (
                  <button
                    type="button"
                    disabled={!internetLiberadaNaCta}
                    onClick={() => handleCtaClick(true, resolverDestinoAnuncio(anuncioAtual))}
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
                  NÃ£o, obrigado. Ir para o Wi-Fi
                </button>
              </div>
            </div>
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
              Sua internet foi liberada com sucesso. Aproveite a conexÃ£o em <strong className="text-gray-300">{hotspot?.nome}</strong>.
            </p>

            <div className="relative overflow-hidden rounded-2xl border border-[#6be12f]/25 bg-[#6be12f]/[0.06] px-4 py-4 mb-8 text-left">
              <div className="absolute inset-0 bg-gradient-to-r from-[#6be12f]/[0.08] via-transparent to-transparent pointer-events-none" />
              <div className="relative flex items-start gap-3">
                <div className="mt-0.5 w-8 h-8 rounded-full bg-[#6be12f]/10 border border-[#6be12f]/20 flex items-center justify-center flex-shrink-0">
                  <ShieldCheck size={16} className="text-[#6be12f]" />
                </div>

                <div>
                  <p className="text-[11px] uppercase tracking-[0.22em] text-[#6be12f] font-bold mb-2">
                    ObservaÃ§Ã£o importante
                  </p>
                  <p className="text-sm text-white leading-relaxed font-medium">
                    Se ficar sem internet, Ã© porque ficou inativo. Desligue e ligue seu Wi-Fi e entre novamente.
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
                {modalAberto === 'termos' ? <FileText className="text-[#6be12f]" size={24} /> : <Shield className="text-[#6be12f]" size={24} />}
                <h2 className="text-xl font-bold text-white">
                  {modalAberto === 'termos' ? 'Termos de Uso' : 'PolÃ­tica de Privacidade'}
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
              {modalAberto === 'termos' ? (
                <>
                  <p><strong>1. AceitaÃ§Ã£o dos Termos:</strong> Ao acessar a rede Wi-Fi patrocinada pela NexaWi ADS, vocÃª concorda com estes termos. O acesso Ã© fornecido de forma gratuita mediante a visualizaÃ§Ã£o de anÃºncios publicitÃ¡rios.</p>
                  <p><strong>2. Uso da Rede:</strong> A rede deve ser utilizada para fins lÃ­citos. Ã‰ estritamente proibido o uso para download de conteÃºdo ilegal, pirataria, ataques cibernÃ©ticos, spam ou qualquer atividade que viole as leis brasileiras.</p>
                  <p><strong>3. ExibiÃ§Ã£o de AnÃºncios:</strong> O acesso gratuito Ã  internet pode ser condicionado Ã  visualizaÃ§Ã£o de anÃºncios no momento de entrada ou retorno Ã  rede. A NexaWi ADS nÃ£o interrompe intencionalmente a navegaÃ§Ã£o ativa para exibir campanhas no meio do uso.</p>
                  <p><strong>4. RenovaÃ§Ã£o de Acesso:</strong> Para garantir a qualidade da rede para todos os usuÃ¡rios, a sessÃ£o poderÃ¡ ser encerrada em casos de inatividade, perda de alcance do sinal ou necessidade tÃ©cnica do ponto de acesso. Nesses casos, uma nova autenticaÃ§Ã£o poderÃ¡ ser exigida.</p>
                  <p><strong>5. IsenÃ§Ã£o de Responsabilidade:</strong> A NexaWi ADS e o estabelecimento parceiro nÃ£o se responsabilizam por falhas na conexÃ£o, perda de dados ou danos causados por malwares durante o uso da rede aberta. Recomendamos o uso de conexÃµes seguras (HTTPS) para transaÃ§Ãµes sensÃ­veis.</p>
                </>
              ) : (
                <>
                  <p><strong>1. Coleta de Dados:</strong> A NexaWi ADS coleta os dados fornecidos no momento do cadastro (Nome, E-mail, Telefone e, quando solicitado, CPF), bem como dados tÃ©cnicos de conexÃ£o (EndereÃ§o IP, MAC Address e tempo de sessÃ£o) para fins de autenticaÃ§Ã£o e seguranÃ§a.</p>
                  <p><strong>2. Finalidade do Uso (LGPD):</strong> Os dados coletados sÃ£o utilizados para: (a) Liberar o acesso Ã  rede Wi-Fi; (b) Cumprir obrigaÃ§Ãµes legais do Marco Civil da Internet (registro de logs); (c) Direcionar campanhas publicitÃ¡rias relevantes durante a sua navegaÃ§Ã£o; (d) ComunicaÃ§Ãµes de marketing do estabelecimento parceiro.</p>
                  <p><strong>3. Compartilhamento:</strong> Seus dados nÃ£o sÃ£o vendidos a terceiros. Eles podem ser compartilhados exclusivamente com o estabelecimento onde vocÃª estÃ¡ acessando a rede e com autoridades competentes mediante ordem judicial.</p>
                  <p><strong>4. SeguranÃ§a:</strong> Adotamos medidas tÃ©cnicas e administrativas para proteger seus dados pessoais contra acessos nÃ£o autorizados, destruiÃ§Ã£o ou alteraÃ§Ã£o, armazenando-os em servidores seguros.</p>
                  <p><strong>5. Seus Direitos:</strong> Conforme a Lei Geral de ProteÃ§Ã£o de Dados (Lei nÂº 13.709/2018), vocÃª tem o direito de solicitar a exclusÃ£o, alteraÃ§Ã£o ou visualizaÃ§Ã£o dos seus dados a qualquer momento, entrando em contato com o suporte da NexaWi ADS.</p>
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

