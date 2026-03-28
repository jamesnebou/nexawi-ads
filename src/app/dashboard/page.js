'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@supabase/supabase-js'
import {
  Users, Wifi, UserPlus, DollarSign,
  TrendingUp, AlertTriangle, Clock, CheckCircle2, Eye, Activity // Adicionado Activity para Pessoas Online
} from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import toast, { Toaster } from 'react-hot-toast' // Importa toast e Toaster

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const CORES = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']

export default function Dashboard() {
  const [loading, setLoading] = useState(true)
  const [hotspots, setHotspots] = useState([])
  const [selectedHotspotId, setSelectedHotspotId] = useState('')
  const [selectedHotspotName, setSelectedHotspotName] = useState('Nenhum Hotspot') // Novo estado para o nome do hotspot
  const [totalVisualizacoes, setTotalVisualizacoes] = useState(0)
  const [onlineUsers, setOnlineUsers] = useState(0)
  const [metricas, setMetricas] = useState({
    clientesAtivos: 0,
    clientesInativos: 0,
    clientesPendentes: 0,
    clientesVencidos: 0,
    receitaTotal: 0,
    receitaAtiva: 0,
    pendenteTotal: 0,
    vencidoTotal: 0,
  })
  const [leadsPorDiaGeral, setLeadsPorDiaGeral] = useState([])
  const [receitaPorMes, setReceitaPorMes] = useState([])
  const [clientesPorStatus, setClientesPorStatus] = useState([])
  const [leadsPorHotspotGeral, setLeadsPorHotspotGeral] = useState([])
  const [pagamentosRecentes, setPagamentosRecentes] = useState([])
  const [leadsRecentes, setLeadsRecentes] = useState([])

  const fmt = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
  const corStatus = (status) => {
    switch (status) {
      case 'ativo': return 'text-green-400';
      case 'inativo': return 'text-gray-500';
      case 'pendente': return 'text-yellow-400';
      case 'vencido': return 'text-red-400';
      default: return 'text-gray-400';
    }
  }

  const buscarDados = useCallback(async () => {
    setLoading(true)
    try {
      // Hotspots
      const { data: hotspotsData, error: hotspotsError } = await supabase
        .from('hotspots')
        .select('id, nome, visualizacoes')
        .order('nome', { ascending: true })

      if (hotspotsError) throw hotspotsError
      setHotspots(hotspotsData)
      if (hotspotsData.length > 0 && !selectedHotspotId) {
        setSelectedHotspotId(hotspotsData[0].id)
        setSelectedHotspotName(hotspotsData[0].nome)
      } else if (selectedHotspotId) {
        const currentHotspot = hotspotsData.find(h => h.id === selectedHotspotId)
        if (currentHotspot) setSelectedHotspotName(currentHotspot.nome)
      }

      // Métricas
      const { data: metricasData, error: metricasError } = await supabase.rpc('get_dashboard_metrics')
      if (metricasError) throw metricasError
      setMetricas(metricasData[0] || {})

      // Leads por Dia (Geral)
      const { data: leadsDiaData, error: leadsDiaError } = await supabase.rpc('get_leads_by_day_general')
      if (leadsDiaError) throw leadsDiaError
      setLeadsPorDiaGeral(leadsDiaData)

      // Receita por Mês
      const { data: receitaMesData, error: receitaMesError } = await supabase.rpc('get_revenue_by_month')
      if (receitaMesError) throw receitaMesError
      setReceitaPorMes(receitaMesData)

      // Clientes por Status
      const { data: clientesStatusData, error: clientesStatusError } = await supabase.rpc('get_clients_by_status')
      if (clientesStatusError) throw clientesStatusError
      setClientesPorStatus(clientesStatusData)

      // Leads por Hotspot (Geral)
      const { data: leadsHotspotData, error: leadsHotspotError } = await supabase.rpc('get_leads_by_hotspot_general')
      if (leadsHotspotError) throw leadsHotspotError
      setLeadsPorHotspotGeral(leadsHotspotData)

      // Últimos Pagamentos
      const { data: pagamentosData, error: pagamentosError } = await supabase
        .from('pagamentos')
        .select('id, valor, status, created_at, clientes(nome)')
        .order('created_at', { ascending: false })
        .limit(5)
      if (pagamentosError) throw pagamentosError
      setPagamentosRecentes(pagamentosData)

      // Últimos Leads
      const { data: leadsData, error: leadsError } = await supabase
        .from('leads')
        .select('id, nome, email, created_at, hotspots(nome)')
        .order('created_at', { ascending: false })
        .limit(5)
      if (leadsError) throw leadsError
      setLeadsRecentes(leadsData)

      // Pessoas Online (para o hotspot selecionado)
      if (selectedHotspotId) {
        const { data: onlineData, error: onlineError } = await supabase
          .from('hotspot_sessions')
          .select('id')
          .eq('hotspot_id', selectedHotspotId)
          .is('end_time', null) // Sessões ativas
        if (onlineError) throw onlineError
        setOnlineUsers(onlineData.length)
      } else {
        setOnlineUsers(0)
      }

    } catch (error) {
      console.error('Erro ao buscar dados do dashboard:', error.message)
      toast.error('Erro ao carregar dados do dashboard.')
    } finally {
      setLoading(false)
    }
  }, [selectedHotspotId])

  useEffect(() => {
    buscarDados()
  }, [buscarDados])

  // Realtime para hotspot_sessions
  useEffect(() => {
    if (!selectedHotspotId) return

    const channel = supabase
      .channel(`hotspot_sessions_channel_${selectedHotspotId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'hotspot_sessions',
          filter: `hotspot_id=eq.${selectedHotspotId}`
        },
        (payload) => {
          console.log('Change received!', payload)
          if (payload.eventType === 'INSERT') {
            toast.success(`Novo usuário online no hotspot ${selectedHotspotName}!`)
          }
          // Re-fetch online users on any change to keep it updated
          const fetchOnlineUsers = async () => {
            const { data: onlineData, error: onlineError } = await supabase
              .from('hotspot_sessions')
              .select('id')
              .eq('hotspot_id', selectedHotspotId)
              .is('end_time', null)
            if (onlineError) {
              console.error('Erro ao buscar usuários online em tempo real:', onlineError.message)
            } else {
              setOnlineUsers(onlineData.length)
            }
          }
          fetchOnlineUsers()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [selectedHotspotId, selectedHotspotName])


  const handleHotspotChange = (e) => {
    const newHotspotId = e.target.value
    setSelectedHotspotId(newHotspotId)
    const newHotspotName = hotspots.find(h => h.id === newHotspotId)?.nome || 'Nenhum Hotspot'
    setSelectedHotspotName(newHotspotName)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen-minus-header">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-green-500"></div>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white p-4 sm:p-6 md:p-8">
      <Toaster position="top-right" reverseOrder={false} /> {/* Componente Toaster */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-4 sm:mb-0">Dashboard</h1>
        <div className="flex items-center gap-3">
          <label htmlFor="hotspot-select" className="text-gray-400 text-sm">Hotspot:</label>
          <select
            id="hotspot-select"
            value={selectedHotspotId}
            onChange={handleHotspotChange}
            className="bg-gray-800 border border-gray-700 text-white text-sm rounded-lg focus:ring-green-500 focus:border-green-500 p-2.5"
          >
            {hotspots.map((hotspot) => (
              <option key={hotspot.id} value={hotspot.id}>
                {hotspot.nome}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            {/* Card Pessoas Online */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 sm:p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-sm sm:text-base font-semibold text-white">Pessoas Online</h2>
                  <Activity size={20} className="text-green-400" />
                </div>
                <p className="text-3xl sm:text-4xl font-bold text-white">{onlineUsers}</p>
                <p className="text-xs text-gray-500 mt-1">No hotspot: {selectedHotspotName}</p>
              </div>
            </div>

            {/* Card Clientes Ativos */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 sm:p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-sm sm:text-base font-semibold text-white">Clientes Ativos</h2>
                  <CheckCircle2 size={20} className="text-green-400" />
                </div>
                <p className="text-3xl sm:text-4xl font-bold text-white">{metricas.clientesAtivos}</p>
                <p className="text-xs text-gray-500 mt-1">Total de clientes: {metricas.clientesAtivos + metricas.clientesInativos + metricas.clientesPendentes + metricas.clientesVencidos}</p>
              </div>
            </div>

            {/* Card Receita Ativa */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 sm:p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-sm sm:text-base font-semibold text-white">Receita Ativa</h2>
                  <TrendingUp size={20} className="text-blue-400" />
                </div>
                <p className="text-3xl sm:text-4xl font-bold text-white">{fmt(metricas.receitaAtiva)}</p>
                <p className="text-xs text-gray-500 mt-1">Pendente: {fmt(metricas.pendenteTotal)}</p>
              </div>
            </div>

            {/* Card Pagamentos Vencidos */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 sm:p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-sm sm:text-base font-semibold text-white">Pagamentos Vencidos</h2>
                  <AlertTriangle size={20} className="text-red-400" />
                </div>
                <p className="text-3xl sm:text-4xl font-bold text-white">{fmt(metricas.vencidoTotal)}</p>
                <p className="text-xs text-gray-500 mt-1">Total pendente: {fmt(metricas.pendenteTotal)}</p>
              </div>
            </div>

            {/* Card Visualizações do Hotspot Selecionado */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 sm:p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-sm sm:text-base font-semibold text-white">Visualizações</h2>
                  <Eye size={20} className="text-yellow-400" />
                </div>
                <p className="text-3xl sm:text-4xl font-bold text-white">
                  {hotspots.find(h => h.id === selectedHotspotId)?.visualizacoes || 0}
                </p>
                <p className="text-xs text-gray-500 mt-1">No hotspot: {selectedHotspotName}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Gráfico de Leads por Dia (Geral) */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 sm:p-6">
              <h2 className="text-sm sm:text-base font-semibold text-white mb-1">Leads por Dia (Geral)</h2>
              <p className="text-xs text-gray-500 mb-5">Últimos 30 dias</p>
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={leadsPorDiaGeral} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                  <Tooltip contentStyle={{ backgroundColor: '#111827', border: '1px solid #1f2937', borderRadius: '8px', fontSize: '12px' }} labelStyle={{ color: '#9ca3af' }} itemStyle={{ color: '#3b82f6' }} />
                  <Area type="monotone" dataKey="leads" stroke="#3b82f6" fillOpacity={1} fill="url(#colorLeads)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Gráfico de Receita por Mês */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 sm:p-6">
              <h2 className="text-sm sm:text-base font-semibold text-white mb-1">Receita por Mês</h2>
              <p className="text-xs text-gray-500 mb-5">Últimos 6 meses</p>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={receitaPorMes} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={fmt} tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#111827', border: '1px solid #1f2937', borderRadius: '8px', fontSize: '12px' }} labelStyle={{ color: '#9ca3af' }} itemStyle={{ color: '#22c55e' }} formatter={(value) => fmt(value)} />
                  <Bar dataKey="receita" fill="#22c55e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Gráfico de Clientes por Status */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 sm:p-6">
              <h2 className="text-sm sm:text-base font-semibold text-white mb-1">Clientes por Status</h2>
              <p className="text-xs text-gray-500 mb-5">Distribuição atual</p>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                  <Pie
                    data={clientesPorStatus}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {clientesPorStatus.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CORES[index % CORES.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#111827', border: '1px solid #1f2937', borderRadius: '8px', fontSize: '12px' }} labelStyle={{ color: '#9ca3af' }} itemStyle={{ color: '#fff' }} />
                  <Legend wrapperStyle={{ fontSize: '12px', color: '#9ca3af' }} />
                </PieChart>
              </ResponsiveContainer>
                <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 mt-4">
                  {clientesPorStatus.map((item, index) => (
                    <div key={item.name} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: CORES[index % CORES.length] }}>
                      </div>
                      <span className="text-xs font-medium text-white">{item.name}: {item.value}</span>
                    </div>
                  ))}
                </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
            {/* Gráfico de Top Hotspots GERAL */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 sm:p-6">
              <h2 className="text-sm sm:text-base font-semibold text-white mb-1">Top Hotspots (Geral)</h2>
              <p className="text-xs text-gray-500 mb-5">Por leads capturados</p>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={leadsPorHotspotGeral} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} width={80} />
                  <Tooltip contentStyle={{ backgroundColor: '#111827', border: '1px solid #1f2937', borderRadius: '8px', fontSize: '12px' }} labelStyle={{ color: '#9ca3af' }} itemStyle={{ color: '#3b82f6' }} />
                  <Bar dataKey="leads" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Últimos Pagamentos */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 sm:p-6">
              <h2 className="text-sm sm:text-base font-semibold text-white mb-1">Últimos Pagamentos</h2>
              <p className="text-xs text-gray-500 mb-4">5 mais recentes</p>
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
            </div>
          </div>

          {/* Últimos Leads Capturados */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 sm:p-6">
            <h2 className="text-sm sm:text-base font-semibold text-white mb-1">Últimos Leads Capturados</h2>
            <p className="text-xs text-gray-500 mb-4">5 mais recentes</p>
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
          </div>
        </>
      )}
    </main>
  )
}