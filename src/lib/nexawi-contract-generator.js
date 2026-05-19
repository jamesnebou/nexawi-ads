// src/lib/nexawi-contract-generator.js
// ============================================================
// Gerador de contrato padrão NexaWi.
// MVP Sprint 6:
// - Monta campos editáveis a partir de empresa/cliente/plano
// - Renderiza contrato em HTML para prévia, impressão e PDF pelo navegador
// - Mantém defaults comerciais definidos pela NexaWi
// ============================================================

export const NEXAWI_DEFAULTS = {
  razao_social: '54.954.915 James Costa Lima',
  cnpj: '54.954.915/0001-65',
  endereco: 'TV Cuiabá, 42 - Bairro Brasil - Vitória da Conquista - BA',
  email: 'contato@nexawi.com.br',
  telefone: '77 9 8865-6394',
  suporte: 'Somente via suporte dentro da plataforma ou pelo e-mail contato@nexawi.com.br. WhatsApp ainda não habilitado para suporte.',
  horario_suporte: 'Horário comercial de segunda a sexta-feira. Sexta-feira somente até as 17h.',
}

const PLANOS = {
  basico: {
    tipo: 'BÁSICO',
    prazo_minimo_meses: 2,
    prazo_maximo_meses: 2,
    renovacao: 'Mediante novo aceite ou continuidade mensal sem exclusividade.',
    exclusividade_aplicavel: false,
    exclusividade_texto: 'Não se aplica ao presente contrato, pois o plano contratado não contempla exclusividade, reserva comercial, reserva territorial ou reserva de categoria.',
  },
  intermediario: {
    tipo: 'INTERMEDIÁRIO',
    prazo_minimo_meses: 3,
    prazo_maximo_meses: 9,
    renovacao: 'Mediante negociação comercial entre as partes.',
    exclusividade_aplicavel: false,
    exclusividade_texto: 'Não se aplica ao presente contrato, pois o plano contratado não contempla exclusividade, reserva comercial, reserva territorial ou reserva de categoria, salvo previsão expressa em anexo.',
  },
  vip: {
    tipo: 'VIP / EXCLUSIVIDADE',
    prazo_minimo_meses: 4,
    prazo_maximo_meses: 12,
    renovacao: 'Renovação negociável, sem renovação automática de exclusividade.',
    exclusividade_aplicavel: true,
    exclusividade_texto: 'Plano elegível a exclusividade, reserva comercial ou condição VIP, conforme campos editáveis deste contrato.',
  },
}

function limpar(value = '') {
  return String(value || '').trim()
}

function formatMoney(value) {
  const number = Number(value || 0)
  if (!Number.isFinite(number) || number <= 0) return 'R$ 0,00'

  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(number)
}

function normalizarPlanoKey(value = '') {
  const raw = limpar(value).toLowerCase()

  if (raw.includes('vip') || raw.includes('premium') || raw.includes('exclusiv')) return 'vip'
  if (raw.includes('inter')) return 'intermediario'
  if (raw.includes('business')) return 'intermediario'
  if (raw.includes('basic') || raw.includes('básic') || raw.includes('basico') || raw.includes('starter')) return 'basico'

  return 'basico'
}

function dataISO(date = new Date()) {
  return date.toISOString().slice(0, 10)
}

function addMonths(date, months) {
  const copy = new Date(date)
  copy.setMonth(copy.getMonth() + Number(months || 0))
  return copy
}

function formatDateBR(value) {
  if (!value) return ''
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('pt-BR')
}

function escapeHtml(value = '') {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function p(value = '') {
  return escapeHtml(value || '—')
}

function resolvePlanoNome({ cliente = {}, empresa = {} }) {
  return limpar(cliente.planos?.nome) || limpar(cliente.plano_nome) || limpar(cliente.plano) || limpar(empresa.plano_nome) || 'Básico'
}

function resolveValorMensal({ cliente = {}, empresa = {} }) {
  return Number(cliente.valor_mensal || cliente.crm_valor_potencial || empresa.valor_mensal || 0)
}

function resolveEndereco(source = {}) {
  return limpar(source.endereco) || [source.cidade, source.estado].filter(Boolean).join(' / ')
}

export function buildNexawiContractFields({ empresa = null, cliente = null, source = 'empresa' } = {}) {
  const entidade = empresa || cliente || {}
  const planoNome = resolvePlanoNome({ cliente: cliente || {}, empresa: empresa || {} })
  const planoKey = normalizarPlanoKey(planoNome)
  const plano = PLANOS[planoKey] || PLANOS.basico
  const inicio = new Date()
  const dataInicio = dataISO(inicio)
  const dataTermino = dataISO(addMonths(inicio, plano.prazo_minimo_meses))
  const cidade = limpar(entidade.cidade) || 'Vitória da Conquista'
  const estado = limpar(entidade.estado) || 'BA'
  const valorMensal = resolveValorMensal({ cliente: cliente || {}, empresa: empresa || {} })

  return {
    meta: {
      source,
      empresa_id: empresa?.id || cliente?.empresa_id || '',
      cliente_id: cliente?.id || empresa?.cliente_id || '',
      gerado_em: new Date().toISOString(),
      template_version: 'nexawi-contract-v1',
    },
    contratante: {
      nome_razao_social: limpar(entidade.nome_empresa) || limpar(entidade.nome) || limpar(entidade.empresa) || 'Cliente não informado',
      cpf_cnpj: limpar(entidade.cpf_cnpj) || limpar(entidade.documento) || '',
      endereco_completo: resolveEndereco(entidade),
      nome_responsavel: limpar(entidade.nome_responsavel) || limpar(entidade.responsavel) || limpar(entidade.nome) || '',
      nacionalidade: 'Brasileiro',
      estado_civil: '',
      profissao_cargo: limpar(entidade.cargo) || 'Representante legal',
      cpf_responsavel: limpar(entidade.cpf_responsavel) || limpar(entidade.cpf) || '',
      email: limpar(entidade.email),
      telefone: limpar(entidade.telefone),
      cidade,
      estado,
    },
    contratada: { ...NEXAWI_DEFAULTS },
    plano: {
      nome: planoNome,
      tipo: plano.tipo,
      valor_mensal: valorMensal,
      valor_mensal_formatado: formatMoney(valorMensal),
      setup_implantacao: 0,
      setup_implantacao_formatado: 'R$ 0,00',
      forma_pagamento: 'PIX, boleto ou cartão, conforme combinado entre as partes.',
      dia_vencimento: '01',
      quantidade_hotspots: empresa?.resumo?.hotspots || cliente?.hotspots || 1,
      quantidade_campanhas: empresa?.resumo?.anuncios || cliente?.campanhas || 1,
      quantidade_usuarios: empresa?.usuarios?.length || 1,
      relatorios: 'Dashboard online e relatório conforme plano contratado.',
      suporte: NEXAWI_DEFAULTS.suporte,
      instalacao_presencial: 'Não incluída, salvo previsão expressa em proposta comercial.',
      equipamentos: 'Não incluídos, salvo previsão expressa em proposta comercial.',
      observacoes: '',
      prazo_minimo_meses: plano.prazo_minimo_meses,
      prazo_maximo_meses: plano.prazo_maximo_meses,
      data_inicio: dataInicio,
      data_termino: dataTermino,
      renovacao: plano.renovacao,
    },
    exclusividade: {
      aplicavel: plano.exclusividade_aplicavel,
      texto_padrao: plano.exclusividade_texto,
      tipo: plano.exclusividade_aplicavel ? 'Por categoria, hotspot, região ou unidade, conforme definição abaixo.' : 'Não se aplica a este cliente.',
      categoria_protegida: plano.exclusividade_aplicavel ? '' : 'Não se aplica a este cliente.',
      local_regiao: plano.exclusividade_aplicavel ? '' : 'Não se aplica a este cliente.',
      hotspots_protegidos: plano.exclusividade_aplicavel ? '' : 'Não se aplica a este cliente.',
      prazo: plano.exclusividade_aplicavel ? `${plano.prazo_minimo_meses} a ${plano.prazo_maximo_meses} meses` : 'Não se aplica a este cliente.',
      valor: plano.exclusividade_aplicavel ? '' : 'Não se aplica a este cliente.',
      observacoes: plano.exclusividade_aplicavel ? '' : 'Este contrato não corresponde a categoria VIP, exclusividade ou reserva comercial.',
    },
    condicoes: {
      multa_atraso_percentual: 3,
      juros_mensal_percentual: 2,
      dias_para_suspensao: 5,
      aviso_cancelamento_dias: 30,
      multa_intermediario_percentual: 40,
      multa_vip_percentual: 30,
      foro: `${cidade}/${estado}`,
      numero_vias: 2,
      local_assinatura: cidade,
      data_assinatura: dataISO(new Date()),
      suporte_canais: NEXAWI_DEFAULTS.suporte,
      horario_atendimento: NEXAWI_DEFAULTS.horario_suporte,
    },
  }
}

export function renderNexawiContractHtml(fields = {}) {
  const c = fields.contratante || {}
  const n = fields.contratada || NEXAWI_DEFAULTS
  const plano = fields.plano || {}
  const ex = fields.exclusividade || {}
  const cond = fields.condicoes || {}

  return `
    <article class="contract-document">
      <h1>CONTRATO DE PRESTAÇÃO DE SERVIÇOS — NEXAWI ADS / NEXAWI WI-FI</h1>
      <p class="muted"><strong>Modelo gerado automaticamente.</strong> Revise todos os campos antes de enviar ao cliente.</p>

      <h2>1. PARTES</h2>
      <p><strong>CONTRATANTE:</strong> ${p(c.nome_razao_social)}, inscrito(a) no CPF/CNPJ sob nº ${p(c.cpf_cnpj)}, com sede/endereço em ${p(c.endereco_completo)}, neste ato representado(a) por ${p(c.nome_responsavel)}, ${p(c.nacionalidade)}, ${p(c.estado_civil)}, ${p(c.profissao_cargo)}, portador(a) do CPF nº ${p(c.cpf_responsavel)}, e-mail ${p(c.email)}, telefone ${p(c.telefone)}, doravante denominado(a) simplesmente <strong>CONTRATANTE</strong>.</p>
      <p><strong>CONTRATADA:</strong> <strong>NEXAWI ADS / NEXAWI WI-FI</strong>, de titularidade de ${p(n.razao_social)}, inscrita no CPF/CNPJ sob nº ${p(n.cnpj)}, com sede/endereço em ${p(n.endereco)}, e-mail ${p(n.email)}, telefone ${p(n.telefone)}, doravante denominada simplesmente <strong>CONTRATADA</strong>.</p>

      <h2>2. OBJETO DO CONTRATO</h2>
      <p>O presente contrato tem por objeto a prestação, pela CONTRATADA, de serviços relacionados à implantação, configuração, disponibilização e/ou operação da solução NexaWi, que permite ao CONTRATANTE utilizar uma estrutura de Wi-Fi com portal cativo para liberação de acesso à internet, captura de dados autorizados dos usuários, exibição de campanhas/ofertas digitais e acompanhamento de resultados por meio de painel online.</p>
      <p>A solução poderá incluir, conforme o plano contratado: portal cativo personalizado, formulário de captura de leads, dashboard, configuração de campanhas, anúncios, ofertas, hotspots, relatórios e suporte técnico relacionado à plataforma.</p>
      <p>Este contrato não representa contratação de serviço de provimento de internet banda larga. O fornecimento da conexão de internet principal do estabelecimento é de responsabilidade do CONTRATANTE, salvo contratação específica em documento separado.</p>

      <h2>3. PLANO CONTRATADO</h2>
      <table>
        <tbody>
          <tr><th>Plano</th><td>${p(plano.nome)} — ${p(plano.tipo)}</td></tr>
          <tr><th>Valor mensal</th><td>${p(plano.valor_mensal_formatado)}</td></tr>
          <tr><th>Setup/implantação</th><td>${p(plano.setup_implantacao_formatado)}</td></tr>
          <tr><th>Forma de pagamento</th><td>${p(plano.forma_pagamento)}</td></tr>
          <tr><th>Dia de vencimento</th><td>${p(plano.dia_vencimento)}</td></tr>
          <tr><th>Hotspots incluídos</th><td>${p(plano.quantidade_hotspots)}</td></tr>
          <tr><th>Campanhas incluídas</th><td>${p(plano.quantidade_campanhas)}</td></tr>
          <tr><th>Usuários incluídos</th><td>${p(plano.quantidade_usuarios)}</td></tr>
          <tr><th>Relatórios</th><td>${p(plano.relatorios)}</td></tr>
          <tr><th>Instalação presencial</th><td>${p(plano.instalacao_presencial)}</td></tr>
          <tr><th>Equipamentos</th><td>${p(plano.equipamentos)}</td></tr>
        </tbody>
      </table>

      <h2>4. PRAZO CONTRATUAL</h2>
      <p>O plano contratado possui prazo mínimo de <strong>${p(plano.prazo_minimo_meses)} mês(es)</strong> e prazo máximo de <strong>${p(plano.prazo_maximo_meses)} mês(es)</strong>, conforme sua categoria comercial.</p>
      <p><strong>Data de início:</strong> ${p(formatDateBR(plano.data_inicio))}. <strong>Data de término prevista:</strong> ${p(formatDateBR(plano.data_termino))}.</p>
      <p><strong>Renovação:</strong> ${p(plano.renovacao)}</p>

      <h2>5. EXCLUSIVIDADE, CONTRATO VIP E RESERVA COMERCIAL</h2>
      <p>${p(ex.texto_padrao)}</p>
      <table>
        <tbody>
          <tr><th>Tipo de exclusividade</th><td>${p(ex.tipo)}</td></tr>
          <tr><th>Categoria protegida</th><td>${p(ex.categoria_protegida)}</td></tr>
          <tr><th>Local/região protegida</th><td>${p(ex.local_regiao)}</td></tr>
          <tr><th>Hotspots protegidos</th><td>${p(ex.hotspots_protegidos)}</td></tr>
          <tr><th>Prazo</th><td>${p(ex.prazo)}</td></tr>
          <tr><th>Valor</th><td>${p(ex.valor)}</td></tr>
          <tr><th>Observações</th><td>${p(ex.observacoes)}</td></tr>
        </tbody>
      </table>

      <h2>6. OBRIGAÇÕES DA CONTRATADA</h2>
      <p>A CONTRATADA deverá disponibilizar acesso à plataforma NexaWi conforme plano contratado, configurar os recursos acordados, disponibilizar dashboard quando incluído no plano, prestar suporte técnico dentro dos canais e prazos estabelecidos e tratar dados pessoais conforme a legislação aplicável.</p>

      <h2>7. OBRIGAÇÕES DO CONTRATANTE</h2>
      <p>O CONTRATANTE deverá fornecer informações corretas, garantir autorização para uso de marcas, imagens e campanhas, manter internet e energia no local, utilizar os leads de forma lícita, pagar pontualmente os valores contratados e não utilizar a plataforma para spam, fraude ou conteúdo ilícito.</p>

      <h2>8. O QUE NÃO ESTÁ INCLUÍDO</h2>
      <p>Não estão incluídos, salvo contratação expressa: fornecimento de internet banda larga, compra de equipamentos físicos, obras civis, passagem de cabos, criação profissional de identidade visual, gestão de tráfego pago, garantia de vendas, suporte presencial ilimitado e disparo de mensagens em massa.</p>

      <h2>9. LEADS, DADOS E LGPD</h2>
      <p>As partes reconhecem que a operação da plataforma poderá envolver tratamento de dados pessoais, incluindo nome, telefone, e-mail, CPF, IP, data/hora de acesso, aceite de termos e interações com campanhas. Para os dados coletados no portal em benefício do CONTRATANTE, o CONTRATANTE será, em regra, controlador dos dados, e a CONTRATADA atuará, em regra, como operadora dos dados tratados em nome do CONTRATANTE.</p>
      <p>O CONTRATANTE deverá utilizar os leads exclusivamente para finalidades lícitas e compatíveis com a comunicação apresentada ao usuário no momento da coleta.</p>

      <h2>10. ACESSO AO DASHBOARD E USUÁRIOS</h2>
      <p>O CONTRATANTE poderá receber acesso ao dashboard da empresa, onde poderá visualizar dados relacionados ao seu plano, leads, campanhas, hotspots, relatórios, pagamentos e demais recursos disponíveis.</p>

      <h2>11. SUPORTE</h2>
      <p><strong>Canais:</strong> ${p(cond.suporte_canais)}</p>
      <p><strong>Horário:</strong> ${p(cond.horario_atendimento)}</p>

      <h2>12. PREÇOS, PAGAMENTOS E REAJUSTE</h2>
      <p>O atraso no pagamento poderá gerar multa de <strong>${p(cond.multa_atraso_percentual)}%</strong> sobre o valor em atraso, acrescida de juros de <strong>${p(cond.juros_mensal_percentual)}% ao mês</strong>, calculados pro rata die, além de correção monetária quando aplicável.</p>
      <p>Em caso de atraso superior a <strong>${p(cond.dias_para_suspensao)} dias</strong>, a CONTRATADA poderá suspender o acesso à plataforma, campanhas, relatórios, suporte e/ou funcionamento do portal, mediante aviso prévio quando possível.</p>

      <h2>13. CANCELAMENTO E RESCISÃO</h2>
      <p>O CONTRATANTE poderá solicitar cancelamento mediante comunicação escrita com antecedência mínima de <strong>${p(cond.aviso_cancelamento_dias)} dias</strong>, observados os prazos mínimos de permanência do plano contratado.</p>
      <p>Em contratos intermediários, caso o CONTRATANTE solicite cancelamento antes do prazo mínimo de 3 meses, deverá pagar os valores correspondentes ao período mínimo contratado ou multa equivalente a <strong>${p(cond.multa_intermediario_percentual)}%</strong> do saldo restante até o prazo mínimo.</p>
      <p>Em contratos VIP ou com exclusividade, caso o CONTRATANTE solicite cancelamento antes do prazo mínimo de 4 meses ou antes do prazo total contratado, poderá ser devida multa equivalente a <strong>${p(cond.multa_vip_percentual)}%</strong> do saldo restante do contrato, sem prejuízo de valores vencidos, equipamentos não devolvidos, setup, implantação ou serviços já prestados.</p>

      <h2>14. PROPRIEDADE INTELECTUAL, CONFIDENCIALIDADE E RESPONSABILIDADES</h2>
      <p>A plataforma NexaWi, seus códigos, telas, fluxos, banco de dados, layout, marca, documentação, integrações, automações, métodos, dashboards e tecnologias pertencem à CONTRATADA ou a seus licenciadores. O presente contrato concede ao CONTRATANTE apenas licença limitada, temporária, não exclusiva e intransferível de uso da plataforma durante a vigência contratual.</p>
      <p>As partes se comprometem a manter sigilo sobre informações técnicas, comerciais, estratégicas, financeiras, operacionais, dados de acesso, credenciais, relatórios, leads e quaisquer informações confidenciais conhecidas em razão deste contrato.</p>

      <h2>15. FORO</h2>
      <p>As partes elegem o foro da Comarca de <strong>${p(cond.foro)}</strong>, com renúncia de qualquer outro, por mais privilegiado que seja, para dirimir eventuais controvérsias decorrentes deste contrato.</p>
      <p>E, por estarem justas e contratadas, as partes assinam o presente instrumento em <strong>${p(cond.numero_vias)} vias</strong> de igual teor, podendo a assinatura ser física ou eletrônica.</p>
      <p>${p(cond.local_assinatura)}, ${p(formatDateBR(cond.data_assinatura))}.</p>

      <div class="signatures">
        <div><p>CONTRATANTE</p><br/><br/><p>__________________________________________</p><p>${p(c.nome_razao_social)}</p><p>${p(c.cpf_cnpj)}</p></div>
        <div><p>CONTRATADA — NEXAWI ADS / NEXAWI WI-FI</p><br/><br/><p>__________________________________________</p><p>${p(n.razao_social)}</p><p>${p(n.cnpj)}</p></div>
      </div>

      <h2>ANEXO I — RESUMO COMERCIAL DO PLANO</h2>
      <table>
        <tbody>
          <tr><th>Cliente</th><td>${p(c.nome_razao_social)}</td></tr>
          <tr><th>Plano</th><td>${p(plano.nome)} — ${p(plano.tipo)}</td></tr>
          <tr><th>Valor mensal</th><td>${p(plano.valor_mensal_formatado)}</td></tr>
          <tr><th>Setup/implantação</th><td>${p(plano.setup_implantacao_formatado)}</td></tr>
          <tr><th>Prazo contratado</th><td>${p(plano.prazo_minimo_meses)} a ${p(plano.prazo_maximo_meses)} meses</td></tr>
          <tr><th>Data de início</th><td>${p(formatDateBR(plano.data_inicio))}</td></tr>
          <tr><th>Data de término</th><td>${p(formatDateBR(plano.data_termino))}</td></tr>
          <tr><th>Vencimento mensal</th><td>Dia ${p(plano.dia_vencimento)}</td></tr>
          <tr><th>Hotspots incluídos</th><td>${p(plano.quantidade_hotspots)}</td></tr>
          <tr><th>Campanhas incluídas</th><td>${p(plano.quantidade_campanhas)}</td></tr>
          <tr><th>Usuários incluídos</th><td>${p(plano.quantidade_usuarios)}</td></tr>
          <tr><th>Relatórios</th><td>${p(plano.relatorios)}</td></tr>
          <tr><th>Suporte</th><td>${p(cond.suporte_canais)}</td></tr>
          <tr><th>Exclusividade</th><td>${ex.aplicavel ? 'Sim, conforme preenchimento deste contrato.' : 'Não se aplica.'}</td></tr>
          <tr><th>Observações</th><td>${p(plano.observacoes)}</td></tr>
        </tbody>
      </table>
    </article>
  `
}

export function flattenContractFields(fields = {}) {
  return {
    ...fields.contratante,
    ...Object.fromEntries(Object.entries(fields.plano || {}).map(([key, value]) => [`plano_${key}`, value])),
    ...Object.fromEntries(Object.entries(fields.exclusividade || {}).map(([key, value]) => [`exclusividade_${key}`, value])),
    ...Object.fromEntries(Object.entries(fields.condicoes || {}).map(([key, value]) => [`condicoes_${key}`, value])),
  }
}

export function updateContractFields(fields = {}, updates = {}) {
  const next = JSON.parse(JSON.stringify(fields || {}))

  for (const [key, value] of Object.entries(updates || {})) {
    if (key.startsWith('plano_')) {
      next.plano[key.replace('plano_', '')] = value
      continue
    }

    if (key.startsWith('exclusividade_')) {
      next.exclusividade[key.replace('exclusividade_', '')] = value
      continue
    }

    if (key.startsWith('condicoes_')) {
      next.condicoes[key.replace('condicoes_', '')] = value
      continue
    }

    next.contratante[key] = value
  }

  next.plano.valor_mensal_formatado = formatMoney(next.plano.valor_mensal)
  next.plano.setup_implantacao_formatado = formatMoney(next.plano.setup_implantacao)

  return next
}
