'use client'

import { useEffect, useState } from 'react'
import { createClient as createBrowserSupabaseClient } from '@/lib/supabase/client'
import { Search, Download, UserPlus, Wifi, Shield, ShieldOff, MonitorPlay } from 'lucide-react'

// Cliente Supabase usado apenas para pegar a sessão do admin logado.
// As consultas sensíveis agora passam por /api/admin/leads.
const supabase = createBrowserSupabaseClient()

// ============================================================
// Chamada padrão para APIs administrativas.
// Essa função pega o token do usuário logado e envia para a API.
// A API valida se o usuário é admin antes de consultar o banco.
// ============================================================

async function adminApiFetch(path, { method = 'GET', body } = {}) {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession()

  if (sessionError || !sessionData?.session?.access_token) {
    throw new Error('Sessão administrativa não encontrada. Faça login novamente.')
  }

  const response = await fetch(path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${sessionData.session.access_token}`,
    },
    cache: 'no-store',
    body: body ? JSON.stringify(body) : undefined,
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error || 'Erro na API administrativa')
  }

  return data
}

export default function Leads() {
  const [leads, setLeads] = useState([])
  const [hotspots, setHotspots] = useState([])
  const [anuncios, setAnuncios] = useState([]) // NOVO ESTADO
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [filtroHotspot, setFiltroHotspot] = useState('Todos')
  const [filtroLgpd, setFiltroLgpd] = useState('Todos')

  // Recarrega os dados quando os filtros mudam.
// Agora os filtros são aplicados no servidor pela API admin.
useEffect(() => {
  buscarDados()
}, [busca, filtroHotspot, filtroLgpd])

  async function buscarDados() {
  setLoading(true)

  try {
    // A aba Leads agora não consulta mais leads/hotspots/anuncios direto no Supabase.
    // Ela chama a API protegida, que valida admin e usa service_role no servidor.
    const params = new URLSearchParams()

    if (busca) params.set('busca', busca)
    if (filtroHotspot) params.set('hotspot', filtroHotspot)
    if (filtroLgpd) params.set('lgpd', filtroLgpd)

    const data = await adminApiFetch(`/api/admin/leads?${params.toString()}`)

    setLeads(data.leads || [])
    setHotspots(data.hotspots || [])
    setAnuncios(data.anuncios || [])
  } catch (error) {
    console.error('Erro ao buscar leads:', error)
    alert(error.message || 'Erro ao carregar leads.')
  } finally {
    setLoading(false)
  }
}

  function exportarCSV() {
  // Exportação CSV melhorada para Excel:
  // - Usa ponto e vírgula, que costuma abrir melhor no Excel PT-BR.
  // - Usa BOM UTF-8 para manter acentos.
  // - Escapa aspas para não quebrar células.
  function csvCell(value) {
    const text = String(value ?? '')
    return `"${text.replace(/"/g, '""')}"`
  }

  const linhas = [
    ['Nome', 'E-mail', 'Telefone', 'CPF', 'Hotspot', 'Anúncio Visto', 'Aceite LGPD', 'Data de Captura'],
    ...leadsFiltrados.map((l) => [
      l.nome || '',
      l.email || '',
      l.telefone || '',
      l.cpf || '',
      nomeHotspot(l.hotspot_id),
      nomeAnuncio(l.anuncio_id),
      l.aceite_lgpd ? 'Sim' : 'Não',
      new Date(l.created_at).toLocaleString('pt-BR'),
    ]),
  ]

  const csvContent = '\uFEFF' + linhas
    .map((linha) => linha.map(csvCell).join(';'))
    .join('\n')

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', `leads_${new Date().toISOString().slice(0, 10)}.csv`)

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  URL.revokeObjectURL(url)
}

  const nomeHotspot = (id) => hotspots.find(h => h.id === id)?.nome || 'Desconhecido'

  // NOVA FUNÇÃO PARA PEGAR O NOME DO ANÚNCIO
  const nomeAnuncio = (id) => {
    if (!id) return 'Orgânico / Sem anúncio'
    return anuncios.find(a => a.id === id)?.titulo || 'Anúncio excluído'
  }

  // Os filtros agora são aplicados no servidor pela API admin.
// Mantemos este nome para não precisar alterar toda a tabela e a exportação.
const leadsFiltrados = leads

  return (
    <>
      <div className="relative z-10 px-4 sm:px-6 md:px-8 pb-12 animate-fade-in-up">

        {/* Cabeçalho */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div>
            <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-neutral-500 tracking-tight flex items-center gap-3">
              <div className="p-2.5 bg-[#6be12f]/10 rounded-2xl border border-[#6be12f]/20">
                <UserPlus className="text-[#6be12f]" size={24} />
              </div>
              Leads Capturados
            </h1>
            <p className="text-sm text-neutral-500 mt-2 font-medium">
              {leads.length} lead{leads.length !== 1 ? 's' : ''} na sua base de dados
            </p>
          </div>
          <button
            onClick={exportarCSV}
            disabled={leadsFiltrados.length === 0}
            className="flex items-center justify-center gap-2 bg-white/[0.02] hover:bg-white/[0.05] disabled:opacity-50 disabled:cursor-not-allowed text-neutral-300 hover:text-white font-bold px-6 py-3.5 rounded-2xl transition-all duration-300 text-sm border border-white/[0.05] hover:border-white/[0.1] shadow-inner"
          >
            <Download size={18} />
            Exportar CSV
          </button>
        </div>

        {/* Filtros Premium */}
        <div className="flex flex-col xl:flex-row gap-4 mb-8">
          <div className="relative flex-1 group/input">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-600 group-focus-within/input:text-[#6be12f] transition-colors duration-300" />
            <input
              type="text"
              placeholder="Buscar por nome, e-mail, telefone ou CPF..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full bg-[#0a0a0a] backdrop-blur-xl border border-white/[0.05] rounded-2xl pl-12 pr-5 py-4 text-sm text-white placeholder-neutral-600 focus:outline-none focus:ring-1 focus:ring-[#6be12f]/30 focus:border-[#6be12f]/30 transition-all shadow-inner"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative min-w-[220px] group/select">
              <select
                value={filtroHotspot}
                onChange={(e) => setFiltroHotspot(e.target.value)}
                className="w-full bg-[#0a0a0a] backdrop-blur-xl border border-white/[0.05] rounded-2xl px-5 py-4 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#6be12f]/30 focus:border-[#6be12f]/30 transition-all appearance-none pr-12 cursor-pointer shadow-inner"
              >
                <option value="Todos" className="bg-[#0a0a0a]">Todos os hotspots</option>
                {hotspots.map((h) => (
                  <option key={h.id} value={h.id} className="bg-[#0a0a0a]">{h.nome}</option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-5 text-neutral-600 group-hover/select:text-[#6be12f] transition-colors">
                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
              </div>
            </div>

            {/* Segmented Control para LGPD Premium */}
            <div className="flex bg-[#0a0a0a] border border-white/[0.05] rounded-2xl p-1.5 flex-shrink-0 shadow-inner">
              {['Todos', 'Aceito', 'Não aceito'].map((f) => (
                <button
                  key={f}
                  onClick={() => setFiltroLgpd(f)}
                  className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${
                    filtroLgpd === f
                      ? 'bg-white/[0.05] text-white shadow-sm border border-white/[0.05]'
                      : 'text-neutral-500 hover:text-neutral-300 hover:bg-white/[0.02] border border-transparent'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Tabela */}
        <div className="bg-[#0a0a0a] backdrop-blur-xl border border-white/[0.05] rounded-[2.5rem] shadow-[0_20px_40px_rgba(0,0,0,0.5)] overflow-hidden">
          <div className="overflow-x-auto custom-scrollbar">
            {loading ? (
              <div className="flex items-center justify-center py-32">
                <div className="relative w-16 h-16 flex items-center justify-center">
                  <div className="absolute inset-0 border-t-2 border-[#6be12f]/50 rounded-full animate-spin"></div>
                  <UserPlus className="text-[#6be12f] animate-pulse" size={24} />
                </div>
              </div>
            ) : leadsFiltrados.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-32 text-center">
                <div className="w-20 h-20 rounded-full bg-white/[0.02] border border-white/[0.05] flex items-center justify-center mb-6 shadow-inner">
                  <UserPlus size={32} className="text-neutral-600" />
                </div>
                <p className="text-xl font-bold text-white tracking-tight mb-2">Nenhum lead encontrado</p>
                <p className="text-neutral-500 text-sm max-w-md">Tente ajustar os filtros de busca ou aguarde novas conexões na sua rede.</p>
              </div>
            ) : (
              <table className="min-w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/[0.05] bg-white/[0.01]">
                    <th className="text-xs font-bold text-neutral-500 uppercase tracking-widest px-8 py-6 whitespace-nowrap">Lead</th>
                    <th className="text-xs font-bold text-neutral-500 uppercase tracking-widest px-8 py-6 whitespace-nowrap">Contato</th>
                    <th className="text-xs font-bold text-neutral-500 uppercase tracking-widest px-8 py-6 whitespace-nowrap">Hotspot</th>
                    {/* NOVA COLUNA */}
                    <th className="text-xs font-bold text-neutral-500 uppercase tracking-widest px-8 py-6 whitespace-nowrap">Anúncio Visto</th>
                    <th className="text-xs font-bold text-neutral-500 uppercase tracking-widest px-8 py-6 whitespace-nowrap">LGPD</th>
                    <th className="text-xs font-bold text-neutral-500 uppercase tracking-widest px-8 py-6 whitespace-nowrap">Capturado em</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.02]">
                  {leadsFiltrados.map((lead) => (
                    <tr key={lead.id} className="hover:bg-white/[0.02] transition-colors duration-300 group">
                      <td className="px-8 py-5 whitespace-nowrap">
                        <div className="flex items-center gap-4">
                          <div className="w-11 h-11 rounded-full bg-[#050505] border border-white/[0.05] flex items-center justify-center text-neutral-500 font-bold text-sm flex-shrink-0 shadow-inner group-hover:text-[#8cf059] group-hover:border-[#6be12f]/30 transition-all duration-300">
                            {lead.nome?.charAt(0).toUpperCase() || '?'}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-neutral-300 group-hover:text-white transition-colors truncate">{lead.nome || '—'}</p>
                            <p className="text-xs text-neutral-500 truncate mt-1 font-medium">{lead.email || '—'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-5 whitespace-nowrap">
                        <div className="flex flex-col justify-center">
                          <span className="text-sm font-bold text-neutral-300">{lead.telefone || '—'}</span>
                          <span className="text-xs text-neutral-500 mt-1 font-medium">CPF: {lead.cpf || '—'}</span>
                        </div>
                      </td>
                      <td className="px-8 py-5 whitespace-nowrap">
                        <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#050505] border border-white/[0.05] text-xs font-bold text-neutral-400 shadow-inner group-hover:border-white/[0.1] transition-colors">
                          <Wifi size={14} className="text-neutral-600 group-hover:text-[#6be12f] transition-colors flex-shrink-0" />
                          <span className="truncate max-w-[150px]">{nomeHotspot(lead.hotspot_id)}</span>
                        </span>
                      </td>

                      {/* NOVA CÉLULA DO ANÚNCIO */}
                      <td className="px-8 py-5 whitespace-nowrap">
                        <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#050505] border border-white/[0.05] text-xs font-bold text-neutral-400 shadow-inner group-hover:border-white/[0.1] transition-colors">
                          <MonitorPlay size={14} className="text-neutral-600 group-hover:text-[#6be12f] transition-colors flex-shrink-0" />
                          <span className="truncate max-w-[150px]">{nomeAnuncio(lead.anuncio_id)}</span>
                        </span>
                      </td>

                      <td className="px-8 py-5 whitespace-nowrap">
                        {lead.aceite_lgpd ? (
                          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#6be12f]/10 border border-[#6be12f]/20 text-[11px] font-bold uppercase tracking-widest text-[#8cf059]">
                            <Shield size={14} className="flex-shrink-0" />
                            Aceito
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-[11px] font-bold uppercase tracking-widest text-red-400">
                            <ShieldOff size={14} className="flex-shrink-0" />
                            Não aceito
                          </span>
                        )}
                      </td>
                      <td className="px-8 py-5 text-sm text-neutral-500 font-medium whitespace-nowrap">
                        {new Date(lead.created_at).toLocaleString('pt-BR', { 
                          day: '2-digit', month: '2-digit', year: 'numeric', 
                          hour: '2-digit', minute: '2-digit' 
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Estilo para a barra de rolagem da tabela e animações */}
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { height: 8px; width: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }

        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up {
          animation: fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          opacity: 0;
        }
      `}} />
    </>
  )
}