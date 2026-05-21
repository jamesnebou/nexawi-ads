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

export const LP_GENERATOR_TEMPLATES = [
  {
    id: 'servico-local',
    name: 'Servico local',
    description: 'Para prestadores, lojas, assistencias, oficinas e negocios de bairro.',
    defaultName: 'LP Servico Local',
    config: {
      identidade: {
        corPrimaria: '#6be12f',
        corSecundaria: '#14b8a6',
        corFundo: '#050505',
      },
      hero: {
        eyebrow: 'Atendimento rapido na sua regiao',
        titulo: 'Resolva isso hoje com uma equipe local de confianca',
        subtitulo: 'Mostre sua solucao, destaque o atendimento proximo e capture contatos prontos para chamar no WhatsApp.',
      },
      beneficios: {
        titulo: 'Por que escolher uma empresa local muda tudo',
        itens: [
          { titulo: 'Resposta mais rapida', texto: 'O lead entende que pode falar com alguem da propria regiao sem demora.' },
          { titulo: 'Confiança imediata', texto: 'A pagina reforca proximidade, clareza e facilidade de atendimento.' },
          { titulo: 'Contato direto', texto: 'O caminho para WhatsApp ou formulario fica simples e sem distracao.' },
        ],
      },
      prova: {
        depoimento: 'Cheguei pela pagina, entendi rapido o servico e consegui falar no mesmo dia.',
        autor: 'Cliente local',
      },
      oferta: {
        titulo: 'Atendimento direto, sem enrolacao',
        texto: 'Explique sua oferta principal, area atendida, prazo medio e o melhor motivo para o visitante chamar agora.',
      },
      seo: {
        title: 'Servico local com atendimento rapido',
        description: 'Landing page para capturar clientes interessados em servicos locais.',
      },
    },
  },
  {
    id: 'clinica-estetica',
    name: 'Clinica e estetica',
    description: 'Para estetica, saude, odontologia, harmonizacao, terapeutas e studios.',
    defaultName: 'LP Clinica e Estetica',
    config: {
      identidade: {
        corPrimaria: '#f6c6d6',
        corSecundaria: '#a78bfa',
        corFundo: '#090609',
      },
      hero: {
        eyebrow: 'Agenda seletiva',
        titulo: 'Valorize sua imagem com um atendimento pensado para voce',
        subtitulo: 'Uma pagina elegante para apresentar procedimentos, gerar desejo com seguranca e receber contatos qualificados.',
      },
      beneficios: {
        titulo: 'Experiencia premium antes mesmo da primeira consulta',
        itens: [
          { titulo: 'Desejo com criterio', texto: 'A comunicacao mostra transformacao sem prometer resultado irresponsavel.' },
          { titulo: 'Autoridade visual', texto: 'A pagina passa cuidado, higiene, estetica e profissionalismo.' },
          { titulo: 'Agenda organizada', texto: 'O formulario ajuda a entender o interesse antes do primeiro contato.' },
        ],
      },
      prova: {
        depoimento: 'A pagina passa profissionalismo e ajuda a pessoa a chegar mais decidida para o atendimento.',
        autor: 'Especialista parceira',
      },
      oferta: {
        titulo: 'Agende uma avaliacao personalizada',
        texto: 'Use este bloco para explicar o procedimento, orientar expectativas e conduzir para uma conversa segura.',
        preco: 'Avaliacao sob consulta',
      },
      seo: {
        title: 'Clinica e estetica com atendimento premium',
        description: 'Landing page para clinicas, estetica e atendimentos personalizados.',
      },
    },
  },
  {
    id: 'curso-mentoria',
    name: 'Curso ou mentoria',
    description: 'Para experts, treinamentos, consultorias, grupos pagos e infoprodutos.',
    defaultName: 'LP Curso ou Mentoria',
    config: {
      identidade: {
        corPrimaria: '#8b5cf6',
        corSecundaria: '#22d3ee',
        corFundo: '#05020d',
      },
      hero: {
        eyebrow: 'Nova turma aberta',
        titulo: 'Aprenda o metodo que encurta seu caminho para o resultado',
        subtitulo: 'Uma pagina preparada para vender autoridade, apresentar a promessa e capturar interessados para uma chamada ou lista.',
      },
      beneficios: {
        titulo: 'O que faz a pessoa querer entrar agora',
        itens: [
          { titulo: 'Promessa especifica', texto: 'O visitante entende qual transformacao esta sendo oferecida.' },
          { titulo: 'Autoridade clara', texto: 'O layout destaca metodo, prova e direcao sem parecer conteudo solto.' },
          { titulo: 'Proximo passo simples', texto: 'O lead escolhe conversar, entrar na lista ou aplicar para a turma.' },
        ],
      },
      prova: {
        depoimento: 'A pagina deixou a promessa mais forte e os interessados chegaram mais conscientes.',
        autor: 'Aluno em potencial',
      },
      oferta: {
        titulo: 'Entre para a proxima turma',
        texto: 'Mostre para quem e, o que a pessoa recebe, quais resultados ela busca e por que agora e o momento certo.',
        preco: 'Vagas limitadas',
      },
      seo: {
        title: 'Curso ou mentoria com inscricoes abertas',
        description: 'Landing page para cursos, mentorias e programas de transformacao.',
      },
    },
  },
  {
    id: 'imobiliaria',
    name: 'Imobiliaria',
    description: 'Para corretores, loteamentos, apartamentos, casas e captacao de visitas.',
    defaultName: 'LP Imobiliaria',
    config: {
      identidade: {
        corPrimaria: '#f59e0b',
        corSecundaria: '#22c55e',
        corFundo: '#070707',
      },
      hero: {
        eyebrow: 'Oportunidade imobiliaria',
        titulo: 'Encontre o imovel certo antes que ele saia do mercado',
        subtitulo: 'Apresente localizacao, diferenciais e chamada para visita com uma pagina direta para captar compradores interessados.',
      },
      beneficios: {
        titulo: 'Do interesse a visita em poucos cliques',
        itens: [
          { titulo: 'Diferenciais visiveis', texto: 'Mostre localizacao, acabamento, financiamento e pontos fortes rapidamente.' },
          { titulo: 'Contato qualificado', texto: 'O corretor recebe dados de quem realmente demonstrou interesse.' },
          { titulo: 'Oferta com urgencia', texto: 'A pagina permite destacar condicao, prazo e disponibilidade.' },
        ],
      },
      prova: {
        depoimento: 'A pagina deixou o imovel mais claro e facilitou o contato com compradores reais.',
        autor: 'Equipe comercial',
      },
      oferta: {
        titulo: 'Agende uma visita ou simule agora',
        texto: 'Use este espaco para informar condicao, bairro, metragem, entrada facilitada e chamada para falar com o corretor.',
        preco: 'Condicoes especiais',
      },
      seo: {
        title: 'Imovel com condicoes especiais',
        description: 'Landing page para captacao de compradores e agendamento de visitas.',
      },
    },
  },
  {
    id: 'evento',
    name: 'Evento',
    description: 'Para shows, workshops, palestras, congressos, eventos locais e inscricoes.',
    defaultName: 'LP Evento',
    config: {
      identidade: {
        corPrimaria: '#f97316',
        corSecundaria: '#ec4899',
        corFundo: '#080405',
      },
      hero: {
        eyebrow: 'Inscricoes abertas',
        titulo: 'Um evento para quem quer sair do comum',
        subtitulo: 'Destaque data, promessa, experiencia e chamada para inscricao em uma pagina feita para gerar decisao rapida.',
      },
      beneficios: {
        titulo: 'Por que participar agora',
        itens: [
          { titulo: 'Experiencia clara', texto: 'A pessoa entende o que vai viver e por que deve se inscrever.' },
          { titulo: 'Urgencia natural', texto: 'Vagas, lote, data e beneficios ficam em destaque.' },
          { titulo: 'Inscricao simples', texto: 'O formulario captura interesse ou direciona para compra do ingresso.' },
        ],
      },
      prova: {
        depoimento: 'A pagina deixou o evento mais desejavel e aumentou a procura por inscricoes.',
        autor: 'Organizacao do evento',
      },
      oferta: {
        titulo: 'Garanta sua vaga no proximo lote',
        texto: 'Explique data, local, beneficios, convidados e o motivo para fazer a inscricao agora.',
        preco: 'Lote atual',
      },
      seo: {
        title: 'Evento com inscricoes abertas',
        description: 'Landing page para divulgar evento e capturar inscricoes.',
      },
    },
  },
  {
    id: 'saas',
    name: 'SaaS ou startup',
    description: 'Para softwares, apps, plataformas, listas de espera e demonstracoes.',
    defaultName: 'LP SaaS',
    config: {
      identidade: {
        corPrimaria: '#38bdf8',
        corSecundaria: '#6be12f',
        corFundo: '#030712',
      },
      hero: {
        eyebrow: 'Produto em crescimento',
        titulo: 'Transforme um problema complexo em uma operacao simples',
        subtitulo: 'Uma pagina para explicar o software, mostrar valor rapidamente e capturar leads para demo, teste ou lista de espera.',
      },
      beneficios: {
        titulo: 'Venda a clareza antes de vender a ferramenta',
        itens: [
          { titulo: 'Problema evidente', texto: 'Mostre a dor operacional que o produto resolve sem jargao desnecessario.' },
          { titulo: 'Valor em camadas', texto: 'Explique beneficios, prova e fluxo de uso em uma narrativa simples.' },
          { titulo: 'Demo qualificada', texto: 'Capture leads que ja entenderam o contexto antes de pedir contato.' },
        ],
      },
      prova: {
        depoimento: 'A pagina tornou a proposta mais objetiva e facilitou conversas comerciais melhores.',
        autor: 'Time de produto',
      },
      oferta: {
        titulo: 'Veja como funciona na pratica',
        texto: 'Use este bloco para convidar para uma demonstracao, teste guiado ou conversa com o time comercial.',
        preco: 'Demo gratuita',
      },
      seo: {
        title: 'Software com demonstracao gratuita',
        description: 'Landing page para SaaS, startup e captacao de demos.',
      },
    },
  },
]

export function getLpTemplate(templateId = '') {
  return LP_GENERATOR_TEMPLATES.find((template) => template.id === templateId) || null
}

export function getLpTemplateConfig(templateId = '') {
  const template = getLpTemplate(templateId)
  return getLpConfig(template?.config || {})
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
