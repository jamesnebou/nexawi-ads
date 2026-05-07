'use client'

// src/app/dashboard/equipe/page.js
// ============================================================
// Tela de Equipe/Admins.
// Agora com permissões granulares por módulo e ação:
// Ver, Criar, Editar, Excluir, Exportar, Ativar, Pausar, Marcar Pago.
// ============================================================

import { useEffect, useState } from 'react'
import { createClient as createBrowserSupabaseClient } from '@/lib/supabase/client'
import {
  Users,
  ShieldCheck,
  Search,
  Save,
  RefreshCw,
  UserPlus,
  Crown,
  Eye,
  Headphones,
  DollarSign,
  Check,
  X,
  Lock,
  Sparkles,
} from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'

const supabase = createBrowserSupabaseClient()

const roleLabels = {
  master: 'Master',
  admin: 'Admin',
  suporte: 'Suporte',
  financeiro: 'Financeiro',
  viewer: 'Visualizador',
}

const roleIcons = {
  master: Crown,
  admin: ShieldCheck,
  suporte: Headphones,
  financeiro: DollarSign,
  viewer: Eye,
}

const actionLabels = {
  view: 'Ver',
  create: 'Criar',
  update: 'Editar',
  delete: 'Excluir',
  export: 'Exportar',
  activate: 'Ativar',
  pause: 'Pausar',
  mark_paid: 'Marcar pago',
}

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

export default function EquipePage() {
  const [admins, setAdmins] = useState([])
  const [roles, setRoles] = useState(['master', 'admin', 'suporte', 'financeiro', 'viewer'])
  const [modules, setModules] = useState([])
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState('')
  const [busca, setBusca] = useState('')

  const [novoAdmin, setNovoAdmin] = useState({
    email: '',
    role: 'admin',
  })

  useEffect(() => {
    buscarEquipe()
  }, [])

  async function buscarEquipe() {
    setLoading(true)

    try {
      const data = await adminApiFetch('/api/admin/equipe')

      setAdmins(data.admins || [])
      setRoles(data.roles || roles)
      setModules(data.modules || [])
    } catch (error) {
      console.error('Erro ao buscar equipe:', error)
      toast.error(error.message || 'Erro ao carregar equipe.')
    } finally {
      setLoading(false)
    }
  }

  function atualizarAdminLocal(userId, changes) {
    setAdmins((prev) =>
      prev.map((admin) =>
        admin.user_id === userId
          ? { ...admin, ...changes }
          : admin
      )
    )
  }

  function togglePermissao(admin, moduleKey, actionKey) {
    const current = admin.permissions || {}
    const currentModule = current[moduleKey] || {}

    atualizarAdminLocal(admin.user_id, {
      permissions: {
        ...current,
        [moduleKey]: {
          ...currentModule,
          [actionKey]: !Boolean(currentModule[actionKey]),
        },
      },
    })
  }

  async function salvarAdmin(admin) {
    setSalvando(admin.user_id)

    try {
      await adminApiFetch('/api/admin/equipe', {
        method: 'POST',
        body: {
          action: 'update_admin',
          user_id: admin.user_id,
          role: admin.role,
          active: admin.active,
          permissions: admin.permissions || {},
        },
      })

      toast.success('Administrador atualizado!')
      await buscarEquipe()
    } catch (error) {
      console.error('Erro ao salvar admin:', error)
      toast.error(error.message || 'Erro ao salvar administrador.')
    } finally {
      setSalvando('')
    }
  }

  async function adicionarAdmin(e) {
    e.preventDefault()

    if (!novoAdmin.email.trim()) {
      toast.error('Informe o e-mail do administrador.')
      return
    }

    setSalvando('novo')

    try {
      await adminApiFetch('/api/admin/equipe', {
        method: 'POST',
        body: {
          action: 'upsert_admin',
          email: novoAdmin.email,
          role: novoAdmin.role,
          active: true,
        },
      })

      toast.success('Administrador adicionado!')
      setNovoAdmin({ email: '', role: 'admin' })
      await buscarEquipe()
    } catch (error) {
      console.error('Erro ao adicionar admin:', error)
      toast.error(error.message || 'Erro ao adicionar administrador.')
    } finally {
      setSalvando('')
    }
  }

  const adminsFiltrados = admins.filter((admin) => {
    const term = busca.toLowerCase().trim()

    if (!term) return true

    return (
      String(admin.email || '').toLowerCase().includes(term) ||
      String(admin.role || '').toLowerCase().includes(term)
    )
  })

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
                <Users className="text-[#6be12f]" size={24} />
              </div>
              Equipe
            </h1>

            <p className="text-sm text-neutral-500 mt-2 font-medium">
              Controle master de administradores, cargos e permissões por ação
            </p>
          </div>

          <button
            onClick={buscarEquipe}
            className="bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.05] hover:border-white/[0.1] text-white font-bold py-3.5 px-5 rounded-2xl text-sm transition-all duration-300 flex items-center justify-center gap-2 shadow-inner"
          >
            <RefreshCw size={17} />
            Atualizar
          </button>
        </div>

        <form
          onSubmit={adicionarAdmin}
          className="bg-white/[0.02] border border-white/[0.05] rounded-[2rem] p-5 mb-8 grid grid-cols-1 xl:grid-cols-[2fr_1fr_220px] gap-4 items-end"
        >
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-neutral-500 mb-3">
              Adicionar administrador existente
            </label>

            <input
              value={novoAdmin.email}
              onChange={(e) => setNovoAdmin({ ...novoAdmin, email: e.target.value })}
              placeholder="email@dominio.com"
              className="w-full bg-[#050505] border border-white/[0.05] rounded-2xl px-5 py-4 text-sm text-white placeholder-neutral-700 focus:outline-none focus:border-[#6be12f]/40"
            />

            <p className="text-xs text-neutral-600 mt-2">
              O usuário precisa existir em Supabase Authentication &gt; Users.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-neutral-500 mb-3">
              Cargo
            </label>

            <select
              value={novoAdmin.role}
              onChange={(e) => setNovoAdmin({ ...novoAdmin, role: e.target.value })}
              className="w-full bg-[#050505] border border-white/[0.05] rounded-2xl px-5 py-4 text-sm text-white focus:outline-none focus:border-[#6be12f]/40"
            >
              {roles.map((role) => (
                <option key={role} value={role} className="bg-[#050505]">
                  {roleLabels[role] || role}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={salvando === 'novo'}
            className="h-[54px] w-full bg-[#6be12f] hover:bg-[#8cf059] disabled:opacity-50 text-black font-extrabold rounded-2xl text-base flex items-center justify-center gap-2 transition-all shadow-[0_0_26px_rgba(107,225,47,0.18)]"
          >
            <UserPlus size={19} />
            Adicionar
          </button>
        </form>

        <div className="relative mb-8">
          <Search size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-neutral-600" />

          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por e-mail ou cargo..."
            className="w-full bg-[#050505] border border-white/[0.05] rounded-2xl pl-12 pr-5 py-4 text-sm text-white placeholder-neutral-700 focus:outline-none focus:border-[#6be12f]/40"
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-32">
            <div className="w-14 h-14 border-t-2 border-[#6be12f]/60 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-6">
            {adminsFiltrados.map((admin) => {
              const RoleIcon = roleIcons[admin.role] || ShieldCheck

              return (
                <div
                  key={admin.user_id}
                  className="bg-[#0a0a0a] border border-white/[0.05] rounded-[2rem] p-6 hover:border-white/[0.1] transition-all"
                >
                  <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-5 mb-6">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-12 h-12 rounded-2xl bg-[#6be12f]/10 border border-[#6be12f]/20 flex items-center justify-center flex-shrink-0">
                        <RoleIcon size={21} className="text-[#8cf059]" />
                      </div>

                      <div className="min-w-0">
                        <p className="text-white font-bold truncate">
                          {admin.email}
                        </p>

                        <p className="text-xs text-neutral-500 mt-1">
                          {admin.active ? 'Ativo' : 'Inativo'} · {roleLabels[admin.role] || admin.role}
                        </p>
                      </div>
                    </div>

                    <div
                      className={`text-[10px] uppercase tracking-widest font-extrabold px-3 py-1.5 rounded-lg border w-fit ${
                        admin.active
                          ? 'bg-[#6be12f]/10 text-[#8cf059] border-[#6be12f]/20'
                          : 'bg-red-500/10 text-red-400 border-red-500/20'
                      }`}
                    >
                      {admin.active ? 'Ativo' : 'Bloqueado'}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-7">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-widest text-neutral-500 mb-3">
                        Cargo
                      </label>

                      <select
                        value={admin.role}
                        onChange={(e) => {
                          atualizarAdminLocal(admin.user_id, {
                            role: e.target.value,
                          })
                        }}
                        className="w-full bg-[#050505] border border-white/[0.05] rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#6be12f]/40"
                      >
                        {roles.map((role) => (
                          <option key={role} value={role} className="bg-[#050505]">
                            {roleLabels[role] || role}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-widest text-neutral-500 mb-3">
                        Status
                      </label>

                      <button
                        type="button"
                        onClick={() =>
                          atualizarAdminLocal(admin.user_id, {
                            active: !admin.active,
                          })
                        }
                        className={`w-full rounded-2xl px-4 py-3 text-sm font-bold border flex items-center justify-center gap-2 transition-all ${
                          admin.active
                            ? 'bg-[#6be12f]/10 text-[#8cf059] border-[#6be12f]/20'
                            : 'bg-red-500/10 text-red-400 border-red-500/20'
                        }`}
                      >
                        {admin.active ? <Check size={16} /> : <X size={16} />}
                        {admin.active ? 'Ativo' : 'Bloqueado'}
                      </button>
                    </div>
                  </div>

                  <div className="mb-7">
                    <div className="flex items-center gap-2 mb-4">
                      <Lock size={15} className="text-neutral-500" />

                      <p className="text-xs font-bold uppercase tracking-widest text-neutral-500">
                        Permissões por módulo e ação
                      </p>
                    </div>

                    <div className="space-y-3">
                      {modules.map((modulo) => (
                        <div
                          key={modulo.key}
                          className="bg-white/[0.015] border border-white/[0.05] rounded-2xl p-4"
                        >
                          <div className="flex items-center gap-2 mb-3">
                            <Sparkles size={14} className="text-[#8cf059]" />

                            <p className="text-sm font-extrabold text-white">
                              {modulo.label}
                            </p>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-7 gap-2">
                            {modulo.actions.map((actionKey) => {
                              const ativo = Boolean(admin.permissions?.[modulo.key]?.[actionKey])

                              return (
                                <button
                                  key={`${modulo.key}-${actionKey}`}
                                  type="button"
                                  onClick={() => togglePermissao(admin, modulo.key, actionKey)}
                                  className={`px-3 py-2.5 rounded-xl text-[11px] font-bold border transition-all ${
                                    ativo
                                      ? 'bg-[#6be12f]/10 text-[#8cf059] border-[#6be12f]/20'
                                      : 'bg-[#050505] text-neutral-500 border-white/[0.05] hover:text-white'
                                  }`}
                                >
                                  {actionLabels[actionKey] || actionKey}
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => salvarAdmin(admin)}
                    disabled={salvando === admin.user_id}
                    className="w-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-white font-bold py-3.5 rounded-2xl text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                  >
                    <Save size={16} />
                    {salvando === admin.user_id ? 'Salvando...' : 'Salvar alterações'}
                  </button>
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