'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@supabase/supabase-js'
import {
  Users, Wifi, UserPlus, DollarSign, Eye, AlertTriangle, Clock // Adicionado o ícone Eye, AlertTriangle e Clock para visualizações
} from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const CORES = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']

export default function Dashboard() {
  const [loading, setLoading] = useState(true)
  const [hotspots, setHotspots] = useState([])
  const [selectedHotspotId, setSelectedHotspotId] = useState('')
  const [totalVisualizacoesHotspot, setTotalVisualizacoesHotspot] = useState(0)
  const [metricas, setMetricas] = useState({
    totalClientes: 0, clientesAtivos: 0,
    totalHotspots: 0, hotspotsAtivos: 0,
    totalLeads: 0, leadsHoje: 0,
    recebidoMes: 0, pendenteTotal: 0, vencidoTotal: 0,
  })
  const [leadsPorDiaGeral, setLeadsPorDiaGeral] = useState([])
  const [leadsUnicosPorDiaHotspot, setLeadsUnicosPorDiaHotspot] = useState([])
  const [receitaPorMes, setReceitaPorMes] = useState([])
  const [clientesPorStatus, setClientesPorStatus] = useState([])
  const [leadsPorHotspotGeral, setLeadsPorHotspotGeral] = useState([])
  const [pagamentosRecentes, setPagamentosRecentes] = useState([])
  const [leadsRecentes, setLeadsRecentes] = useState([])

  const buscarDados = useCallback(async () => {
    setLoading(true)

    const hoje = new Date()
    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString()
    const hojeStr = hoje.toISOString().slice(0, 10)

    const { data: allHotspots, error: hotspotsError } = await supabase
      .from('hotspots')
      .select('id, nome, visualizacoes')
      .order('nome', { ascending: true })

    if (hotspotsError) {
      console.error('Erro ao buscar hotspots:', hotspotsError)
    } else {
      setHotspots(allHotspots || [])
      if (allHotspots && allHotspots.length > 0 && !selectedHotspotId) {
        setSelectedHotspotId(allHotspots[0].id)
        setTotalVisualizacoesHotspot(allHotspots[0].visualizacoes || 0)
      } else if (selectedHotspotId) {
        const currentHotspot = allHotspots?.find(h => h.id === selectedHotspotId)
        setTotalVisualizacoesHotspot(currentHotspot?.visualizacoes || 0)
      }
    }

    const [
      { data: clientes },
      { data: hotspotsData },
      { data: leadsGeral },
      { data: pagamentos },
      { data: leadsHoje },
    ] = await Promise.all([
      supabase.from('clientes').select('status, created_at'),
      supabase.from('hotspots').select('status'),
      supabase.from('leads').select('id, nome, email, created_at, hotspot_id, cpf, hotspots(nome)').order('created_at', { ascending: false }),
      supabase.from('pagamentos').select('valor, status, data_vencimento, created_at, clientes(nome)').order('created_at', { ascending: false }),
      supabase.from('leads').select('id').gte('created_at', hojeStr),
    ])

    const recebidoMes = (pagamentos || [])
      .filter(p => p.status === 'Pago' && p.created_at >= inicioMes)
      .reduce((acc, p) => acc + Number(p.valor), 0)
    const pendenteTotal = (pagamentos || [])
      .filter(p => p.status === 'Pendente')
      .reduce((acc, p) => acc + Number(p.valor), 0)
    const vencidoTotal = (pagamentos || [])
      .filter(p => p.status === 'Vencido' && new Date(p.data_vencimento) < hoje)
      .reduce((acc, p) => acc + Number(p.valor), 0)

    setMetricas({
      totalClientes: clientes?.length || 0,
      clientesAtivos: clientes?.filter(c => c.status === 'Ativo').length || 0,
      totalHotspots: hotspotsData?.length || 0,
      hotspotsAtivos: hotspotsData?.filter(h => h.status === 'Ativo').length || 0,
      totalLeads: leadsGeral?.length || 0,
      leadsHoje: leadsHoje?.length || 0,
      recebidoMes,
      pendenteTotal,
      vencidoTotal,
    })

    // Gráfico de Leads por Dia (Geral)
    const leadsPorDiaMap = (leadsGeral || []).reduce((acc, lead) => {
      const date = new Date(lead.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
      acc[date] = (acc[date] || 0) + 1
      return acc
    }, {})
    const ultimos14Dias = Array.from({ length: 14 }, (_, i) => {
      const d = new Date()
      d.setDate(hoje.getDate() - i)
      return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
    }).reverse()
    setLeadsPorDiaGeral(ultimos14Dias.map(date => ({
      data: date,
      leads: leadsPorDiaMap[date] || 0,
    })))

    // Gráfico de Leads Únicos por Dia (Hotspot Selecionado)
    if (selectedHotspotId) {
      const { data: leadsHotspot, error: leadsHotspotError } = await supabase
        .from('leads')
        .select('id, created_at')
        .eq('hotspot_id', selectedHotspotId)
        .gte('created_at', new Date(hoje.setDate(hoje.getDate() - 14)).toISOString().slice(0, 10)) // Últimos 14 dias

      if (leadsHotspotError) {
        console.error('Erro ao buscar leads do hotspot:', leadsHotspotError)
      } else {
        const leadsUnicosPorDiaMap = (leadsHotspot || []).reduce((acc, lead) => {
          const date = new Date(lead.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
          acc[date] = (acc[date] || new Set()).add(lead.id) // Contar IDs únicos
          return acc
        }, {})
        setLeadsUnicosPorDiaHotspot(ultimos14Dias.map(date => ({
          data: date,
          leadsUnicos: leadsUnicosPorDiaMap[date]?.size || 0,
        })))
      }
    } else {
      setLeadsUnicosPorDiaHotspot([])
    }


    // Gráfico de Receita por Mês
    const receitaPorMesMap = (pagamentos || []).reduce((acc, p) => {
      const mesAno = new Date(p.created_at).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
      if (!acc[mesAno]) {
        acc[mesAno] = { recebido: 0, pendente: 0 }
      }
      if (p.status === 'Pago') {
        acc[mesAno].recebido += Number(p.valor)
      } else if (p.status === 'Pendente') {
        acc[mesAno].pendente += Number(p.valor)
      }
      return acc
    }, {})
    const ultimos6Meses = Array.from({ length: 6 }, (_, i) => {
      const d = new Date()
      d.setMonth(hoje.getMonth() - i)
      return d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
    }).reverse()
    setReceitaPorMes(ultimos6Meses.map(mesAno => ({
      label: mesAno,
      recebido: receitaPorMesMap[mesAno]?.recebido || 0,
      pendente: receitaPorMesMap[mesAno]?.pendente || 0,
    })))

    // Gráfico de Clientes por Status
    const clientesPorStatusMap = (clientes || []).reduce((acc, c) => {
      acc[c.status] = (acc[c.status] || 0) + 1
      return acc
    }, {})
    setClientesPorStatus(Object.entries(clientesPorStatusMap).map(([status, count]) => ({
      name: status,
      value: count,
    })))

    // Gráfico de Leads por Hotspot (Geral)
    const leadsPorHotspotMap = (leadsGeral || []).reduce((acc, lead) => {
      const hotspotNome = lead.hotspots?.nome || 'Desconhecido'
      acc[hotspotNome] = (acc[hotspotNome] || 0) + 1
      return acc
    }, {})
    setLeadsPorHotspotGeral(Object.entries(leadsPorHotspotMap)
      .map(([name, leads]) => ({ name, leads }))
      .sort((a, b) => b.leads - a.leads)
      .slice(0, 5)) // Top 5

    // Pagamentos Recentes
    setPagamentosRecentes(pagamentos || [])

    // Leads Recentes
    setLeadsRecentes(leadsGeral || [])

    setLoading(false)
  }, [selectedHotspotId, hotspots])

  useEffect(() => {
    buscarDados()
  }, [buscarDados])

  const fmt = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)

  const corStatus = (status) => {
    switch (status) {
      case 'Pago': return 'text-green-400'
      case 'Pendente': return 'text-yellow-400'
      case 'Vencido': return 'text-red-400'
      case 'Ativo': return 'text-green-400'
      case 'Inativo': return 'text-red-400'
      default: return 'text-gray-400'
    }
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white p-4 sm:p-6 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl sm:text-2xl font-bold">Dashboard</h1>
        <div className="flex items-center gap-3">
          <select
            className="bg-gray-800 border border-gray-700 text-white text-sm rounded-lg focus:ring-green-500 focus:border-green-500 p-2.5"
            value={selectedHotspotId}
            onChange={(e) => setSelectedHotspotId(e.target.value)}
          >
            <option value="">Todos os Hotspots</option>
            {hotspots.map((hotspot) => (
              <option key={hotspot.id} value={hotspot.id}>
                {hotspot.nome}
              </option>
            ))}
          </select>
          <button
            onClick={buscarDados}
            className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg text-sm transition-colors"
          >
            Atualizar
          </button>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-10">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
          <p className="ml-3 text-gray-400">Carregando dados...</p>
        </div>
      )}

      {!loading && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
            {[
              { label: 'Clientes Ativos', valor: metricas.clientesAtivos, sub: `${metricas.totalClientes} total`, icon: Users, cor: 'text-blue-400', bg: 'bg-blue-400/5 border-blue-400/20' },
              { label: 'Hotspots Ativos', valor: metricas.hotspotsAtivos, sub: `${metricas.totalHotspots} total`, icon: Wifi, cor: 'text-green-400', bg: 'bg-green-400/5 border-green-400/20' },
              { label: 'Leads Hoje', valor: metricas.leadsHoje, sub: `${metricas.totalLeads} total`, icon: UserPlus, cor: 'text-red-400', bg: 'bg-red-400/5 border-red-400/20' },
              { label: 'Recebido no Mês', valor: fmt(metricas.recebidoMes), sub: `${fmt(metricas.pendenteTotal)} pendente`, icon: DollarSign, cor: 'text-yellow-400', bg: 'bg-yellow-400/5 border-yellow-400/20' },
              { label: 'Visualizações Hotspot', valor: totalVisualizacoesHotspot, sub: 'Total de acessos ao portal', icon: Eye, cor: 'text-orange-400', bg: 'bg-orange-400/5 border-orange-400/20' },
            ].map((card, index) => {
              console.log(`Processando card ${index}:`, card.label, card.valor); // Linha de console.log para depuração
              const Icon = card.icon
              return (
                <div key={index} className={`relative p-4 rounded-2xl border ${card.bg}`}>
                  <div className={`absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center ${card.bg}`}>
                    <Icon className={`w-4 h-4 ${card.cor}`} />
                  </div>
                  <p className={`text-xl sm:text-2xl font-bold ${card.cor}`}>{card.valor}</p>
                  <p className="text-xs text-gray-600 mt-1">{card.sub}</p>
                </div>
              )
            })}
          </div>

          <div className="flex flex-wrap items-center gap-3 mb-8">
            {metricas.vencidoTotal > 0 && (
              <div className="flex items-center gap-2 bg-red-400/10 border border-red-400/20 rounded-xl px-3 py-2 sm:px-4 sm:py-2.5">
                <AlertTriangle size={15} className="text-red-400" />
                <span className="text-xs text-red-400 font-medium">{fmt(metricas.vencidoTotal)} em pagamentos vencidos</span>
              </div>
            )}
            {metricas.pendenteTotal > 0 && (
              <div className="flex items-center gap-2 bg-yellow-400/10 border border-yellow-400/20 rounded-xl px-3 py-2 sm:px-4 sm:py-2.5">
                <Clock size={15} className="text-yellow-400" />
                <span className="text-xs text-yellow-400 font-medium">{fmt(metricas.pendenteTotal)} a receber</span>
              </div>
            )}
          </div>
        </>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Gráfico de Leads Capturados GERAL (mantido) */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 sm:p-6">
          <h2 className="text-sm sm:text-base font-semibold text-white mb-1">Leads Capturados (Geral)</h2>
          <p className="text-xs text-gray-500 mb-5">Últimos 14 dias</p>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={leadsPorDiaGeral}>
              <defs>
                <linearGradient id="colorLeadsGeral" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="data" tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={{ backgroundColor: '#111827', border: '1px solid #1f2937', borderRadius: '8px', fontSize: '12px' }} labelStyle={{ color: '#9ca3af' }} itemStyle={{ color: '#22c55e' }} />
              <Area type="monotone" dataKey="leads" stroke="#22c55e" strokeWidth={2} fill="url(#colorLeadsGeral)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* NOVO GRÁFICO: Acessos Únicos por Dia para o Hotspot Selecionado */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 sm:p-6">
          <h2 className="text-sm sm:text-base font-semibold text-white mb-1">Acessos Únicos por Dia</h2>
          <p className="text-xs text-gray-500 mb-5">Hotspot: {hotspots.find(h => h.id === selectedHotspotId)?.nome || 'Nenhum selecionado'}</p>
          {selectedHotspotId && leadsUnicosPorDiaHotspot.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={leadsUnicosPorDiaHotspot}>
                <defs>
                  <linearGradient id="colorLeadsUnicos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="data" tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ backgroundColor: '#111827', border: '1px solid #1f2937', borderRadius: '8px', fontSize: '12px' }} labelStyle={{ color: '#9ca3af' }} itemStyle={{ color: '#3b82f6' }} />
                <Area type="monotone" dataKey="leadsUnicos" stroke="#3b82f6" strokeWidth={2} fill="url(#colorLeadsUnicos)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-40 text-gray-600 text-sm">
              {selectedHotspotId ? 'Sem dados de acessos únicos para este hotspot.' : 'Selecione um hotspot para ver os dados.'}
            </div>
          )}
        </div>

        {/* Gráfico de Receita Mensal (mantido) */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 sm:p-6">
          <h2 className="text-sm sm:text-base font-semibold text-white mb-1">Receita Mensal</h2>
          <p className="text-xs text-gray-500 mb-5">Últimos 6 meses</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={receitaPorMes}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ backgroundColor: '#111827', border: '1px solid #1f2937', borderRadius: '8px', fontSize: '12px' }} labelStyle={{ color: '#9ca3af' }} formatter={(v) => fmt(v)} />
              <Legend wrapperStyle={{ fontSize: '11px', color: '#6b7280' }} />
              <Bar dataKey="recebido" name="Recebido" fill="#22c55e" radius={[4, 4, 0, 0]} />
              <Bar dataKey="pendente" name="Pendente" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
        {/* Gráfico de Clientes por Status (mantido) */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 sm:p-6">
          <h2 className="text-sm sm:text-base font-semibold text-white mb-1">Clientes por Status</h2>
          <p className="text-xs text-gray-500 mb-4">Distribuição atual</p>
          {clientesPorStatus.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-gray-600 text-sm">Sem dados</div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={150}>
                <PieChart>
                  <Pie data={clientesPorStatus} cx="50%" cy="50%" innerRadius={45} outerRadius={65} dataKey="value" paddingAngle={3}>
                    {clientesPorStatus.map((_, i) => (
                      <Cell key={i} fill={CORES[i % CORES.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#111827', border: '1px solid #1f2937', borderRadius: '8px', fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-2">
                {clientesPorStatus.map((item, i) => (
                  <div key={item.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: CORES[i % CORES.length] }} />
                      <span className="text-xs text-gray-400">{item.name}</span>
                    </div>
                    <span className="text-xs font-medium text-white">{item.value}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Gráfico de Top Hotspots GERAL (mantido) */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 sm:p-6">
          <h2 className="text-sm sm:text-base font-semibold text-white mb-1">Top Hotspots (Geral)</h2>
          <p className="text-xs text-gray-500 mb-5">Por leads capturados</p>
          {leadsPorHotspotGeral.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-gray-600 text-sm">Sem dados</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={leadsPorHotspotGeral} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} width={80} />
                <Tooltip contentStyle={{ backgroundColor: '#111827', border: '1px solid #1f2937', borderRadius: '8px', fontSize: '12px' }} labelStyle={{ color: '#9ca3af' }} itemStyle={{ color: '#3b82f6' }} />
                <Bar dataKey="leads" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Últimos Pagamentos (mantido) */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 sm:p-6">
          <h2 className="text-sm sm:text-base font-semibold text-white mb-1">Últimos Pagamentos</h2>
          <p className="text-xs text-gray-500 mb-4">5 mais recentes</p>
          {pagamentosRecentes.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-gray-600 text-sm">Sem dados</div>
          ) : (
            <div className="space-y-3">
              {pagamentosRecentes.map((p) => (
                <div key={p.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-blue-400/10 flex items-center justify-center text-blue-400 font-semibold text-xs flex-shrink-0">
                      {p.clientes?.nome?.charAt(0).toUpperCase() || '?'}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-white truncate">{p.clientes?.nome || '—'}</p>
                      <p className="text-xs text-gray-500">{new Date(p.created_at).toLocaleDateString('pt-BR')}</p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-2">
                    <p className="text-xs font-semibold text-white">{fmt(p.valor)}</p>
                    <p className={`text-xs ${corStatus(p.status)}`}>{p.status}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Últimos Leads Capturados (mantido) */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 sm:p-6">
        <h2 className="text-sm sm:text-base font-semibold text-white mb-1">Últimos Leads Capturados</h2>
        <p className="text-xs text-gray-500 mb-4">5 mais recentes</p>
        {leadsRecentes.length === 0 ? (
          <div className="flex items-center justify-center py-8 text-gray-600 text-sm">Nenhum lead capturado ainda.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left text-xs text-gray-500 font-medium pb-3">Lead</th>
                  <th className="text-left text-xs text-gray-500 font-medium pb-3">Hotspot</th>
                  <th className="text-left text-xs text-gray-500 font-medium pb-3">Capturado em</th>
                </tr>
              </thead>
              <tbody>
                {leadsRecentes.map((l) => (
                  <tr key={l.id} className="border-b border-gray-800 last:border-0">
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-orange-400/10 flex items-center justify-center text-orange-400 font-semibold text-xs">
                          {l.nome?.charAt(0).toUpperCase() || '?'}
                        </div>
                        <div>
                          <p className="text-xs text-white">{l.nome || '—'}</p>
                          <p className="text-xs text-gray-500">{l.email || '—'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 text-xs text-gray-400">{l.hotspots?.nome || '—'}</td>
                    <td className="py-3 text-xs text-gray-500">{new Date(l.created_at).toLocaleString('pt-BR')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  )
}