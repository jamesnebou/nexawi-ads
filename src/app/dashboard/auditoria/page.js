'use client'

// src/app/dashboard/auditoria/page.js
// ============================================================
// Tela de Auditoria Administrativa da NexaWi ADS.
// Mostra ações sensíveis feitas dentro da dashboard.
// ============================================================

import { useEffect, useMemo, useState } from 'react'
import { createClient as createBrowserSupabaseClient } from '@/lib/supabase/client'
import {
  ShieldCheck,
  Search,
  RefreshCw,
  Clock,
  User,
  Database,
  FileText,
  PlusCircle,
  Pencil,
  Trash2,
  PauseCircle,
  PlayCircle,
  DollarSign,
  Settings,
  Activity,
  ChevronDown,
} from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'

const supabase = createBrowserSupabaseClient()

const periodos = [
  { value: 'hoje', label: 'Hoje' },
  { value: 'ultimos_7', label: 'Últimos 7 dias' },
  { value: 'ultimos_30', label: 'Últimos 30 dias' },
  { value: 'todos', label: 'Todo período' },
]

const entidadesFixas = [
  { value: 'todos', label: 'Todas entidades' },
  { value: 'clientes', label: 'Clientes' },
  { value: 'hotspots', label: 'Hotspots' },
  { value: 'anuncios', label: 'Anúncios' },
  { value: 'pagamentos', label: 'Financeiro' },
  { value: 'planos', label: 'Planos' },
  { value: 'configuracoes', label: 'Configurações' },
]

const acoesFixas = [
  { value: 'todos', label: 'Todas ações' },
  { value: 'create', label: 'Criações' },
  { value: 'update', label: 'Edições' },
  { value: 'delete', label: 'Exclusões' },
  { value: 'activate', label: 'Ativações' },
  { value: 'pause', label: 'Pausas' },
  { value: 'mark_paid', label: 'Marcado como pago' },
]

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

  const text = await response.text()

  let data = null

  try {
    data = text ? JSON.parse(text) : null
  } catch {
    throw new Error(`A API não retornou JSON. Status: ${response.status}`)
  }

  if (!response.ok) {
    throw new Error(data?.error || 'Erro na API administrativa')
  }

  return data
}

function formatarData(value) {
  if (!value) return '-'

  return new Date(value).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getActionConfig(action) {
  const configs = {
    create: {
      label: 'Criou',
      icon: PlusCircle,
      className: 'bg-[#6be12f]/10 text-[#8cf059] border-[#6be12f]/20',
    },
    update: {
      label: 'Editou',
      icon: Pencil,
      className: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    },
    delete: {
      label: 'Excluiu',
      icon: Trash2,
      className: 'bg-red-500/10 text-red-400 border-red-500/20',
    },
    activate: {
      label: 'Ativou',
      icon: PlayCircle,
      className: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    },
    pause: {
      label: 'Pausou',
      icon: PauseCircle,
      className: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    },
    mark_paid: {
      label: 'Pago',
      icon: DollarSign,
      className: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    },
  }

  return configs[action] || {
    label: action || 'Ação',
    icon: Activity,
    className: 'bg-white/[0.04] text-neutral-400 border-white/[0.08]',
  }
}

function getEntityLabel(entity) {
  const labels = {
    clientes: 'Clientes',
    hotspots: 'Hotspots',
    anuncios: 'Anúncios',
    pagamentos: 'Financeiro',
    planos: 'Planos',
    configuracoes: 'Configurações',
  }

  return labels[entity] || entity || '-'
}

export default function AuditoriaPage() {
  const [logs, setLogs] = useState([])
  const [resumo, setResumo] = useState({
    total: 0,
    criacoes: 0,
    edicoes: 0,
    exclusoes: 0,
    financeiro: 0,
  })

  const [busca, setBusca] = useState('')
  const [periodo, setPeriodo] = useState('ultimos_7')
  const [entity, setEntity] = useState('todos')
  const [action, setAction] = useState('todos')
  const [loading, setLoading] = useState(true)
  const [logAberto, setLogAberto] = useState(null)

  useEffect(() => {
    buscarLogs()
  }, [periodo, entity, action])

  async function buscarLogs() {
    setLoading(true)

    try {
      const params = new URLSearchParams()

      params.set('periodo', periodo)
      params.set('entity', entity)
      params.set('action', action)

      if (busca.trim()) {
        params.set('busca', busca.trim())
      }

      const data = await adminApiFetch(`/api/admin/auditoria?${params.toString()}`)

      setLogs(data.logs || [])
      setResumo(data.resumo || {
        total: 0,
        criacoes: 0,
        edicoes: 0,
        exclusoes: 0,
        financeiro: 0,
      })
    } catch (error) {
      console.error('Erro ao buscar auditoria:', error)
      toast.error(error.message || 'Erro ao carregar auditoria.')
    } finally {
      setLoading(false)
    }
  }

  function handleSubmit(e) {
    e.preventDefault()
    buscarLogs()
  }

  const cards = useMemo(() => [
    {
      label: 'Eventos',
      value: resumo.total,
      icon: ShieldCheck,
      sub: 'ações registradas',
      className: 'text-[#8cf059]',
    },
    {
      label: 'Criações',
      value: resumo.criacoes,
      icon: PlusCircle,
      sub: 'novos registros',
      className: 'text-blue-400',
    },
    {
      label: 'Edições',
      value: resumo.edicoes,
      icon: Pencil,
      sub: 'alterações feitas',
      className: 'text-orange-400',
    },
    {
      label: 'Exclusões',
      value: resumo.exclusoes,
      icon: Trash2,
      sub: 'remoções realizadas',
      className: 'text-red-400',
    },
    {
      label: 'Financeiro',
      value: resumo.financeiro,
      icon: DollarSign,
      sub: 'ações em pagamentos',
      className: 'text-purple-400',
    },
  ], [resumo])

  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#0a0a0a',
            color: '#fff',
            borderRadius: '16px',
            border: '1px solid rgba(255,255,255,0.1)',
          },
        }}
      />

      <div className="relative z-10 px-4 sm:px-6 md:px-8 pb-12 animate-fade-in-up">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 mb-10">
          <div>
            <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-neutral-500 tracking-tight flex items-center gap-3">
              <div className="p-2.5 bg-[#6be12f]/10 rounded-2xl border border-[#6be12f]/20">
                <ShieldCheck className="text-[#6be12f]" size={24} />
              </div>
              Auditoria
            </h1>

            <p className="text-sm text-neutral-500 mt-2 font-medium">
              Histórico de ações administrativas realizadas no sistema
            </p>
          </div>

          <button
            onClick={buscarLogs}
            className="bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.05] hover:border-white/[0.1] text-white font-bold py-3.5 px-5 rounded-2xl text-sm transition-all duration-300 flex items-center justify-center gap-2 shadow-inner"
          >
            <RefreshCw size={17} />
            Atualizar
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-5 mb-8">
          {cards.map((card) => (
            <div
              key={card.label}
              className="bg-white/[0.02] border border-white/[0.05] rounded-3xl p-6 hover:border-white/[0.1] transition-all duration-300"
            >
              <div className="flex items-center justify-between mb-5">
                <p className="text-neutral-500 text-xs font-bold tracking-widest uppercase">
                  {card.label}
                </p>

                <div className="p-2.5 rounded-2xl bg-[#0a0a0a] border border-white/[0.05]">
                  <card.icon size={18} className={card.className} />
                </div>
              </div>

              <p className="text-4xl font-light text-white tracking-tight">
                {card.value}
              </p>

              <p className="text-xs text-neutral-500 mt-2 font-medium">
                {card.sub}
              </p>
            </div>
          ))}
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white/[0.02] border border-white/[0.05] rounded-[2rem] p-5 mb-8 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4"
        >
          <div className="relative xl:col-span-2">
            <Search size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-neutral-600" />

            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por e-mail, ação, entidade..."
              className="w-full bg-[#050505] border border-white/[0.05] rounded-2xl pl-12 pr-5 py-4 text-sm text-white placeholder-neutral-700 focus:outline-none focus:border-[#6be12f]/40"
            />
          </div>

          <SelectFilter value={periodo} onChange={setPeriodo} options={periodos} />
          <SelectFilter value={entity} onChange={setEntity} options={entidadesFixas} />
          <SelectFilter value={action} onChange={setAction} options={acoesFixas} />

          <button
            type="submit"
            className="md:col-span-2 xl:col-span-5 bg-[#6be12f] hover:bg-[#8cf059] text-black font-extrabold py-3.5 px-5 rounded-2xl text-sm transition-all duration-300"
          >
            Filtrar Auditoria
          </button>
        </form>

        {loading ? (
          <div className="flex items-center justify-center py-32">
            <div className="relative w-16 h-16 flex items-center justify-center">
              <div className="absolute inset-0 border-t-2 border-[#6be12f]/50 rounded-full animate-spin" />
              <ShieldCheck className="text-[#6be12f] animate-pulse" size={24} />
            </div>
          </div>
        ) : logs.length === 0 ? (
          <div className="bg-white/[0.02] border border-white/[0.05] rounded-[2.5rem] py-24 text-center">
            <div className="w-20 h-20 bg-white/[0.02] rounded-full flex items-center justify-center mb-6 border border-white/[0.05] mx-auto">
              <FileText size={32} className="text-neutral-600" />
            </div>

            <h3 className="text-xl font-semibold text-white mb-2 tracking-tight">
              Nenhum log encontrado
            </h3>

            <p className="text-sm text-neutral-500 max-w-md mx-auto">
              Assim que ações administrativas forem realizadas, elas aparecerão aqui.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {logs.map((log) => {
              const actionConfig = getActionConfig(log.action)
              const ActionIcon = actionConfig.icon
              const aberto = logAberto === log.id

              return (
                <div
                  key={log.id}
                  className="bg-[#0a0a0a] border border-white/[0.05] rounded-[2rem] overflow-hidden hover:border-white/[0.1] transition-all duration-300"
                >
                  <button
                    onClick={() => setLogAberto(aberto ? null : log.id)}
                    className="w-full text-left p-5 sm:p-6 flex flex-col xl:flex-row xl:items-center gap-5 justify-between"
                  >
                    <div className="flex items-start gap-4 min-w-0">
                      <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center flex-shrink-0 ${actionConfig.className}`}>
                        <ActionIcon size={20} />
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span className={`text-[10px] uppercase tracking-widest font-extrabold px-2.5 py-1 rounded-lg border ${actionConfig.className}`}>
                            {actionConfig.label}
                          </span>

                          <span className="text-[10px] uppercase tracking-widest font-bold px-2.5 py-1 rounded-lg bg-white/[0.04] text-neutral-400 border border-white/[0.06]">
                            {getEntityLabel(log.entity)}
                          </span>
                        </div>

                        <h3 className="text-white font-bold text-base sm:text-lg">
                          {log.description || 'Ação administrativa registrada'}
                        </h3>

                        <div className="flex flex-wrap gap-3 mt-2 text-xs text-neutral-500">
                          <span className="flex items-center gap-1.5">
                            <User size={13} />
                            {log.admin_email || 'Admin não identificado'}
                          </span>

                          <span className="flex items-center gap-1.5">
                            <Clock size={13} />
                            {formatarData(log.created_at)}
                          </span>

                          <span className="flex items-center gap-1.5">
                            <Database size={13} />
                            {log.entity_id || 'Sem ID'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <ChevronDown
                      size={20}
                      className={`text-neutral-500 transition-transform ${aberto ? 'rotate-180' : ''}`}
                    />
                  </button>

                  {aberto && (
                    <div className="border-t border-white/[0.05] p-5 sm:p-6 bg-white/[0.015]">
                      <p className="text-xs font-bold uppercase tracking-widest text-neutral-500 mb-3">
                        Detalhes técnicos
                      </p>

                      <pre className="bg-[#050505] border border-white/[0.05] rounded-2xl p-4 text-xs text-neutral-300 overflow-x-auto whitespace-pre-wrap">
                        {JSON.stringify(log.metadata || {}, null, 2)}
                      </pre>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 text-xs text-neutral-500">
                        <div>
                          <span className="font-bold text-neutral-400">IP:</span> {log.ip_address || '-'}
                        </div>

                        <div>
                          <span className="font-bold text-neutral-400">User Agent:</span> {log.user_agent || '-'}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
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

function SelectFilter({ value, onChange, options }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-[#050505] border border-white/[0.05] rounded-2xl px-5 py-4 text-sm text-white focus:outline-none focus:border-[#6be12f]/40 appearance-none"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value} className="bg-[#050505]">
            {option.label}
          </option>
        ))}
      </select>

      <ChevronDown
        size={16}
        className="pointer-events-none absolute right-5 top-1/2 -translate-y-1/2 text-neutral-600"
      />
    </div>
  )
}