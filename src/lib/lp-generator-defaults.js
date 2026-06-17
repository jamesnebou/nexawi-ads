export const LP_GENERATOR_ORDERABLE_SECTIONS = [
  { id: 'logos', label: 'Logos' },
  { id: 'benefícios', label: 'Benefícios' },
  { id: 'prova', label: 'Prova social' },
  { id: 'galeria', label: 'Prova visual' },
  { id: 'oferta', label: 'Oferta' },
  { id: 'garantia', label: 'Garantia' },
  { id: 'urgencia', label: 'Urgência' },
  { id: 'precos', label: 'Preços' },
  { id: 'cta', label: 'CTA intermediário' },
  { id: 'faq', label: 'FAQ' },
  { id: 'formulário', label: 'Formulário' },
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
    description: 'Promessa centralizada com mídia abaixo para LPs mais editoriais.',
  },
  {
    id: 'media-left',
    name: 'Imagem primeiro',
    description: 'A mídia ganha prioridade visual e o texto entra como fechamento da dobra.',
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
    contatoUrl: '#formulário',
  },
  hero: {
    ativo: true,
    variante: 'split-media',
    eyebrow: 'Página de conversão premium',
    titulo: 'Transforme atenção em clientes todos os dias',
    subtitulo: 'Uma landing page moderna, direta e construída para mostrar valor rápido, quebrar objeções e capturar leads prontos para conversar.',
    ctaTexto: 'Quero conversar agora',
    ctaUrl: '#formulário',
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
  benefícios: {
    ativo: true,
    backgroundUrl: '',
    titulo: 'Uma estrutura pensada para prender atenção e gerar ação',
    itens: [
      { titulo: 'Promessa em segundos', texto: 'A pessoa entende o que você vende antes de pensar em sair da página.' },
      { titulo: 'Oferta sem ruído', texto: 'O layout destaca valor, prova e próximo passo sem parecer uma página comum.' },
      { titulo: 'Contato mais quente', texto: 'O formulário fica no contexto certo, depois que o visitante já entendeu a oferta.' },
    ],
  },
  prova: {
    ativo: true,
    backgroundUrl: '',
    titulo: 'Prova de confiança',
    depoimento: 'A página ficou mais clara, mais bonita e os contatos passaram a chegar com muito mais contexto.',
    autor: 'Cliente em operação',
  },
  galeria: {
    ativo: false,
    backgroundUrl: '',
    eyebrow: 'Prova visual',
    titulo: 'Mostre resultado, bastidor ou produto em contexto real',
    texto: 'Imagens certas reduzem dúvida e fazem a oferta parecer concreta antes do contato.',
    itens: [
      { titulo: 'Resultado em destaque', texto: 'Use uma imagem que torne a entrega visível.', imagemUrl: '' },
      { titulo: 'Experiência real', texto: 'Mostre o produto, ambiente ou atendimento.', imagemUrl: '' },
      { titulo: 'Detalhe que convence', texto: 'Reforce qualidade, acabamento ou transformação.', imagemUrl: '' },
    ],
  },
  oferta: {
    ativo: true,
    backgroundUrl: '',
    titulo: 'Mostre sua oferta como algo impossível de ignorar',
    texto: 'Use este bloco para resumir a proposta, reforçar diferenciais, reduzir dúvidas e levar o visitante direto para o contato.',
    preco: 'Sob consulta',
    ctaTexto: 'Falar no WhatsApp',
    ctaUrl: '#formulário',
  },
  garantia: {
    ativo: false,
    backgroundUrl: '',
    eyebrow: 'Segurança',
    titulo: 'Reduza o risco percebido antes da decisão',
    texto: 'Explique garantia, suporte, acompanhamento ou compromisso que deixa o visitante mais seguro para avançar.',
    selo: 'Compromisso claro com a entrega',
  },
  urgencia: {
    ativo: false,
    backgroundUrl: '',
    eyebrow: 'Agora',
    titulo: 'De um motivo legítimo para agir neste momento',
    texto: 'Use prazo, lote, agenda, bônus ou capacidade operacional sem criar promessa artificial.',
    destaque: 'Condição atual disponível',
    ctaTexto: 'Quero aproveitar agora',
    ctaUrl: '#formulário',
  },
  precos: {
    ativo: false,
    backgroundUrl: '',
    eyebrow: 'Planos',
    titulo: 'Escolha a condição certa para começar',
    texto: 'Mostre opções claras, entregáveis objetivos e o próximo passo para contratar.',
    planos: [
      {
        nome: 'Essencial',
        descricao: 'Para validar a oferta com clareza.',
        preco: 'R$ 297',
        periodo: '/mes',
        imagemUrl: '',
        ctaTexto: 'Quero este plano',
        ctaUrl: '#formulário',
        destaque: false,
        entregáveis: ['Landing page editavel', 'Captura de leads', 'Suporte inicial'],
      },
      {
        nome: 'Crescimento',
        descricao: 'Para operar com mais velocidade.',
        preco: 'R$ 597',
        periodo: '/mes',
        imagemUrl: '',
        ctaTexto: 'Escolher crescimento',
        ctaUrl: '#formulário',
        destaque: true,
        entregáveis: ['Tudo do Essencial', 'Ajustes de oferta', 'Relatorio de leads'],
      },
      {
        nome: 'Premium',
        descricao: 'Para campanhas mais completas.',
        preco: 'Sob consulta',
        periodo: '',
        imagemUrl: '',
        ctaTexto: 'Falar com especialista',
        ctaUrl: '#formulário',
        destaque: false,
        entregáveis: ['Estratégia personalizada', 'Acompanhamento comercial', 'Prioridade no suporte'],
      },
    ],
  },
  cta: {
    ativo: false,
    backgroundUrl: '',
    eyebrow: 'Próximo passo',
    titulo: 'Leve o visitante de volta para a ação certa',
    texto: 'Repita a chamada principal depois que prova, oferta e objeções já foram trabalhadas.',
    ctaTexto: 'Quero falar agora',
    ctaUrl: '#formulário',
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
    benefíciosEyebrow: '',
    benefíciosIntro: '',
    provaIntro: '',
    ofertaEyebrow: '',
    ofertaItens: [],
    ofertaCondicaoLabel: '',
    ofertaTextoAuxiliar: '',
    formulárioItens: [],
    faqEyebrow: '',
    planoDestaqueTexto: '',
    planoCtaFallback: '',
    formulárioEnviandoTexto: '',
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
      { pergunta: 'Funciona no celular?', resposta: 'Sim. O layout e responsivo e prioriza leitura rápida.' },
    ],
  },
  formulário: {
    ativo: true,
    backgroundUrl: '',
    titulo: 'Entre na fila de atendimento',
    texto: 'Preencha os dados e receba um contato com a orientação certa para o seu caso.',
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
    contatoUrl: '#formulário',
    mostrarInstagram: false,
    instagramUrl: '',
    whatsappAtivo: false,
    whatsappNumero: '',
  },
  seo: {
    title: 'Landing Page de Alta Conversão',
    description: 'Página criada no gerador de LP da NexaWi.',
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
    description: 'Para prestádores, lojas, assistências, oficinas e negócios de bairro.',
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
        sectionOrder: ['benefícios', 'prova', 'oferta', 'garantia', 'cta', 'faq', 'formulário', 'logos', 'galeria', 'urgencia', 'precos'],
      },
      hero: {
        variante: 'split-media',
        eyebrow: 'Atendimento rápido na sua região',
        titulo: 'Resolva isso hoje com uma equipe local de confiança',
        subtitulo: 'Mostre sua solução, destaque o atendimento próximo e capture contatos prontos para chamar no WhatsApp.',
      },
      benefícios: {
        titulo: 'Por que escolher uma empresa local muda tudo',
        itens: [
          { titulo: 'Resposta mais rápida', texto: 'O lead entende que pode falar com alguém da própria região sem demora.' },
          { titulo: 'Confiança imediata', texto: 'A página reforça proximidade, clareza e facilidade de atendimento.' },
          { titulo: 'Contato direto', texto: 'O caminho para WhatsApp ou formulário fica simples e sem distração.' },
        ],
      },
      prova: {
        depoimento: 'Cheguei pela página, entendi rápido o servico e consegui falar no mesmo dia.',
        autor: 'Cliente local',
      },
      oferta: {
        titulo: 'Atendimento direto, sem enrolação',
        texto: 'Explique sua oferta principal, área atendida, prazo médio e o melhor motivo para o visitante chamar agora.',
      },
      garantia: {
        ativo: true,
        eyebrow: 'Atendimento seguro',
        titulo: 'Mostre o que deixa a decisão simples para quem precisa resolver agora',
        texto: 'Use este bloco para explicar prazo de resposta, suporte, área atendida ou compromisso operacional que reduz a dúvida antes do contato.',
        selo: 'Contato direto com uma equipe da região',
      },
      cta: {
        ativo: true,
        eyebrow: 'Chamada direta',
        titulo: 'Quem procura uma solução local precisa encontrar o próximo passo sem fricção',
        texto: 'Reforce a chamada para conversa quando o visitante já entendeu a entrega e a confiança do atendimento.',
        ctaTexto: 'Pedir atendimento agora',
      },
      seo: {
        title: 'Serviço local com atendimento rápido',
        description: 'Landing page para capturar clientes interessados em servicos locais.',
      },
    },
  },
  {
    id: 'clinica-estética',
    name: 'Clínica e estética',
    description: 'Para estética, saúde, odontologia, harmonização, terapeutas e stúdios.',
    premium: false,
    defaultName: 'LP Clinica e Estética',
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
        sectionOrder: ['galeria', 'benefícios', 'prova', 'garantia', 'oferta', 'cta', 'faq', 'formulário', 'logos', 'urgencia', 'precos'],
      },
      hero: {
        variante: 'split-media',
        eyebrow: 'Agenda seletiva',
        titulo: 'Valorize sua imagem com um atendimento pensado para você',
        subtitulo: 'Uma página elegante para apresentar procedimentos, gerar desejo com segurança e receber contatos qualificados.',
      },
      benefícios: {
        titulo: 'Experiência premium antes mesmo da primeira consulta',
        itens: [
          { titulo: 'Desejo com critério', texto: 'A comunicação mostra transformação sem prometer resultado irresponsável.' },
          { titulo: 'Autoridade visual', texto: 'A página passa cuidado, higiene, estética e profissionalismo.' },
          { titulo: 'Agenda organizada', texto: 'O formulário ajuda a entender o interesse antes do primeiro contato.' },
        ],
      },
      prova: {
        depoimento: 'A página passa profissionalismo e ajuda a pessoa a chegar mais decidida para o atendimento.',
        autor: 'Especialista parceira',
      },
      oferta: {
        titulo: 'Agende uma avaliação personalizada',
        texto: 'Use este bloco para explicar o procedimento, orientar expectativas e conduzir para uma conversa segura.',
        preco: 'Avaliação sob consulta',
      },
      galeria: {
        ativo: true,
        eyebrow: 'Experiência',
        titulo: 'Transforme cuidado e resultado em desejo visual',
        texto: 'Adicione fotos de ambiente, procedimento, equipe e detalhes reais para sustentar a sensação premium.',
      },
      garantia: {
        ativo: true,
        eyebrow: 'Segurança',
        titulo: 'A decisão fica mais fácil quando o atendimento transmite critério',
        texto: 'Explique avaliação, acompanhamento, biossegurança, limite do procedimento ou suporte pós-atendimento.',
        selo: 'Avaliação orientada antes da decisão',
      },
      cta: {
        ativo: true,
        eyebrow: 'Agenda',
        titulo: 'Conduza o interesse para uma conversa elegante e objetiva',
        texto: 'Depois da prova e dos diferenciais, deixe claro como a pessoa pode reservar o próximo horário.',
        ctaTexto: 'Quero avaliar meu caso',
      },
      seo: {
        title: 'Clinica e estética com atendimento premium',
        description: 'Landing page para clinicas, estética e atendimentos personalizados.',
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
        sectionOrder: ['benefícios', 'prova', 'urgencia', 'precos', 'oferta', 'cta', 'faq', 'formulário', 'logos', 'galeria', 'garantia'],
      },
      hero: {
        variante: 'center-stage',
        eyebrow: 'Nova turma aberta',
        titulo: 'Aprenda o método que encurta seu caminho para o resultado',
        subtitulo: 'Uma página preparada para vender autoridade, apresentar a promessa e capturar interessados para uma chamada ou lista.',
      },
      benefícios: {
        titulo: 'O que faz a pessoa querer entrar agora',
        itens: [
          { titulo: 'Promessa específica', texto: 'O visitante entende qual transformação está sendo oferecida.' },
          { titulo: 'Autoridade clara', texto: 'O layout destaca método, prova e direção sem parecer conteúdo solto.' },
          { titulo: 'Próximo passo simples', texto: 'O lead escolhe conversar, entrar na lista ou aplicar para a turma.' },
        ],
      },
      prova: {
        depoimento: 'A página deixou a promessa mais forte e os interessados chegaram mais conscientes.',
        autor: 'Aluno em potencial',
      },
      oferta: {
        titulo: 'Entre para a próxima turma',
        texto: 'Mostre para quem e, o que a pessoa recebe, quais resultados ela busca e por que agora e o momento certo.',
        preco: 'Vagas limitadas',
      },
      urgência: {
        ativo: true,
        eyebrow: 'Próxima turma',
        titulo: 'Organize urgência real com vagas, início e critério de entrada',
        texto: 'Use este bloco para mostrar prazo de inscrição, bônus atual ou limite de acompanhamento sem depender de escassez artificial.',
        destaque: 'Inscrições da turma atual abertas',
        ctaTexto: 'Quero entrar na turma',
      },
      precos: {
        ativo: true,
        eyebrow: 'Formatos',
        titulo: 'Apresente a oferta com caminho de entrada claro',
        texto: 'Edite os planos para mostrar mentoria, turma, consultoria ou aplicação comercial.',
      },
      cta: {
        ativo: true,
        eyebrow: 'Aplicação',
        titulo: 'A pessoa certa precisa saber exatamente como avançar',
        texto: 'Use esta chamada para direcionar o lead para inscrição, conversa ou lista prioritária.',
        ctaTexto: 'Quero aplicar agora',
      },
      seo: {
        title: 'Curso ou mentoria com inscrições abertas',
        description: 'Landing page para cursos, mentorias e programas de transformação.',
      },
    },
  },
  {
    id: 'imobiliaria',
    name: 'Imobiliária',
    description: 'Para corretores, loteamentos, apartamentos, casas e captação de visitas.',
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
        sectionOrder: ['galeria', 'benefícios', 'oferta', 'urgencia', 'prova', 'cta', 'faq', 'formulário', 'logos', 'garantia', 'precos'],
      },
      hero: {
        variante: 'media-left',
        eyebrow: 'Oportunidade imobiliaria',
        titulo: 'Encontre o imóvel certo antes que ele saia do mercado',
        subtitulo: 'Apresente localização, diferenciais e chamada para visita com uma página direta para captar compradores interessados.',
      },
      benefícios: {
        titulo: 'Do interesse à visita em poucos cliques',
        itens: [
          { titulo: 'Diferenciais visíveis', texto: 'Mostre localização, acabamento, financiamento e pontos fortes rapidamente.' },
          { titulo: 'Contato qualificado', texto: 'O corretor recebe dados de quem realmente demonstrou interesse.' },
          { titulo: 'Oferta com urgência', texto: 'A página permite destacar condição, prazo e disponibilidade.' },
        ],
      },
      prova: {
        depoimento: 'A página deixou o imóvel mais claro e fácilitou o contato com compradores reais.',
        autor: 'Equipe comercial',
      },
      oferta: {
        titulo: 'Agende uma visita ou simule agora',
        texto: 'Use este espaço para informar condição, bairro, metragem, entrada fácilitada e chamada para falar com o corretor.',
        preco: 'Condições especiais',
      },
      galeria: {
        ativo: true,
        eyebrow: 'Visita visual',
        titulo: 'Mostre o imóvel antes da conversa comercial',
        texto: 'Adicione fachada, planta, ambiente, vista e entorno para transformar curiosidade em visita.',
      },
      urgencia: {
        ativo: true,
        eyebrow: 'Disponibilidade',
        titulo: 'Deixe claro o que pode mudar na condição atual',
        texto: 'Informe unidade, lote, agenda de visita, simulação ou condição comercial que merece resposta rápida.',
        destaque: 'Consulte disponibilidade antes da visita',
        ctaTexto: 'Falar com o corretor',
      },
      cta: {
        ativo: true,
        eyebrow: 'Agendamento',
        titulo: 'O comprador interessado precisa chegar ao corretor no ponto certo',
        texto: 'Reforce simulação, visita e conversa depois de apresentar os diferenciais do imóvel.',
        ctaTexto: 'Agendar minha visita',
      },
      seo: {
        title: 'Imóvel com condições especiais',
        description: 'Landing page para captação de compradores e agendamento de visitas.',
      },
    },
  },
  {
    id: 'evento',
    name: 'Evento',
    description: 'Para shows, workshops, palestras, congressos, eventos locais e inscrições.',
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
        sectionOrder: ['urgencia', 'benefícios', 'galeria', 'precos', 'prova', 'oferta', 'cta', 'faq', 'formulário', 'logos', 'garantia'],
      },
      hero: {
        variante: 'cover-story',
        eyebrow: 'Inscrições abertas',
        titulo: 'Um evento para quem quer sair do comum',
        subtitulo: 'Destaque data, promessa, experiência e chamada para inscrição em uma página feita para gerar decisão rápida.',
      },
      benefícios: {
        titulo: 'Por que participar agora',
        itens: [
          { titulo: 'Experiência clara', texto: 'A pessoa entende o que vai viver e por que deve se inscrever.' },
          { titulo: 'Urgência natural', texto: 'Vagas, lote, data e benefícios ficam em destaque.' },
          { titulo: 'Inscrição simples', texto: 'O formulário captura interesse ou direciona para compra do ingresso.' },
        ],
      },
      prova: {
        depoimento: 'A página deixou o evento mais desejável e aumentou a procura por inscrições.',
        autor: 'Organização do evento',
      },
      oferta: {
        titulo: 'Garanta sua vaga no próximo lote',
        texto: 'Explique data, local, benefícios, convidados e o motivo para fazer a inscrição agora.',
        preco: 'Lote atual',
      },
      galeria: {
        ativo: true,
        eyebrow: 'Clima do evento',
        titulo: 'Mostre a experiência antes do ingresso',
        texto: 'Use imagens de palco, público, convidados ou estrutura para tornar a promessa concreta.',
      },
      urgencia: {
        ativo: true,
        eyebrow: 'Lote atual',
        titulo: 'Data e disponibilidade fazem a decisão acontecer',
        texto: 'Reforce mudanca de lote, limite de vagas, horário e beneficio de comprar ou se inscrever agora.',
        destaque: 'Lote atual sujeito a virada',
        ctaTexto: 'Garantir minha vaga',
      },
      cta: {
        ativo: true,
        eyebrow: 'Inscrição',
        titulo: 'Quem já se imaginou no evento precisa de uma ação evidente',
        texto: 'Repita a chamada com foco em ingresso, lista ou inscrição depois de construir desejo.',
        ctaTexto: 'Quero participar',
      },
      seo: {
        title: 'Evento com inscrições abertas',
        description: 'Landing page para divulgar evento e capturar inscrições.',
      },
    },
  },
  {
    id: 'saas',
    name: 'SaaS ou startup',
    description: 'Para softwares, apps, plataformas, listas de espera e demonstrações.',
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
        sectionOrder: ['logos', 'benefícios', 'oferta', 'garantia', 'precos', 'prova', 'cta', 'faq', 'formulário', 'galeria', 'urgencia'],
      },
      hero: {
        variante: 'split-media',
        eyebrow: 'Produto em crescimento',
        titulo: 'Transforme um problema complexo em uma operação simples',
        subtitulo: 'Uma página para explicar o software, mostrar valor rapidamente e capturar leads para demo, teste ou lista de espera.',
      },
      benefícios: {
        titulo: 'Venda a clareza antes de vender a ferramenta',
        itens: [
          { titulo: 'Problema evidente', texto: 'Mostre a dor operacional que o produto resolve sem jargão desnecessário.' },
          { titulo: 'Valor em camadas', texto: 'Explique benefícios, prova e fluxo de uso em uma narrativa simples.' },
          { titulo: 'Demo qualificada', texto: 'Capture leads que já entenderam o contexto antes de pedir contato.' },
        ],
      },
      prova: {
        depoimento: 'A página tornou a proposta mais objetiva e fácilitou conversas comerciais melhores.',
        autor: 'Time de produto',
      },
      oferta: {
        titulo: 'Veja como funciona na prática',
        texto: 'Use este bloco para convidar para uma demonstração, teste guiado ou conversa com o time comercial.',
        preco: 'Demo gratuita',
      },
      logos: {
        ativo: true,
        eyebrow: 'Autoridade',
        titulo: 'Reserve espaço para clientes, integrações e parceiros que validam o produto',
      },
      garantia: {
        ativo: true,
        eyebrow: 'Onboarding',
        titulo: 'Reduza o medo de trocar processo por software',
        texto: 'Explique implantação, suporte, segurança, teste guiado ou acompanhamento que protege a decisão.',
        selo: 'Demo com contexto real da operação',
      },
      precos: {
        ativo: true,
        eyebrow: 'Planos',
        titulo: 'Deixe a conversa comercial pronta para escalar',
        texto: 'Edite os planos para apresentar entrada, crescimento e operação completa com entregáveis claros.',
      },
      cta: {
        ativo: true,
        eyebrow: 'Demo',
        titulo: 'Mostre o produto no momento em que o valor já ficou claro',
        texto: 'Convide para demo, teste ou conversa qualificada depois de apresentar prova e oferta.',
        ctaTexto: 'Agendar demonstração',
      },
      seo: {
        title: 'Software com demonstração gratuita',
        description: 'Landing page para SaaS, startup e captação de demos.',
      },
    },
  },
  {
    id: 'loja-roupas',
    name: 'Loja de roupas',
    description: 'Para boutique, moda feminina, masculina, infantil, drops e coleções vendidas pelo WhatsApp.',
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
        sectionOrder: ['galeria', 'precos', 'benefícios', 'oferta', 'prova', 'cta', 'faq', 'formulário', 'logos', 'garantia', 'urgencia'],
      },
      cabecalho: {
        precosTexto: 'Produtos',
        contatoTexto: 'Comprar no WhatsApp',
        contatoUrl: '#precos',
      },
      hero: {
        variante: 'split-media',
        eyebrow: 'Coleção disponível',
        titulo: 'Looks escolhidos para você comprar pelo WhatsApp',
        subtitulo: 'Mostre peças, preços, tamanhos e disponibilidade com uma vitrine moderna que leva o cliente direto para o pedido.',
        ctaTexto: 'Ver produtos',
        ctaUrl: '#precos',
      },
      galeria: {
        ativo: true,
        eyebrow: 'Vitrine visual',
        titulo: 'Mostre a coleção como desejo, não como lista',
        texto: 'Use fotos de looks, detalhes, combinações e novidades para o cliente escolher antes de chamar no WhatsApp.',
        itens: [
          { titulo: 'Look destaque', texto: 'Foto principal da coleção ou combinação mais vendável.', imagemUrl: '' },
          { titulo: 'Detalhe da peça', texto: 'Mostre tecido, caimento, cor ou acabamento.', imagemUrl: '' },
          { titulo: 'Novidade da semana', texto: 'Use para lançamento, reposição ou promoção.', imagemUrl: '' },
        ],
      },
      benefícios: {
        titulo: 'Tudo para comprar sem precisar ir até a loja',
        itens: [
          { titulo: 'Preço claro', texto: 'Cada produto pode ter foto, valor e chamada para pedido.' },
          { titulo: 'Compra assistida', texto: 'O cliente chama no WhatsApp para confirmar tamanho, cor e entrega.' },
          { titulo: 'Vitrine atualizada', texto: 'Troque produtos, imagens e ofertas direto pelo editor.' },
        ],
      },
      precos: {
        ativo: true,
        eyebrow: 'Produtos em destaque',
        titulo: 'Escolha sua peça e chame no WhatsApp',
        texto: 'Edite os cards abaixo com foto, nome, preço, tamanho, cor e chamada para fechar o pedido.',
        planos: [
          {
            nome: 'Vestido canelado',
            descricao: 'Peça versátil para look casual ou noite.',
            preco: 'R$ 129,90',
            periodo: '',
            imagemUrl: '',
            ctaTexto: 'Comprar pelo WhatsApp',
            ctaUrl: '#formulário',
            destaque: true,
            entregáveis: ['Tamanhos P, M e G', 'Cores disponiveis no WhatsApp', 'Retirada ou entrega local'],
          },
          {
            nome: 'Conjunto alfaiataria',
            descricao: 'Visual pronto com acabamento premium.',
            preco: 'R$ 219,90',
            periodo: '',
            imagemUrl: '',
            ctaTexto: 'Consultar tamanho',
            ctaUrl: '#formulário',
            destaque: false,
            entregáveis: ['Tecido estruturado', 'Ideal para trabalho ou evento', 'Atendimento pelo WhatsApp'],
          },
          {
            nome: 'Blusa essencial',
            descricao: 'Produto de giro para compra rápida.',
            preco: 'R$ 69,90',
            periodo: '',
            imagemUrl: '',
            ctaTexto: 'Quero essa peça',
            ctaUrl: '#formulário',
            destaque: false,
            entregáveis: ['Varias cores', 'Combina com looks basicos', 'Pedido direto no WhatsApp'],
          },
        ],
      },
      oferta: {
        titulo: 'Monte seu pedido com atendimento direto',
        texto: 'Use esta área para explicar entrega, retirada, troca, formas de pagamento e como a pessoa finaliza pelo WhatsApp.',
        preco: 'Pedido pelo WhatsApp',
        ctaTexto: 'Falar com a loja',
      },
      formulário: {
        titulo: 'Peça seu produto pelo WhatsApp',
        texto: 'Informe a peça desejada, tamanho e cor. A loja retorna para confirmar disponibilidade e pagamento.',
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
    defaultName: 'Site Loja de Calçados',
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
        sectionOrder: ['precos', 'galeria', 'benefícios', 'oferta', 'prova', 'cta', 'faq', 'formulário', 'logos', 'garantia', 'urgencia'],
      },
      cabeçalho: {
        precosTexto: 'Modelos',
        contatoTexto: 'Reservar modelo',
        contatoUrl: '#precos',
      },
      hero: {
        variante: 'media-left',
        eyebrow: 'Modelos disponiveis',
        titulo: 'Escolha seu calçado e reserve pelo WhatsApp',
        subtitulo: 'Uma vitrine direta para mostrar modelos, preços, numeração e levar o cliente para a conversa de compra.',
        ctaTexto: 'Ver modelos',
        ctaUrl: '#precos',
      },
      benefícios: {
        titulo: 'Menos dúvida, mais reserva pelo WhatsApp',
        itens: [
          { titulo: 'Modelo em destaque', texto: 'Cada card mostra foto, preço e chamada de reserva.' },
          { titulo: 'Numeração consultiva', texto: 'O cliente chama para confirmar tamanho antes de comprar.' },
          { titulo: 'Venda assistida', texto: 'A equipe pode orientar cor, estoque, entrega e pagamento.' },
        ],
      },
      galeria: {
        ativo: true,
        eyebrow: 'Detalhes',
        titulo: 'Mostre o calçado em ângulos que vendem',
        texto: 'Use fotos da lateral, sola, detalhe, cor e composição para aumentar confiança antes da reserva.',
      },
      precos: {
        ativo: true,
        eyebrow: 'Modelos em destaque',
        titulo: 'Reserve o modelo ideal no seu número',
        texto: 'Edite os cards com foto, nome, preço, numeração, cores e chamada para reserva.',
        planos: [
          {
            nome: 'Tenis urbano',
            descricao: 'Conforto para rotina e visual casual.',
            preco: 'R$ 189,90',
            periodo: '',
            imagemUrl: '',
            ctaTexto: 'Consultar numeração',
            ctaUrl: '#formulário',
            destaque: true,
            entregáveis: ['Numeros 37 ao 43', 'Cores disponiveis no WhatsApp', 'Reserva rápida'],
          },
          {
            nome: 'Sandalia premium',
            descricao: 'Modelo leve para saída, trabalho ou passeio.',
            preco: 'R$ 119,90',
            periodo: '',
            imagemUrl: '',
            ctaTexto: 'Reservar no WhatsApp',
            ctaUrl: '#formulário',
            destaque: false,
            entregáveis: ['Confortavel', 'Consulta de tamanho', 'Entrega local'],
          },
          {
            nome: 'Sapato social',
            descricao: 'Acabamento elegante para ocasiões especiais.',
            preco: 'R$ 249,90',
            periodo: '',
            imagemUrl: '',
            ctaTexto: 'Ver disponibilidade',
            ctaUrl: '#formulário',
            destaque: false,
            entregáveis: ['Modelo masculino', 'Cores sob consulta', 'Atendimento assistido'],
          },
        ],
      },
      formulário: {
        titulo: 'Reserve seu calçado',
        texto: 'Informe modelo, número e cor desejada. A loja confirma disponibilidade pelo WhatsApp.',
        botao: 'Enviar reserva',
        camposExtras: [
          { id: 'modelo', rotulo: 'Modelo e número desejado', placeholder: 'Ex: tenis urbano número 40', tipo: 'text', obrigatorio: true },
        ],
      },
      oferta: {
        titulo: 'Compra assistida para acertar no tamanho',
        texto: 'Explique troca, retirada, entrega, formas de pagamento e disponibilidade de numeração.',
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
        sectionOrder: ['precos', 'benefícios', 'oferta', 'garantia', 'prova', 'cta', 'faq', 'formulário', 'logos', 'galeria', 'urgencia'],
      },
      cabeçalho: {
        precosTexto: 'Ofertas',
        contatoTexto: 'Pedir no WhatsApp',
        contatoUrl: '#precos',
      },
      hero: {
        variante: 'split-media',
        eyebrow: 'Farmácia perto de você',
        titulo: 'Peça seus produtos de farmácia pelo WhatsApp',
        subtitulo: 'Mostre ofertas, itens essenciais, cuidado pessoal e entrega local com atendimento rápido pelo WhatsApp.',
        ctaTexto: 'Ver ofertas',
        ctaUrl: '#precos',
      },
      benefícios: {
        titulo: 'Confiança e praticidade para pedidos rápidos',
        itens: [
          { titulo: 'Ofertas visíveis', texto: 'Produtos com foto, preço e descrição objetiva.' },
          { titulo: 'Entrega local', texto: 'Explique bairro, prazo, taxa ou retirada na loja.' },
          { titulo: 'Atendimento humano', texto: 'O cliente confirma produto e disponibilidade pelo WhatsApp.' },
        ],
      },
      garantia: {
        ativo: true,
        eyebrow: 'Cuidado',
        titulo: 'Pedido confirmado com atendimento responsável',
        texto: 'Use esta seção para orientar sobre disponibilidade, substituições, entrega e contato com a equipe.',
        selo: 'Atendimento local pelo WhatsApp',
      },
      precos: {
        ativo: true,
        eyebrow: 'Ofertas e produtos',
        titulo: 'Escolha o produto e confirme pelo WhatsApp',
        texto: 'Edite os cards com foto, nome, preço, indicação básica e chamada para pedido.',
        planos: [
          {
            nome: 'Kit cuidado diario',
            descricao: 'Itens de cuidado pessoal para rotina.',
            preco: 'R$ 39,90',
            periodo: '',
            imagemUrl: '',
            ctaTexto: 'Pedir no WhatsApp',
            ctaUrl: '#formulário',
            destaque: true,
            entregáveis: ['Produto sujeito a disponibilidade', 'Entrega local', 'Confirmação pelo WhatsApp'],
          },
          {
            nome: 'Vitaminas selecionadas',
            descricao: 'Consulte marcas e disponibilidade.',
            preco: 'A partir de R$ 29,90',
            periodo: '',
            imagemUrl: '',
            ctaTexto: 'Consultar produto',
            ctaUrl: '#formulário',
            destaque: false,
            entregáveis: ['Marcas sob consulta', 'Orientação de compra', 'Retirada ou entrega'],
          },
          {
            nome: 'Higiene e beleza',
            descricao: 'Produtos essenciais com atendimento local.',
            preco: 'Ofertas do dia',
            periodo: '',
            imagemUrl: '',
            ctaTexto: 'Ver disponibilidade',
            ctaUrl: '#formulário',
            destaque: false,
            entregáveis: ['Ofertas atualizaveis', 'Pedido assistido', 'Pagamento combinado no contato'],
          },
        ],
      },
      oferta: {
        titulo: 'Atendimento rápido para confirmar seu pedido',
        texto: 'Explique horário de funcionamento, área de entrega, retirada, pagamento e como o cliente deve enviar o pedido.',
        preco: 'Pedido pelo WhatsApp',
        ctaTexto: 'Chamar farmácia',
      },
      formulário: {
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
