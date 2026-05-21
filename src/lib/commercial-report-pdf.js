function normalizeText(value = '') {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, '')
}

function escapePdf(value = '') {
  return normalizeText(value)
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
}

function wrapLine(text = '', maxChars = 92) {
  const words = normalizeText(text).split(/\s+/).filter(Boolean)
  const lines = []
  let current = ''

  for (const word of words) {
    if (!current) current = word
    else if (`${current} ${word}`.length > maxChars) {
      lines.push(current)
      current = word
    } else {
      current = `${current} ${word}`
    }
  }

  if (current) lines.push(current)
  return lines.length ? lines : ['']
}

function textToLines(text = '') {
  const rawLines = normalizeText(text).split('\n').map((line) => line.trim())
  const lines = []

  rawLines.forEach((line) => {
    if (!line) {
      if (lines[lines.length - 1] !== '') lines.push('')
      return
    }

    lines.push(...wrapLine(line))
  })

  return lines
}

function chunkLines(lines = [], linesPerPage = 56) {
  const pages = []

  for (let i = 0; i < lines.length; i += linesPerPage) {
    pages.push(lines.slice(i, i + linesPerPage))
  }

  return pages.length ? pages : [[]]
}

function formatNumber(value) {
  return new Intl.NumberFormat('pt-BR').format(Number(value || 0))
}

function formatPercent(value) {
  return `${Number(value || 0).toLocaleString('pt-BR')}%`
}

function formatDate(value = new Date()) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(value)
}

function reportText({ report = {}, periodo = 'ultimos_30' } = {}) {
  const resumo = report.resumo || {}
  const rankings = report.rankings || {}
  const topAnuncios = (rankings.anuncios || []).slice(0, 8)
  const topHotspots = (rankings.hotspots || []).slice(0, 8)
  const topHoras = (report.onlinePorHora || [])
    .filter((item) => Number(item.sessoes || 0) > 0)
    .sort((a, b) => Number(b.sessoes || 0) - Number(a.sessoes || 0))
    .slice(0, 8)

  return [
    'RELATORIO COMERCIAL NEXAWI ADS',
    `Periodo: ${periodo}`,
    `Gerado em: ${formatDate(new Date())}`,
    '',
    'RESUMO EXECUTIVO',
    `Visualizacoes: ${formatNumber(resumo.totalVisualizacoes)}`,
    `Cliques CTA: ${formatNumber(resumo.totalCliques)}`,
    `Leads capturados: ${formatNumber(resumo.totalLeads)}`,
    `CTR geral: ${formatPercent(resumo.ctrGeral)}`,
    `Usuarios unicos: ${formatNumber(resumo.usuariosUnicos)}`,
    `Sessoes autorizadas: ${formatNumber(resumo.sessoesAutorizadas)}`,
    `Pico online por hora: ${formatNumber(resumo.picoOnlineHora)}`,
    `Hotspots com campanha: ${formatNumber(resumo.hotspotsComCampanha)}`,
    '',
    'TOP ANUNCIOS',
    ...(topAnuncios.length
      ? topAnuncios.map((item, index) =>
          `${index + 1}. ${item.titulo || 'Anuncio'} | Views: ${formatNumber(item.visualizacoes)} | Cliques: ${formatNumber(item.cliques)} | Leads: ${formatNumber(item.leads)} | CTR: ${formatPercent(item.ctr)}`
        )
      : ['Sem dados de anuncios no periodo.']),
    '',
    'TOP HOTSPOTS',
    ...(topHotspots.length
      ? topHotspots.map((item, index) =>
          `${index + 1}. ${item.nome || 'Hotspot'}${item.cidade ? ` - ${item.cidade}` : ''} | Views: ${formatNumber(item.visualizacoes)} | Cliques: ${formatNumber(item.cliques)} | Leads: ${formatNumber(item.leads)} | CTR: ${formatPercent(item.ctr)}`
        )
      : ['Sem dados de hotspots no periodo.']),
    '',
    'ONLINE POR HORA',
    ...(topHoras.length
      ? topHoras.map((item) => `${item.hora}: ${formatNumber(item.sessoes)} sessoes autorizadas`)
      : ['Sem sessoes autorizadas no periodo.']),
    '',
    'OBSERVACAO',
    'Este relatorio e gerado automaticamente pela plataforma NexaWi ADS com base nos eventos registrados no portal cativo, campanhas, cliques, leads e sessoes autorizadas.',
  ].join('\n')
}

export function generateCommercialReportPdfBuffer({ report = {}, periodo = 'ultimos_30' } = {}) {
  const pages = chunkLines(textToLines(reportText({ report, periodo })))
  const objects = []
  const addObject = (content) => {
    objects.push(content)
    return objects.length
  }

  const catalogId = addObject('')
  const pagesId = addObject('')
  const fontRegularId = addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>')
  const fontBoldId = addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>')
  const pageIds = []

  pages.forEach((pageLines, pageIndex) => {
    const commands = [
      '0.96 0.99 0.94 rg',
      '0 804 595 38 re f',
      '0.33 0.88 0.15 rg',
      '42 821 130 2 re f',
      '0 0 0 rg',
      'BT /F2 11 Tf 42 818 Td (NexaWi ADS) Tj ET',
      `BT /F1 8 Tf 475 818 Td (Pagina ${pageIndex + 1}/${pages.length}) Tj ET`,
    ]

    let y = 785

    pageLines.forEach((line, lineIndex) => {
      const isTitle = pageIndex === 0 && lineIndex === 0
      const isSection = /^[A-Z0-9 ]{7,}$/.test(normalizeText(line)) && normalizeText(line).length < 60
      const font = isTitle || isSection ? 'F2' : 'F1'
      const size = isTitle ? 15 : isSection ? 10 : 8.5

      if (!line) {
        y -= 8
        return
      }

      if (isSection && !isTitle) {
        commands.push('0.90 0.90 0.90 rg')
        commands.push(`42 ${y - 4} 510 0.7 re f`)
        commands.push('0 0 0 rg')
      }

      commands.push(`BT /${font} ${size} Tf 42 ${y} Td (${escapePdf(line)}) Tj ET`)
      y -= isTitle ? 18 : 12
    })

    commands.push('0.45 0.45 0.45 rg')
    commands.push('BT /F1 7 Tf 42 26 Td (Relatorio automatico gerado pela plataforma NexaWi ADS.) Tj ET')

    const streamText = commands.join('\n')
    const contentId = addObject(`<< /Length ${Buffer.byteLength(streamText, 'utf8')} >>\nstream\n${streamText}\nendstream`)
    const pageId = addObject(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${fontRegularId} 0 R /F2 ${fontBoldId} 0 R >> >> /Contents ${contentId} 0 R >>`)
    pageIds.push(pageId)
  })

  objects[catalogId - 1] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`
  objects[pagesId - 1] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`

  let pdf = '%PDF-1.4\n'
  const offsets = [0]

  objects.forEach((content, index) => {
    offsets.push(Buffer.byteLength(pdf, 'utf8'))
    pdf += `${index + 1} 0 obj\n${content}\nendobj\n`
  })

  const xrefOffset = Buffer.byteLength(pdf, 'utf8')
  pdf += `xref\n0 ${objects.length + 1}\n`
  pdf += '0000000000 65535 f \n'
  for (let i = 1; i <= objects.length; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`

  return Buffer.from(pdf, 'utf8')
}

export function buildCommercialReportPdfAttachment({ report = {}, periodo = 'ultimos_30', filename = '' } = {}) {
  const safePeriod = normalizeText(periodo)
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase() || 'periodo'

  return {
    filename: filename || `relatorio_comercial_${safePeriod}_${new Date().toISOString().slice(0, 10)}.pdf`,
    content: generateCommercialReportPdfBuffer({ report, periodo }),
    contentType: 'application/pdf',
  }
}
