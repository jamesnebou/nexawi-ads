// src/lib/contract-pdf-generator.js
// PDF simples server-side para anexar contratos por e-mail, sem dependências pesadas.

function clean(value = '') {
  return String(value || '').trim()
}

function htmlToText(html = '') {
  return String(html || '')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/h1>/gi, '\n')
    .replace(/<\/h2>/gi, '\n')
    .replace(/<\/tr>/gi, '\n')
    .replace(/<\/td>/gi, ' | ')
    .replace(/<\/th>/gi, ' | ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/\r/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function normalizeText(value = '') {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[–—]/g, '-')
    .replace(/•/g, '-')
    .replace(/º/g, 'o')
    .replace(/ª/g, 'a')
    .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, '')
}

function escapePdf(value = '') {
  return normalizeText(value).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')
}

function wrapLine(text = '', maxChars = 94) {
  const words = normalizeText(text).split(/\s+/).filter(Boolean)
  const lines = []
  let current = ''

  for (const word of words) {
    if (!current) current = word
    else if (`${current} ${word}`.length > maxChars) {
      lines.push(current)
      current = word
    } else current = `${current} ${word}`
  }

  if (current) lines.push(current)
  return lines.length ? lines : ['']
}

function textToLines(text = '') {
  const rawLines = normalizeText(text).split('\n').map((line) => line.trim())
  const lines = []

  for (const line of rawLines) {
    if (!line) {
      if (lines[lines.length - 1] !== '') lines.push('')
    } else {
      lines.push(...wrapLine(line))
    }
  }

  return lines
}

function chunkLines(lines = [], linesPerPage = 55) {
  const pages = []
  for (let i = 0; i < lines.length; i += linesPerPage) pages.push(lines.slice(i, i + linesPerPage))
  return pages.length ? pages : [[]]
}

function formatDate(value = new Date()) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(value)
}

function contractText({ fields = {}, html = '', title = '' }) {
  const contratante = fields?.contratante || {}
  const plano = fields?.plano || {}
  const header = [
    title || 'Contrato NexaWi',
    'NexaWi ADS / NexaWi Wi-Fi',
    `Gerado em: ${formatDate(new Date())}`,
    '',
    `Cliente: ${contratante.nome_razao_social || 'Nao informado'}`,
    `CPF/CNPJ: ${contratante.cpf_cnpj || 'Nao informado'}`,
    `E-mail: ${contratante.email || 'Nao informado'}`,
    `Telefone: ${contratante.telefone || 'Nao informado'}`,
    `Plano: ${plano.nome || 'Plano NexaWi'}`,
    '',
    'CONTEUDO DO CONTRATO',
    '',
  ].join('\n')

  return `${header}${htmlToText(html)}`.trim()
}

export function generateContractPdfBuffer({ fields = {}, html = '', title = 'Contrato NexaWi' } = {}) {
  const pages = chunkLines(textToLines(contractText({ fields, html, title })))
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
      '0.96 0.98 0.94 rg',
      '0 806 595 36 re f',
      '0.10 0.55 0.10 rg',
      '42 821 110 2 re f',
      '0 0 0 rg',
      'BT /F2 11 Tf 42 818 Td (NexaWi ADS) Tj ET',
      `BT /F1 8 Tf 475 818 Td (Pagina ${pageIndex + 1}/${pages.length}) Tj ET`,
    ]

    let y = 785

    pageLines.forEach((line, lineIndex) => {
      const isTitle = pageIndex === 0 && lineIndex === 0
      const isSection = /^[0-9]{1,2}\.|^[A-Z0-9 ]{8,}$/.test(line) && line.length < 80
      const font = isTitle || isSection ? 'F2' : 'F1'
      const size = isTitle ? 15 : isSection ? 10 : 8.4

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
    commands.push('BT /F1 7 Tf 42 26 Td (Documento gerado automaticamente pela plataforma NexaWi ADS.) Tj ET')

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
  for (let i = 1; i <= objects.length; i += 1) pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`

  return Buffer.from(pdf, 'utf8')
}

export function makeContractPdfFilename(fields = {}) {
  const nome = clean(fields?.contratante?.nome_razao_social || 'cliente')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
    .slice(0, 70) || 'cliente'

  return `contrato-nexawi-${nome}.pdf`
}

export function buildContractPdfAttachment({ fields = {}, html = '', title = 'Contrato NexaWi' } = {}) {
  return {
    filename: makeContractPdfFilename(fields),
    content: generateContractPdfBuffer({ fields, html, title }),
    contentType: 'application/pdf',
  }
}
