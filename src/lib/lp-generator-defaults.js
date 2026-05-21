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
    eyebrow: 'Pagina de conversao premium',
    titulo: 'Transforme atencao em clientes todos os dias',
    subtitulo: 'Uma landing page moderna, direta e construida para mostrar valor rapido, quebrar objeções e capturar leads prontos para conversar.',
    ctaTexto: 'Quero conversar agora',
    ctaUrl: '#formulario',
    imagemUrl: '',
    backgroundUrl: '',
  },
  beneficios: {
    ativo: true,
    titulo: 'Uma estrutura pensada para prender atencao e gerar acao',
    itens: [
      { titulo: 'Promessa em segundos', texto: 'A pessoa entende o que voce vende antes de pensar em sair da pagina.' },
      { titulo: 'Oferta sem ruido', texto: 'O layout destaca valor, prova e proximo passo sem parecer uma pagina comum.' },
      { titulo: 'Contato mais quente', texto: 'O formulario fica no contexto certo, depois que o visitante ja entendeu a oferta.' },
    ],
  },
  prova: {
    ativo: true,
    titulo: 'Prova de confianca',
    depoimento: 'A pagina ficou mais clara, mais bonita e os contatos passaram a chegar com muito mais contexto.',
    autor: 'Cliente em operacao',
  },
  oferta: {
    ativo: true,
    titulo: 'Mostre sua oferta como algo impossivel de ignorar',
    texto: 'Use este bloco para resumir a proposta, reforcar diferenciais, reduzir duvidas e levar o visitante direto para o contato.',
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
    titulo: 'Entre na fila de atendimento',
    texto: 'Preencha os dados e receba um contato com a orientacao certa para o seu caso.',
    botao: 'Enviar meus dados',
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
