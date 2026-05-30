'use client'

import { useEffect, useRef, useState } from 'react'
import {
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  ChevronDown,
  Layers3,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  Zap,
} from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'
import { LP_GENERATOR_ORDERABLE_SECTIONS } from '@/lib/lp-generator-defaults'

function sectionStyle(config) {
  return {
    '--primary': config.identidade.corPrimaria,
    '--secondary': config.identidade.corSecundaria,
    '--page-bg': config.identidade.corFundo,
    '--page-text': config.identidade.corTexto,
    '--page-muted': config.identidade.corTextoSuave,
  }
}

function Cta({ href, children, variant = 'primary', className = '' }) {
  const variantClassName = variant === 'ghost'
    ? 'border border-white/12 bg-white/[0.04] text-white hover:bg-white/[0.08]'
    : 'bg-[var(--primary)] text-black shadow-[0_18px_60px_rgba(0,0,0,0.34)] hover:brightness-110'

  return (
    <a
      href={href || '#formulario'}
      className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-black transition ${variantClassName} ${className}`}
    >
      {children}
      <ArrowRight size={17} />
    </a>
  )
}

function Metric({ value, label }) {
  return (
    <div className="min-w-0">
      <p className="text-2xl font-black tracking-tight text-white sm:text-3xl">{value}</p>
      <p className="mt-1 text-xs font-bold uppercase tracking-[0.18em] text-[var(--page-muted)]">{label}</p>
    </div>
  )
}

function visibleItems(items = [], keys = []) {
  return items.filter((item) => keys.some((key) => String(item?.[key] || '').trim()))
}

function sectionBackgroundStyle(backgroundUrl, gradient = 'linear-gradient(120deg, rgba(5,5,5,.96), rgba(5,5,5,.84))') {
  if (!backgroundUrl) return undefined

  return {
    backgroundImage: `${gradient}, url(${backgroundUrl})`,
    backgroundPosition: 'center',
    backgroundSize: 'cover',
  }
}

function trackLead(page) {
  const pageSlug = page?.slug || ''

  window.dataLayer = window.dataLayer || []
  window.dataLayer.push({
    event: 'lp_generate_lead',
    lp_slug: pageSlug,
  })

  if (typeof window.gtag === 'function') {
    window.gtag('event', 'generate_lead', {
      lp_slug: pageSlug,
    })
  }

  if (typeof window.fbq === 'function') {
    window.fbq('track', 'Lead')
  }
}

function VisualPanel({ config }) {
  const previewCards = normalizePreviewCards(config.textos?.previewCards)

  if (config.hero.imagemUrl) {
    return (
      <div className="relative isolate flex min-h-[260px] items-center justify-center sm:min-h-[360px]">
        <div className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[78%] w-[78%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--primary)]/15 blur-3xl" />
        <div className="pointer-events-none absolute bottom-[8%] left-[12%] -z-10 h-24 w-24 rounded-full bg-[var(--secondary)]/15 blur-3xl" />
        <img
          src={config.hero.imagemUrl}
          alt=""
          className="relative max-h-[min(58vh,560px)] w-full max-w-[680px] object-contain drop-shadow-[0_30px_70px_rgba(0,0,0,0.56)] sm:max-h-[min(76vh,760px)]"
        />
      </div>
    )
  }

  return (
    <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(145deg,rgba(255,255,255,.09),rgba(255,255,255,.015))] p-4 shadow-2xl shadow-black/50">
      <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,var(--primary),transparent)] opacity-70" />
      <div className="rounded-[1.5rem] border border-white/10 bg-black/80 p-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[var(--primary)]">{textOr(config.textos?.previewEyebrow, 'Live preview')}</p>
            <p className="mt-1 text-sm font-black text-white">{config.identidade.marca}</p>
          </div>
          <div className="rounded-full border border-[var(--primary)]/30 bg-[var(--primary)]/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-[var(--primary)]">
            {textOr(config.textos?.previewStatus, 'Online')}
          </div>
        </div>

        <div className="grid gap-3 py-5">
          <div className="h-3 w-28 rounded-full bg-white/20" />
          <div className="h-5 w-4/5 rounded-full bg-white/80" />
          <div className="h-5 w-3/5 rounded-full bg-white/55" />
          <div className="mt-2 grid gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3">
            <div className="h-2 w-2/3 rounded-full bg-[var(--primary)]/70" />
            <div className="h-2 w-full rounded-full bg-white/15" />
            <div className="h-2 w-4/5 rounded-full bg-white/10" />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {previewCards.map((item, index) => (
            <div key={`${item.numero}-${item.texto}-${index}`} className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
              <p className="text-lg font-black text-white">{item.numero}</p>
              <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-[var(--page-muted)]">{item.texto}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function BrandMark({ config, compact = false }) {
  if (config.identidade.logoUrl) {
    return (
      <img
        src={config.identidade.logoUrl}
        alt={config.identidade.marca}
        className={`${compact ? 'h-8' : 'h-9'} w-auto max-w-[180px] object-contain`}
      />
    )
  }

  return (
    <div className={`flex ${compact ? 'h-8 w-8' : 'h-9 w-9'} shrink-0 items-center justify-center rounded-full bg-[var(--primary)] text-sm font-black text-black`}>
      {config.identidade.marca?.charAt(0) || 'L'}
    </div>
  )
}

function footerLinkVisible(enabled, href) {
  return Boolean(enabled && String(href || '').trim())
}

function buildFloatingWhatsappUrl(config) {
  const phone = String(config.rodape.whatsappNumero || '').replace(/\D/g, '')
  if (!phone) return ''

  const brand = config.identidade.marca || 'sua empresa'
  const template = textOr(
    config.textos?.whatsappMensagem,
    'Ola [Nome da empresa], vim pelo seu site e queria saber mais informacoes.'
  )
  const message = template.replace(/\[Nome da empresa\]/g, brand)
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
}

function emptyLeadForm() {
  return { nome: '', email: '', telefone: '', mensagem: '', camposExtras: {} }
}

function formFieldVisible(field) {
  return Boolean(field?.ativo)
}

function formFieldLabel(field, fallback) {
  return field?.rotulo || fallback
}

function cleanCustomFormFields(fields = []) {
  return fields
    .filter((field) => String(field?.rotulo || '').trim())
    .slice(0, 8)
    .map((field, index) => ({
      ...field,
      id: field.id || `campo-${index + 1}`,
    }))
}

function cleanText(value) {
  return String(value || '').trim()
}

function textOr(value, fallback) {
  return cleanText(value) || fallback
}

function normalizePreviewCards(items = []) {
  const fallback = [
    { numero: '01', texto: 'Oferta' },
    { numero: '02', texto: 'Prova' },
    { numero: '03', texto: 'Lead' },
  ]

  const valid = (Array.isArray(items) ? items : [])
    .map((item, index) => ({
      numero: textOr(item?.numero, `0${index + 1}`),
      texto: cleanText(item?.texto),
    }))
    .filter((item) => item.texto)

  return valid.length ? valid.slice(0, 3) : fallback
}

function normalizeMetrics(items = [], fallback = []) {
  const valid = (Array.isArray(items) ? items : [])
    .map((item) => ({
      value: cleanText(item?.value || item?.valor),
      label: cleanText(item?.label || item?.rotulo),
    }))
    .filter((item) => item.value || item.label)

  return valid.length ? valid.slice(0, 3) : fallback
}

function normalizeSignals(items = [], fallback = []) {
  const icons = [Zap, ShieldCheck, MessageCircle]
  const valid = (Array.isArray(items) ? items : [])
    .map((item, index) => ({
      icon: fallback[index]?.icon || icons[index % icons.length],
      title: cleanText(item?.titulo || item?.title),
      text: cleanText(item?.texto || item?.text),
    }))
    .filter((item) => item.title || item.text)

  return valid.length ? valid.slice(0, 3) : fallback
}

function normalizeTextList(items = [], fallback = []) {
  const valid = (Array.isArray(items) ? items : [])
    .map((item) => cleanText(typeof item === 'string' ? item : item?.texto || item?.label || item?.titulo))
    .filter(Boolean)

  return valid.length ? valid : fallback
}

function getEditableTextContent(config, layoutContent) {
  const textos = config.textos || {}

  return {
    heroBotaoSecundario: textOr(textos.heroBotaoSecundario, 'Ver detalhes'),
    heroScrollTexto: textOr(textos.heroScrollTexto, 'Descer'),
    metrics: normalizeMetrics(textos.metricas, layoutContent.metrics),
    signals: normalizeSignals(textos.sinais, layoutContent.signals),
    benefitEyebrow: textOr(textos.beneficiosEyebrow, layoutContent.benefitEyebrow),
    benefitIntro: textOr(textos.beneficiosIntro, layoutContent.benefitIntro),
    proofIntro: textOr(textos.provaIntro, layoutContent.proofIntro),
    ofertaEyebrow: textOr(textos.ofertaEyebrow, 'Oferta principal'),
    offerBullets: normalizeTextList(textos.ofertaItens, layoutContent.offerBullets),
    ofertaCondicaoLabel: textOr(textos.ofertaCondicaoLabel, 'Condicao'),
    ofertaTextoAuxiliar: textOr(textos.ofertaTextoAuxiliar, 'Direcione o visitante para o proximo passo sem excesso de texto.'),
    formBullets: normalizeTextList(textos.formularioItens, layoutContent.formBullets),
    faqEyebrow: textOr(textos.faqEyebrow, 'Duvidas'),
    planoDestaqueTexto: textOr(textos.planoDestaqueTexto, 'Destaque'),
    planoCtaFallback: textOr(textos.planoCtaFallback, 'Escolher plano'),
    formularioEnviandoTexto: textOr(textos.formularioEnviandoTexto, 'Enviando...'),
    rodapeTermosTexto: textOr(textos.rodapeTermosTexto, 'Termos de Uso'),
    rodapePrivacidadeTexto: textOr(textos.rodapePrivacidadeTexto, 'Privacidade'),
    rodapeContatoTexto: textOr(textos.rodapeContatoTexto, 'Contato'),
    rodapeInstagramTexto: textOr(textos.rodapeInstagramTexto, 'Instagram'),
  }
}

function getTemplateLayoutContent(templateLayout = 'conversion-flow') {
  const layouts = {
    'local-service': {
      metrics: [
        { value: 'Hoje', label: 'resposta' },
        { value: 'Local', label: 'regiao' },
        { value: '1 clique', label: 'contato' },
      ],
      signals: [
        { icon: Zap, title: 'Urgencia real', text: 'A pagina mostra que o atendimento pode resolver agora.' },
        { icon: ShieldCheck, title: 'Confianca local', text: 'Proximidade, clareza e prova deixam o contato mais seguro.' },
        { icon: MessageCircle, title: 'WhatsApp em foco', text: 'O visitante encontra o caminho direto para pedir atendimento.' },
      ],
      benefitEyebrow: 'Atendimento local',
      benefitIntro: 'Esse modelo prioriza velocidade, regiao atendida e contato direto para transformar procura em conversa.',
      proofIntro: 'Prova simples e local reduz receio antes do primeiro contato.',
      offerBullets: ['Area atendida', 'Prazo claro', 'Contato direto'],
      formBullets: ['Pedido chega com contexto', 'Atendimento mais rapido', 'Lead pronto para WhatsApp'],
    },
    'clinic-editorial': {
      metrics: [
        { value: 'Avalie', label: 'com criterio' },
        { value: 'Clean', label: 'experiencia' },
        { value: 'Agenda', label: 'organizada' },
      ],
      signals: [
        { icon: Sparkles, title: 'Desejo elegante', text: 'A estetica valoriza resultado sem parecer apelativa.' },
        { icon: ShieldCheck, title: 'Seguranca percebida', text: 'Cuidado, criterio e acompanhamento aparecem antes da oferta.' },
        { icon: BadgeCheck, title: 'Autoridade visual', text: 'Ambiente, equipe e prova sustentam a decisao.' },
      ],
      benefitEyebrow: 'Experiencia premium',
      benefitIntro: 'Esse modelo trabalha desejo, seguranca e autoridade com ritmo mais limpo e sofisticado.',
      proofIntro: 'Depoimentos e cuidado visual ajudam o visitante a confiar antes da avaliacao.',
      offerBullets: ['Avaliacao', 'Cuidado', 'Acompanhamento'],
      formBullets: ['Interesse qualificado', 'Dados para avaliacao', 'Conversa sem pressa'],
    },
    'expert-launch': {
      metrics: [
        { value: 'Metodo', label: 'central' },
        { value: 'Turma', label: 'aberta' },
        { value: 'Aplicacao', label: 'guiada' },
      ],
      signals: [
        { icon: Target, title: 'Promessa especifica', text: 'O visitante entende a transformacao antes de ver preco.' },
        { icon: TrendingUp, title: 'Autoridade em camadas', text: 'Metodo, prova e urgencia constroem decisao.' },
        { icon: Zap, title: 'Entrada com criterio', text: 'O formulario filtra interessados para turma, lista ou chamada.' },
      ],
      benefitEyebrow: 'Arquitetura de lancamento',
      benefitIntro: 'Esse modelo parece uma pagina de inscricao: autoridade primeiro, urgencia real depois e aplicacao no fim.',
      proofIntro: 'Prova social posicionada como resultado de metodo, nao apenas opiniao solta.',
      offerBullets: ['Metodo claro', 'Turma atual', 'Aplicacao'],
      formBullets: ['Lead para turma', 'Interesse segmentado', 'Contexto comercial'],
    },
    'real-estate-showcase': {
      metrics: [
        { value: 'Visita', label: 'agendada' },
        { value: 'Condicao', label: 'em foco' },
        { value: 'Corretor', label: 'direto' },
      ],
      signals: [
        { icon: Target, title: 'Imovel primeiro', text: 'Imagem, localizacao e condicao ganham prioridade visual.' },
        { icon: TrendingUp, title: 'Interesse qualificado', text: 'O lead chega sabendo o que quer visitar ou simular.' },
        { icon: MessageCircle, title: 'Corretor acionado', text: 'A pagina empurra para conversa sem perder o contexto.' },
      ],
      benefitEyebrow: 'Vitrine imobiliaria',
      benefitIntro: 'Esse modelo destaca imagem, disponibilidade e agendamento, como uma pagina de oportunidade real.',
      proofIntro: 'A prova aparece para confirmar liquidez, procura ou confianca comercial.',
      offerBullets: ['Localizacao', 'Condicao', 'Visita'],
      formBullets: ['Contato do comprador', 'Interesse no imovel', 'Simulacao ou visita'],
    },
    'event-ticket': {
      metrics: [
        { value: 'Data', label: 'marcada' },
        { value: 'Lote', label: 'atual' },
        { value: 'Vagas', label: 'limitadas' },
      ],
      signals: [
        { icon: Zap, title: 'Energia de evento', text: 'A primeira dobra cria movimento e senso de acontecimento.' },
        { icon: TrendingUp, title: 'Virada de lote', text: 'Urgencia aparece cedo para evitar visitante frio.' },
        { icon: BadgeCheck, title: 'Experiencia concreta', text: 'Galeria, prova e chamada sustentam inscricao.' },
      ],
      benefitEyebrow: 'Pagina de inscricao',
      benefitIntro: 'Esse modelo funciona como pagina de ingresso: data, lote, experiencia e acao aparecem com mais agressividade.',
      proofIntro: 'A prova reforca energia, presenca e vontade de participar.',
      offerBullets: ['Data e local', 'Lote atual', 'Inscricao'],
      formBullets: ['Interessado no evento', 'Contato para inscricao', 'Origem da campanha'],
    },
    'product-demo': {
      metrics: [
        { value: 'Demo', label: 'guiada' },
        { value: 'Fluxo', label: 'simples' },
        { value: 'Escala', label: 'comercial' },
      ],
      signals: [
        { icon: Layers3, title: 'Produto explicado', text: 'Beneficios viram fluxo de uso, nao apenas promessa.' },
        { icon: Target, title: 'Dor operacional', text: 'A pagina mostra o problema antes da solucao.' },
        { icon: TrendingUp, title: 'Demo qualificada', text: 'O lead chega com contexto para venda consultiva.' },
      ],
      benefitEyebrow: 'Demonstracao de produto',
      benefitIntro: 'Esse modelo organiza SaaS como produto: problema, fluxo, prova, planos e demo com menos ruido.',
      proofIntro: 'Prova de produto ajuda o lead a imaginar implantacao e uso real.',
      offerBullets: ['Problema claro', 'Fluxo de uso', 'Demo'],
      formBullets: ['Lead para demo', 'Contexto da operacao', 'Dados para venda'],
    },
    'fashion-store': {
      metrics: [
        { value: 'Drop', label: 'atual' },
        { value: 'Looks', label: 'prontos' },
        { value: 'Whats', label: 'compra' },
      ],
      signals: [
        { icon: Sparkles, title: 'Vitrine de desejo', text: 'As pecas aparecem como colecao, nao como tabela fria.' },
        { icon: BadgeCheck, title: 'Preco visivel', text: 'Cada produto pode mostrar nome, preco, descricao e chamada.' },
        { icon: MessageCircle, title: 'Pedido no WhatsApp', text: 'O visitante escolhe e chama a loja no canal de venda.' },
      ],
      benefitEyebrow: 'Moda e colecao',
      benefitIntro: 'Esse modelo troca a logica de LP por vitrine: colecao, prova visual, produtos e chamada direta para comprar.',
      proofIntro: 'Prova visual e estilo ajudam a roupa parecer desejada antes do contato.',
      offerBullets: ['Colecao atual', 'Pedido no WhatsApp', 'Entrega ou retirada'],
      formBullets: ['Peca desejada', 'Tamanho e cor', 'Contato para fechar pedido'],
    },
    'shoe-store': {
      metrics: [
        { value: 'Modelos', label: 'em destaque' },
        { value: 'Numeros', label: 'consulta' },
        { value: 'Whats', label: 'reserva' },
      ],
      signals: [
        { icon: Target, title: 'Modelo em foco', text: 'O produto ganha destaque por foto, preco e disponibilidade.' },
        { icon: ShieldCheck, title: 'Compra assistida', text: 'O cliente pode tirar duvida de numero, cor e entrega.' },
        { icon: MessageCircle, title: 'Reserva rapida', text: 'A chamada leva direto para conversa de venda.' },
      ],
      benefitEyebrow: 'Calcados e disponibilidade',
      benefitIntro: 'Esse modelo funciona como vitrine de modelos: destaque visual, preco, numeracao e reserva por WhatsApp.',
      proofIntro: 'Prova e imagem ajudam o cliente confiar no modelo antes de pedir numeracao.',
      offerBullets: ['Modelo em destaque', 'Numeracao', 'Reserva no WhatsApp'],
      formBullets: ['Modelo desejado', 'Numero do cliente', 'Contato para reserva'],
    },
    'pharmacy-store': {
      metrics: [
        { value: 'Ofertas', label: 'do dia' },
        { value: 'Entrega', label: 'local' },
        { value: 'Whats', label: 'pedido' },
      ],
      signals: [
        { icon: Zap, title: 'Oferta rapida', text: 'Produtos essenciais ficam claros para pedido imediato.' },
        { icon: ShieldCheck, title: 'Confianca e cuidado', text: 'A pagina valoriza orientacao, entrega e atendimento humano.' },
        { icon: MessageCircle, title: 'Pedido assistido', text: 'O cliente chama no WhatsApp para confirmar produto e entrega.' },
      ],
      benefitEyebrow: 'Farmacia local',
      benefitIntro: 'Esse modelo prioriza oferta, conveniencia, entrega e contato rapido para pedidos por WhatsApp.',
      proofIntro: 'Confianca e atendimento proximo reduzem friccao em compra de farmacia.',
      offerBullets: ['Oferta do dia', 'Entrega local', 'Atendimento no WhatsApp'],
      formBullets: ['Produto desejado', 'Bairro para entrega', 'Contato para confirmar pedido'],
    },
  }

  return layouts[templateLayout] || {
    metrics: [
      { value: '24h', label: 'no ar' },
      { value: '+3x', label: 'clareza' },
      { value: '100%', label: 'editavel' },
    ],
    signals: [
      { icon: Zap, title: 'Decisao rapida', text: 'Promessa, prova e oferta aparecem no ritmo certo.' },
      { icon: Layers3, title: 'Secoes fluidas', text: 'Cada bloco sustenta o proximo passo sem quebrar a leitura.' },
      { icon: ShieldCheck, title: 'Contato claro', text: 'O formulario chega depois do visitante entender o valor.' },
    ],
    benefitEyebrow: 'Metodo visual',
    benefitIntro: 'Uma LP forte precisa ser entendida em segundos: promessa clara, prova suficiente e chamada para acao sem friccao.',
    proofIntro: 'Prova social posicionada antes da oferta reduz duvida e aumenta confianca na decisao.',
    offerBullets: ['Promessa clara', 'Contato direto', 'Layout mobile'],
    formBullets: ['Retorno com contexto da LP', 'Dados organizados no painel', 'Pronto para contato comercial'],
  }
}

export default function GeneratedLandingPage({ page, config, previewMode = false }) {
  const pageRef = useRef(null)
  const [form, setForm] = useState(emptyLeadForm)
  const [sending, setSending] = useState(false)
  const benefitItems = visibleItems(config.beneficios.itens, ['titulo', 'texto'])
  const faqItems = visibleItems(config.faq.itens, ['pergunta', 'resposta'])
  const logoItems = visibleItems(config.logos.itens, ['nome', 'imagemUrl']).slice(0, 8)
  const galleryItems = visibleItems(config.galeria.itens, ['titulo', 'texto', 'imagemUrl']).slice(0, 6)
  const pricePlans = visibleItems(config.precos.planos, ['nome', 'preco', 'descricao'])
    .slice(0, 3)
    .map((plan) => ({
      ...plan,
      entregaveis: (plan.entregaveis || []).filter((item) => String(item || '').trim()),
    }))
  const detailsHref = config.beneficios.ativo && benefitItems.length > 0 ? '#beneficios' : '#formulario'
  const floatingWhatsappUrl = config.rodape.whatsappAtivo ? buildFloatingWhatsappUrl(config) : ''
  const showHeaderPricing = config.cabecalho.mostrarPrecos && config.precos.ativo && pricePlans.length > 0
  const showHeaderContact = config.cabecalho.mostrarContato && String(config.cabecalho.contatoTexto || '').trim()
  const formFields = config.formulario.campos || {}
  const customFormFields = cleanCustomFormFields(config.formulario.camposExtras)
  const visualStyle = config.estilo?.preset || 'editorial-premium'
  const templateLayout = config.layout?.templateLayout || 'conversion-flow'
  const layoutContent = getTemplateLayoutContent(templateLayout)
  const editableText = getEditableTextContent(config, layoutContent)
  const mobileCtaText = String(config.cta?.mobileTexto || '').trim() || config.formulario.botao
  const heroVariant = config.hero.variante || 'split-media'
  const heroCoverUrl = config.hero.backgroundUrl || (heroVariant === 'cover-story' ? config.hero.imagemUrl : '')
  const heroGridClassName = {
    'center-stage': 'mx-auto max-w-6xl grid-cols-1 text-center',
    'media-left': 'lg:grid-cols-[minmax(340px,.95fr)_minmax(0,1.05fr)]',
    'cover-story': 'mx-auto max-w-6xl grid-cols-1',
    'split-media': 'lg:grid-cols-[minmax(0,1.05fr)_minmax(340px,.95fr)]',
  }[heroVariant] || 'lg:grid-cols-[minmax(0,1.05fr)_minmax(340px,.95fr)]'
  const configuredSectionOrder = config.layout?.sectionOrder || []
  const sectionOrder = [
    ...configuredSectionOrder.filter((id) => LP_GENERATOR_ORDERABLE_SECTIONS.some((section) => section.id === id)),
    ...LP_GENERATOR_ORDERABLE_SECTIONS
      .map((section) => section.id)
      .filter((id) => !configuredSectionOrder.includes(id)),
  ]

  function orderedSectionStyle(sectionId, backgroundUrl, gradient) {
    return {
      ...sectionBackgroundStyle(backgroundUrl, gradient),
      order: sectionOrder.indexOf(sectionId),
    }
  }

  useEffect(() => {
    if (previewMode || !page?.slug) return

    const controller = new AbortController()
    const params = new URLSearchParams(window.location.search)

    fetch('/api/lp-generator/view', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pageSlug: page.slug,
        pageUrl: window.location.href,
        referer: document.referrer,
        utm: {
          source: params.get('utm_source') || '',
          medium: params.get('utm_medium') || '',
          campaign: params.get('utm_campaign') || '',
          content: params.get('utm_content') || '',
          term: params.get('utm_term') || '',
        },
      }),
      signal: controller.signal,
    }).catch(() => {})

    return () => controller.abort()
  }, [page?.slug, previewMode])

  useEffect(() => {
    const root = pageRef.current
    if (!root) return

    const revealItems = [...root.querySelectorAll('[data-lp-reveal]')]
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (reduceMotion || !('IntersectionObserver' in window)) {
      revealItems.forEach((item) => item.setAttribute('data-lp-visible', 'true'))
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return
          entry.target.setAttribute('data-lp-visible', 'true')
          observer.unobserve(entry.target)
        })
      },
      {
        rootMargin: '0px 0px -12% 0px',
        threshold: 0.12,
      }
    )

    revealItems.forEach((item) => observer.observe(item))

    return () => observer.disconnect()
  }, [config, previewMode])

  async function sendLead(event) {
    event.preventDefault()

    if (previewMode) {
      toast('Formulario desativado no preview.')
      return
    }

    setSending(true)

    try {
      const params = new URLSearchParams(window.location.search)
      const response = await fetch('/api/lp-generator/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pageSlug: page.slug,
          pageUrl: window.location.href,
          referer: document.referrer,
          utm: {
            source: params.get('utm_source') || '',
            medium: params.get('utm_medium') || '',
            campaign: params.get('utm_campaign') || '',
            content: params.get('utm_content') || '',
            term: params.get('utm_term') || '',
          },
          ...form,
        }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data?.error || 'Erro ao enviar')

      trackLead(page)
      toast.success(data.message || 'Enviado com sucesso.')
      setForm(emptyLeadForm())

      const whatsapp = config.formulario.destinoWhatsapp
      if (whatsapp) {
        const contactName = form.nome || 'um novo interessado'
        const message = encodeURIComponent(`Ola, vim pela landing page ${page.name}. Meu nome e ${contactName}.`)
        window.setTimeout(() => {
          window.open(`https://wa.me/${whatsapp.replace(/\D/g, '')}?text=${message}`, '_blank')
        }, 700)
      }
    } catch (error) {
      toast.error(error.message || 'Erro ao enviar interesse.')
    } finally {
      setSending(false)
    }
  }

  return (
    <main
      ref={pageRef}
      style={sectionStyle(config)}
      data-lp-style={visualStyle}
      data-lp-hero={heroVariant}
      data-lp-template={templateLayout}
      className="lp-page min-h-screen [overflow-x:clip] bg-[var(--page-bg)] pb-20 text-[var(--page-text)] selection:bg-[var(--primary)] selection:text-black md:pb-0"
    >
      {!previewMode && <Toaster position="top-right" />}
      <style jsx global>{`
        [data-lp-reveal] {
          opacity: 0;
          filter: blur(7px);
          transform: translate3d(0, 30px, 0) scale(0.985);
          transition:
            opacity 760ms cubic-bezier(.2,.8,.2,1),
            filter 760ms cubic-bezier(.2,.8,.2,1),
            transform 760ms cubic-bezier(.2,.8,.2,1);
          transition-delay: var(--lp-reveal-delay, 0ms);
          will-change: opacity, filter, transform;
        }

        [data-lp-reveal="left"] {
          transform: translate3d(-34px, 18px, 0) scale(0.985);
        }

        [data-lp-reveal="right"] {
          transform: translate3d(34px, 18px, 0) scale(0.985);
        }

        [data-lp-reveal][data-lp-visible="true"] {
          opacity: 1;
          filter: blur(0);
          transform: translate3d(0, 0, 0) scale(1);
          will-change: auto;
        }

        @media (prefers-reduced-motion: reduce) {
          [data-lp-reveal] {
            opacity: 1;
            filter: none;
            transform: none;
            transition: none;
          }
        }

        .lp-page {
          --lp-radius: 2rem;
          --lp-surface: rgba(0, 0, 0, .48);
          --lp-soft-surface: rgba(255, 255, 255, .045);
          --lp-line: rgba(255, 255, 255, .1);
          max-width: 100%;
        }

        .lp-page .lp-surface,
        .lp-page .lp-nav,
        .lp-page .lp-signal-card {
          border-color: var(--lp-line);
        }

        .lp-page[data-lp-style="editorial-premium"] .lp-hero h1 {
          max-width: 11ch;
        }

        .lp-page[data-lp-style="editorial-premium"] .lp-surface {
          box-shadow: 0 26px 100px rgba(0, 0, 0, .28);
        }

        .lp-page[data-lp-style="editorial-premium"] .lp-proof-section blockquote {
          font-weight: 800;
          line-height: .98;
        }

        .lp-page[data-lp-style="tech-neon"] {
          --lp-radius: 1.25rem;
          --lp-surface: rgba(1, 8, 20, .72);
          --lp-soft-surface: rgba(59, 247, 255, .08);
          --lp-line: rgba(59, 247, 255, .24);
        }

        .lp-page[data-lp-style="tech-neon"] .lp-hero {
          background:
            radial-gradient(circle at 78% 22%, color-mix(in srgb, var(--secondary) 34%, transparent), transparent 28rem),
            radial-gradient(circle at 18% 22%, color-mix(in srgb, var(--primary) 22%, transparent), transparent 24rem);
        }

        .lp-page[data-lp-style="tech-neon"] .lp-nav,
        .lp-page[data-lp-style="tech-neon"] .lp-surface,
        .lp-page[data-lp-style="tech-neon"] .lp-signal-card {
          border-radius: var(--lp-radius);
          background-color: var(--lp-surface);
          box-shadow: inset 0 0 0 1px rgba(59, 247, 255, .04), 0 0 52px rgba(59, 247, 255, .08);
        }

        .lp-page[data-lp-style="tech-neon"] .lp-section-label {
          padding: .45rem .75rem;
          border: 1px solid var(--lp-line);
          border-radius: 999px;
          background: var(--lp-soft-surface);
        }

        .lp-page[data-lp-style="luxo-discreto"] {
          --lp-radius: .7rem;
          --lp-surface: rgba(14, 11, 8, .62);
          --lp-soft-surface: rgba(214, 180, 106, .075);
          --lp-line: rgba(214, 180, 106, .22);
        }

        .lp-page[data-lp-style="luxo-discreto"] .lp-nav,
        .lp-page[data-lp-style="luxo-discreto"] .lp-surface,
        .lp-page[data-lp-style="luxo-discreto"] .lp-signal-card {
          border-radius: var(--lp-radius);
          background-color: var(--lp-surface);
        }

        .lp-page[data-lp-style="luxo-discreto"] .lp-hero h1,
        .lp-page[data-lp-style="luxo-discreto"] h2 {
          font-weight: 800;
          line-height: .98;
        }

        .lp-page[data-lp-style="luxo-discreto"] .lp-grid-layer {
          opacity: .15;
        }

        .lp-page[data-lp-style="imobiliario-impactante"] .lp-hero-media img {
          max-width: 760px;
          max-height: min(82vh, 860px);
        }

        .lp-page[data-lp-style="imobiliario-impactante"] .lp-nav,
        .lp-page[data-lp-style="imobiliario-impactante"] .lp-offer-card,
        .lp-page[data-lp-style="imobiliario-impactante"] .lp-urgency-card {
          border-color: color-mix(in srgb, var(--primary) 32%, rgba(255,255,255,.08));
        }

        .lp-page[data-lp-style="imobiliario-impactante"] .lp-signal-card:first-child {
          transform: translateY(-14px);
        }

        .lp-page[data-lp-style="evento-agressivo"] {
          --lp-radius: 1.15rem;
          --lp-surface: rgba(19, 2, 10, .7);
          --lp-soft-surface: rgba(255, 90, 31, .12);
          --lp-line: rgba(255, 90, 31, .28);
        }

        .lp-page[data-lp-style="evento-agressivo"] .lp-hero {
          min-height: 100vh;
        }

        .lp-page[data-lp-style="evento-agressivo"] .lp-hero::after {
          content: "";
          position: absolute;
          inset: auto -10% -1px -10%;
          height: 36%;
          background: linear-gradient(96deg, transparent, color-mix(in srgb, var(--primary) 28%, transparent), color-mix(in srgb, var(--secondary) 25%, transparent), transparent);
          filter: blur(36px);
          pointer-events: none;
        }

        .lp-page[data-lp-style="evento-agressivo"] .lp-nav,
        .lp-page[data-lp-style="evento-agressivo"] .lp-surface,
        .lp-page[data-lp-style="evento-agressivo"] .lp-signal-card {
          border-radius: var(--lp-radius);
          background-color: var(--lp-surface);
          box-shadow: 0 20px 100px rgba(255, 45, 166, .08);
        }

        .lp-page[data-lp-style="clinica-clean-premium"] {
          --lp-radius: 2rem;
          --lp-surface: rgba(34, 22, 29, .56);
          --lp-soft-surface: rgba(244, 185, 203, .1);
          --lp-line: rgba(255, 231, 239, .16);
        }

        .lp-page[data-lp-style="clinica-clean-premium"] .lp-hero {
          background:
            radial-gradient(circle at 16% 20%, rgba(255, 255, 255, .14), transparent 24rem),
            radial-gradient(circle at 82% 12%, color-mix(in srgb, var(--secondary) 25%, transparent), transparent 25rem);
        }

        .lp-page[data-lp-style="clinica-clean-premium"] .lp-nav,
        .lp-page[data-lp-style="clinica-clean-premium"] .lp-surface,
        .lp-page[data-lp-style="clinica-clean-premium"] .lp-signal-card {
          background-color: var(--lp-surface);
          border-color: var(--lp-line);
          box-shadow: 0 24px 90px rgba(0, 0, 0, .16);
        }

        .lp-page[data-lp-hero="center-stage"] .lp-hero-copy {
          margin-inline: auto;
          display: grid;
          justify-items: center;
        }

        .lp-page[data-lp-hero="center-stage"] .lp-hero-copy p {
          margin-inline: auto;
        }

        .lp-page[data-lp-hero="center-stage"] .lp-hero-media {
          width: min(100%, 860px);
          margin-inline: auto;
        }

        .lp-page[data-lp-hero="media-left"] .lp-hero-copy {
          order: 2;
        }

        .lp-page[data-lp-hero="media-left"] .lp-hero-media {
          order: 1;
        }

        .lp-page[data-lp-hero="cover-story"] .lp-hero-copy {
          max-width: 920px;
        }

        .lp-page[data-lp-hero="cover-story"] .lp-hero-media {
          display: none;
        }

        .lp-page[data-lp-template="local-service"] .lp-hero {
          background:
            linear-gradient(90deg, rgba(255,255,255,.045) 1px, transparent 1px),
            radial-gradient(circle at 18% 24%, color-mix(in srgb, var(--primary) 18%, transparent), transparent 24rem);
          background-size: 26px 26px, auto;
        }

        .lp-page[data-lp-template="local-service"] .lp-signal-card {
          border-left: 4px solid var(--primary);
        }

        .lp-page[data-lp-template="local-service"] .lp-benefit-card {
          min-height: 230px;
          border-radius: 1rem;
        }

        .lp-page[data-lp-template="clinic-editorial"] .lp-hero h1 {
          max-width: 12ch;
          font-weight: 850;
        }

        .lp-page[data-lp-template="clinic-editorial"] .lp-signal-card,
        .lp-page[data-lp-template="clinic-editorial"] .lp-benefit-card,
        .lp-page[data-lp-template="clinic-editorial"] .lp-gallery-card {
          border-radius: 2.25rem;
        }

        .lp-page[data-lp-template="clinic-editorial"] .lp-gallery-card:first-child {
          transform: translateY(-18px);
        }

        .lp-page[data-lp-template="expert-launch"] .lp-hero h1 {
          max-width: 13ch;
          text-transform: uppercase;
        }

        .lp-page[data-lp-template="expert-launch"] .lp-signal-card {
          background: linear-gradient(135deg, color-mix(in srgb, var(--primary) 16%, transparent), rgba(0,0,0,.62));
        }

        .lp-page[data-lp-template="expert-launch"] .lp-price-card[data-featured="true"] {
          transform: translateY(-34px) scale(1.08);
        }

        .lp-page[data-lp-template="real-estate-showcase"] .lp-hero-grid {
          gap: clamp(1.5rem, 4vw, 5rem);
        }

        .lp-page[data-lp-template="real-estate-showcase"] .lp-hero-media img {
          width: min(100%, 780px);
          max-width: none;
        }

        .lp-page[data-lp-template="real-estate-showcase"] .lp-gallery-card:first-child {
          grid-column: span 2 / span 2;
        }

        .lp-page[data-lp-template="real-estate-showcase"] .lp-offer-card {
          border-radius: .9rem;
        }

        .lp-page[data-lp-template="event-ticket"] .lp-hero h1 {
          max-width: 10ch;
          text-transform: uppercase;
        }

        .lp-page[data-lp-template="event-ticket"] .lp-signal-card {
          transform: rotate(-1deg);
        }

        .lp-page[data-lp-template="event-ticket"] .lp-signal-card:nth-child(even) {
          transform: rotate(1deg) translateY(12px);
        }

        .lp-page[data-lp-template="event-ticket"] .lp-urgency-card {
          border-color: color-mix(in srgb, var(--primary) 54%, rgba(255,255,255,.08));
          box-shadow: 0 30px 120px color-mix(in srgb, var(--primary) 18%, transparent);
        }

        .lp-page[data-lp-template="product-demo"] .lp-hero h1 {
          max-width: 12ch;
        }

        .lp-page[data-lp-template="product-demo"] .lp-benefit-card {
          min-height: 240px;
          border-radius: 1.1rem;
          background:
            linear-gradient(135deg, rgba(255,255,255,.055), rgba(255,255,255,.012)),
            rgba(0,0,0,.55);
        }

        .lp-page[data-lp-template="product-demo"] .lp-offer-card {
          border-radius: 1.2rem;
          grid-template-columns: minmax(0, .95fr) minmax(320px, 1.05fr);
        }

        .lp-page[data-lp-template="fashion-store"] .lp-hero h1,
        .lp-page[data-lp-template="shoe-store"] .lp-hero h1,
        .lp-page[data-lp-template="pharmacy-store"] .lp-hero h1 {
          max-width: 11ch;
        }

        .lp-page[data-lp-template="fashion-store"] .lp-price-card,
        .lp-page[data-lp-template="shoe-store"] .lp-price-card,
        .lp-page[data-lp-template="pharmacy-store"] .lp-price-card {
          min-height: 0;
          padding: 0;
          border-radius: 1.35rem;
        }

        .lp-page[data-lp-template="fashion-store"] .lp-product-image,
        .lp-page[data-lp-template="shoe-store"] .lp-product-image,
        .lp-page[data-lp-template="pharmacy-store"] .lp-product-image {
          display: block;
        }

        .lp-page[data-lp-template="fashion-store"] .lp-price-card {
          background: linear-gradient(145deg, rgba(255,255,255,.08), rgba(0,0,0,.62));
        }

        .lp-page[data-lp-template="fashion-store"] .lp-gallery-card {
          border-radius: .75rem 2.2rem .75rem 2.2rem;
        }

        .lp-page[data-lp-template="shoe-store"] .lp-price-card {
          border-radius: .9rem;
          border-bottom-width: 4px;
          border-bottom-color: var(--primary);
        }

        .lp-page[data-lp-template="shoe-store"] .lp-signal-card {
          border-radius: .9rem;
        }

        .lp-page[data-lp-template="pharmacy-store"] .lp-hero {
          background:
            radial-gradient(circle at 80% 18%, color-mix(in srgb, var(--primary) 18%, transparent), transparent 24rem),
            linear-gradient(180deg, rgba(255,255,255,.035), transparent);
        }

        .lp-page[data-lp-template="pharmacy-store"] .lp-price-card,
        .lp-page[data-lp-template="pharmacy-store"] .lp-signal-card,
        .lp-page[data-lp-template="pharmacy-store"] .lp-benefit-card {
          border-radius: 1rem;
        }

        @media (max-width: 1023px) {
          .lp-page[data-lp-template="real-estate-showcase"] .lp-gallery-card:first-child {
            grid-column: auto;
          }

          .lp-page[data-lp-template="product-demo"] .lp-offer-card {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 640px) {
          .lp-page .lp-nav {
            border-radius: 1.25rem;
          }

          .lp-page .lp-hero-copy {
            min-width: 0;
          }

          .lp-page[data-lp-hero="media-left"] .lp-hero-copy,
          .lp-page[data-lp-hero="media-left"] .lp-hero-media {
            order: initial;
          }

          .lp-page[data-lp-template="event-ticket"] .lp-signal-card,
          .lp-page[data-lp-template="event-ticket"] .lp-signal-card:nth-child(even),
          .lp-page[data-lp-style="imobiliario-impactante"] .lp-signal-card:first-child {
            transform: none;
          }

          .lp-page[data-lp-template="clinic-editorial"] .lp-gallery-card:first-child {
            transform: none;
          }
        }
      `}</style>

      {config.cabecalho.ativo ? (
        <header className="sticky top-0 z-40 px-3 pt-3 sm:px-5">
          <nav data-lp-reveal className="lp-nav mx-auto flex w-full max-w-7xl items-center justify-between gap-3 rounded-full border border-white/10 bg-black/78 px-3 py-3 shadow-2xl shadow-black/30 backdrop-blur-2xl sm:px-4">
            {config.cabecalho.mostrarMarca ? (
              <a href="#" className="flex min-w-0 items-center gap-3">
                <BrandMark config={config} />
                <span className="truncate text-sm font-black">{config.identidade.marca}</span>
              </a>
            ) : <span aria-hidden="true" className="h-9" />}

            <div className="flex shrink-0 items-center gap-2">
              {showHeaderPricing ? (
                <a href="#precos" className="hidden rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-xs font-black text-white transition hover:bg-white/[0.1] sm:inline-flex">
                  {config.cabecalho.precosTexto || 'Precos'}
                </a>
              ) : null}
              {showHeaderContact ? (
                <a href={config.cabecalho.contatoUrl || '#formulario'} className="rounded-full bg-white px-4 py-2 text-xs font-black text-black transition hover:bg-[var(--primary)]">
                  {config.cabecalho.contatoTexto}
                </a>
              ) : null}
            </div>
          </nav>
        </header>
      ) : null}

      {config.hero.ativo && (
        <section
          className="lp-hero relative"
          style={heroCoverUrl ? {
            backgroundImage: `linear-gradient(120deg, rgba(5,5,5,.96), rgba(5,5,5,.72), rgba(5,5,5,.42)), url(${heroCoverUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          } : undefined}
        >
          <div className="lp-grid-layer absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,.055)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,.045)_1px,transparent_1px)] bg-[size:72px_72px] opacity-35" />
          <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/70 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-[var(--page-bg)] to-transparent" />

          <div className="relative mx-auto flex min-h-[calc(100svh-76px)] w-full max-w-7xl flex-col px-5 pb-12 pt-8 sm:px-8 sm:pb-14">
            <div className={`lp-hero-grid mt-6 grid flex-1 items-center gap-8 sm:mt-10 sm:gap-12 ${heroGridClassName}`}>
              <div data-lp-reveal="left" className="lp-hero-copy">
                <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-[var(--primary)] backdrop-blur-xl">
                  <Sparkles size={14} />
                  {config.hero.eyebrow}
                </p>

                <h1 className="max-w-5xl text-balance text-4xl font-black leading-[0.95] tracking-tight sm:text-7xl sm:leading-[0.92] lg:text-8xl">
                  {config.hero.titulo}
                </h1>

                <p className="mt-7 max-w-2xl text-pretty text-base leading-relaxed text-[var(--page-muted)] sm:text-xl">
                  {config.hero.subtitulo}
                </p>

                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <Cta href={config.hero.ctaUrl} className="w-full sm:w-auto">{config.hero.ctaTexto}</Cta>
                  <Cta href={detailsHref} variant="ghost" className="w-full sm:w-auto">{editableText.heroBotaoSecundario}</Cta>
                </div>

                <div className="mt-10 grid max-w-2xl grid-cols-3 gap-3 border-t border-white/10 pt-7 sm:gap-5">
                  {editableText.metrics.map((metric) => (
                    <Metric key={`${metric.value}-${metric.label}`} value={metric.value} label={metric.label} />
                  ))}
                </div>
              </div>

              <div data-lp-reveal="right" className="lp-hero-media" style={{ '--lp-reveal-delay': '120ms' }}>
                <VisualPanel config={config} />
              </div>
            </div>

            <a href={detailsHref} className="mt-10 inline-flex w-fit items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-[var(--page-muted)] hover:text-white">
              {editableText.heroScrollTexto}
              <ChevronDown size={15} />
            </a>
          </div>
        </section>
      )}

      {config.hero.ativo ? (
        <section className="relative z-10 mx-auto -mt-4 grid w-full max-w-7xl gap-3 px-5 sm:grid-cols-3 sm:px-8">
          {editableText.signals.map(({ icon: Icon, title, text }, index) => (
            <div
              key={title}
              data-lp-reveal
              style={{ '--lp-reveal-delay': `${index * 90}ms` }}
              className="lp-signal-card rounded-[1.35rem] border border-white/10 bg-black/55 p-5 shadow-2xl shadow-black/25 backdrop-blur-xl"
            >
              <Icon size={18} className="text-[var(--primary)]" />
              <p className="mt-4 text-base font-black text-white">{title}</p>
              <p className="mt-2 text-sm leading-relaxed text-[var(--page-muted)]">{text}</p>
            </div>
          ))}
        </section>
      ) : null}

      <div className="flex flex-col">
      {config.logos.ativo && logoItems.length > 0 && (
        <section
          className="px-5 py-16 sm:px-8 sm:py-20"
          style={orderedSectionStyle('logos', config.logos.backgroundUrl, 'linear-gradient(120deg, rgba(5,5,5,.97), rgba(5,5,5,.82))')}
        >
          <div className="mx-auto max-w-7xl">
            <div data-lp-reveal className="max-w-4xl">
              <p className="lp-section-label text-xs font-black uppercase tracking-[0.24em] text-[var(--primary)]">{config.logos.eyebrow}</p>
              <h2 className="mt-4 text-balance text-3xl font-black leading-tight sm:text-5xl">{config.logos.titulo}</h2>
            </div>

            <div className="mt-9 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {logoItems.map((item, index) => (
                <div
                  key={`${item.nome || 'logo'}-${index}`}
                  data-lp-reveal
                  style={{ '--lp-reveal-delay': `${index * 65}ms` }}
                  className="lp-surface flex min-h-28 items-center justify-center rounded-[1.35rem] border border-white/10 bg-black/45 p-5 text-center backdrop-blur-sm"
                >
                  {item.imagemUrl ? (
                    <img src={item.imagemUrl} alt={item.nome || ''} className="max-h-16 w-auto max-w-full object-contain opacity-90" />
                  ) : (
                    <span className="text-base font-black text-white">{item.nome}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {config.beneficios.ativo && benefitItems.length > 0 && (
        <section
          id="beneficios"
          className="px-5 py-20 sm:px-8 sm:py-28"
          style={orderedSectionStyle('beneficios', config.beneficios.backgroundUrl)}
        >
          <div className="mx-auto max-w-7xl">
            <div data-lp-reveal className="grid gap-8 lg:grid-cols-[.75fr_1.25fr] lg:items-end">
              <div>
                <p className="lp-section-label text-xs font-black uppercase tracking-[0.24em] text-[var(--primary)]">{editableText.benefitEyebrow}</p>
                <h2 className="mt-4 max-w-3xl text-4xl font-black leading-tight sm:text-6xl">{config.beneficios.titulo}</h2>
              </div>
              <p className="max-w-2xl text-base leading-relaxed text-[var(--page-muted)]">
                {editableText.benefitIntro}
              </p>
            </div>

            <div className="mt-12 grid gap-4 md:grid-cols-3">
              {benefitItems.map((item, index) => {
                const Icon = [Target, TrendingUp, ShieldCheck][index % 3]
                return (
                  <div
                    key={index}
                    data-lp-reveal
                    style={{ '--lp-reveal-delay': `${index * 95}ms` }}
                    className={`lp-surface lp-benefit-card group min-h-[290px] rounded-[1.5rem] border border-white/10 bg-black/45 p-6 backdrop-blur-sm transition hover:-translate-y-1 hover:border-[var(--primary)]/35 hover:bg-black/60 ${index === 0 ? 'md:-translate-y-4 md:bg-black/60' : ''}`}
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[var(--primary)]/20 bg-[var(--primary)]/10 text-[var(--primary)]">
                      <Icon size={22} />
                    </div>
                    <span className="mt-8 block text-xs font-black uppercase tracking-[0.22em] text-[var(--page-muted)]">0{index + 1}</span>
                    <h3 className="mt-3 text-2xl font-black">{item.titulo}</h3>
                    <p className="mt-4 text-sm leading-relaxed text-[var(--page-muted)]">{item.texto}</p>
                  </div>
                )
              })}
            </div>
          </div>
        </section>
      )}

      {config.prova.ativo && (
        <section
          className="lp-proof-section border-y border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,.055),rgba(255,255,255,.015))] px-5 py-20 sm:px-8 sm:py-28"
          style={orderedSectionStyle('prova', config.prova.backgroundUrl, 'linear-gradient(120deg, rgba(5,5,5,.94), rgba(5,5,5,.74))')}
        >
          <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[360px_1fr] lg:items-center">
            <div data-lp-reveal="left" className="lp-surface rounded-[1.75rem] border border-white/10 bg-black/30 p-6">
              <BadgeCheck className="text-[var(--primary)]" size={34} />
              <p className="mt-6 text-xs font-black uppercase tracking-[0.24em] text-[var(--primary)]">{config.prova.titulo}</p>
              <p className="mt-3 text-sm leading-relaxed text-[var(--page-muted)]">
                {editableText.proofIntro}
              </p>
            </div>

            <div data-lp-reveal="right" style={{ '--lp-reveal-delay': '90ms' }}>
              <blockquote className="text-balance text-3xl font-black leading-tight sm:text-5xl">
                &ldquo;{config.prova.depoimento}&rdquo;
              </blockquote>
              <p className="mt-6 text-sm font-black uppercase tracking-[0.18em] text-[var(--page-muted)]">{config.prova.autor}</p>
            </div>
          </div>
        </section>
      )}

      {config.galeria.ativo && galleryItems.length > 0 && (
        <section
          className="px-5 py-20 sm:px-8 sm:py-28"
          style={orderedSectionStyle('galeria', config.galeria.backgroundUrl, 'linear-gradient(120deg, rgba(5,5,5,.96), rgba(5,5,5,.75))')}
        >
          <div className="mx-auto max-w-7xl">
            <div data-lp-reveal className="grid gap-6 lg:grid-cols-[.85fr_1.15fr] lg:items-end">
              <div>
                <p className="lp-section-label text-xs font-black uppercase tracking-[0.24em] text-[var(--primary)]">{config.galeria.eyebrow}</p>
                <h2 className="mt-4 text-balance text-4xl font-black leading-tight sm:text-6xl">{config.galeria.titulo}</h2>
              </div>
              <p className="max-w-2xl text-base leading-relaxed text-[var(--page-muted)]">{config.galeria.texto}</p>
            </div>

            <div className="mt-12 grid gap-4 lg:grid-cols-3">
              {galleryItems.map((item, index) => (
                <article
                  key={`${item.titulo || 'prova'}-${index}`}
                  data-lp-reveal
                  style={{ '--lp-reveal-delay': `${index * 85}ms` }}
                  className={`lp-surface lp-gallery-card group overflow-hidden rounded-[1.75rem] border border-white/10 bg-black/50 shadow-2xl shadow-black/20 backdrop-blur-sm ${index === 0 ? 'lg:col-span-2' : ''}`}
                >
                  <div className={`${index === 0 ? 'aspect-[16/9]' : 'aspect-[4/3]'} overflow-hidden border-b border-white/10 bg-white/[0.04]`}>
                    {item.imagemUrl ? (
                      <img src={item.imagemUrl} alt={item.titulo || ''} className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]" />
                    ) : (
                      <div className="flex h-full items-center justify-center p-8 text-center text-sm font-black text-[var(--page-muted)]">
                        {item.titulo || 'Imagem da prova visual'}
                      </div>
                    )}
                  </div>
                  <div className="p-5 sm:p-6">
                    {item.titulo ? <h3 className="text-xl font-black text-white">{item.titulo}</h3> : null}
                    {item.texto ? <p className="mt-3 text-sm leading-relaxed text-[var(--page-muted)]">{item.texto}</p> : null}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {config.oferta.ativo && (
        <section
          className="px-5 py-20 sm:px-8 sm:py-28"
          style={orderedSectionStyle('oferta', config.oferta.backgroundUrl)}
        >
          <div data-lp-reveal className="lp-surface lp-offer-card mx-auto grid max-w-7xl overflow-hidden rounded-[2rem] border border-white/10 bg-black/50 shadow-2xl shadow-black/25 backdrop-blur-sm lg:grid-cols-[1.1fr_.9fr]">
            <div className="p-7 sm:p-10 lg:p-12">
              <p className="lp-section-label text-xs font-black uppercase tracking-[0.24em] text-[var(--primary)]">{editableText.ofertaEyebrow}</p>
              <h2 className="mt-5 text-balance text-4xl font-black leading-tight sm:text-6xl">{config.oferta.titulo}</h2>
              <p className="mt-6 max-w-3xl text-base leading-relaxed text-[var(--page-muted)]">{config.oferta.texto}</p>

              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                {editableText.offerBullets.map((item) => (
                  <div key={item} className="flex items-center gap-2 rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm font-bold text-white">
                    <CheckCircle2 size={17} className="text-[var(--primary)]" />
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col justify-between border-t border-white/10 bg-black/30 p-7 sm:p-10 lg:border-l lg:border-t-0">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-[var(--page-muted)]">{editableText.ofertaCondicaoLabel}</p>
                <p className="mt-5 text-5xl font-black tracking-tight">{config.oferta.preco}</p>
                <p className="mt-4 text-sm leading-relaxed text-[var(--page-muted)]">
                  {editableText.ofertaTextoAuxiliar}
                </p>
              </div>

              <div className="mt-8">
                <Cta href={config.oferta.ctaUrl} className="w-full sm:w-auto">{config.oferta.ctaTexto}</Cta>
              </div>
            </div>
          </div>
        </section>
      )}

      {config.garantia.ativo && (
        <section
          className="px-5 py-20 sm:px-8 sm:py-28"
          style={orderedSectionStyle('garantia', config.garantia.backgroundUrl, 'linear-gradient(120deg, rgba(5,5,5,.96), rgba(5,5,5,.78))')}
        >
          <div data-lp-reveal className="lp-surface mx-auto grid max-w-7xl gap-5 rounded-[2rem] border border-[var(--primary)]/20 bg-[linear-gradient(135deg,rgba(255,255,255,.06),rgba(0,0,0,.35))] p-6 shadow-2xl shadow-black/25 backdrop-blur-sm sm:p-10 lg:grid-cols-[280px_1fr] lg:items-center">
            <div className="rounded-[1.75rem] border border-[var(--primary)]/20 bg-[var(--primary)]/[0.12] p-6">
              <ShieldCheck size={38} className="text-[var(--primary)]" />
              <p className="mt-6 text-xs font-black uppercase tracking-[0.24em] text-[var(--primary)]">{config.garantia.eyebrow}</p>
              <p className="mt-4 rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm font-black text-white">{config.garantia.selo}</p>
            </div>
            <div>
              <h2 className="text-balance text-4xl font-black leading-tight sm:text-6xl">{config.garantia.titulo}</h2>
              <p className="mt-5 max-w-3xl text-base leading-relaxed text-[var(--page-muted)]">{config.garantia.texto}</p>
            </div>
          </div>
        </section>
      )}

      {config.urgencia.ativo && (
        <section
          className="px-5 py-20 sm:px-8 sm:py-28"
          style={orderedSectionStyle('urgencia', config.urgencia.backgroundUrl, 'linear-gradient(120deg, rgba(5,5,5,.97), rgba(5,5,5,.76))')}
        >
          <div data-lp-reveal className="lp-surface lp-urgency-card mx-auto grid max-w-7xl overflow-hidden rounded-[2rem] border border-white/10 bg-black/55 shadow-2xl shadow-black/30 backdrop-blur-sm lg:grid-cols-[1fr_auto] lg:items-center">
            <div className="p-7 sm:p-10">
              <p className="lp-section-label text-xs font-black uppercase tracking-[0.24em] text-[var(--primary)]">{config.urgencia.eyebrow}</p>
              <h2 className="mt-5 text-balance text-4xl font-black leading-tight sm:text-6xl">{config.urgencia.titulo}</h2>
              <p className="mt-5 max-w-3xl text-base leading-relaxed text-[var(--page-muted)]">{config.urgencia.texto}</p>
            </div>
            <div className="border-t border-white/10 bg-white/[0.04] p-7 sm:p-10 lg:min-w-[320px] lg:border-l lg:border-t-0">
              <p className="rounded-2xl border border-[var(--primary)]/25 bg-[var(--primary)]/10 px-4 py-3 text-sm font-black text-[var(--primary)]">{config.urgencia.destaque}</p>
              <Cta href={config.urgencia.ctaUrl} className="mt-5 w-full">{config.urgencia.ctaTexto}</Cta>
            </div>
          </div>
        </section>
      )}

      {config.precos.ativo && pricePlans.length > 0 && (
        <section
          id="precos"
          className="px-5 py-20 sm:px-8 sm:py-28"
          style={orderedSectionStyle('precos', config.precos.backgroundUrl, 'linear-gradient(120deg, rgba(5,5,5,.97), rgba(5,5,5,.78))')}
        >
          <div className="mx-auto max-w-7xl">
            <div data-lp-reveal className="max-w-4xl">
              <p className="lp-section-label text-xs font-black uppercase tracking-[0.24em] text-[var(--primary)]">{config.precos.eyebrow}</p>
              <h2 className="mt-4 text-balance text-4xl font-black leading-tight sm:text-6xl">{config.precos.titulo}</h2>
              <p className="mt-5 max-w-2xl text-base leading-relaxed text-[var(--page-muted)]">{config.precos.texto}</p>
            </div>

            <div className={`mt-12 grid gap-4 ${pricePlans.length === 1 ? 'max-w-xl' : pricePlans.length === 2 ? 'lg:grid-cols-2' : 'lg:grid-cols-3'}`}>
              {pricePlans.map((plan, index) => (
                <article
                  key={`${plan.nome || 'plano'}-${index}`}
                  data-lp-reveal
                  data-featured={plan.destaque ? 'true' : 'false'}
                  style={{ '--lp-reveal-delay': `${index * 100}ms` }}
                  className={`lp-surface lp-price-card relative flex min-h-[520px] flex-col overflow-hidden rounded-[1.75rem] border shadow-2xl shadow-black/25 backdrop-blur-sm transition duration-300 ${
                    plan.destaque
                      ? 'border-[var(--primary)]/60 bg-[var(--primary)]/[0.14] shadow-[0_28px_110px_rgba(0,0,0,.55)] ring-1 ring-[var(--primary)]/40 lg:-translate-y-7 lg:scale-[1.06]'
                      : 'border-white/10 bg-black/55'
                  }`}
                >
                  {plan.imagemUrl ? (
                    <div className="lp-product-image hidden aspect-[4/3] overflow-hidden border-b border-white/10 bg-white/[0.04]">
                      <img src={plan.imagemUrl} alt={plan.nome || ''} className="h-full w-full object-cover transition duration-500 hover:scale-[1.035]" />
                    </div>
                  ) : null}

                  <div className="flex flex-1 flex-col p-6 sm:p-7">
                  {plan.destaque ? (
                    <>
                      <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,transparent,var(--primary),var(--secondary),transparent)]" />
                      <div className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-[var(--primary)]/25 blur-3xl" />
                      <div className="pointer-events-none absolute -bottom-24 -left-20 h-56 w-56 rounded-full bg-[var(--secondary)]/20 blur-3xl" />
                    </>
                  ) : null}

                  {plan.destaque ? (
                    <div className="absolute right-5 top-5 z-10 rounded-full border border-[var(--primary)]/30 bg-[var(--primary)] px-3 py-1 text-[10px] font-black uppercase tracking-widest text-black shadow-lg shadow-black/30">
                      {editableText.planoDestaqueTexto}
                    </div>
                  ) : null}

                  <div className="relative z-10 pr-16">
                    <p className="text-2xl font-black text-white">{plan.nome || `Plano ${index + 1}`}</p>
                    {plan.descricao ? <p className="mt-3 text-sm leading-relaxed text-[var(--page-muted)]">{plan.descricao}</p> : null}
                  </div>

                  <div className="relative z-10 mt-8 border-y border-white/10 py-6">
                    <p className="flex flex-wrap items-end gap-2 text-4xl font-black tracking-tight text-white sm:text-5xl">
                      <span>{plan.preco || 'Sob consulta'}</span>
                      {plan.periodo ? <span className="pb-1 text-sm font-bold text-[var(--page-muted)]">{plan.periodo}</span> : null}
                    </p>
                  </div>

                  <div className="relative z-10 mt-6 flex-1 space-y-3">
                    {plan.entregaveis.map((item, itemIndex) => (
                      <p key={`${item}-${itemIndex}`} className="flex gap-3 text-sm font-bold leading-relaxed text-white">
                        <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-[var(--primary)]" />
                        <span>{item}</span>
                      </p>
                    ))}
                  </div>

                  <div className="relative z-10 mt-8">
                    <Cta href={plan.ctaUrl || '#formulario'} className="w-full">
                      {plan.ctaTexto || editableText.planoCtaFallback}
                    </Cta>
                  </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {config.cta.ativo && (
        <section
          className="px-5 py-20 sm:px-8 sm:py-28"
          style={orderedSectionStyle('cta', config.cta.backgroundUrl, 'linear-gradient(120deg, rgba(5,5,5,.95), rgba(5,5,5,.72))')}
        >
          <div data-lp-reveal className="lp-surface mx-auto max-w-7xl rounded-[2rem] border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,.08),rgba(255,255,255,.025))] p-7 text-center shadow-2xl shadow-black/25 backdrop-blur-sm sm:p-12">
            <p className="lp-section-label text-xs font-black uppercase tracking-[0.24em] text-[var(--primary)]">{config.cta.eyebrow}</p>
            <h2 className="mx-auto mt-5 max-w-5xl text-balance text-4xl font-black leading-tight sm:text-6xl">{config.cta.titulo}</h2>
            <p className="mx-auto mt-5 max-w-3xl text-base leading-relaxed text-[var(--page-muted)]">{config.cta.texto}</p>
            <div className="mt-8 flex justify-center">
              <Cta href={config.cta.ctaUrl} className="w-full sm:w-auto">{config.cta.ctaTexto}</Cta>
            </div>
          </div>
        </section>
      )}

      {config.faq.ativo && faqItems.length > 0 && (
        <section
          className="px-5 py-20 sm:px-8 sm:py-28"
          style={orderedSectionStyle('faq', config.faq.backgroundUrl)}
        >
          <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[.8fr_1.2fr]">
            <div data-lp-reveal="left">
              <p className="lp-section-label text-xs font-black uppercase tracking-[0.24em] text-[var(--primary)]">{editableText.faqEyebrow}</p>
              <h2 className="mt-4 text-4xl font-black leading-tight sm:text-5xl">{config.faq.titulo}</h2>
            </div>

            <div className="grid gap-3">
              {faqItems.map((item, index) => (
                <details
                  key={index}
                  data-lp-reveal="right"
                  style={{ '--lp-reveal-delay': `${index * 75}ms` }}
                  className="lp-surface group rounded-2xl border border-white/10 bg-black/45 p-5 backdrop-blur-sm"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-base font-black">
                    {item.pergunta}
                    <ChevronDown className="shrink-0 transition group-open:rotate-180" size={18} />
                  </summary>
                  <p className="mt-4 text-sm leading-relaxed text-[var(--page-muted)]">{item.resposta}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      )}

      {config.formulario.ativo && (
        <section
          id="formulario"
          className="px-5 py-20 sm:px-8 sm:py-28"
          style={orderedSectionStyle('formulario', config.formulario.backgroundUrl)}
        >
          <div data-lp-reveal className="lp-surface mx-auto grid max-w-7xl overflow-hidden rounded-[2rem] border border-white/10 bg-black/50 shadow-2xl shadow-black/25 backdrop-blur-sm lg:grid-cols-[.82fr_1.18fr]">
            <div className="border-b border-white/10 bg-black/30 p-7 sm:p-10 lg:border-b-0 lg:border-r">
              <MessageCircle className="text-[var(--primary)]" size={34} />
              <h2 className="mt-6 text-balance text-4xl font-black leading-tight">{config.formulario.titulo}</h2>
              <p className="mt-4 text-sm leading-relaxed text-[var(--page-muted)]">{config.formulario.texto}</p>

              <div className="mt-8 space-y-3 text-sm font-bold text-white">
                {editableText.formBullets.map((item) => (
                  <p key={item} className="flex items-center gap-2"><CheckCircle2 size={17} className="text-[var(--primary)]" /> {item}</p>
                ))}
              </div>
            </div>

            <form onSubmit={sendLead} className="grid gap-4 p-7 sm:p-10">
              <div className="grid gap-4 sm:grid-cols-2">
                {formFieldVisible(formFields.nome) ? (
                  <label className="grid gap-2">
                    <span className="text-xs font-black uppercase tracking-[0.18em] text-[var(--page-muted)]">{formFieldLabel(formFields.nome, 'Nome')}</span>
                    <input required={Boolean(formFields.nome.obrigatorio)} autoComplete="name" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder={formFields.nome.placeholder || 'Nome'} className="min-w-0 rounded-2xl border border-white/10 bg-black/35 px-4 py-4 text-sm outline-none transition focus:border-[var(--primary)]/50" />
                  </label>
                ) : null}
                {formFieldVisible(formFields.telefone) ? (
                  <label className="grid gap-2">
                    <span className="text-xs font-black uppercase tracking-[0.18em] text-[var(--page-muted)]">{formFieldLabel(formFields.telefone, 'Telefone / WhatsApp')}</span>
                    <input required={Boolean(formFields.telefone.obrigatorio)} inputMode="tel" autoComplete="tel" value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} placeholder={formFields.telefone.placeholder || 'Telefone / WhatsApp'} className="min-w-0 rounded-2xl border border-white/10 bg-black/35 px-4 py-4 text-sm outline-none transition focus:border-[var(--primary)]/50" />
                  </label>
                ) : null}
              </div>
              {formFieldVisible(formFields.email) ? (
                <label className="grid gap-2">
                  <span className="text-xs font-black uppercase tracking-[0.18em] text-[var(--page-muted)]">{formFieldLabel(formFields.email, 'E-mail')}</span>
                  <input required={Boolean(formFields.email.obrigatorio)} type="email" autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder={formFields.email.placeholder || 'E-mail'} className="rounded-2xl border border-white/10 bg-black/35 px-4 py-4 text-sm outline-none transition focus:border-[var(--primary)]/50" />
                </label>
              ) : null}
              {customFormFields.map((field, index) => (
                <label key={`${field.id || 'campo'}-${index}`} className="grid gap-2">
                  <span className="text-xs font-black uppercase tracking-[0.18em] text-[var(--page-muted)]">{field.rotulo}</span>
                  {field.tipo === 'textarea' ? (
                    <textarea required={Boolean(field.obrigatorio)} value={form.camposExtras[field.id] || ''} onChange={(e) => setForm({ ...form, camposExtras: { ...form.camposExtras, [field.id]: e.target.value } })} placeholder={field.placeholder || field.rotulo} rows={3} className="rounded-2xl border border-white/10 bg-black/35 px-4 py-4 text-sm outline-none transition focus:border-[var(--primary)]/50" />
                  ) : (
                    <input required={Boolean(field.obrigatorio)} type={field.tipo === 'email' ? 'email' : 'text'} inputMode={field.tipo === 'tel' ? 'tel' : undefined} value={form.camposExtras[field.id] || ''} onChange={(e) => setForm({ ...form, camposExtras: { ...form.camposExtras, [field.id]: e.target.value } })} placeholder={field.placeholder || field.rotulo} className="rounded-2xl border border-white/10 bg-black/35 px-4 py-4 text-sm outline-none transition focus:border-[var(--primary)]/50" />
                  )}
                </label>
              ))}
              {formFieldVisible(formFields.mensagem) ? (
                <label className="grid gap-2">
                  <span className="text-xs font-black uppercase tracking-[0.18em] text-[var(--page-muted)]">{formFieldLabel(formFields.mensagem, 'Mensagem')}</span>
                  <textarea required={Boolean(formFields.mensagem.obrigatorio)} value={form.mensagem} onChange={(e) => setForm({ ...form, mensagem: e.target.value })} placeholder={formFields.mensagem.placeholder || 'Mensagem'} rows={4} className="rounded-2xl border border-white/10 bg-black/35 px-4 py-4 text-sm outline-none transition focus:border-[var(--primary)]/50" />
                </label>
              ) : null}
              <button disabled={sending} className="inline-flex min-h-14 items-center justify-center gap-2 rounded-full bg-[var(--primary)] px-6 py-4 text-sm font-black text-black transition hover:brightness-110 disabled:opacity-60">
                {sending ? editableText.formularioEnviandoTexto : config.formulario.botao}
                {!sending && <ArrowRight size={17} />}
              </button>
            </form>
          </div>
        </section>
      )}
      </div>

      {config.rodape.ativo ? (
        <footer className="mt-8 border-t border-white/10 bg-black/50 py-4 pb-28 backdrop-blur-md md:pb-4">
          <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 md:flex-row">
            {config.rodape.mostrarLogo ? (
              <div data-lp-reveal className="flex min-w-[120px] justify-center md:justify-start">
                <BrandMark config={config} />
              </div>
            ) : <div className="hidden min-w-[120px] md:block" />}

            {config.rodape.mostrarCopyright ? (
              <p data-lp-reveal className="text-center text-xs text-gray-500 sm:text-sm">
              &copy; {new Date().getFullYear()} {config.identidade.marca}. {config.rodape.copyright}
              </p>
            ) : null}

            <div data-lp-reveal="right" className="flex flex-wrap justify-center gap-4 text-xs font-medium text-gray-400 sm:gap-6 sm:text-sm md:justify-end">
              {footerLinkVisible(config.rodape.mostrarTermos, config.rodape.termosUrl) ? (
                <a href={config.rodape.termosUrl} className="transition-colors hover:text-[var(--primary)]">
                  {editableText.rodapeTermosTexto}
                </a>
              ) : null}
              {footerLinkVisible(config.rodape.mostrarPrivacidade, config.rodape.privacidadeUrl) ? (
                <a href={config.rodape.privacidadeUrl} className="transition-colors hover:text-[var(--primary)]">
                  {editableText.rodapePrivacidadeTexto}
                </a>
              ) : null}
              {footerLinkVisible(config.rodape.mostrarContato, config.rodape.contatoUrl) ? (
                <a href={config.rodape.contatoUrl} className="transition-colors hover:text-[var(--primary)]">
                  {editableText.rodapeContatoTexto}
                </a>
              ) : null}
              {footerLinkVisible(config.rodape.mostrarInstagram, config.rodape.instagramUrl) ? (
                <a href={config.rodape.instagramUrl} target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-[var(--primary)]">
                  {editableText.rodapeInstagramTexto}
                </a>
              ) : null}
            </div>
          </div>
        </footer>
      ) : null}

      {!previewMode && config.formulario.ativo ? (
        <div className="fixed inset-x-3 bottom-3 z-30 rounded-full border border-white/10 bg-black/80 p-2 shadow-2xl shadow-black/60 backdrop-blur-xl md:hidden">
          <a
            href="#formulario"
            className="flex min-h-12 items-center justify-center gap-2 rounded-full bg-[var(--primary)] px-5 py-3 text-sm font-black text-black"
          >
            {mobileCtaText}
            <ArrowRight size={17} />
          </a>
        </div>
      ) : null}

      {!previewMode && floatingWhatsappUrl ? (
        <div className={`fixed right-4 z-50 group sm:right-6 ${config.formulario.ativo ? 'bottom-20 sm:bottom-24 md:bottom-6' : 'bottom-4 sm:bottom-6'}`}>
          <div className="absolute inset-0 animate-ping rounded-full bg-[var(--primary)] opacity-20 transition-opacity duration-500 group-hover:opacity-40" />
          <a
            href={floatingWhatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Falar com ${config.identidade.marca} no WhatsApp`}
            className="relative flex h-14 w-14 items-center justify-center rounded-full bg-[var(--primary)] text-black shadow-[0_0_20px_rgba(107,225,47,0.4)] transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_0_40px_rgba(107,225,47,0.8)] sm:h-16 sm:w-16"
          >
            <svg className="h-7 w-7 sm:h-8 sm:w-8" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
            </svg>
          </a>
        </div>
      ) : null}
    </main>
  )
}
