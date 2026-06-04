'use client'

import { Activity, CheckCircle2, MousePointerClick, TrendingUp, Users, Wifi } from 'lucide-react'

function formatNumber(value) {
  return new Intl.NumberFormat('pt-BR').format(Number(value || 0))
}

function formatMoney(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number(value || 0))
}

function formatDateTime(value) {
  if (!value) return new Date().toLocaleString('pt-BR')
  return new Date(value).toLocaleString('pt-BR')
}

function getResumo({ report, resumo }) {
  return report?.resumo || {
    totalVisualizacoes: resumo?.totalVisualizacoes || 0,
    totalCliques: resumo?.totalCliques || 0,
    totalLeads: resumo?.totalLeads || 0,
    ctrGeral: resumo?.ctrGeral || 0,
    usuariosUnicos: 0,
    anunciosAtivos: resumo?.anunciosAtivos || 0,
    totalAnuncios: resumo?.totalAnuncios || 0,
    hotspotsComCampanha: resumo?.hotspotsVinculados || 0,
  }
}

function MetricCard({ label, value, icon: Icon }) {
  const SafeIcon = Icon || Activity

  return (
    <div className="pdf-metric-card">
      <div className="pdf-metric-icon">
        <SafeIcon size={16} />
      </div>
      <p className="pdf-metric-label">{label}</p>
      <p className="pdf-metric-value">{value}</p>
    </div>
  )
}

function Table({ title, rows = [], columns = [], emptyText }) {
  return (
    <section className="pdf-section avoid-break">
      <div className="pdf-section-head">
        <h2>{title}</h2>
      </div>

      {rows.length === 0 ? (
        <div className="pdf-empty">{emptyText || 'Nenhum dado encontrado.'}</div>
      ) : (
        <table className="pdf-table">
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column.key}>{column.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={row.id || index}>
                {columns.map((column) => (
                  <td key={column.key}>{column.render ? column.render(row, index) : row[column.key]}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  )
}

export default function CommercialPdfReport({
  cliente,
  campanha,
  resumo,
  financeiro,
  ads = [],
  leadsRecentes = [],
  hotspotsVinculados = [],
  report,
}) {
  const reportResumo = getResumo({ report, resumo })
  const rankingAnuncios = report?.rankings?.anuncios?.length ? report.rankings.anuncios : ads
  const rankingHotspots = report?.rankings?.hotspots?.length ? report.rankings.hotspots : hotspotsVinculados
  const generatedAt = report?.generatedAt || new Date().toISOString()

  return (
    <div id="cliente-commercial-pdf-report" className="print-only commercial-pdf-report">
      <div className="pdf-page-shell">
        <header className="pdf-hero avoid-break">
          <div className="pdf-brand-row">
            <div>
              <div className="pdf-brand">NexaWi ADS</div>
              <div className="pdf-subbrand">Relatório comercial de performance</div>
            </div>
            <div className="pdf-badge">DarkBlack Report</div>
          </div>

          <div className="pdf-title-grid">
            <div>
              <p className="pdf-eyebrow">Área do cliente</p>
              <h1>{cliente?.nome_empresa || cliente?.nome || 'Cliente NexaWi'}</h1>
              <p className="pdf-description">
                Visão executiva dos anúncios, visualizações, cliques, leads, hotspots e performance comercial da operação NexaWi.
              </p>
            </div>

            <div className="pdf-status-card">
              <p>Status da campanha</p>
              <strong>{campanha?.label || 'Campanha em acompanhamento'}</strong>
              <span>{campanha?.message || 'Dados gerados automaticamente pela plataforma NexaWi.'}</span>
            </div>
          </div>
        </header>

        <section className="pdf-metrics-grid avoid-break">
          <MetricCard label="Visualizações" value={formatNumber(reportResumo.totalVisualizacoes)} icon={Activity} />
          <MetricCard label="Cliques" value={formatNumber(reportResumo.totalCliques)} icon={MousePointerClick} />
          <MetricCard label="Leads" value={formatNumber(reportResumo.totalLeads)} icon={Users} />
          <MetricCard label="CTR geral" value={`${reportResumo.ctrGeral || 0}%`} icon={TrendingUp} />
          <MetricCard label="Usuários únicos" value={formatNumber(reportResumo.usuariosUnicos)} icon={CheckCircle2} />
          <MetricCard label="Hotspots" value={formatNumber(reportResumo.hotspotsComCampanha)} icon={Wifi} />
        </section>

        <section className="pdf-info-grid avoid-break">
          <div className="pdf-info-card">
            <p>Total pago</p>
            <strong>{formatMoney(financeiro?.totalPago || 0)}</strong>
          </div>
          <div className="pdf-info-card warning">
            <p>Total pendente</p>
            <strong>{formatMoney(financeiro?.totalPendente || 0)}</strong>
          </div>
          <div className="pdf-info-card">
            <p>Anúncios ativos</p>
            <strong>{formatNumber(reportResumo.anunciosAtivos || resumo?.anunciosAtivos || 0)}</strong>
          </div>
          <div className="pdf-info-card">
            <p>Emitido em</p>
            <strong>{formatDateTime(generatedAt)}</strong>
          </div>
        </section>

        <Table
          title="Ranking de anúncios"
          rows={(rankingAnuncios || []).slice(0, 8)}
          emptyText="Nenhum anúncio encontrado para o período."
          columns={[
            { key: 'titulo', label: 'Anúncio', render: (row) => row.titulo || row.nome || 'Anúncio sem título' },
            { key: 'visualizacoes', label: 'Views', render: (row) => formatNumber(row.visualizacoes || 0) },
            { key: 'cliques', label: 'Cliques', render: (row) => formatNumber(row.cliques || 0) },
            { key: 'leads', label: 'Leads', render: (row) => formatNumber(row.leads || 0) },
            { key: 'ctr', label: 'CTR', render: (row) => `${row.ctr || 0}%` },
          ]}
        />

        <Table
          title="Hotspots com campanha"
          rows={(rankingHotspots || []).slice(0, 8)}
          emptyText="Nenhum hotspot vinculado encontrado."
          columns={[
            { key: 'nome', label: 'Hotspot', render: (row) => row.nome || 'Hotspot' },
            { key: 'cidade', label: 'Cidade', render: (row) => row.cidade || row.localizacao || '—' },
            { key: 'visualizacoes', label: 'Views', render: (row) => formatNumber(row.visualizacoes || 0) },
            { key: 'cliques', label: 'Cliques', render: (row) => formatNumber(row.cliques || 0) },
            { key: 'leads', label: 'Leads', render: (row) => formatNumber(row.leads || 0) },
          ]}
        />

        <Table
          title="Leads recentes"
          rows={(leadsRecentes || []).slice(0, 8)}
          emptyText="Nenhum lead recente encontrado."
          columns={[
            { key: 'nome', label: 'Nome', render: (row) => row.nome || 'Lead' },
            { key: 'telefone', label: 'Telefone', render: (row) => row.telefone || '—' },
            { key: 'email', label: 'E-mail', render: (row) => row.email || '—' },
            { key: 'created_at', label: 'Data', render: (row) => formatDateTime(row.created_at) },
          ]}
        />

        <footer className="pdf-footer avoid-break">
          <div>
            <strong>NexaWi ADS</strong>
            <span>Wi-Fi Ads · Mídia geolocalizada de alta atenção</span>
          </div>
          <div className="pdf-footer-mark">Relatório automático</div>
        </footer>
      </div>

      <style jsx global>{`
        .print-only { display: none; }

        @media print {
          .screen-dashboard, .no-print, nav { display: none !important; }
          .print-only { display: block !important; }
          html, body { background: #050505 !important; color: #ffffff !important; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          @page { size: A4; margin: 8mm; }

          .commercial-pdf-report {
            min-height: 100vh;
            background:
              radial-gradient(circle at 20% 0%, rgba(107, 225, 47, 0.16), transparent 34%),
              radial-gradient(circle at 80% 12%, rgba(59, 130, 246, 0.12), transparent 30%),
              #050505 !important;
            color: #ffffff !important;
            font-family: Arial, Helvetica, sans-serif;
            padding: 0;
          }

          .pdf-page-shell {
            max-width: 1120px;
            margin: 0 auto;
            padding: 18px;
          }

          .avoid-break { break-inside: avoid; page-break-inside: avoid; }

          .pdf-hero {
            border: 1px solid rgba(107, 225, 47, 0.24);
            background: linear-gradient(135deg, rgba(10, 10, 10, 0.98), rgba(19, 35, 16, 0.92));
            border-radius: 26px;
            padding: 24px;
            box-shadow: 0 16px 50px rgba(0,0,0,0.45);
            margin-bottom: 16px;
          }

          .pdf-brand-row,
          .pdf-title-grid,
          .pdf-info-grid,
          .pdf-footer {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 18px;
          }

          .pdf-brand {
            color: #6be12f;
            font-size: 24px;
            font-weight: 900;
            letter-spacing: -0.03em;
          }

          .pdf-subbrand,
          .pdf-description,
          .pdf-status-card span,
          .pdf-footer span {
            color: #9ca3af;
            font-size: 11px;
            line-height: 1.5;
          }

          .pdf-badge {
            border: 1px solid rgba(107, 225, 47, 0.25);
            background: rgba(107, 225, 47, 0.1);
            color: #8cf059;
            border-radius: 999px;
            padding: 9px 14px;
            font-size: 10px;
            font-weight: 900;
            text-transform: uppercase;
            letter-spacing: 0.12em;
          }

          .pdf-title-grid {
            margin-top: 26px;
          }

          .pdf-eyebrow,
          .pdf-metric-label,
          .pdf-info-card p,
          .pdf-section-head h2,
          .pdf-table th {
            color: #8cf059;
            font-size: 10px;
            font-weight: 900;
            letter-spacing: 0.12em;
            text-transform: uppercase;
            margin: 0 0 8px;
          }

          .pdf-title-grid h1 {
            color: #ffffff;
            font-size: 30px;
            line-height: 1.05;
            margin: 0 0 10px;
            letter-spacing: -0.04em;
          }

          .pdf-status-card {
            width: 260px;
            border: 1px solid rgba(255,255,255,0.08);
            background: rgba(0,0,0,0.28);
            border-radius: 20px;
            padding: 18px;
          }

          .pdf-status-card p {
            color: #9ca3af;
            margin: 0 0 8px;
            font-size: 10px;
            font-weight: 900;
            letter-spacing: 0.12em;
            text-transform: uppercase;
          }

          .pdf-status-card strong {
            display: block;
            color: #ffffff;
            font-size: 16px;
            margin-bottom: 8px;
          }

          .pdf-metrics-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 12px;
            margin-bottom: 16px;
          }

          .pdf-metric-card,
          .pdf-info-card,
          .pdf-section,
          .pdf-footer {
            border: 1px solid rgba(255,255,255,0.08);
            background: rgba(12, 12, 12, 0.96);
            border-radius: 22px;
            padding: 16px;
            box-shadow: 0 12px 30px rgba(0,0,0,0.25);
          }

          .pdf-metric-icon {
            width: 34px;
            height: 34px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 12px;
            color: #6be12f;
            background: rgba(107, 225, 47, 0.12);
            margin-bottom: 14px;
          }

          .pdf-metric-value {
            color: #ffffff;
            font-size: 28px;
            line-height: 1;
            margin: 0;
            letter-spacing: -0.04em;
          }

          .pdf-info-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            margin-bottom: 16px;
          }

          .pdf-info-card strong {
            color: #ffffff;
            font-size: 16px;
          }

          .pdf-info-card.warning {
            border-color: rgba(245, 158, 11, 0.28);
            background: rgba(245, 158, 11, 0.08);
          }

          .pdf-section {
            margin-bottom: 16px;
          }

          .pdf-section-head {
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-bottom: 1px solid rgba(255,255,255,0.08);
            padding-bottom: 10px;
            margin-bottom: 12px;
          }

          .pdf-table {
            width: 100%;
            border-collapse: separate;
            border-spacing: 0 8px;
          }

          .pdf-table th,
          .pdf-table td {
            text-align: left;
            padding: 8px 10px;
          }

          .pdf-table td {
            color: #ffffff;
            background: rgba(255,255,255,0.035);
            border-top: 1px solid rgba(255,255,255,0.06);
            border-bottom: 1px solid rgba(255,255,255,0.06);
            font-size: 11px;
          }

          .pdf-table td:first-child {
            border-left: 1px solid rgba(255,255,255,0.06);
            border-radius: 12px 0 0 12px;
            font-weight: 800;
          }

          .pdf-table td:last-child {
            border-right: 1px solid rgba(255,255,255,0.06);
            border-radius: 0 12px 12px 0;
          }

          .pdf-empty {
            color: #9ca3af;
            border: 1px dashed rgba(255,255,255,0.1);
            border-radius: 16px;
            padding: 16px;
            text-align: center;
            font-size: 12px;
          }

          .pdf-footer {
            align-items: center;
            margin-top: 18px;
          }

          .pdf-footer strong {
            color: #6be12f;
            display: block;
            margin-bottom: 4px;
          }

          .pdf-footer-mark {
            color: #8cf059;
            border: 1px solid rgba(107,225,47,0.2);
            border-radius: 999px;
            padding: 8px 12px;
            font-size: 10px;
            font-weight: 900;
            text-transform: uppercase;
            letter-spacing: 0.12em;
          }
        }
      `}</style>
    </div>
  )
}
