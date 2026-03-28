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
  const [totalVisualizacoesHotspot, setTotalVisualizacoesHotspot] = useState(0)
  const [onlineUsers, setOnlineUsers] = useState(0) // Novo estado para pessoas online
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

  // Função para formatar valores monetários
  const fmt = (value) => {
    if (typeof value !== 'number') return 'R$ 0,00'
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  // Função para determinar a cor do status
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

  // Função para buscar dados
  const buscarDados = useCallback(async () => {
    setLoading(true)

    const hoje = new Date()
    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString()
    const hojeStr = hoje.toISOString().slice(0, 10)

    let currentHotspots = hotspots;
    if (currentHotspots.length === 0) {
      const { data: allHotspots, error: hotspotsError } = await supabase
        .from('hotspots')
        .select('id, nome, visualizacoes')
        .order('nome', { ascending: true })

      if (hotspotsError) {
        console.error('Erro ao buscar hotspots:', hotspotsError)
      } else {
        currentHotspots = allHotspots || [];
        setHotspots(currentHotspots);
        if (currentHotspots.length > 0 && !selectedHotspotId) {
          setSelectedHotspotId(currentHotspots[0].id);
          setSelectedHotspotName(currentHotspots[0].nome);
        }
      }
    }

    // Métricas gerais
    const { data: clientesData, error: clientesError } = await supabase
      .from('clientes')
      .select('id, status')
    const { data: hotspotsData, error: hotspotsCountError } = await supabase
      .from('hotspots')
      .select('id, status')
    const { data: leadsData, error: leadsError } = await supabase
      .from('leads')
      .select('id, created_at, hotspot_id')
    const { data: pagamentosData, error: pagamentosError } = await supabase
      .from('pagamentos')
      .select('id, valor, status, created_at, clientes(nome)')

    if (clientesError) console.error('Erro ao buscar clientes:', clientesError)
    if (hotspotsCountError) console.error('Erro ao buscar hotspots:', hotspotsCountError)
    if (leadsError) console.error('Erro ao buscar leads:', leadsError)
    if (pagamentosError) console.error('Erro ao buscar pagamentos:', pagamentosError)

    const totalClientes = clientesData?.length || 0
    const clientesAtivos = clientesData?.filter(c => c.status === 'Ativo').length || 0
    const totalHotspots = hotspotsData?.length || 0
    const hotspotsAtivos = hotspotsData?.filter(h => h.status === 'Ativo').length || 0
    const totalLeads = leadsData?.length || 0
    const leadsHoje = leadsData?.filter(l => l.created_at.startsWith(hojeStr)).length || 0

    const recebidoMes = pagamentosData?.filter(p => p.status === 'Pago' && p.created_at >= inicioMes).reduce((sum, p) => sum + p.valor, 0) || 0
    const pendenteTotal = pagamentosData?.filter(p => p.status === 'Pendente').reduce((sum, p) => sum + p.valor, 0) || 0
    const vencidoTotal = pagamentosData?.filter(p => p.status === 'Vencido').reduce((sum, p) => sum + p.valor, 0) || 0

    setMetricas({
      totalClientes, clientesAtivos,
      totalHotspots, hotspotsAtivos,
      totalLeads, leadsHoje,
      recebidoMes, pendenteTotal, vencidoTotal,
    })

    // Leads por dia (geral)
    const leadsPorDiaMap = leadsData?.reduce((acc, lead) => {
      const date = lead.created_at.slice(0, 10)
      acc[date] = (acc[date] || 0) + 1
      return acc
    }, {})
    const leadsPorDiaArray = Object.keys(leadsPorDiaMap || {}).map(date => ({
      date,
      leads: leadsPorDiaMap[date],
    })).sort((a, b) => new Date(a.date) - new Date(b.date))
    setLeadsPorDiaGeral(leadsPorDiaArray)

    // Leads por hotspot (geral)
    const leadsPorHotspotMap = leadsData?.reduce((acc, lead) => {
      const hotspot = currentHotspots.find(h => h.id === lead.hotspot_id)
      if (hotspot) {
        acc[hotspot.nome] = (acc[hotspot.nome] || 0) + 1
      }
      return acc
    }, {})
    const leadsPorHotspotArray = Object.keys(leadsPorHotspotMap || {}).map(name => ({
      name,
      leads: leadsPorHotspotMap[name],
    })).sort((a, b) => b.leads - a.leads).slice(0, 5)
    setLeadsPorHotspotGeral(leadsPorHotspotArray)

    // Receita por mês
    const receitaPorMesMap = pagamentosData?.filter(p => p.status === 'Pago').reduce((acc, p) => {
      const month = new Date(p.created_at).toLocaleString('pt-BR', { month: 'short', year: 'numeric' })
      acc[month] = (acc[month] || 0) + p.valor
      return acc
    }, {})
    const receitaPorMesArray = Object.keys(receitaPorMesMap || {}).map(month => ({
      month,
      receita: receitaPorMesMap[month],
    }))
    setReceitaPorMes(receitaPorMesArray)

    // Clientes por status
    const clientesPorStatusMap = clientesData?.reduce((acc, c) => {
      acc[c.status] = (acc[c.status] || 0) + 1
      return acc
    }, {})
    const clientesPorStatusArray = Object.keys(clientesPorStatusMap || {}).map(status => ({
      name: status,
      value: clientesPorStatusMap[status],
    }))
    setClientesPorStatus(clientesPorStatusArray)

    // Pagamentos recentes
    const pagamentosRecentesArray = pagamentosData?.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5) || []
    setPagamentosRecentes(pagamentosRecentesArray)

    // Leads recentes
    const leadsRecentesArray = leadsData?.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5) || []
    const { data: leadsRecentesComHotspot, error: leadsRecentesError } = await supabase
      .from('leads')
      .select('*, hotspots(nome)')
      .order('created_at', { ascending: false })
      .limit(5)
    if (leadsRecentesError) console.error('Erro ao buscar leads recentes com hotspot:', leadsRecentesError)
    setLeadsRecentes(leadsRecentesComHotspot || [])

    setLoading(false)
  }, [hotspots, selectedHotspotId]) // Adicionado selectedHotspotId como dependência

  // Efeito para buscar dados iniciais e quando o hotspot selecionado muda
  useEffect(() => {
    buscarDados()
  }, [buscarDados])

  // Efeito para Realtime e Pessoas Online
  useEffect(() => {
    if (!selectedHotspotId) return;

    const fetchOnlineUsers = async () => {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const { count, error } = await supabase
        .from('hotspot_sessions')
        .select('id', { count: 'exact' })
        .eq('hotspot_id', selectedHotspotId)
        .gte('last_active_at', fiveMinutesAgo);

      if (error) {
        console.error('Erro ao buscar usuários online:', error);
        setOnlineUsers(0);
      } else {
        setOnlineUsers(count || 0);
      }
    };

    fetchOnlineUsers(); // Busca inicial de usuários online

    const channel = supabase
      .channel(`hotspot_sessions_changes_${selectedHotspotId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'hotspot_sessions',
          filter: `hotspot_id=eq.${selectedHotspotId}`
        },
        (payload) => {
          console.log('Realtime change received!', payload);
          fetchOnlineUsers(); // Re-fetch users on any change

          if (payload.eventType === 'INSERT') {
            const hotspot = hotspots.find(h => h.id === selectedHotspotId);
            if (hotspot) {
              toast.success(`Hotspot "${hotspot.nome}" recebeu um novo acesso!`, {
                position: 'bottom-right',
                duration: 4000,
                style: {
                  background: '#1f2937',
                  color: '#fff',
                  border: '1px solid #22c55e',
                },
              });
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedHotspotId, hotspots]); // Dependências: selectedHotspotId e hotspots

  // Efeito para atualizar o nome do hotspot selecionado
  useEffect(() => {
    const currentHotspot = hotspots.find(h => h.id === selectedHotspotId);
    setSelectedHotspotName(currentHotspot ? currentHotspot.nome : 'Nenhum Hotspot');
  }, [selectedHotspotId, hotspots]);


  const handleHotspotChange = (event) => {
    const newHotspotId = event.target.value;
    setSelectedHotspotId(newHotspotId);
    const selected = hotspots.find(h => h.id === newHotspotId);
    setSelectedHotspotName(selected ? selected.nome : 'Nenhum Hotspot');
  }

  return (
    <main className="min-h-screen bg-gray-950 text-gray-100 p-4 sm:p-6 md:p-8">
      <Toaster /> {/* Componente para exibir os toasts */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-white">Dashboard</h1>
        <div className="flex items-center gap-3">
          <label htmlFor="hotspot-select" className="sr-only">Selecionar Hotspot</label>
          <select
            id="hotspot-select"
            value={selectedHotspotId}
            onChange={handleHotspotChange}
            className="bg-gray-800 border border-gray-700 text-white text-sm rounded-lg focus:ring-green-500 focus:border-green-500 block p-2.5"
          >
            <option value="">Todos os Hotspots</option>
            {hotspots.map((hotspot) => (
              <option key={hotspot.id} value={hotspot.id}>
                {hotspot.nome}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-green-500"></div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-6">
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

            {/* Card Total de Clientes */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 sm:p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-sm sm:text-base font-semibold text-white">Total de Clientes</h2>
                  <Users size={20} className="text-blue-400" />
                </div>
                <p className="text-3xl sm:text-4xl font-bold text-white">{metricas.totalClientes}</p>
                <p className="text-xs text-gray-500 mt-1">{metricas.clientesAtivos} ativos</p>
              </div>
            </div>

            {/* Card Total de Hotspots */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 sm:p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-sm sm:text-base font-semibold text-white">Total de Hotspots</h2>
                  <Wifi size={20} className="text-purple-400" />
                </div>
                <p className="text-3xl sm:text-4xl font-bold text-white">{metricas.totalHotspots}</p>
                <p className="text-xs text-gray-500 mt-1">{metricas.hotspotsAtivos} ativos</p>
              </div>
            </div>

            {/* Card Leads Capturados Hoje */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 sm:p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-sm sm:text-base font-semibold text-white">Leads Capturados Hoje</h2>
                  <UserPlus size={20} className="text-orange-400" />
                </div>
                <p className="text-3xl sm:text-4xl font-bold text-white">{metricas.leadsHoje}</p>
                <p className="text-xs text-gray-500 mt-1">Total: {metricas.totalLeads}</p>
              </div>
            </div>

            {/* Card Recebido no Mês */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 sm:p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-sm sm:text-base font-semibold text-white">Recebido no Mês</h2>
                  <DollarSign size={20} className="text-green-400" />
                </div>
                <p className="text-3xl sm:text-4xl font-bold text-white">{fmt(metricas.recebidoMes)}</p>
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