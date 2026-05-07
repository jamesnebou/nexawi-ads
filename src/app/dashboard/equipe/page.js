'use client'

// src/app/dashboard/equipe/page.js
// ============================================================
// Tela de Equipe/Admins.
// Versão premium e limpa:
// - Cards compactos por administrador.
// - Permissões ficam dentro de modal.
// - Master mostra "Acesso total" sem poluir a tela.
// - Presets rápidos: total, operacional, financeiro, leitura e limpar.
// ============================================================

import { useEffect, useMemo, useState } from 'react'
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
  SlidersHorizontal,
  Shield,
  Layers,
  Ban,
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

function deepClone(value) {
  return JSON.parse(JSON.stringify(value || {}))
}

function contarPermissoesAtivas(admin, modules) {
  if (admin.role === 'master') {
    return {
      modulos: modules.length,
      permissoes: modules.reduce((acc, modulo) => acc + modulo.actions.length, 0),
    }
  }

  let modulos = 0
  let permissoes = 0

  modules.forEach((modulo) => {
    const moduloPerms = admin.permissions?.[modulo.key] || {}
    const acoesAtivas = modulo.actions.filter((action) => Boolean(moduloPerms[action]))

    if (acoesAtivas.length > 0) {
      modulos += 1
      permissoes += acoesAtivas.length
    }
  })

  return { modulos, permissoes }
}

function criarPermissoesVazias(modules) {
  const permissions = {}

  modules.forEach((modulo) => {
    permissions[modulo.key] = {}

    modulo.actions.forEach((action) => {
      permissions[modulo.key][action] = false
    })
  })

  return permissions
}

function criarPermissoesTotais(modules) {
  const permissions = {}

  modules.forEach((modulo) => {
    permissions[modulo.key] = {}

    modulo.actions.forEach((action) => {
      permissions[modulo.key][action] = true
    })
  })

  return permissions
}

function criarPermissoesLeitura(modules) {
  const permissions = criarPermissoesVazias(modules)

  modules.forEach((modulo) => {
    if (permissions[modulo.key]) {
      permissions[modulo.key].view = true
    }
  })

  return permissions
}

function criarPresetOperacional(modules) {
  const permissions = criarPermissoesVazias(modules)

  const liberar = {
    dashboard: ['view'],
    clientes: ['view', 'create', 'update'],
    hotspots: ['view', 'create', 'update'],
    anuncios: ['view', 'create', 'update', 'activate', 'pause'],
    leads: ['view', 'export'],
    relatorios: ['view'],
  }

  modules.forEach((modulo) => {
    const actions = liberar[modulo.key] || []

    actions.forEach((action) => {
      if (permissions[modulo.key] && action in permissions[modulo.key]) {
        permissions[modulo.key][action] = true
      }
    })
  })

  return permissions
}

function criarPresetFinanceiro(modules) {
  const permissions = criarPermissoesVazias(modules)

  const liberar = {
    dashboard: ['view'],
    clientes: ['view', 'export'],
    financeiro: ['view', 'create', 'update', 'mark_paid', 'export'],
    planos: ['view'],
    relatorios: ['view', 'export'],
  }

  modules.forEach((modulo) => {
    const actions = liberar[modulo.key] || []

    actions.forEach((action) => {
      if (permissions[modulo.key] && action in permissions[modulo.key]) {
        permissions[modulo.key][action] = true
      }
    })
  })

  return permissions
}

function normalizarPermissoesParaTela(permissions, modules) {
  const normalized = {}

  modules.forEach((modulo) => {
    normalized[modulo.key] = {}

    modulo.actions.forEach((action) => {
      normalized[modulo.key][action] = Boolean(permissions?.[modulo.key]?.[action])
    })
  })

  return normalized
}

export default function EquipePage() {
  const [admins, setAdmins] = useState([])
  const [roles, setRoles] = useState(['master', 'admin', 'suporte', 'financeiro', 'viewer'])
  const [modules, setModules] = useState([])
  const [permissoesPadrao, setPermissoesPadrao] = useState({})
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState('')
  const [busca, setBusca] = useState('')
  const [adminEditando, setAdminEditando] = useState(null)

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
      setPermissoesPadrao(data.permissoesPadrao || {})
    } catch (error) {
      console.error('Erro ao buscar equipe:', error)
      toast.error(error.message || 'Erro ao carregar equipe.')
    } finally {
      setLoading(false)
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

  function abrirModalPermissoes(admin) {
    setAdminEditando({
      ...deepClone(admin),
      permissions: normalizarPermissoesParaTela(admin.permissions || {}, modules),
    })
  }

  function fecharModal() {
    setAdminEditando(null)
  }

  function atualizarAdminEditando(changes) {
    setAdminEditando((prev) => ({
      ...prev,
      ...changes,
    }))
  }

  function togglePermissao(moduleKey, actionKey) {
    setAdminEditando((prev) => {
      const current = prev.permissions || {}
      const currentModule = current[moduleKey] || {}

      return {
        ...prev,
        permissions: {
          ...current,
          [moduleKey]: {
            ...currentModule,
            [actionKey]: !Boolean(currentModule[actionKey]),
          },
        },
      }
    })
  }

  function aplicarPreset(tipo) {
    if (!adminEditando) return

    if (tipo === 'total') {
      atualizarAdminEditando({
        permissions: criarPermissoesTotais(modules),
      })
      return
    }

    if (tipo === 'cargo') {
      const role = adminEditando.role || 'admin'
      atualizarAdminEditando({
        permissions: normalizarPermissoesParaTela(permissoesPadrao[role] || {}, modules),
      })
      return
    }

    if (tipo === 'operacional') {
      atualizarAdminEditando({
        permissions: criarPresetOperacional(modules),
      })
      return
    }

    if (tipo === 'financeiro') {
      atualizarAdminEditando({
        permissions: criarPresetFinanceiro(modules),
      })
      return
    }

    if (tipo === 'leitura') {
      atualizarAdminEditando({
        permissions: criarPermissoesLeitura(modules),
      })
      return
    }

    if (tipo === 'limpar') {
      atualizarAdminEditando({
        permissions: criarPermissoesVazias(modules),
      })
    }
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
      setAdminEditando(null)
      await buscarEquipe()
    } catch (error) {
      console.error('Erro ao salvar admin:', error)
      toast.error(error.message || 'Erro ao salvar administrador.')
    } finally {
      setSalvando('')
    }
  }

  const adminsFiltrados = useMemo(() => {
    const term = busca.toLowerCase().trim()

    if (!term) return admins

    return admins.filter((admin) => (
      String(admin.email || '').toLowerCase().includes(term) ||
      String(admin.role || '').toLowerCase().includes(term)
    ))
  }, [admins, busca])

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
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {adminsFiltrados.map((admin) => {
              const RoleIcon = roleIcons[admin.role] || ShieldCheck
              const resumo = contarPermissoesAtivas(admin, modules)

              return (
                <div
                  key={admin.user_id}
                  className="bg-[#0a0a0a] border border-white/[0.05] rounded-[2rem] p-6 hover:border-white/[0.1] transition-all relative overflow-hidden"
                >
                  <div className="absolute -right-12 -top-12 w-40 h-40 bg-[#6be12f]/5 rounded-full blur-3xl pointer-events-none" />

                  <div className="relative z-10 flex flex-col sm:flex-row sm:items-start justify-between gap-5 mb-6">
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

                    <span
                      className={`text-[10px] uppercase tracking-widest font-extrabold px-3 py-1.5 rounded-lg border w-fit ${
                        admin.active
                          ? 'bg-[#6be12f]/10 text-[#8cf059] border-[#6be12f]/20'
                          : 'bg-red-500/10 text-red-400 border-red-500/20'
                      }`}
                    >
                      {admin.active ? 'Ativo' : 'Bloqueado'}
                    </span>
                  </div>

                  <div className="relative z-10 bg-white/[0.02] border border-white/[0.05] rounded-2xl p-4 mb-5">
                    <div className="flex items-center gap-2 mb-2">
                      <Shield size={15} className="text-[#8cf059]" />

                      <p className="text-xs uppercase tracking-widest font-bold text-neutral-500">
                        Nível de acesso
                      </p>
                    </div>

                    {admin.role === 'master' ? (
                      <p className="text-sm font-bold text-white">
                        Acesso total ao sistema
                      </p>
                    ) : (
                      <p className="text-sm font-bold text-white">
                        {resumo.modulos} módulos liberados · {resumo.permissoes} permissões ativas
                      </p>
                    )}
                  </div>

                  <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => abrirModalPermissoes(admin)}
                      className="bg-[#6be12f] hover:bg-[#8cf059] text-black font-extrabold py-3.5 rounded-2xl text-sm flex items-center justify-center gap-2 transition-all"
                    >
                      <SlidersHorizontal size={16} />
                      Editar permissões
                    </button>

                    <button
                      type="button"
                      onClick={() => salvarAdmin(admin)}
                      disabled={salvando === admin.user_id}
                      className="bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-white font-bold py-3.5 rounded-2xl text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                    >
                      <Save size={16} />
                      {salvando === admin.user_id ? 'Salvando...' : 'Salvar'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {adminEditando && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-6xl max-h-[92vh] bg-[#070707] border border-white/[0.08] rounded-[2rem] shadow-[0_30px_100px_rgba(0,0,0,0.7)] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-white/[0.06] flex flex-col lg:flex-row lg:items-center justify-between gap-5">
              <div>
                <h2 className="text-2xl font-extrabold text-white flex items-center gap-3">
                  <div className="p-2 bg-[#6be12f]/10 rounded-2xl border border-[#6be12f]/20">
                    <SlidersHorizontal size={20} className="text-[#8cf059]" />
                  </div>
                  Editar permissões
                </h2>

                <p className="text-sm text-neutral-500 mt-2">
                  {adminEditando.email}
                </p>
              </div>

              <button
                onClick={fecharModal}
                className="w-11 h-11 rounded-2xl bg-white/[0.04] hover:bg-red-500/10 border border-white/[0.06] hover:border-red-500/20 text-neutral-400 hover:text-red-400 flex items-center justify-center transition-all"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto custom-modal-scrollbar">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-neutral-500 mb-3">
                    Cargo
                  </label>

                  <select
                    value={adminEditando.role}
                    onChange={(e) => {
                      atualizarAdminEditando({
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
                      atualizarAdminEditando({
                        active: !adminEditando.active,
                      })
                    }
                    className={`w-full rounded-2xl px-4 py-3 text-sm font-bold border flex items-center justify-center gap-2 transition-all ${
                      adminEditando.active
                        ? 'bg-[#6be12f]/10 text-[#8cf059] border-[#6be12f]/20'
                        : 'bg-red-500/10 text-red-400 border-red-500/20'
                    }`}
                  >
                    {adminEditando.active ? <Check size={16} /> : <X size={16} />}
                    {adminEditando.active ? 'Ativo' : 'Bloqueado'}
                  </button>
                </div>
              </div>

              <div className="bg-white/[0.02] border border-white/[0.05] rounded-[1.5rem] p-4 mb-6">
                <p className="text-xs font-bold uppercase tracking-widest text-neutral-500 mb-3">
                  Presets rápidos
                </p>

                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2">
                  <PresetButton icon={Crown} label="Acesso total" onClick={() => aplicarPreset('total')} />
                  <PresetButton icon={Sparkles} label="Padrão cargo" onClick={() => aplicarPreset('cargo')} />
                  <PresetButton icon={Headphones} label="Operacional" onClick={() => aplicarPreset('operacional')} />
                  <PresetButton icon={DollarSign} label="Financeiro" onClick={() => aplicarPreset('financeiro')} />
                  <PresetButton icon={Eye} label="Só leitura" onClick={() => aplicarPreset('leitura')} />
                  <PresetButton icon={Ban} label="Limpar tudo" danger onClick={() => aplicarPreset('limpar')} />
                </div>
              </div>

              {adminEditando.role === 'master' ? (
                <div className="bg-[#6be12f]/10 border border-[#6be12f]/20 rounded-[1.5rem] p-6 text-center">
                  <Crown size={34} className="text-[#8cf059] mx-auto mb-4" />

                  <h3 className="text-xl font-extrabold text-white mb-2">
                    Master tem acesso total
                  </h3>

                  <p className="text-sm text-neutral-400 max-w-xl mx-auto">
                    Administradores master podem acessar, criar, editar e excluir tudo no sistema,
                    além de gerenciar permissões de outros integrantes.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {modules.map((modulo) => (
                    <div
                      key={modulo.key}
                      className="bg-white/[0.015] border border-white/[0.05] rounded-2xl p-4"
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
                        <div className="flex items-center gap-2">
                          <Layers size={15} className="text-[#8cf059]" />

                          <p className="text-sm font-extrabold text-white">
                            {modulo.label}
                          </p>
                        </div>

                        <p className="text-[11px] text-neutral-600 font-medium">
                          Controle o que este admin pode fazer neste módulo
                        </p>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-7 gap-2">
                        {modulo.actions.map((actionKey) => {
                          const ativo = Boolean(adminEditando.permissions?.[modulo.key]?.[actionKey])

                          return (
                            <button
                              key={`${modulo.key}-${actionKey}`}
                              type="button"
                              onClick={() => togglePermissao(modulo.key, actionKey)}
                              className={`px-3 py-2.5 rounded-xl text-[12px] font-bold border transition-all ${
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
              )}
            </div>

            <div className="p-5 border-t border-white/[0.06] grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={fecharModal}
                className="bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-white font-bold py-3.5 rounded-2xl text-sm transition-all"
              >
                Cancelar
              </button>

              <button
                onClick={() => salvarAdmin(adminEditando)}
                disabled={salvando === adminEditando.user_id}
                className="bg-[#6be12f] hover:bg-[#8cf059] disabled:opacity-50 text-black font-extrabold py-3.5 rounded-2xl text-sm flex items-center justify-center gap-2 transition-all"
              >
                <Save size={16} />
                {salvando === adminEditando.user_id ? 'Salvando...' : 'Salvar permissões'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .animate-fade-in-up {
          animation: fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          opacity: 0;
        }

        .custom-modal-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-modal-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-modal-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.12); border-radius: 999px; }
        .custom-modal-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.22); }
      `}} />
    </>
  )
}

function PresetButton({ icon: Icon, label, onClick, danger = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-3 rounded-2xl text-xs font-extrabold border flex items-center justify-center gap-2 transition-all ${
        danger
          ? 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/15'
          : 'bg-[#050505] text-neutral-400 border-white/[0.06] hover:text-white hover:bg-white/[0.04]'
      }`}
    >
      <Icon size={14} />
      {label}
    </button>
  )
}