'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@supabase/supabase-js'
import {
  Users, Wifi, UserPlus, DollarSign,
  TrendingUp, AlertTriangle, Clock, CheckCircle2, Eye
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

  // Efeito para carregar hotspots iniciais e definir o hotspot padrão
  useEffect(() => {
    const loadInitialHotspots = async () => {
      const { data: allHotspots, error: hotspotsError } = await supabase
        .from('hotspots')
        .select('id, nome, visualizacoes')
        .order('nome', { ascending: true })

      if (hotspotsError) {
        console.error('Erro ao buscar hotspots iniciais:', hotspotsError)
      } else {
        setHotspots(allHotspots || [])
        if (allHotspots && allHotspots.length > 0 && !selectedHotspotId) {
          setSelectedHotspotId(allHotspots[0].id)
        }
      }
    }
    loadInitialHotspots()
  }, [selectedHotspotId]) // Depende de selectedHotspotId para garantir que o padrão seja definido apenas uma vez

  // Função para buscar todos os dados do dashboard, dependente do hotspot selecionado
  const buscarDadosDashboard = useCallback(async () => {
    if (!selectedHotspotId) {
      setLoading(false)
      return // Não busca dados se nenhum hotspot estiver selecionado
    }

    setLoading(true)

    const hoje = new Date()
    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString()
    const hojeStr = hoje.toISOString().slice(0, 10)

    // Atualiza o total de visualizações do hotspot selecionado
    const currentHotspot = hotspots.find(h => h.id === selectedHotspotId)
    setTotalVisualizacoesHotspot(currentHotspot?.visualizacoes || 0)

    // Promise.all para buscar os dados
    const [
      { data: clientes },
      { data: hotspotsData },
      { data: leadsGeral },
      { data: pagamentos },
      { data: leadsHoje },
      { data: leadsHotspot, error: leadsHotspotError }, // Busca de leads específicos do hotspot
    ] = await Promise.all([
      supabase.from('clientes').select('status, created_at'),
      supabase.from('hotspots').select('status'),
      supabase.from('leads').select('id, nome, email, created_at, hotspot_id, cpf, hotspots(nome)').order('created_at', { ascending: false }),
      supabase.from('pagamentos').select('valor, status, data_vencimento, created_at, clientes(nome)').order('created_at', { ascending: false }),
      supabase.from('leads').select('id').gte('created_at', hojeStr),
      supabase.from('leads').select('id, created_at').eq('hotspot_id', selectedHotspotId).gte('created_at', new Date(hoje.setDate(hoje.getDate() - 14)).toISOString().slice(0, 10)),
    ])

    if (leadsHotspotError) {
      console.error('Erro ao buscar leads do hotspot:', leadsHotspotError)
    }

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
      recebidoMes, pendenteTotal, vencidoTotal,
    })

    // Lógica para leadsPorDiaGeral (leads capturados - gráfico geral)
    const ultimos14 = Array.from({ length: 14 }, (_, i) => {
      const d = new Date()
      d.setDate(d.getDate() - (13 - i))
      return d.toISOString().slice(0, 10)
    })
    const leadsPorDiaMap = {}
    ultimos14.forEach(d => leadsPorDiaMap[d] = 0);
    (leadsGeral || []).forEach(l => {
      const d = l.created_at?.slice(0, 10)
      if (leadsPorDiaMap[d] !== undefined) leadsPorDiaMap[d]++
    })
    setLeadsPorDiaGeral(ultimos14.map(d => ({
      data: new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      leads: leadsPorDiaMap[d]
    })))

    // Lógica para leadsUnicosPorDiaHotspot (gráfico por hotspot)
    const leadsUnicosPorDiaMap = (leadsHotspot || []).reduce((acc, lead) => {
      const date = new Date(lead.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
      acc[date] = (acc[date] || new Set()).add(lead.id)
      return acc
    }, {})
    setLeadsUnicosPorDiaHotspot(ultimos14.map(date => ({
      data: new Date(date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      leadsUnicos: leadsUnicosPorDiaMap[new Date(date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })]?.size || 0,
    })))


    // Lógica para receitaPorMes
    const ultimos6Meses = Array.from({ length: 6 }, (_, i) => {
      const d = new Date()
      d.setMonth(d.getMonth() - (5 - i))
      return { ano: d.getFullYear(), mes: d.getMonth(), label: d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }) }
    })
    const receitaMap = {}
    ultimos6Meses.forEach(m => receitaMap[`${m.ano}-${m.mes}`] = { label: m.label, recebido: 0, pendente: 0 });
    (pagamentos || []).forEach(p => {
      const d = new Date(p.created_at)
      const key = `${d.getFullYear()}-${d.getMonth()}`
      if (receitaMap[key]) {
        if (p.status === 'Pago') receitaMap[key].recebido += Number(p.valor)
        if (p.status === 'Pendente') receitaMap[key].pendente += Number(p.valor)
      }
    })
    setReceitaPorMes(Object.values(receitaMap))

    // Lógica para clientesPorStatus
    const statusMap = {}
    ;(clientes || []).forEach(c => {
      statusMap[c.status] = (statusMap[c.status] || 0) + 1
    })
    setClientesPorStatus(Object.entries(statusMap).map(([name, value]) => ({ name, value })))

    // Lógica para leadsPorHotspotGeral
    const leadsPorHotspotMap = (leadsGeral || []).reduce((acc, lead) => {
      const hotspotName = lead.hotspots?.nome || 'Desconhecido'
      acc[hotspotName] = (acc[hotspotName] || 0) + 1
      return acc
    }, {})
    setLeadsPorHotspotGeral(Object.entries(leadsPorHotspotMap)
      .map(([name, leads]) => ({ name, leads }))
      .sort((a, b) => b.leads - a.leads)
      .slice(0, 5))

    // Lógica para pagamentosRecentes
    setPagamentosRecentes((pagamentos || []).slice(0, 5))

    // Lógica para leadsRecentes
    setLeadsRecentes((leadsGeral || []).slice(0, 5))

    setLoading(false)
  }, [selectedHotspotId, hotspots]) // hotspots é uma dependência porque `currentHotspot` a utiliza.

  // Efeito para disparar a busca de dados do dashboard quando o hotspot selecionado ou a lista de hotspots muda
  useEffect(() => {
    buscarDadosDashboard()
  }, [buscarDadosDashboard])

  return (
    <main className="flex-1 p-4 sm:p-6 md:p-8 bg-gray-950 text-white min-h-screen">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-white">Dashboard</h1>
        <div className="flex items-center gap-3">
          <label htmlFor="hotspot-select" className="sr-only">Selecionar Hotspot</label>
          <select
            id="hotspot-select"
            className="bg-gray-800 border border-gray-700 text-white text-sm rounded-xl py-2 px-3 focus:ring-green-500 focus:border-green-500"
            value={selectedHotspotId}
            onChange={(e) => setSelectedHotspotId(e.target.value)}
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
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-green-500"></div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 mb-6">
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

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Gráfico de Leads por Dia (Geral) */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 sm:p-6">
              <h2 className="text-sm sm:text-base font-semibold text-white mb-1">Leads Capturados (Geral)</h2>
              <p className="text-xs text-gray-500 mb-4">Últimos 14 dias</p>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={leadsPorDiaGeral} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                  <XAxis dataKey="data" tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#111827', border: '1px solid #1f2937', borderRadius: '8px', fontSize: '12px' }} labelStyle={{ color: '#9ca3af' }} itemStyle={{ color: '#3b82f6' }} />
                  <Area type="monotone" dataKey="leads" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Gráfico de Leads Únicos por Dia (Hotspot Selecionado) */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 sm:p-6">
              <h2 className="text-sm sm:text-base font-semibold text-white mb-1">Leads Únicos por Dia (Hotspot)</h2>
              <p className="text-xs text-gray-500 mb-4">Últimos 14 dias para o hotspot selecionado</p>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={leadsUnicosPorDiaHotspot} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                  <XAxis dataKey="data" tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#111827', border: '1px solid #1f2937', borderRadius: '8px', fontSize: '12px' }} labelStyle={{ color: '#9ca3af' }} itemStyle={{ color: '#22c55e' }} />
                  <Area type="monotone" dataKey="leadsUnicos" stroke="#22c55e" fill="#22c55e" fillOpacity={0.3} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Gráfico de Receita por Mês */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 sm:p-6">
              <h2 className="text-sm sm:text-base font-semibold text-white mb-1">Receita por Mês</h2>
              <p className="text-xs text-gray-500 mb-4">Últimos 6 meses</p>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={receitaPorMes} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
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

            {/* Gráfico de Clientes por Status */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 sm:p-6">
              <h2 className="text-sm sm:text-base font-semibold text-white mb-1">Clientes por Status</h2>
              <p className="text-xs text-gray-500 mb-4">Distribuição atual</p>
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