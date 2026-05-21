export const LP_GENERATOR_DEFAULT_CONFIG = {
  identidade: {
    marca: 'Sua Marca',
    logoUrl: '',
    corPrimaria: '#6be12f',
    corSecundaria: '#10b981',
    corFundo: '#050505',
    corTexto: '#ffffff',
    corTextoSuave: '#a3a3a3',
  },
  hero: {
    ativo: true,
    eyebrow: 'Oferta por tempo limitado',
    titulo: 'Transforme visitantes em clientes todos os dias',
    subtitulo: 'Uma landing page direta, bonita e feita para capturar leads qualificados sem complicacao.',
    ctaTexto: 'Quero uma proposta',
    ctaUrl: '#formulario',
    imagemUrl: '',
    backgroundUrl: '',
  },
  beneficios: {
    ativo: true,
    titulo: 'Por que isso converte melhor',
    itens: [
      { titulo: 'Mensagem clara', texto: 'A promessa aparece logo no primeiro bloco.' },
      { titulo: 'Oferta objetiva', texto: 'O visitante entende o valor antes de se distrair.' },
      { titulo: 'CTA direto', texto: 'Cada secao empurra para a proxima acao.' },
    ],
  },
  prova: {
    ativo: true,
    titulo: 'Prova de confianca',
    depoimento: 'A pagina ficou simples de entender e gerou contatos mais qualificados.',
    autor: 'Cliente satisfeito',
  },
  oferta: {
    ativo: true,
    titulo: 'Pronto para vender com mais clareza',
    texto: 'Apresente sua oferta, destaque bonus, prazo, garantia e chamada para acao em um unico lugar.',
    preco: 'Sob consulta',
    ctaTexto: 'Falar no WhatsApp',
    ctaUrl: '#formulario',
  },
  faq: {
    ativo: true,
    titulo: 'Perguntas frequentes',
    itens: [
      { pergunta: 'Posso mudar os textos depois?', resposta: 'Sim. A landing foi pensada para ser editada sem depender de programador.' },
      { pergunta: 'Funciona no celular?', resposta: 'Sim. O layout e responsivo e prioriza leitura rapida.' },
    ],
  },
  formulario: {
    ativo: true,
    titulo: 'Receba uma proposta',
    texto: 'Preencha os dados e nossa equipe entra em contato.',
    botao: 'Enviar interesse',
    destinoWhatsapp: '',
  },
  seo: {
    title: 'Landing Page de Alta Conversao',
    description: 'Pagina criada no gerador de LP da NexaWi.',
  },
}

export function deepMerge(base, incoming) {
  if (!incoming || typeof incoming !== 'object' || Array.isArray(incoming)) {
    return base
  }

  const result = { ...base }

  Object.entries(incoming).forEach(([key, value]) => {
    if (
      value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      base[key] &&
      typeof base[key] === 'object' &&
      !Array.isArray(base[key])
    ) {
      result[key] = deepMerge(base[key], value)
    } else {
      result[key] = value
    }
  })

  return result
}

export function getLpConfig(config = {}) {
  return deepMerge(LP_GENERATOR_DEFAULT_CONFIG, config)
}

export function slugifyLp(value = '') {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
}
