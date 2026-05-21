import { buildCommercialReport } from '@/lib/commercial-report'
import { sendEmail } from '@/lib/email-service'

function csvCell(value) {
  const text = String(value ?? '')
  return `"${text.replace(/"/g, '""')}"`
}

export function buildCommercialReportCsv(report) {
  const resumo = report?.resumo || {}
  const rankings = report?.rankings || {}
  const linhas = [
    ['Secao', 'Campo', 'Valor'],
    ['Resumo', 'Visualizacoes', resumo.totalVisualizacoes || 0],
    ['Resumo', 'Cliques CTA', resumo.totalCliques || 0],
    ['Resumo', 'Leads', resumo.totalLeads || 0],
    ['Resumo', 'CTR geral (%)', resumo.ctrGeral || 0],
    ['Resumo', 'Usuarios unicos', resumo.usuariosUnicos || 0],
    ['Resumo', 'Hotspots com campanha', resumo.hotspotsComCampanha || 0],
    ['Resumo', 'Sessoes autorizadas', resumo.sessoesAutorizadas || 0],
    ['Resumo', 'Pico online por hora', resumo.picoOnlineHora || 0],
    [],
    ['Online por hora', 'Hora', 'Sessoes autorizadas'],
    ...(report.onlinePorHora || []).map((item) => [
      'Online por hora',
      item.hora || '',
      item.sessoes || 0,
    ]),
    [],
    ['Tipo', 'Nome', 'Cliente/Cidade', 'Visualizacoes', 'Cliques', 'Leads', 'Usuarios unicos', 'CTR (%)'],
    ...(rankings.anuncios || []).map((item) => [
      'Anuncio',
      item.titulo || '',
      item.cliente_nome || '',
      item.visualizacoes || 0,
      item.cliques || 0,
      item.leads || 0,
      item.usuarios_unicos || 0,
      item.ctr || 0,
    ]),
    ...(rankings.hotspots || []).map((item) => [
      'Hotspot',
      item.nome || '',
      item.cidade || item.cliente_nome || '',
      item.visualizacoes || 0,
      item.cliques || 0,
      item.leads || 0,
      item.usuarios_unicos || 0,
      item.ctr || 0,
    ]),
  ]

  return '\uFEFF' + linhas
    .map((linha) => linha.map(csvCell).join(';'))
    .join('\n')
}

export function buildCommercialReportFileName({
  periodo = 'ultimos_30',
  clienteId = '',
  hotspotId = '',
} = {}) {
  const suffix = [
    periodo || 'periodo',
    clienteId ? `cliente-${clienteId}` : '',
    hotspotId ? `hotspot-${hotspotId}` : '',
    new Date().toISOString().slice(0, 10),
  ].filter(Boolean).join('_')

  return `relatorio_comercial_${suffix}.csv`
}

function buildHtml({ report, periodo }) {
  const resumo = report?.resumo || {}

  return `
    <div style="font-family: Arial, sans-serif; background:#050505; color:#ffffff; padding:32px;">
      <div style="max-width:680px; margin:0 auto; background:#0a0a0a; border:1px solid rgba(255,255,255,0.08); border-radius:24px; padding:32px;">
        <div style="font-size:12px; letter-spacing:1px; text-transform:uppercase; color:#6be12f; font-weight:bold; margin-bottom:14px;">
          NexaWi ADS
        </div>
        <h1 style="margin:0 0 10px; color:#ffffff; font-size:24px;">Relatorio comercial</h1>
        <p style="font-size:14px; color:#cfcfcf; line-height:1.6;">Segue o resumo comercial do periodo <strong>${periodo}</strong>. O CSV completo esta anexado.</p>
        <div style="display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:12px; margin-top:22px;">
          <div style="background:#050505; border:1px solid rgba(255,255,255,0.08); border-radius:16px; padding:16px;">
            <div style="font-size:11px; color:#888; text-transform:uppercase;">Visualizacoes</div>
            <div style="font-size:24px; color:#ffffff; font-weight:bold;">${resumo.totalVisualizacoes || 0}</div>
          </div>
          <div style="background:#050505; border:1px solid rgba(255,255,255,0.08); border-radius:16px; padding:16px;">
            <div style="font-size:11px; color:#888; text-transform:uppercase;">Cliques CTA</div>
            <div style="font-size:24px; color:#ffffff; font-weight:bold;">${resumo.totalCliques || 0}</div>
          </div>
          <div style="background:#050505; border:1px solid rgba(255,255,255,0.08); border-radius:16px; padding:16px;">
            <div style="font-size:11px; color:#888; text-transform:uppercase;">Leads</div>
            <div style="font-size:24px; color:#ffffff; font-weight:bold;">${resumo.totalLeads || 0}</div>
          </div>
          <div style="background:#050505; border:1px solid rgba(255,255,255,0.08); border-radius:16px; padding:16px;">
            <div style="font-size:11px; color:#888; text-transform:uppercase;">CTR geral</div>
            <div style="font-size:24px; color:#ffffff; font-weight:bold;">${resumo.ctrGeral || 0}%</div>
          </div>
          <div style="background:#050505; border:1px solid rgba(255,255,255,0.08); border-radius:16px; padding:16px;">
            <div style="font-size:11px; color:#888; text-transform:uppercase;">Sessoes autorizadas</div>
            <div style="font-size:24px; color:#ffffff; font-weight:bold;">${resumo.sessoesAutorizadas || 0}</div>
          </div>
          <div style="background:#050505; border:1px solid rgba(255,255,255,0.08); border-radius:16px; padding:16px;">
            <div style="font-size:11px; color:#888; text-transform:uppercase;">Pico online/hora</div>
            <div style="font-size:24px; color:#ffffff; font-weight:bold;">${resumo.picoOnlineHora || 0}</div>
          </div>
        </div>
        <p style="margin-top:28px; color:#666; font-size:12px;">E-mail automatico do painel NexaWi ADS.</p>
      </div>
    </div>
  `
}

export async function sendCommercialReportEmail({
  periodo = 'ultimos_30',
  clienteId = '',
  hotspotId = '',
  to = '',
  auth = null,
} = {}) {
  const report = await buildCommercialReport({
    periodo,
    clienteId,
    hotspotId,
    auth,
  })

  const csv = buildCommercialReportCsv(report)
  const filename = buildCommercialReportFileName({ periodo, clienteId, hotspotId })
  const subject = `[NexaWi ADS] Relatorio comercial - ${periodo}`
  const text = [
    'Relatorio comercial NexaWi ADS',
    `Periodo: ${periodo}`,
    `Visualizacoes: ${report.resumo?.totalVisualizacoes || 0}`,
    `Cliques CTA: ${report.resumo?.totalCliques || 0}`,
    `Leads: ${report.resumo?.totalLeads || 0}`,
    `CTR geral: ${report.resumo?.ctrGeral || 0}%`,
    `Sessoes autorizadas: ${report.resumo?.sessoesAutorizadas || 0}`,
    `Pico online/hora: ${report.resumo?.picoOnlineHora || 0}`,
    '',
    'CSV completo em anexo.',
  ].join('\n')

  const emailResult = await sendEmail({
    to,
    subject,
    text,
    html: buildHtml({ report, periodo }),
    attachments: [
      {
        filename,
        content: csv,
        contentType: 'text/csv; charset=utf-8',
      },
    ],
  })

  return {
    emailResult,
    filename,
    report,
  }
}
