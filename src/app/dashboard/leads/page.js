'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { UserPlus, Search, Shield, ShieldOff, Download, Wifi } from 'lucide-react'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default function Leads() {
  const [leads, setLeads] = useState([])
  const [hotspots, setHotspots] = useState([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [filtroLgpd, setFiltroLgpd] = useState('Todos')
  const [filtroHotspot, setFiltroHotspot] = useState('Todos')

  useEffect(() => { buscarDados() }, [])

  async function buscarDados() {
    setLoading(true)
    const [{ data: leadsData }, { data: hotspotsData }] = await Promise.all([
      supabase.from('leads').select('*').order('created_at', { ascending: false }),
      supabase.from('hotspots').select('id, nome')
    ])
    setLeads(leadsData || [])
    setHotspots(hotspotsData || [])
    setLoading(false)
  }

  function nomeHotspot(id) {
    return hotspots.find((h) => h.id === id)?.nome || '—'
  }

  function exportarCSV() {
    const linhas = [
      ['Nome', 'Email', 'Telefone', 'CPF', 'Hotspot', 'LGPD', 'Data Aceite', 'IP', 'Cadastrado em'],
      ...leadsFiltrados.map((l) => [
        l.nome || '',
        l.email || '',
        l.telefone || '',
        l.cpf || '',
        nomeHotspot(l.hotspot_id),
        l.aceite_lgpd ? 'Sim' : 'Não',
        l.data_aceite_lgpd ? new Date(l.data_aceite_lgpd).toLocaleString('pt-BR') : '',
        l.ip || '',
        new Date(l.created_at).toLocaleString('pt-BR')
      ])
    ]
    const csv = linhas.map((l) => l.join(';')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `leads_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
  }

  const leadsFiltrados = leads.filter((l) => {
    const buscaOk =
      l.nome?.toLowerCase().includes(busca.toLowerCase()) ||
      l.email?.toLowerCase().includes(busca.toLowerCase()) ||
      l.telefone?.includes(busca) ||
      l.cpf?.includes(busca)
    const lgpdOk =
      filtroLgpd === 'Todos' ||
      (filtroLgpd === 'Aceito' && l.aceite_lgpd) ||
      (filtroLgpd === 'Não aceito' && !l.aceite_lgpd)
    const hotspotOk = filtroHotspot === 'Todos' || l.hotspot_id === filtroHotspot
    return buscaOk && lgpdOk && hotspotOk
  })

  return (
    <main className="flex-1 px-8 py-8 overflow-auto">

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Leads</h1>
          <p className="text-gray-400 text-sm mt-1">{leads.length} lead{leads.length !== 1 ? 's' : ''} capturado{leads.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={exportarCSV}
          disabled={leadsFiltrados.length === 0}
          className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium px-4 py-2.5 rounded-xl transition-all text-sm border border-gray-700"
        >
          <Download size={16} />
          Exportar CSV
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Buscar por nome, e-mail, telefone ou CPF..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full bg-gray-900 border border-gray-800 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-green-500 transition-colors"
          />
        </div>
        <select
          value={filtroHotspot}
          onChange={(e) => setFiltroHotspot(e.target.value)}
          className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-2.5 text-sm text-gray-400 focus:outline-none focus:border-green-500 transition-colors"
        >
          <option value="Todos">Todos os hotspots</option>
          {hotspots.map((h) => (
            <option key={h.id} value={h.id}>{h.nome}</option>
          ))}
        </select>
        <div className="flex gap-2">
          {['Todos', 'Aceito', 'Não aceito'].map((f) => (
            <button
              key={f}
              onClick={() => setFiltroLgpd(f)}
              className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                filtroLgpd === f
                  ? 'bg-green-500 text-black'
                  : 'bg-gray-900 border border-gray-800 text-gray-400 hover:border-gray-600'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : leadsFiltrados.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <UserPlus size={36} className="text-gray-700 mb-3" />
            <p className="text-gray-500 text-sm">Nenhum lead encontrado.</p>
            <p className="text-gray-600 text-xs mt-1">Os leads são capturados automaticamente pelo hotspot.</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left text-xs text-gray-500 font-medium px-6 py-4">Lead</th>
                <th className="text-left text-xs text-gray-500 font-medium px-6 py-4">Telefone</th>
                <th className="text-left text-xs text-gray-500 font-medium px-6 py-4">CPF</th>
                <th className="text-left text-xs text-gray-500 font-medium px-6 py-4">Hotspot</th>
                <th className="text-left text-xs text-gray-500 font-medium px-6 py-4">LGPD</th>
                <th className="text-left text-xs text-gray-500 font-medium px-6 py-4">Capturado em</th>
              </tr>
            </thead>
            <tbody>
              {leadsFiltrados.map((lead) => (
                <tr key={lead.id} className="border-b border-gray-800 last:border-0 hover:bg-gray-800/40 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-orange-400/10 flex items-center justify-center text-orange-400 font-semibold text-sm flex-shrink-0">
                        {lead.nome?.charAt(0).toUpperCase() || '?'}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">{lead.nome || '—'}</p>
                        <p className="text-xs text-gray-500">{lead.email || '—'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-400">{lead.telefone || '—'}</td>
                  <td className="px-6 py-4 text-sm text-gray-400">{lead.cpf || '—'}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5 text-sm text-gray-400">
                      <Wifi size={13} className="text-blue-400" />
                      {nomeHotspot(lead.hotspot_id)}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {lead.aceite_lgpd ? (
                      <span className="flex items-center gap-1.5 text-xs text-green-400">
                        <Shield size={13} />
                        Aceito
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-xs text-red-400">
                        <ShieldOff size={13} />
                        Não aceito
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {new Date(lead.created_at).toLocaleDateString('pt-BR')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </main>
  )
}