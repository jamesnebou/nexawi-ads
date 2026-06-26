'use client'

import { useMemo, useState } from 'react'
import { Poppins } from 'next/font/google'
import QRCode from 'qrcode'
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Copy,
  Download,
  ExternalLink,
  Eye,
  FileText,
  Globe2,
  Loader2,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  QrCode,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Type,
  Wifi,
  XCircle,
} from 'lucide-react'

type StaticType = 'link' | 'wifi' | 'whatsapp' | 'email' | 'telefone' | 'sms' | 'texto' | 'pix'
type Mode = 'static' | 'dynamic'

type QRItem = {
  id: string
  name: string
  slug: string
  type: string
  target_url: string | null
  status: string
  dynamic_url: string
  total_scans: number
  scans_today: number
  scans_7d: number
  scans_30d: number
  last_scan_at: string | null
  customer_name?: string | null
  location_name?: string | null
  campaign_name?: string | null
}

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
})

const staticTypes = [
  { value: 'link', label: 'Link/Site', icon: Globe2, description: 'Direcione para páginas, ofertas, cardápios ou campanhas.' },
  { value: 'wifi', label: 'Wi-Fi', icon: Wifi, description: 'Conecte o celular à rede usando QR Code.' },
  { value: 'whatsapp', label: 'WhatsApp', icon: MessageCircle, description: 'Abra conversa com mensagem pronta.' },
  { value: 'pix', label: 'Pix', icon: QrCode, description: 'Use um Pix copia e cola já gerado.' },
  { value: 'email', label: 'E-mail', icon: Mail, description: 'Crie uma mensagem de e-mail preenchida.' },
  { value: 'telefone', label: 'Telefone', icon: Phone, description: 'Abra ligação no celular.' },
  { value: 'sms', label: 'SMS', icon: MessageCircle, description: 'Abra SMS com texto pronto.' },
  { value: 'texto', label: 'Texto', icon: Type, description: 'Mostre qualquer informação em texto.' },
] as const

const dynamicTypes = [
  { value: 'link', label: 'Link' },
  { value: 'wifi', label: 'Wi-Fi dinâmico' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'maps', label: 'Google Maps' },
  { value: 'cardapio', label: 'Cardápio' },
  { value: 'campanha', label: 'Campanha' },
]

function cleanPhone(value: string) {
  return value.replace(/\D/g, '')
}

function formatDate(value: string | null) {
  if (!value) return 'Nenhum acesso ainda'

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value))
}

function statusLabel(status = '') {
  return status === 'active' ? 'Ativo' : 'Inativo'
}

export default function DashboardQrGeneratorPage() {
  const [mode, setMode] = useState<Mode>('static')
  const [staticType, setStaticType] = useState<StaticType>('link')
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [qrPayload, setQrPayload] = useState('')
  const [copied, setCopied] = useState('')
  const [message, setMessage] = useState('')

  const [link, setLink] = useState('https://www.nexawi.com.br')
  const [text, setText] = useState('')
  const [ssid, setSsid] = useState('WIFI CANDIDO SALES - NexaWi')
  const [wifiSecurity, setWifiSecurity] = useState<'nopass' | 'WPA'>('nopass')
  const [wifiPassword, setWifiPassword] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [emailSubject, setEmailSubject] = useState('')
  const [bodyMessage, setBodyMessage] = useState('')
  const [pixPayload, setPixPayload] = useState('')

  const [adminKey, setAdminKey] = useState('')
  const [dynamicName, setDynamicName] = useState('')
  const [dynamicSlug, setDynamicSlug] = useState('')
  const [dynamicTarget, setDynamicTarget] = useState('')
  const [dynamicType, setDynamicType] = useState('link')
  const [customerName, setCustomerName] = useState('')
  const [locationName, setLocationName] = useState('')
  const [campaignName, setCampaignName] = useState('')
  const [dynamicWifiSsid, setDynamicWifiSsid] = useState('WIFI CANDIDO SALES - NexaWi')
  const [dynamicWifiSecurity, setDynamicWifiSecurity] = useState<'nopass' | 'WPA'>('nopass')
  const [dynamicWifiPassword, setDynamicWifiPassword] = useState('')
  const [dynamicWifiHidden, setDynamicWifiHidden] = useState(false)
  const [dynamicResult, setDynamicResult] = useState('')
  const [loadingDynamic, setLoadingDynamic] = useState(false)
  const [loadingList, setLoadingList] = useState(false)
  const [items, setItems] = useState<QRItem[]>([])

  const payload = useMemo(() => {
    if (staticType === 'link') return link.trim()
    if (staticType === 'texto') return text.trim()

    if (staticType === 'wifi') {
      if (wifiSecurity === 'nopass') return 'WIFI:T:nopass;S:' + ssid + ';;'
      return 'WIFI:T:WPA;S:' + ssid + ';P:' + wifiPassword + ';;'
    }

    if (staticType === 'whatsapp') {
      const encodedMessage = encodeURIComponent(bodyMessage)
      return 'https://wa.me/' + cleanPhone(phone) + (encodedMessage ? '?text=' + encodedMessage : '')
    }

    if (staticType === 'email') {
      return 'mailto:' + email + '?subject=' + encodeURIComponent(emailSubject) + '&body=' + encodeURIComponent(bodyMessage)
    }

    if (staticType === 'telefone') return 'tel:' + cleanPhone(phone)
    if (staticType === 'sms') return 'sms:' + cleanPhone(phone) + '?body=' + encodeURIComponent(bodyMessage)
    if (staticType === 'pix') return pixPayload.trim()

    return ''
  }, [staticType, link, text, ssid, wifiSecurity, wifiPassword, phone, bodyMessage, email, emailSubject, pixPayload])

  const summary = useMemo(() => {
    const total = items.reduce((acc, item) => acc + Number(item.total_scans || 0), 0)
    const today = items.reduce((acc, item) => acc + Number(item.scans_today || 0), 0)
    const active = items.filter((item) => item.status === 'active').length
    const last = items
      .map((item) => item.last_scan_at)
      .filter(Boolean)
      .sort()
      .at(-1) || null

    return { total, today, active, last }
  }, [items])

  async function generateQRCode(content: string) {
    return QRCode.toDataURL(content, {
      errorCorrectionLevel: 'H',
      margin: 2,
      width: 1000,
      color: {
        dark: '#050505',
        light: '#ffffff',
      },
    })
  }

  async function generateStaticQR() {
    setMessage('')

    if (!payload) {
      setMessage('Preencha as informações antes de gerar o QR Code.')
      return
    }

    const dataUrl = await generateQRCode(payload)
    setQrPayload(payload)
    setQrDataUrl(dataUrl)
    setDynamicResult('')
  }

  async function loadQRCodes() {
    if (!adminKey.trim()) {
      setMessage('Informe a QR_ADMIN_KEY para carregar os QR Codes dinâmicos.')
      return
    }

    setLoadingList(true)
    setMessage('')

    try {
      const response = await fetch('/api/qrcodes', {
        headers: { 'x-admin-key': adminKey.trim() },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao carregar QR Codes.')
      }

      setItems(data.items || [])
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Erro ao carregar QR Codes.')
    } finally {
      setLoadingList(false)
    }
  }

  async function createDynamicQR() {
    if (!adminKey.trim()) {
      setMessage('Informe a QR_ADMIN_KEY antes de criar um QR dinâmico.')
      return
    }

    setLoadingDynamic(true)
    setMessage('')
    setDynamicResult('')

    try {
      const response = await fetch('/api/qrcodes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminKey.trim(),
        },
        body: JSON.stringify({
          name: dynamicName,
          slug: dynamicSlug,
          type: dynamicType,
          target_url: dynamicType === 'wifi' ? null : dynamicTarget,
          wifi_ssid: dynamicType === 'wifi' ? dynamicWifiSsid : null,
          wifi_security: dynamicType === 'wifi' ? dynamicWifiSecurity : null,
          wifi_password: dynamicType === 'wifi' ? dynamicWifiPassword : null,
          wifi_hidden: dynamicType === 'wifi' ? dynamicWifiHidden : false,
          customer_name: customerName || null,
          location_name: locationName || null,
          campaign_name: campaignName || null,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao criar QR dinâmico.')
      }

      const dynamicUrl = data.dynamic_url
      const dataUrl = await generateQRCode(dynamicUrl)

      setDynamicResult(dynamicUrl)
      setQrPayload(dynamicUrl)
      setQrDataUrl(dataUrl)
      setMode('dynamic')
      await loadQRCodes()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Erro ao criar QR dinâmico.')
    } finally {
      setLoadingDynamic(false)
    }
  }

  async function updateQRCode(item: QRItem, updates: Record<string, string>) {
    if (!adminKey.trim()) {
      setMessage('Informe a QR_ADMIN_KEY antes de editar.')
      return
    }

    setMessage('')

    try {
      const response = await fetch('/api/qrcodes/' + item.id, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminKey.trim(),
        },
        body: JSON.stringify(updates),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao atualizar QR Code.')
      }

      await loadQRCodes()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Erro ao atualizar QR Code.')
    }
  }

  async function changeTarget(item: QRItem) {
    const newTarget = window.prompt('Novo destino:', item.target_url || '')
    if (!newTarget || newTarget === item.target_url) return
    await updateQRCode(item, { target_url: newTarget })
  }

  async function toggleStatus(item: QRItem) {
    await updateQRCode(item, {
      status: item.status === 'active' ? 'inactive' : 'active',
    })
  }

  function downloadPNG() {
    if (!qrDataUrl) return

    const linkElement = document.createElement('a')
    linkElement.href = qrDataUrl
    linkElement.download = 'nexawi-qrcode.png'
    linkElement.click()
  }

  async function copyText(value: string, label: string) {
    if (!value) return

    await navigator.clipboard.writeText(value)
    setCopied(label)
    window.setTimeout(() => setCopied(''), 1800)
  }

  return (
    <div className={poppins.className + ' min-h-screen max-w-full overflow-x-hidden bg-[#050505] text-white'}>
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(107,225,47,0.10),transparent_32%),radial-gradient(circle_at_top_right,rgba(255,122,0,0.08),transparent_30%)]" />

      <div className="mx-auto w-full max-w-[1600px] space-y-6">
        <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#6be12f]/30 bg-[#6be12f]/10 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-[#6be12f] shadow-[0_0_25px_rgba(107,225,47,0.08)]">
              <Sparkles size={15} /> Geradores NexaWi
            </div>
            <h1 className="text-4xl font-black tracking-tight sm:text-5xl">Gerador de QR Code</h1>
            <p className="mt-3 text-base leading-relaxed text-gray-500">
              Crie QR Codes profissionais para campanhas, pontos Wi-Fi, materiais impressos, cardápios, WhatsApp, Pix e links rastreáveis da NexaWi.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <MiniMetric label="QRs ativos" value={summary.active} icon={ShieldCheck} />
            <MiniMetric label="Acessos hoje" value={summary.today} icon={Eye} />
            <MiniMetric label="Acessos totais" value={summary.total} icon={BarChart3} />
          </div>
        </header>

        {message ? (
          <div className="rounded-2xl border border-yellow-500/25 bg-yellow-500/10 px-5 py-4 text-sm font-bold text-yellow-100">
            {message}
          </div>
        ) : null}

        <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
          <div className="rounded-3xl border border-white/[0.06] bg-white/[0.025] p-3 shadow-[0_24px_90px_rgba(0,0,0,0.25)] backdrop-blur-xl sm:p-5">
            <div className="mb-5 grid gap-3 sm:grid-cols-2">
              <ModeButton active={mode === 'static'} title="QR Estático" description="Rápido, direto e sem painel de rastreamento." icon={QrCode} onClick={() => setMode('static')} />
              <ModeButton active={mode === 'dynamic'} title="QR Dinâmico" description="Destino editável, métricas e gestão de acessos." icon={RefreshCw} onClick={() => setMode('dynamic')} />
            </div>

            {mode === 'static' ? (
              <div className="space-y-5">
                <div>
                  <h2 className="text-2xl font-black">Escolha o tipo de QR</h2>
                  <p className="mt-1 text-sm text-gray-500">Use QR estático quando o conteúdo não precisa mudar depois de impresso.</p>
                </div>

                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  {staticTypes.map((item) => {
                    const Icon = item.icon
                    const active = staticType === item.value
                    return (
                      <button
                        key={item.value}
                        type="button"
                        onClick={() => setStaticType(item.value)}
                        className={'rounded-2xl border p-4 text-left transition-all ' + (active ? 'border-[#6be12f]/45 bg-[#6be12f]/10 shadow-[0_0_30px_rgba(107,225,47,0.08)]' : 'border-white/[0.06] bg-[#0a0a0a] hover:border-white/[0.12]')}
                      >
                        <div className="mb-3 flex items-center justify-between gap-2">
                          <div className={'rounded-xl border p-2 ' + (active ? 'border-[#6be12f]/25 bg-[#6be12f]/10 text-[#6be12f]' : 'border-white/[0.06] bg-white/[0.03] text-gray-500')}>
                            <Icon size={18} />
                          </div>
                          {active ? <CheckCircle2 size={18} className="text-[#6be12f]" /> : null}
                        </div>
                        <p className="font-black text-white">{item.label}</p>
                        <p className="mt-1 text-xs leading-relaxed text-gray-600">{item.description}</p>
                      </button>
                    )
                  })}
                </div>

                <div className="rounded-3xl border border-white/[0.06] bg-[#0a0a0a] p-4 sm:p-5">
                  <QRStaticFields
                    staticType={staticType}
                    link={link}
                    setLink={setLink}
                    text={text}
                    setText={setText}
                    ssid={ssid}
                    setSsid={setSsid}
                    wifiSecurity={wifiSecurity}
                    setWifiSecurity={setWifiSecurity}
                    wifiPassword={wifiPassword}
                    setWifiPassword={setWifiPassword}
                    phone={phone}
                    setPhone={setPhone}
                    bodyMessage={bodyMessage}
                    setBodyMessage={setBodyMessage}
                    email={email}
                    setEmail={setEmail}
                    emailSubject={emailSubject}
                    setEmailSubject={setEmailSubject}
                    pixPayload={pixPayload}
                    setPixPayload={setPixPayload}
                  />

                  <button
                    type="button"
                    onClick={generateStaticQR}
                    className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#6be12f] px-5 py-4 text-sm font-black text-black shadow-[0_0_30px_rgba(107,225,47,0.14)] transition hover:brightness-110"
                  >
                    Gerar QR Code <ArrowRight size={18} />
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                <div>
                  <h2 className="text-2xl font-black">QR dinâmico rastreável</h2>
                  <p className="mt-1 text-sm text-gray-500">Ideal para materiais impressos, campanhas e locais onde o destino pode mudar sem reimprimir o QR.</p>
                </div>

                <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
                  <PanelCard title="Acesso administrativo" description="Use a QR_ADMIN_KEY para criar, listar e editar QR Codes dinâmicos.">
                    <Field label="Chave Admin" value={adminKey} onChange={setAdminKey} placeholder="QR_ADMIN_KEY" type="password" />
                  </PanelCard>

                  <PanelCard title="Identificação comercial" description="Ajuda a organizar campanhas, clientes e locais no painel.">
                    <div className="grid gap-3 sm:grid-cols-3">
                      <Field label="Cliente" value={customerName} onChange={setCustomerName} placeholder="NexaWi ADS" />
                      <Field label="Local" value={locationName} onChange={setLocationName} placeholder="Praça Central" />
                      <Field label="Campanha" value={campaignName} onChange={setCampaignName} placeholder="Oferta Junho" />
                    </div>
                  </PanelCard>
                </div>

                <div className="rounded-3xl border border-white/[0.06] bg-[#0a0a0a] p-4 sm:p-5">
                  <div className="grid gap-4 lg:grid-cols-2">
                    <Field label="Nome do QR" value={dynamicName} onChange={setDynamicName} placeholder="QR Rio Branco" />
                    <Field label="Slug" value={dynamicSlug} onChange={setDynamicSlug} placeholder="rio-branco" />
                  </div>

                  <div className="mt-4 grid gap-4 lg:grid-cols-[260px_1fr]">
                    <label className="block">
                      <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-gray-600">Tipo</span>
                      <select
                        value={dynamicType}
                        onChange={(event) => setDynamicType(event.target.value)}
                        className="w-full rounded-2xl border border-white/[0.08] bg-black px-4 py-3 text-sm font-bold text-white outline-none focus:border-[#6be12f]/60"
                      >
                        {dynamicTypes.map((item) => (
                          <option key={item.value} value={item.value}>{item.label}</option>
                        ))}
                      </select>
                    </label>

                    {dynamicType === 'wifi' ? (
                      <div className="grid gap-4 lg:grid-cols-[1fr_180px]">
                        <Field label="Nome da rede Wi-Fi" value={dynamicWifiSsid} onChange={setDynamicWifiSsid} placeholder="WIFI CANDIDO SALES - NexaWi" />
                        <label className="block">
                          <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-gray-600">Segurança</span>
                          <select
                            value={dynamicWifiSecurity}
                            onChange={(event) => setDynamicWifiSecurity(event.target.value as 'nopass' | 'WPA')}
                            className="w-full rounded-2xl border border-white/[0.08] bg-black px-4 py-3 text-sm font-bold text-white outline-none focus:border-[#6be12f]/60"
                          >
                            <option value="nopass">Aberta</option>
                            <option value="WPA">WPA/WPA2</option>
                          </select>
                        </label>
                        {dynamicWifiSecurity === 'WPA' ? (
                          <Field label="Senha do Wi-Fi" value={dynamicWifiPassword} onChange={setDynamicWifiPassword} />
                        ) : null}
                        <label className="flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-black px-4 py-3 text-sm font-bold text-gray-300">
                          <input type="checkbox" checked={dynamicWifiHidden} onChange={(event) => setDynamicWifiHidden(event.target.checked)} className="h-5 w-5 accent-[#6be12f]" />
                          Rede oculta
                        </label>
                      </div>
                    ) : (
                      <Field label="Destino" value={dynamicTarget} onChange={setDynamicTarget} placeholder="https://..." />
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={createDynamicQR}
                    disabled={loadingDynamic}
                    className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#6be12f] px-5 py-4 text-sm font-black text-black disabled:opacity-70"
                  >
                    {loadingDynamic ? <Loader2 size={18} className="animate-spin" /> : <RefreshCw size={18} />}
                    Criar QR dinâmico
                  </button>
                </div>
              </div>
            )}
          </div>

          <aside className="rounded-3xl border border-white/[0.06] bg-white/[0.025] p-4 shadow-[0_24px_90px_rgba(0,0,0,0.25)] backdrop-blur-xl sm:p-5">
            <div className="mb-5">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#6be12f]">Preview profissional</p>
              <h2 className="mt-1 text-2xl font-black">Resultado</h2>
              <p className="mt-1 text-sm text-gray-500">Prévia pronta para baixar e usar em impressão, balcão, adesivo ou campanha.</p>
            </div>

            {qrDataUrl ? (
              <div className="space-y-4">
                <div className="relative overflow-hidden rounded-3xl border border-[#6be12f]/20 bg-white p-5 shadow-[0_0_45px_rgba(107,225,47,0.08)]">
                  <img src={qrDataUrl} alt="QR Code NexaWi" className="w-full rounded-2xl" />
                  <div className="pointer-events-none absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-2xl border border-black/10 bg-white shadow-xl">
                    <img src="/simbolo-verde.png" alt="NexaWi" className="max-h-9 max-w-12 object-contain" />
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <button type="button" onClick={downloadPNG} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-black text-black">
                    <Download size={17} /> Baixar PNG
                  </button>
                  <button type="button" onClick={() => copyText(qrPayload, 'payload')} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm font-black text-white">
                    <Copy size={17} /> {copied === 'payload' ? 'Copiado' : 'Copiar conteúdo'}
                  </button>
                </div>

                {dynamicResult ? (
                  <a href={dynamicResult} target="_blank" className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-[#ff7a00]/30 bg-[#ff7a00]/10 px-4 py-3 text-sm font-black text-[#ffb15c]">
                    Abrir QR dinâmico <ExternalLink size={16} />
                  </a>
                ) : null}

                <textarea readOnly value={qrPayload} className="h-28 w-full resize-none rounded-2xl border border-white/[0.08] bg-black px-4 py-3 text-xs text-gray-400 outline-none" />
              </div>
            ) : (
              <div className="flex min-h-[420px] flex-col items-center justify-center rounded-3xl border border-dashed border-white/[0.08] bg-black/30 px-6 text-center">
                <div className="mb-5 rounded-3xl border border-[#6be12f]/20 bg-[#6be12f]/10 p-5 text-[#6be12f]">
                  <QrCode size={44} />
                </div>
                <p className="text-xl font-black">Seu QR aparecerá aqui</p>
                <p className="mt-2 max-w-xs text-sm leading-relaxed text-gray-500">
                  Preencha os dados, gere o QR e baixe uma versão em alta resolução.
                </p>
              </div>
            )}
          </aside>
        </section>

        <section className="rounded-3xl border border-white/[0.06] bg-white/[0.025] p-4 backdrop-blur-xl sm:p-5">
          <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#ff9d2e]">Painel de gestão</p>
              <h2 className="mt-1 text-2xl font-black">QR Codes dinâmicos</h2>
              <p className="mt-1 text-sm text-gray-500">Acompanhe acessos, edite destinos e desative QR Codes sem perder histórico.</p>
            </div>

            <button type="button" onClick={loadQRCodes} disabled={loadingList} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-5 py-3 text-sm font-black text-white disabled:opacity-70">
              {loadingList ? <Loader2 size={17} className="animate-spin" /> : <RefreshCw size={17} />}
              Carregar painel
            </button>
          </div>

          <div className="mb-5 grid gap-3 md:grid-cols-4">
            <InfoCard label="Ativos" value={summary.active} icon={ShieldCheck} />
            <InfoCard label="Acessos hoje" value={summary.today} icon={Eye} />
            <InfoCard label="Total de acessos" value={summary.total} icon={BarChart3} />
            <InfoCard label="Último acesso" value={formatDate(summary.last)} icon={RefreshCw} compact />
          </div>

          {items.length ? (
            <div className="overflow-x-auto rounded-3xl border border-white/[0.06] bg-[#0a0a0a]">
              <table className="w-full min-w-[1120px] text-left text-sm">
                <thead className="border-b border-white/[0.06] bg-white/[0.03] text-[10px] font-black uppercase tracking-[0.16em] text-gray-600">
                  <tr>
                    <th className="px-4 py-4">QR Code</th>
                    <th className="px-4 py-4">Destino</th>
                    <th className="px-4 py-4">Status</th>
                    <th className="px-4 py-4">Hoje</th>
                    <th className="px-4 py-4">7 dias</th>
                    <th className="px-4 py-4">30 dias</th>
                    <th className="px-4 py-4">Total</th>
                    <th className="px-4 py-4">Último acesso</th>
                    <th className="px-4 py-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className="border-b border-white/[0.04] align-top last:border-b-0">
                      <td className="px-4 py-4">
                        <p className="font-black text-white">{item.name}</p>
                        <p className="mt-1 text-xs text-gray-600">{item.type} · /q/{item.slug}</p>
                        <div className="mt-2 flex flex-wrap gap-1.5 text-[10px] font-bold text-gray-500">
                          {item.customer_name ? <span className="rounded-full bg-white/[0.04] px-2 py-1">{item.customer_name}</span> : null}
                          {item.location_name ? <span className="rounded-full bg-white/[0.04] px-2 py-1">{item.location_name}</span> : null}
                          {item.campaign_name ? <span className="rounded-full bg-white/[0.04] px-2 py-1">{item.campaign_name}</span> : null}
                        </div>
                      </td>
                      <td className="max-w-[280px] px-4 py-4">
                        <p className="truncate text-xs text-gray-500">{item.target_url || item.dynamic_url}</p>
                        <button type="button" onClick={() => copyText(item.dynamic_url, item.id)} className="mt-2 inline-flex items-center gap-1 text-xs font-black text-[#6be12f]">
                          <Copy size={12} /> {copied === item.id ? 'Copiado' : 'Copiar link'}
                        </button>
                      </td>
                      <td className="px-4 py-4">
                        <span className={'inline-flex rounded-full px-3 py-1 text-[10px] font-black uppercase ' + (item.status === 'active' ? 'bg-[#6be12f]/15 text-[#6be12f]' : 'bg-red-500/15 text-red-300')}>
                          {statusLabel(item.status)}
                        </span>
                      </td>
                      <td className="px-4 py-4 font-black text-white">{item.scans_today}</td>
                      <td className="px-4 py-4 font-black text-white">{item.scans_7d}</td>
                      <td className="px-4 py-4 font-black text-white">{item.scans_30d}</td>
                      <td className="px-4 py-4 font-black text-white">{item.total_scans}</td>
                      <td className="whitespace-nowrap px-4 py-4 text-xs text-gray-500">{formatDate(item.last_scan_at)}</td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap justify-end gap-2">
                          <a href={item.dynamic_url} target="_blank" className="inline-flex items-center gap-1 rounded-xl border border-white/[0.08] px-3 py-2 text-xs font-black text-gray-300">
                            <ExternalLink size={13} /> Abrir
                          </a>
                          <button type="button" onClick={() => changeTarget(item)} className="rounded-xl border border-white/[0.08] px-3 py-2 text-xs font-black text-gray-300">
                            Editar destino
                          </button>
                          <button type="button" onClick={() => toggleStatus(item)} className={'inline-flex items-center gap-1 rounded-xl border px-3 py-2 text-xs font-black ' + (item.status === 'active' ? 'border-red-500/20 text-red-300' : 'border-[#6be12f]/20 text-[#6be12f]')}>
                            {item.status === 'active' ? <XCircle size={13} /> : <CheckCircle2 size={13} />}
                            {item.status === 'active' ? 'Desativar' : 'Ativar'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-white/[0.08] bg-black/20 px-6 py-12 text-center">
              <QrCode className="mx-auto text-gray-700" size={44} />
              <p className="mt-4 text-lg font-black text-white">Nenhum QR dinâmico carregado</p>
              <p className="mt-2 text-sm text-gray-500">Informe a chave admin e clique em carregar painel para ver o histórico.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

function QRStaticFields(props: {
  staticType: StaticType
  link: string
  setLink: (value: string) => void
  text: string
  setText: (value: string) => void
  ssid: string
  setSsid: (value: string) => void
  wifiSecurity: 'nopass' | 'WPA'
  setWifiSecurity: (value: 'nopass' | 'WPA') => void
  wifiPassword: string
  setWifiPassword: (value: string) => void
  phone: string
  setPhone: (value: string) => void
  bodyMessage: string
  setBodyMessage: (value: string) => void
  email: string
  setEmail: (value: string) => void
  emailSubject: string
  setEmailSubject: (value: string) => void
  pixPayload: string
  setPixPayload: (value: string) => void
}) {
  if (props.staticType === 'link') return <Field label="Link ou site" value={props.link} onChange={props.setLink} placeholder="https://www.nexawi.com.br" />
  if (props.staticType === 'texto') return <Textarea label="Texto" value={props.text} onChange={props.setText} placeholder="Digite o conteúdo que será salvo no QR." />

  if (props.staticType === 'wifi') {
    return (
      <div className="grid gap-4 lg:grid-cols-[1fr_180px]">
        <Field label="Nome da rede Wi-Fi" value={props.ssid} onChange={props.setSsid} />
        <label className="block">
          <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-gray-600">Segurança</span>
          <select value={props.wifiSecurity} onChange={(event) => props.setWifiSecurity(event.target.value as 'nopass' | 'WPA')} className="w-full rounded-2xl border border-white/[0.08] bg-black px-4 py-3 text-sm font-bold text-white outline-none focus:border-[#6be12f]/60">
            <option value="nopass">Aberta</option>
            <option value="WPA">WPA/WPA2</option>
          </select>
        </label>
        {props.wifiSecurity === 'WPA' ? <Field label="Senha" value={props.wifiPassword} onChange={props.setWifiPassword} /> : null}
      </div>
    )
  }

  if (props.staticType === 'whatsapp' || props.staticType === 'telefone' || props.staticType === 'sms') {
    return (
      <div className="grid gap-4 lg:grid-cols-2">
        <Field label="Telefone com DDD e país" value={props.phone} onChange={props.setPhone} placeholder="5577999999999" />
        {props.staticType !== 'telefone' ? <Textarea label="Mensagem" value={props.bodyMessage} onChange={props.setBodyMessage} /> : null}
      </div>
    )
  }

  if (props.staticType === 'email') {
    return (
      <div className="grid gap-4 lg:grid-cols-2">
        <Field label="E-mail" value={props.email} onChange={props.setEmail} />
        <Field label="Assunto" value={props.emailSubject} onChange={props.setEmailSubject} />
        <div className="lg:col-span-2">
          <Textarea label="Mensagem" value={props.bodyMessage} onChange={props.setBodyMessage} />
        </div>
      </div>
    )
  }

  if (props.staticType === 'pix') return <Textarea label="Pix copia e cola" value={props.pixPayload} onChange={props.setPixPayload} placeholder="Cole o payload Pix completo." />

  return null
}

function Field({ label, value, onChange, placeholder, type = 'text' }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; type?: string }) {
  return (
    <label className="block">
      <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-gray-600">{label}</span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-white/[0.08] bg-black px-4 py-3 text-sm font-bold text-white outline-none transition focus:border-[#6be12f]/60"
      />
    </label>
  )
}

function Textarea({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  return (
    <label className="block">
      <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-gray-600">{label}</span>
      <textarea
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-28 w-full resize-y rounded-2xl border border-white/[0.08] bg-black px-4 py-3 text-sm font-bold text-white outline-none transition focus:border-[#6be12f]/60"
      />
    </label>
  )
}

function ModeButton({ active, title, description, icon: Icon, onClick }: { active: boolean; title: string; description: string; icon: typeof QrCode; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={'rounded-2xl border p-4 text-left transition-all ' + (active ? 'border-[#6be12f]/45 bg-[#6be12f]/10' : 'border-white/[0.06] bg-[#0a0a0a] hover:border-white/[0.12]')}>
      <div className="flex items-start gap-3">
        <div className={'rounded-xl border p-2 ' + (active ? 'border-[#6be12f]/25 bg-[#6be12f]/10 text-[#6be12f]' : 'border-white/[0.06] bg-white/[0.03] text-gray-500')}>
          <Icon size={20} />
        </div>
        <div>
          <p className="font-black text-white">{title}</p>
          <p className="mt-1 text-xs leading-relaxed text-gray-500">{description}</p>
        </div>
      </div>
    </button>
  )
}

function PanelCard({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-white/[0.06] bg-[#0a0a0a] p-4">
      <p className="font-black text-white">{title}</p>
      <p className="mb-4 mt-1 text-sm text-gray-500">{description}</p>
      {children}
    </div>
  )
}

function MiniMetric({ label, value, icon: Icon }: { label: string; value: number; icon: typeof QrCode }) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.025] px-4 py-3 backdrop-blur-xl">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-gray-600">{label}</p>
          <p className="mt-1 text-2xl font-black text-white">{value}</p>
        </div>
        <div className="rounded-xl border border-[#6be12f]/20 bg-[#6be12f]/10 p-2 text-[#6be12f]">
          <Icon size={18} />
        </div>
      </div>
    </div>
  )
}

function InfoCard({ label, value, icon: Icon, compact = false }: { label: string; value: string | number; icon: typeof QrCode; compact?: boolean }) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-[#0a0a0a] p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-gray-600">{label}</p>
        <div className="rounded-xl border border-[#ff7a00]/20 bg-[#ff7a00]/10 p-1.5 text-[#ff9d2e]">
          <Icon size={15} />
        </div>
      </div>
      <p className={(compact ? 'text-sm' : 'text-2xl') + ' truncate font-black text-white'}>{value}</p>
    </div>
  )
}
