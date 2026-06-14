export const LP_GENERATOR_ORDERABLE_SECTIONS = [
  { id: 'logos', label: 'Logos' },
  { id: 'beneficios', label: 'Benefícios' },
  { id: 'prova', label: 'Prova social' },
  { id: 'galeria', label: 'Prova visual' },
  { id: 'oferta', label: 'Oferta' },
  { id: 'garantia', label: 'Garantia' },
  { id: 'urgencia', label: 'Urgência' },
  { id: 'precos', label: 'Preços' },
  { id: 'cta', label: 'CTA intermediário' },
  { id: 'faq', label: 'FAQ' },
  { id: 'formulario', label: 'Formulário' },
]

export const LP_GENERATOR_HERO_VARIANTS = [
  {
    id: 'split-media',
    name: 'Imagem lateral',
    description: 'Texto forte e imagem solta ao lado. Bom para produto, serviço e oferta direta.',
  },
  {
    id: 'center-stage',
    name: 'Palco central',
    description: 'Promessa centralizada com midia abaixo para LPs mais editoriais.',
  },
  {
    id: 'media-left',
    name: 'Imagem primeiro',
    description: 'A midia ganha prioridade visual e o texto entra como fechamento da dobra.',
  },
  {
    id: 'cover-story',
    name: 'Imagem imersiva',
    description: 'Usa a imagem do hero como atmosfera de fundo e foca a primeira dobra no CTA.',
  },
]

export const LP_GENERATOR_VISUAL_STYLES = [
  {
    id: 'editorial-premium',
    name: 'Editorial premium',
    description: 'Composição de manifesto, contraste alto, seções com respiro e prova em destaque.',
    heroVariant: 'center-stage',
    palette: {
      corPrimaria: '#d7ff61',
      corSecundaria: '#ffffff',
      corFundo: '#070707',
      corTexto: '#ffffff',
      corTextoSuave: '#b6b6b6',
    },
  },
  {
    id: 'tech-neon',
    name: 'Tech neon',
    description: 'Grade luminosa, linhas técnicas, superfícies compactas e acentos digitais.',
    heroVariant: 'split-media',
    palette: {
      corPrimaria: '#3bf7ff',
      corSecundaria: '#8b5cf6',
      corFundo: '#02050d',
      corTexto: '#eefcff',
      corTextoSuave: '#98b5c7',
    },
  },
  {
    id: 'luxo-discreto',
    name: 'Luxo discreto',
    description: 'Ritmo silencioso, dourado contido, bordas finas e atmosfera mais exclusiva.',
    heroVariant: 'center-stage',
    palette: {
      corPrimaria: '#d6b46a',
      corSecundaria: '#f4ead6',
      corFundo: '#080706',
      corTexto: '#fffaf0',
      corTextoSuave: '#b8ad9a',
    },
  },
  {
    id: 'imobiliario-impactante',
    name: 'Imobiliário impactante',
    description: 'Dobra agressiva para imagem, oferta, disponibilidade e agendamento.',
    heroVariant: 'media-left',
    palette: {
      corPrimaria: '#ffab08',
      corSecundaria: '#34d399',
      corFundo: '#070806',
      corTexto: '#ffffff',
      corTextoSuave: '#aeb6aa',
    },
  },
  {
    id: 'evento-agressivo',
    name: 'Evento agressivo',
    description: 'Energia visual, acentos quentes, CTA recorrente e senso de lote/agenda.',
    heroVariant: 'cover-story',
    palette: {
      corPrimaria: '#ff5a1f',
      corSecundaria: '#ff2da6',
      corFundo: '#090205',
      corTexto: '#fff7fb',
      corTextoSuave: '#d3aeba',
    },
  },
  {
    id: 'clinica-clean-premium',
    name: 'Clínica clean premium',
    description: 'Leve, limpo e sofisticado para atendimento, estética e saúde.',
    heroVariant: 'split-media',
    palette: {
      corPrimaria: '#f4b9cb',
      corSecundaria: '#8bd2c7',
      corFundo: '#120d11',
      corTexto: '#fff9fb',
      corTextoSuave: '#d8c5cd',
    },
  },
]

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
  estilo: {
    preset: 'editorial-premium',
  },
  cabecalho: {
    ativo: true,
    mostrarMarca: true,
    mostrarPrecos: true,
    precosTexto: 'Preços',
    mostrarContato: true,
    contatoTexto: 'Contato',
    contatoUrl: '#formulario',
  },
  hero: {
    ativo: true,
    variante: 'split-media',
    eyebrow: 'Página de conversão premium',
    titulo: 'Transforme atenção em clientes todos os dias',
    subtitulo: 'Uma landing page moderna, direta e construida para mostrar valor rápido, quebrar objeções e capturar leads prontos para conversar.',
    ctaTexto: 'Quero conversar agora',
    ctaUrl: '#formulario',
    imagemUrl: '',
    backgroundUrl: '',
  },
  logos: {
    ativo: false,
    backgroundUrl: '',
    eyebrow: 'Confiança',
    titulo: 'Marcas, clientes ou parceiros que reforçam sua autoridade',
    itens: [
      { nome: 'Cliente 01', imagemUrl: '' },
      { nome: 'Cliente 02', imagemUrl: '' },
      { nome: 'Cliente 03', imagemUrl: '' },
    ],
  },
  beneficios: {
    ativo: true,
    backgroundUrl: '',
    titulo: 'Uma estrutura pensada para prender atenção e gerar ação',
    itens: [
      { titulo: 'Promessa em segundos', texto: 'A pessoa entende o que voce vende antes de pensar em sair da página.' },
      { titulo: 'Oferta sem ruído', texto: 'O layout destaca valor, prova e próximo passo sem parecer uma página comum.' },
      { titulo: 'Contato mais quente', texto: 'O formulário fica no contexto certo, depois que o visitante ja entendeu a oferta.' },
    ],
  },
  prova: {
    ativo: true,
    backgroundUrl: '',
    titulo: 'Prova de confiança',
    depoimento: 'A pagina ficou mais clara, mais bonita e os contatos passaram a chegar com muito mais contexto.',
    autor: 'Cliente em operação',
  },
  galeria: {
    ativo: false,
    backgroundUrl: '',
    eyebrow: 'Prova visual',
    titulo: 'Mostre resultado, bastidor ou produto em contexto real',
    texto: 'Imagens certas reduzem dúvida e fazem a oferta parecer concreta antes do contato.',
    itens: [
      { titulo: 'Resultado em destaque', texto: 'Use uma imagem que torne a entrega visivel.', imagemUrl: '' },
      { titulo: 'Experiência real', texto: 'Mostre o produto, ambiente ou atendimento.', imagemUrl: '' },
      { titulo: 'Detalhe que convence', texto: 'Reforce qualidade, acabamento ou transformação.', imagemUrl: '' },
    ],
  },
  oferta: {
    ativo: true,
    backgroundUrl: '',
    titulo: 'Mostre sua oferta como algo impossível de ignorar',
    texto: 'Use este bloco para resumir a proposta, reforcar diferenciais, reduzir dúvidas e levar o visitante direto para o contato.',
    preco: 'Sob consulta',
    ctaTexto: 'Falar no WhatsApp',
    ctaUrl: '#formulario',
  },
  garantia: {
    ativo: false,
    backgroundUrl: '',
    eyebrow: 'Seguranca',
    titulo: 'Reduza o risco percebido antes da decisao',
    texto: 'Explique garantia, suporte, acompanhamento ou compromisso que deixa o visitante mais seguro para avancar.',
    selo: 'Compromisso claro com a entrega',
  },
  urgencia: {
    ativo: false,
    backgroundUrl: '',
    eyebrow: 'Agora',
    titulo: 'De um motivo legitimo para agir neste momento',
    texto: 'Use prazo, lote, agenda, bonus ou capacidade operacional sem criar promessa artificial.',
    destaque: 'Condicao atual disponivel',
    ctaTexto: 'Quero aproveitar agora',
    ctaUrl: '#formulario',
  },
  precos: {
    ativo: false,
    backgroundUrl: '',
    eyebrow: 'Planos',
    titulo: 'Escolha a condicao certa para comecar',
    texto: 'Mostre opcoes claras, entregaveis objetivos e o proximo passo para contratar.',
    planos: [
      {
        nome: 'Essencial',
        descricao: 'Para validar a oferta com clareza.',
        preco: 'R$ 297',
        periodo: '/mes',
        imagemUrl: '',
        ctaTexto: 'Quero este plano',
        ctaUrl: '#formulario',
        destaque: false,
        entregaveis: ['Landing page editavel', 'Captura de leads', 'Suporte inicial'],
      },
      {
        nome: 'Crescimento',
        descricao: 'Para operar com mais velocidade.',
        preco: 'R$ 597',
        periodo: '/mes',
        imagemUrl: '',
        ctaTexto: 'Escolher crescimento',
        ctaUrl: '#formulario',
        destaque: true,
        entregaveis: ['Tudo do Essencial', 'Ajustes de oferta', 'Relatorio de leads'],
      },
      {
        nome: 'Premium',
        descricao: 'Para campanhas mais completas.',
        preco: 'Sob consulta',
        periodo: '',
        imagemUrl: '',
        ctaTexto: 'Falar com especialista',
        ctaUrl: '#formulario',
        destaque: false,
        entregaveis: ['Estrategia personalizada', 'Acompanhamento comercial', 'Prioridade no suporte'],
      },
    ],
  },
  cta: {
    ativo: false,
    backgroundUrl: '',
    eyebrow: 'Proximo passo',
    titulo: 'Leve o visitante de volta para a acao certa',
    texto: 'Repita a chamada principal depois que prova, oferta e objecoes ja foram trabalhadas.',
    ctaTexto: 'Quero falar agora',
    ctaUrl: '#formulario',
    mobileTexto: '',
  },
  textos: {
    heroBotaoSecundario: '',
    heroScrollTexto: '',
    previewEyebrow: '',
    previewStatus: '',
    previewCards: [],
    metricas: [],
    sinais: [],
    beneficiosEyebrow: '',
    beneficiosIntro: '',
    provaIntro: '',
    ofertaEyebrow: '',
    ofertaItens: [],
    ofertaCondicaoLabel: '',
    ofertaTextoAuxiliar: '',
    formularioItens: [],
    faqEyebrow: '',
    planoDestaqueTexto: '',
    planoCtaFallback: '',
    formularioEnviandoTexto: '',
    rodapeTermosTexto: '',
    rodapePrivacidadeTexto: '',
    rodapeContatoTexto: '',
    rodapeInstagramTexto: '',
    whatsappMensagem: '',
  },
  faq: {
    ativo: true,
    backgroundUrl: '',
    titulo: 'Perguntas frequentes',
    itens: [
      { pergunta: 'Posso mudar os textos depois?', resposta: 'Sim. A landing foi pensada para ser editada sem depender de programador.' },
      { pergunta: 'Funciona no celular?', resposta: 'Sim. O layout e responsivo e prioriza leitura rapida.' },
    ],
  },
  formulario: {
    ativo: true,
    backgroundUrl: '',
    titulo: 'Entre na fila de atendimento',
    texto: 'Preencha os dados e receba um contato com a orientacao certa para o seu caso.',
    botao: 'Enviar meus dados',
    destinoWhatsapp: '',
    campos: {
      nome: {
        ativo: true,
        obrigatorio: true,
        rotulo: 'Nome',
        placeholder: 'Nome',
      },
      telefone: {
        ativo: true,
        obrigatorio: true,
        rotulo: 'Telefone / WhatsApp',
        placeholder: 'Telefone / WhatsApp',
      },
      email: {
        ativo: true,
        obrigatorio: false,
        rotulo: 'E-mail',
        placeholder: 'E-mail',
      },
      mensagem: {
        ativo: true,
        obrigatorio: false,
        rotulo: 'Mensagem',
        placeholder: 'Mensagem',
      },
    },
    camposExtras: [],
  },
  rodape: {
    ativo: true,
    mostrarLogo: true,
    mostrarCopyright: true,
    copyright: 'Todos os direitos reservados.',
    mostrarTermos: false,
    termosUrl: '',
    mostrarPrivacidade: false,
    privacidadeUrl: '',
    mostrarContato: true,
    contatoUrl: '#formulario',
    mostrarInstagram: false,
    instagramUrl: '',
    whatsappAtivo: false,
    whatsappNumero: '',
  },
  seo: {
    title: 'Landing Page de Alta Conversao',
    description: 'Pagina criada no gerador de LP da NexaWi.',
  },
  integracoes: {
    customDomain: '',
    metaPixelId: '',
    ga4MeasurementId: '',
    googleTagManagerId: '',
  },
  layout: {
    templateLayout: 'conversion-flow',
    sectionOrder: LP_GENERATOR_ORDERABLE_SECTIONS.map((section) => section.id),
  },
}

export const LP_GENERATOR_TEMPLATES = [
  {
    id: 'servico-local',
    name: 'Serviço local',
    description: 'Para prestadores, lojas, assistências, oficinas e negócios de bairro.',
    premium: false,
    defaultName: 'LP Servico Local',
    config: {
      identidade: {
        corPrimaria: '#6be12f',
        corSecundaria: '#14b8a6',
        corFundo: '#050505',
      },
      estilo: {
        preset: 'editorial-premium',
      },
      layout: {
        templateLayout: 'local-service',
        sectionOrder: ['beneficios', 'prova', 'oferta', 'garantia', 'cta', 'faq', 'formulario', 'logos', 'galeria', 'urgencia', 'precos'],
      },
      hero: {
        variante: 'split-media',
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
      garantia: {
        ativo: true,
        eyebrow: 'Atendimento seguro',
        titulo: 'Mostre o que deixa a decisao simples para quem precisa resolver agora',
        texto: 'Use este bloco para explicar prazo de resposta, suporte, area atendida ou compromisso operacional que reduz a duvida antes do contato.',
        selo: 'Contato direto com uma equipe da regiao',
      },
      cta: {
        ativo: true,
        eyebrow: 'Chamada direta',
        titulo: 'Quem procura uma solucao local precisa encontrar o proximo passo sem friccao',
        texto: 'Reforce a chamada para conversa quando o visitante ja entendeu a entrega e a confianca do atendimento.',
        ctaTexto: 'Pedir atendimento agora',
      },
      seo: {
        title: 'Serviço local com atendimento rápido',
        description: 'Landing page para capturar clientes interessados em servicos locais.',
      },
    },
  },
  {
    id: 'clinica-estetica',
    name: 'Clínica e estética',
    description: 'Para estética, saúde, odontologia, harmonização, terapeutas e stúdios.',
    premium: false,
    defaultName: 'LP Clinica e Estetica',
    config: {
      identidade: {
        corPrimaria: '#f6c6d6',
        corSecundaria: '#a78bfa',
        corFundo: '#090609',
      },
      estilo: {
        preset: 'clinica-clean-premium',
      },
      layout: {
        templateLayout: 'clinic-editorial',
        sectionOrder: ['galeria', 'beneficios', 'prova', 'garantia', 'oferta', 'cta', 'faq', 'formulario', 'logos', 'urgencia', 'precos'],
      },
      hero: {
        variante: 'split-media',
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
      galeria: {
        ativo: true,
        eyebrow: 'Experiencia',
        titulo: 'Transforme cuidado e resultado em desejo visual',
        texto: 'Adicione fotos de ambiente, procedimento, equipe e detalhes reais para sustentar a sensacao premium.',
      },
      garantia: {
        ativo: true,
        eyebrow: 'Seguranca',
        titulo: 'A decisao fica mais facil quando o atendimento transmite criterio',
        texto: 'Explique avaliacao, acompanhamento, biosseguranca, limite do procedimento ou suporte pos-atendimento.',
        selo: 'Avaliacao orientada antes da decisao',
      },
      cta: {
        ativo: true,
        eyebrow: 'Agenda',
        titulo: 'Conduza o interesse para uma conversa elegante e objetiva',
        texto: 'Depois da prova e dos diferenciais, deixe claro como a pessoa pode reservar o proximo horario.',
        ctaTexto: 'Quero avaliar meu caso',
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
    premium: true,
    defaultName: 'LP Curso ou Mentoria',
    config: {
      identidade: {
        corPrimaria: '#8b5cf6',
        corSecundaria: '#22d3ee',
        corFundo: '#05020d',
      },
      estilo: {
        preset: 'tech-neon',
      },
      layout: {
        templateLayout: 'expert-launch',
        sectionOrder: ['beneficios', 'prova', 'urgencia', 'precos', 'oferta', 'cta', 'faq', 'formulario', 'logos', 'galeria', 'garantia'],
      },
      hero: {
        variante: 'center-stage',
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
      urgência: {
        ativo: true,
        eyebrow: 'Proxima turma',
        titulo: 'Organize urgência real com vagas, inicio e criterio de entrada',
        texto: 'Use este bloco para mostrar prazo de inscricao, bonus atual ou limite de acompanhamento sem depender de escassez artificial.',
        destaque: 'Inscricoes da turma atual abertas',
        ctaTexto: 'Quero entrar na turma',
      },
      preços: {
        ativo: true,
        eyebrow: 'Formatos',
        titulo: 'Apresente a oferta com caminho de entrada claro',
        texto: 'Edite os planos para mostrar mentoria, turma, consultoria ou aplicacao comercial.',
      },
      cta: {
        ativo: true,
        eyebrow: 'Aplicacao',
        titulo: 'A pessoa certa precisa saber exatamente como avancar',
        texto: 'Use esta chamada para direcionar o lead para inscricao, conversa ou lista prioritaria.',
        ctaTexto: 'Quero aplicar agora',
      },
      seo: {
        title: 'Curso ou mentoria com inscricoes abertas',
        description: 'Landing page para cursos, mentorias e programas de transformacao.',
      },
    },
  },
  {
    id: 'imobiliaria',
    name: 'Imobiliária',
    description: 'Para corretores, loteamentos, apartamentos, casas e captação de visítas.',
    premium: true,
    defaultName: 'LP Imobiliaria',
    config: {
      identidade: {
        corPrimaria: '#f59e0b',
        corSecundaria: '#22c55e',
        corFundo: '#070707',
      },
      estilo: {
        preset: 'imobiliario-impactante',
      },
      layout: {
        templateLayout: 'real-estate-showcase',
        sectionOrder: ['galeria', 'beneficios', 'oferta', 'urgencia', 'prova', 'cta', 'faq', 'formulario', 'logos', 'garantia', 'precos'],
      },
      hero: {
        variante: 'media-left',
        eyebrow: 'Oportunidade imobiliaria',
        titulo: 'Encontre o imovel certo antes que ele saia do mercado',
        subtitulo: 'Apresente localizacao, diferenciais e chamada para visita com uma pagina direta para captar compradores interessados.',
      },
      beneficios: {
        titulo: 'Do interesse a visita em poucos cliques',
        itens: [
          { titulo: 'Diferenciais visiveis', texto: 'Mostre localizacao, acabamento, financiamento e pontos fortes rapidamente.' },
          { titulo: 'Contato qualificado', texto: 'O corretor recebe dados de quem realmente demonstrou interesse.' },
          { titulo: 'Oferta com urgência', texto: 'A pagina permite destacar condição, prazo e disponibilidade.' },
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
      galeria: {
        ativo: true,
        eyebrow: 'Visita visual',
        titulo: 'Mostre o imovel antes da conversa comercial',
        texto: 'Adicione fachada, planta, ambiente, vista e entorno para transformar curiosidade em visita.',
      },
      urgencia: {
        ativo: true,
        eyebrow: 'Disponibilidade',
        titulo: 'Deixe claro o que pode mudar na condicao atual',
        texto: 'Informe unidade, lote, agenda de visita, simulacao ou condicao comercial que merece resposta rapida.',
        destaque: 'Consulte disponibilidade antes da visita',
        ctaTexto: 'Falar com o corretor',
      },
      cta: {
        ativo: true,
        eyebrow: 'Agendamento',
        titulo: 'O comprador interessado precisa chegar ao corretor no ponto certo',
        texto: 'Reforce simulacao, visita e conversa depois de apresentar os diferenciais do imovel.',
        ctaTexto: 'Agendar minha visita',
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
    premium: true,
    defaultName: 'LP Evento',
    config: {
      identidade: {
        corPrimaria: '#f97316',
        corSecundaria: '#ec4899',
        corFundo: '#080405',
      },
      estilo: {
        preset: 'evento-agressivo',
      },
      layout: {
        templateLayout: 'event-ticket',
        sectionOrder: ['urgencia', 'beneficios', 'galeria', 'precos', 'prova', 'oferta', 'cta', 'faq', 'formulario', 'logos', 'garantia'],
      },
      hero: {
        variante: 'cover-story',
        eyebrow: 'Inscricoes abertas',
        titulo: 'Um evento para quem quer sair do comum',
        subtitulo: 'Destaque data, promessa, experiencia e chamada para inscricao em uma pagina feita para gerar decisao rapida.',
      },
      beneficios: {
        titulo: 'Por que participar agora',
        itens: [
          { titulo: 'Experiencia clara', texto: 'A pessoa entende o que vai viver e por que deve se inscrever.' },
          { titulo: 'Urgência natural', texto: 'Vagas, lote, data e beneficios ficam em destaque.' },
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
      galeria: {
        ativo: true,
        eyebrow: 'Clima do evento',
        titulo: 'Mostre a experiencia antes do ingresso',
        texto: 'Use imagens de palco, publico, convidados ou estrutura para tornar a promessa concreta.',
      },
      urgencia: {
        ativo: true,
        eyebrow: 'Lote atual',
        titulo: 'Data e disponibilidade fazem a decisao acontecer',
        texto: 'Reforce mudanca de lote, limite de vagas, horario e beneficio de comprar ou se inscrever agora.',
        destaque: 'Lote atual sujeito a virada',
        ctaTexto: 'Garantir minha vaga',
      },
      cta: {
        ativo: true,
        eyebrow: 'Inscricao',
        titulo: 'Quem ja se imaginou no evento precisa de uma acao evidente',
        texto: 'Repita a chamada com foco em ingresso, lista ou inscricao depois de construir desejo.',
        ctaTexto: 'Quero participar',
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
    premium: true,
    defaultName: 'LP SaaS',
    config: {
      identidade: {
        corPrimaria: '#38bdf8',
        corSecundaria: '#6be12f',
        corFundo: '#030712',
      },
      estilo: {
        preset: 'tech-neon',
      },
      layout: {
        templateLayout: 'product-demo',
        sectionOrder: ['logos', 'beneficios', 'oferta', 'garantia', 'precos', 'prova', 'cta', 'faq', 'formulario', 'galeria', 'urgencia'],
      },
      hero: {
        variante: 'split-media',
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
      logos: {
        ativo: true,
        eyebrow: 'Autoridade',
        titulo: 'Reserve espaco para clientes, integracoes e parceiros que validam o produto',
      },
      garantia: {
        ativo: true,
        eyebrow: 'Onboarding',
        titulo: 'Reduza o medo de trocar processo por software',
        texto: 'Explique implantacao, suporte, seguranca, teste guiado ou acompanhamento que protege a decisao.',
        selo: 'Demo com contexto real da operacao',
      },
      preços: {
        ativo: true,
        eyebrow: 'Planos',
        titulo: 'Deixe a conversa comercial pronta para escalar',
        texto: 'Edite os planos para apresentar entrada, crescimento e operacao completa com entregaveis claros.',
      },
      cta: {
        ativo: true,
        eyebrow: 'Demo',
        titulo: 'Mostre o produto no momento em que o valor ja ficou claro',
        texto: 'Convide para demo, teste ou conversa qualificada depois de apresentar prova e oferta.',
        ctaTexto: 'Agendar demonstracao',
      },
      seo: {
        title: 'Software com demonstracao gratuita',
        description: 'Landing page para SaaS, startup e captacao de demos.',
      },
    },
  },
  {
    id: 'loja-roupas',
    name: 'Loja de roupas',
    description: 'Para boutique, moda feminina, masculina, infantil, drops e colecoes vendidas pelo WhatsApp.',
    premium: false,
    defaultName: 'Site Loja de Roupas',
    config: {
      identidade: {
        corPrimaria: '#ff4fb8',
        corSecundaria: '#facc15',
        corFundo: '#080508',
      },
      estilo: {
        preset: 'luxo-discreto',
      },
      layout: {
        templateLayout: 'fashion-store',
        sectionOrder: ['galeria', 'precos', 'beneficios', 'oferta', 'prova', 'cta', 'faq', 'formulario', 'logos', 'garantia', 'urgencia'],
      },
      cabecalho: {
        precosTexto: 'Produtos',
        contatoTexto: 'Comprar no WhatsApp',
        contatoUrl: '#precos',
      },
      hero: {
        variante: 'split-media',
        eyebrow: 'Colecao disponivel',
        titulo: 'Looks escolhidos para voce comprar pelo WhatsApp',
        subtitulo: 'Mostre pecas, preços, tamanhos e disponibilidade com uma vitrine moderna que leva o cliente direto para o pedido.',
        ctaTexto: 'Ver produtos',
        ctaUrl: '#precos',
      },
      galeria: {
        ativo: true,
        eyebrow: 'Vitrine visual',
        titulo: 'Mostre a colecao como desejo, nao como lista',
        texto: 'Use fotos de looks, detalhes, combinacoes e novidades para o cliente escolher antes de chamar no WhatsApp.',
        itens: [
          { titulo: 'Look destaque', texto: 'Foto principal da colecao ou combinacao mais vendavel.', imagemUrl: '' },
          { titulo: 'Detalhe da peca', texto: 'Mostre tecido, caimento, cor ou acabamento.', imagemUrl: '' },
          { titulo: 'Novidade da semana', texto: 'Use para lancamento, reposicao ou promocao.', imagemUrl: '' },
        ],
      },
      beneficios: {
        titulo: 'Tudo para comprar sem precisar ir ate a loja',
        itens: [
          { titulo: 'Preco claro', texto: 'Cada produto pode ter foto, valor e chamada para pedido.' },
          { titulo: 'Compra assistida', texto: 'O cliente chama no WhatsApp para confirmar tamanho, cor e entrega.' },
          { titulo: 'Vitrine atualizada', texto: 'Troque produtos, imagens e ofertas direto pelo editor.' },
        ],
      },
      precos: {
        ativo: true,
        eyebrow: 'Produtos em destaque',
        titulo: 'Escolha sua peca e chame no WhatsApp',
        texto: 'Edite os cards abaixo com foto, nome, preco, tamanho, cor e chamada para fechar o pedido.',
        planos: [
          {
            nome: 'Vestido canelado',
            descricao: 'Peca versatil para look casual ou noite.',
            preco: 'R$ 129,90',
            periodo: '',
            imagemUrl: '',
            ctaTexto: 'Comprar pelo WhatsApp',
            ctaUrl: '#formulario',
            destaque: true,
            entregaveis: ['Tamanhos P, M e G', 'Cores disponiveis no WhatsApp', 'Retirada ou entrega local'],
          },
          {
            nome: 'Conjunto alfaiataria',
            descricao: 'Visual pronto com acabamento premium.',
            preco: 'R$ 219,90',
            periodo: '',
            imagemUrl: '',
            ctaTexto: 'Consultar tamanho',
            ctaUrl: '#formulario',
            destaque: false,
            entregaveis: ['Tecido estruturado', 'Ideal para trabalho ou evento', 'Atendimento pelo WhatsApp'],
          },
          {
            nome: 'Blusa essencial',
            descricao: 'Produto de giro para compra rapida.',
            preco: 'R$ 69,90',
            periodo: '',
            imagemUrl: '',
            ctaTexto: 'Quero essa peca',
            ctaUrl: '#formulario',
            destaque: false,
            entregaveis: ['Varias cores', 'Combina com looks basicos', 'Pedido direto no WhatsApp'],
          },
        ],
      },
      oferta: {
        titulo: 'Monte seu pedido com atendimento direto',
        texto: 'Use esta area para explicar entrega, retirada, troca, formas de pagamento e como a pessoa finaliza pelo WhatsApp.',
        preco: 'Pedido pelo WhatsApp',
        ctaTexto: 'Falar com a loja',
      },
      formulario: {
        titulo: 'Peca seu produto pelo WhatsApp',
        texto: 'Informe a peca desejada, tamanho e cor. A loja retorna para confirmar disponibilidade e pagamento.',
        botao: 'Enviar pedido',
        camposExtras: [
          { id: 'produto', rotulo: 'Produto desejado', placeholder: 'Ex: vestido canelado tamanho M', tipo: 'text', obrigatorio: true },
        ],
      },
      seo: {
        title: 'Loja de roupas com compra pelo WhatsApp',
        description: 'Site vitrine para loja de roupas vender produtos pelo WhatsApp.',
      },
    },
  },
  {
    id: 'loja-calcados',
    name: 'Loja de calçados',
    description: 'Para tenis, sandálias, sapatos, chinelos e modelos vendidos por reserva no WhatsApp.',
    premium: false,
    defaultName: 'Site Loja de Calcados',
    config: {
      identidade: {
        corPrimaria: '#f97316',
        corSecundaria: '#38bdf8',
        corFundo: '#060606',
      },
      estilo: {
        preset: 'imobiliario-impactante',
      },
      layout: {
        templateLayout: 'shoe-store',
        sectionOrder: ['precos', 'galeria', 'beneficios', 'oferta', 'prova', 'cta', 'faq', 'formulario', 'logos', 'garantia', 'urgencia'],
      },
      cabeçalho: {
        precosTexto: 'Modelos',
        contatoTexto: 'Reservar modelo',
        contatoUrl: '#precos',
      },
      hero: {
        variante: 'media-left',
        eyebrow: 'Modelos disponiveis',
        titulo: 'Escolha seu calcado e reserve pelo WhatsApp',
        subtitulo: 'Uma vitrine direta para mostrar modelos, preços, numeracao e levar o cliente para a conversa de compra.',
        ctaTexto: 'Ver modelos',
        ctaUrl: '#precos',
      },
      beneficios: {
        titulo: 'Menos duvida, mais reserva pelo WhatsApp',
        itens: [
          { titulo: 'Modelo em destaque', texto: 'Cada card mostra foto, preco e chamada de reserva.' },
          { titulo: 'Numeracao consultiva', texto: 'O cliente chama para confirmar tamanho antes de comprar.' },
          { titulo: 'Venda assistida', texto: 'A equipe pode orientar cor, estoque, entrega e pagamento.' },
        ],
      },
      galeria: {
        ativo: true,
        eyebrow: 'Detalhes',
        titulo: 'Mostre o calcado em angulos que vendem',
        texto: 'Use fotos da lateral, sola, detalhe, cor e composicao para aumentar confianca antes da reserva.',
      },
      precos: {
        ativo: true,
        eyebrow: 'Modelos em destaque',
        titulo: 'Reserve o modelo ideal no seu numero',
        texto: 'Edite os cards com foto, nome, preco, numeracao, cores e chamada para reserva.',
        planos: [
          {
            nome: 'Tenis urbano',
            descricao: 'Conforto para rotina e visual casual.',
            preco: 'R$ 189,90',
            periodo: '',
            imagemUrl: '',
            ctaTexto: 'Consultar numeracao',
            ctaUrl: '#formulario',
            destaque: true,
            entregaveis: ['Numeros 37 ao 43', 'Cores disponiveis no WhatsApp', 'Reserva rapida'],
          },
          {
            nome: 'Sandalia premium',
            descricao: 'Modelo leve para saida, trabalho ou passeio.',
            preco: 'R$ 119,90',
            periodo: '',
            imagemUrl: '',
            ctaTexto: 'Reservar no WhatsApp',
            ctaUrl: '#formulario',
            destaque: false,
            entregaveis: ['Confortavel', 'Consulta de tamanho', 'Entrega local'],
          },
          {
            nome: 'Sapato social',
            descricao: 'Acabamento elegante para ocasioes especiais.',
            preco: 'R$ 249,90',
            periodo: '',
            imagemUrl: '',
            ctaTexto: 'Ver disponibilidade',
            ctaUrl: '#formulario',
            destaque: false,
            entregaveis: ['Modelo masculino', 'Cores sob consulta', 'Atendimento assistido'],
          },
        ],
      },
      formulario: {
        titulo: 'Reserve seu calcado',
        texto: 'Informe modelo, numero e cor desejada. A loja confirma disponibilidade pelo WhatsApp.',
        botao: 'Enviar reserva',
        camposExtras: [
          { id: 'modelo', rotulo: 'Modelo e numero desejado', placeholder: 'Ex: tenis urbano numero 40', tipo: 'text', obrigatorio: true },
        ],
      },
      oferta: {
        titulo: 'Compra assistida para acertar no tamanho',
        texto: 'Explique troca, retirada, entrega, formas de pagamento e disponibilidade de numeracao.',
        preco: 'Reserva pelo WhatsApp',
        ctaTexto: 'Chamar vendedor',
      },
      seo: {
        title: 'Loja de calçados com reserva pelo WhatsApp',
        description: 'Site vitrine para loja de calçados vender modelos pelo WhatsApp.',
      },
    },
  },
  {
    id: 'farmacia',
    name: 'Farmácia',
    description: 'Para farmácias e drogarias com ofertas, itens de cuidado, entrega local e pedido pelo WhatsApp.',
    premium: false,
    defaultName: 'Site Farmacia',
    config: {
      identidade: {
        corPrimaria: '#22c55e',
        corSecundaria: '#38bdf8',
        corFundo: '#06110b',
      },
      estilo: {
        preset: 'clinica-clean-premium',
      },
      layout: {
        templateLayout: 'pharmacy-store',
        sectionOrder: ['precos', 'beneficios', 'oferta', 'garantia', 'prova', 'cta', 'faq', 'formulario', 'logos', 'galeria', 'urgencia'],
      },
      cabeçalho: {
        precosTexto: 'Ofertas',
        contatoTexto: 'Pedir no WhatsApp',
        contatoUrl: '#precos',
      },
      hero: {
        variante: 'split-media',
        eyebrow: 'Farmácia perto de voce',
        titulo: 'Peça seus produtos de farmácia pelo WhatsApp',
        subtitulo: 'Mostre ofertas, itens essênciais, cuidado pessoal e entrega local com atendimento rápido pelo WhatsApp.',
        ctaTexto: 'Ver ofertas',
        ctaUrl: '#precos',
      },
      beneficios: {
        titulo: 'Confianca e praticidade para pedidos rapidos',
        itens: [
          { titulo: 'Ofertas visiveis', texto: 'Produtos com foto, preco e descricao objetiva.' },
          { titulo: 'Entrega local', texto: 'Explique bairro, prazo, taxa ou retirada na loja.' },
          { titulo: 'Atendimento humano', texto: 'O cliente confirma produto e disponibilidade pelo WhatsApp.' },
        ],
      },
      garantia: {
        ativo: true,
        eyebrow: 'Cuidado',
        titulo: 'Pedido confirmado com atendimento responsavel',
        texto: 'Use esta secao para orientar sobre disponibilidade, substituicoes, entrega e contato com a equipe.',
        selo: 'Atendimento local pelo WhatsApp',
      },
      preços: {
        ativo: true,
        eyebrow: 'Ofertas e produtos',
        titulo: 'Escolha o produto e confirme pelo WhatsApp',
        texto: 'Edite os cards com foto, nome, preco, indicacao basica e chamada para pedido.',
        planos: [
          {
            nome: 'Kit cuidado diario',
            descricao: 'Itens de cuidado pessoal para rotina.',
            preco: 'R$ 39,90',
            periodo: '',
            imagemUrl: '',
            ctaTexto: 'Pedir no WhatsApp',
            ctaUrl: '#formulario',
            destaque: true,
            entregaveis: ['Produto sujeito a disponibilidade', 'Entrega local', 'Confirmacao pelo WhatsApp'],
          },
          {
            nome: 'Vitaminas selecionadas',
            descricao: 'Consulte marcas e disponibilidade.',
            preco: 'A partir de R$ 29,90',
            periodo: '',
            imagemUrl: '',
            ctaTexto: 'Consultar produto',
            ctaUrl: '#formulario',
            destaque: false,
            entregaveis: ['Marcas sob consulta', 'Orientacao de compra', 'Retirada ou entrega'],
          },
          {
            nome: 'Higiene e beleza',
            descricao: 'Produtos essenciais com atendimento local.',
            preco: 'Ofertas do dia',
            periodo: '',
            imagemUrl: '',
            ctaTexto: 'Ver disponibilidade',
            ctaUrl: '#formulario',
            destaque: false,
            entregaveis: ['Ofertas atualizaveis', 'Pedido assistido', 'Pagamento combinado no contato'],
          },
        ],
      },
      oferta: {
        titulo: 'Atendimento rapido para confirmar seu pedido',
        texto: 'Explique horario de funcionamento, area de entrega, retirada, pagamento e como o cliente deve enviar o pedido.',
        preco: 'Pedido pelo WhatsApp',
        ctaTexto: 'Chamar farmácia',
      },
      formulario: {
        titulo: 'Envie seu pedido',
        texto: 'Informe produto, quantidade e bairro. A farmácia retorna para confirmar disponibilidade e entrega.',
        botao: 'Enviar pedido',
        camposExtras: [
          { id: 'pedido', rotulo: 'Produto e quantidade', placeholder: 'Ex: vitamina C 1 unidade', tipo: 'text', obrigatorio: true },
          { id: 'bairro', rotulo: 'Bairro para entrega', placeholder: 'Ex: Centro', tipo: 'text', obrigatorio: false },
        ],
      },
      seo: {
        title: 'Farmácia com pedido pelo WhatsApp',
        description: 'Site vitrine para farmácia receber pedidos e consultar produtos pelo WhatsApp.',
      },
    },
  },
]

export function getLpTemplate(templateId = '') {
  return LP_GENERATOR_TEMPLATES.find((template) => template.id === templateId) || null
}

export function isLpTemplatePremium(templateId = '') {
  return Boolean(getLpTemplate(templateId)?.premium)
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
