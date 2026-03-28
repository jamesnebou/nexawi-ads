'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@supabase/supabase-js'
import {
  Users, Wifi, UserPlus, DollarSign, Eye // Adicionado o ícone Eye para visualizações
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
      .filter(p => p.status === 'Vencido')
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

    const clientesPorStatusMap = {}
    clientes?.forEach(c => {
      clientesPorStatusMap[c.status] = (clientesPorStatusMap[c.status] || 0) + 1
    })
    setClientesPorStatus(Object.keys(clientesPorStatusMap).map(status => ({
      name: status,
      value: clientesPorStatusMap[status]
    })))

    const leadsPorHotspotMap = {}
    leadsGeral?.forEach(l => {
      if (l.hotspots?.nome) {
        leadsPorHotspotMap[l.hotspots.nome] = (leadsPorHotspotMap[l.hotspots.nome] || 0) + 1
      }
    })
    setLeadsPorHotspotGeral(Object.keys(leadsPorHotspotMap).map(nome => ({
      name: nome,
      leads: leadsPorHotspotMap[nome]
    })).sort((a, b) => b.leads - a.leads).slice(0, 5))

    setPagamentosRecentes(pagamentos?.slice(0, 5) || [])
    setLeadsRecentes(leadsGeral?.slice(0, 5) || [])

    setLoading(false)
  }, [selectedHotspotId])

  useEffect(() => {
    buscarDados()
  }, [buscarDados])

  useEffect(() => {
    if (selectedHotspotId) {
      const currentHotspot = hotspots.find(h => h.id === selectedHotspotId)
      setTotalVisualizacoesHotspot(currentHotspot?.visualizacoes || 0)

      const hoje = new Date()
      const ultimos14 = Array.from({ length: 14 }, (_, i) => {
        const d = new Date()
        d.setDate(d.getDate() - (13 - i))
        return d.toISOString().slice(0, 10)
      })

      supabase
        .from('leads')
        .select('created_at')
        .eq('hotspot_id', selectedHotspotId)
        .gte('created_at', ultimos14[0])
        .then(({ data, error }) => {
          if (error) {
            console.error('Erro ao buscar leads únicos por hotspot:', error)
            setLeadsUnicosPorDiaHotspot([])
            return
          }

          const leadsUnicosMap = {}
          ultimos14.forEach(d => leadsUnicosMap[d] = 0);

          const uniqueDates = new Set();
          (data || []).forEach(l => {
            const d = l.created_at?.slice(0, 10)
            if (ultimos14.includes(d) && !uniqueDates.has(`${d}-${l.id}`)) { // Considera leads únicos por dia
              leadsUnicosMap[d]++;
              uniqueDates.add(`${d}-${l.id}`);
            }
          })

          setLeadsUnicosPorDiaHotspot(ultimos14.map(d => ({
            data: new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
            leadsUnicos: leadsUnicosMap[d]
          })))
        })
    } else {
      setLeadsUnicosPorDiaHotspot([])
    }
  }, [selectedHotspotId, hotspots])

  const handleHotspotChange = (e) => {
    setSelectedHotspotId(e.target.value)
  }

  const fmt = (value) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
  }

  const corStatus = (status) => {
    switch (status) {
      case 'Pago': return 'text-green-400'
      case 'Pendente': return 'text-yellow-400'
      case 'Vencido': return 'text-red-400'
      default: return 'text-gray-400'
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-gray-950 text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        <p className="mt-4 text-gray-400">Carregando dashboard...</p>
      </main>
    )
  }

  return (
    <main className="flex min-h-screen flex-col p-6 bg-gray-950 text-white">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div className="flex items-center gap-4">
          <label htmlFor="hotspot-select" className="text-sm text-gray-400">
            Selecionar Hotspot para Análise:
          </label>
          <select
            id="hotspot-select"
            className="bg-gray-800 border border-gray-700 text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5"
            value={selectedHotspotId}
            onChange={handleHotspotChange}
          >
            {hotspots.length === 0 ? (
              <option value="">Nenhum hotspot encontrado</option>
            ) : (
              <>
                {hotspots.map((hotspot) => (
                  <option key={hotspot.id} value={hotspot.id}>
                    {hotspot.nome}
                  </option>
                ))}
              </>
            )}
          </select>
        </div>
      </div>

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
              <p className="text-xs text-gray-600 mt-1">{card.label}</p> {/* Alterado de card.sub para card.label para corresponder ao exemplo */}
            </div>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 sm:p-6">
          <h2 className="text-sm sm:text-base font-semibold text-white mb-1">Leads Capturados (Geral)</h2>
          <p className="text-xs text-gray-500 mb-5">Últimos 14 dias</p>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={leadsPorDiaGeral}>
              <defs>
                <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="data" tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={{ backgroundColor: '#111827', border: '1px solid #1f2937', borderRadius: '8px', fontSize: '12px' }} labelStyle={{ color: '#9ca3af' }} itemStyle={{ color: '#22c55e' }} />
              <Area type="monotone" dataKey="leads" stroke="#22c55e" strokeWidth={2} fill="url(#colorLeads)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 sm:p-6">
          <h2 className="text-sm sm:text-base font-semibold text-white mb-1">Acessos Diários</h2>
          <p className="text-xs text-gray-500 mb-5">Hotspot selecionado (últimos 14 dias)</p>
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
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: CORES[i % CORES.length]} } />
                      <span className="text-xs text-gray-400">{item.name}</span>
                    </div>
                    <span className="text-xs font-medium text-white">{item.value}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

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