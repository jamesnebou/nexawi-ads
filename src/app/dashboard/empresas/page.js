'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { createClient as createBrowserSupabaseClient } from '@/lib/supabase/admin-client'
import {
  Building2,
  Edit3,
  FileText,
  Megaphone,
  RefreshCw,
  Router,
  Save,
  Search,
  UserPlus,
  Users,
  Wifi,
  X,
} from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'

const supabase = createBrowserSupabaseClient()

const emptyEmpresa = {
  nome_empresa: '',
  nome_responsavel: '',
  email: '',
  telefone: '',
  cpf_cnpj: '',
  cidade: '',
  estado: '',
  endereco: '',
  status: 'ativo',
  plano_id: '',
}

const emptyUsuario = {
  empresa_id: '',
  nome: '',
  email: '',
  role: 'viewer',
  active: true,
}

const statusOptions = [
  { value: '', label: 'Todos' },
  { value: 'prospect', label: 'Prospect' },
  { value: 'ativo', label: 'Ativo' },
  { value: 'pausado', label: 'Pausado' },
  { value: 'cancelado', label: 'Cancelado' },
  { value: 'inativo', label: 'Inativo' },
]

const roleOptions = [
  { value: 'owner', label: 'Owner' },
  { value: 'admin', label: 'Admin' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'financeiro', label: 'Financeiro' },
  { value: 'viewer', label: 'Viewer' },
]

async function adminApiFetch(path, { method = 'GET', body } = {}) {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession()

  if (sessionError || !sessionData?.session?.access_token) {
    throw new Error('Sessão administrativa não encontrada.')
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
  const data = text ? JSON.parse(text) : null

  if (!response.ok) {
    throw new Error(data?.error || 'Erro na API administrativa.')
  }

  return data
}

function formatNumber(value) {
  return new Intl.NumberFormat('pt-BR').format(Number(value || 0))
}

function roleLabel(role) {
  return roleOptions.find((item) => item.value === role)?.label || role || 'Viewer'
}

function planoLabel(plano) {
  if (!plano) return 'Sem plano definido'
  const max = Number(plano.max_criativos || 0)
  return `${plano.nome}${max ? ` · ${max} criativo${max > 1 ? 's' : ''}` : ''}`
}

export default function EmpresasPage() {
  const [empresas, setEmpresas] = useState([])
  const [permissions, setPermissions] = useState({})
  const [planos, setPlanos] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [busca, setBusca] = useState('')
  const [status, setStatus] = useState('')
  const [editingId, setEditingId] = useState('')
  const [empresaForm, setEmpresaForm] = useState(emptyEmpresa)
  const [usuarioForm, setUsuarioForm] = useState(emptyUsuario)
  const editorRef = useRef(null)

  const canCreate = permissions.create !== false
  const canUpdate = permissions.update !== false
  const canManageUsers = permissions.manage_users !== false

  const resumo = useMemo(() => {
    return empresas.reduce((acc, empresa) => {
      acc.usuarios += empresa.usuarios?.length || 0
      acc.hotspots += empresa.resumo?.hotspots || 0
      acc.mikrotiks += empresa.resumo?.mikrotiks || 0
      acc.anuncios += empresa.resumo?.anuncios || 0
      acc.leads += empresa.resumo?.leads || 0
      return acc
    }, { usuarios: 0, hotspots: 0, mikrotiks: 0, anuncios: 0, leads: 0 })
  }, [empresas])

  useEffect(() => {
    carregar()
  }, [status])

  useEffect(() => {
    if (!editingId || !editorRef.current) return
    window.setTimeout(() => {
      editorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 80)
  }, [editingId])

  async function carregar() {
    setLoading(true)

    try {
      const params = new URLSearchParams()
      if (status) params.set('status', status)
      if (busca.trim()) params.set('busca', busca.trim())

      const data = await adminApiFetch(`/api/admin/empresas?${params.toString()}`)
      setEmpresas(data.empresas || [])
      setPermissions(data.permissions || {})
      setPlanos(data.options?.planos || [])
    } catch (error) {
      console.error('Erro ao carregar empresas:', error)
      toast.error(error.message || 'Erro ao carregar empresas.')
    } finally {
      setLoading(false)
    }
  }

  function abrirNovaEmpresa() {
    setEditingId('nova')
    setEmpresaForm(emptyEmpresa)
  }

  function editarEmpresa(empresa) {
    setEditingId(empresa.id)
    setEmpresaForm({
      nome_empresa: empresa.nome_empresa || '',
      nome_responsavel: empresa.nome_responsavel || '',
      email: empresa.email || '',
      telefone: empresa.telefone || '',
      cpf_cnpj: empresa.cpf_cnpj || '',
      cidade: empresa.cidade || '',
      estado: empresa.estado || '',
      endereco: empresa.endereco || '',
      status: empresa.status || 'ativo',
      plano_id: empresa.plano_id || '',
    })
  }

  function fecharEditor() {
    setEditingId('')
    setEmpresaForm(emptyEmpresa)
  }

  async function salvarEmpresa(event) {
    event.preventDefault()

    if (editingId === 'nova' && !canCreate) {
      toast.error('Você não tem permissão para criar empresas.')
      return
    }

    if (editingId !== 'nova' && !canUpdate) {
      toast.error('Você não tem permissão para editar empresas.')
      return
    }

    if (!empresaForm.nome_empresa.trim()) {
      toast.error('Informe o nome da empresa.')
      return
    }

    setSaving(true)

    try {
      await adminApiFetch('/api/admin/empresas', {
        method: editingId === 'nova' ? 'POST' : 'PATCH',
        body: {
          id: editingId === 'nova' ? undefined : editingId,
          ...empresaForm,
        },
      })

      toast.success(editingId === 'nova' ? 'Empresa criada.' : 'Empresa atualizada.')
      fecharEditor()
      await carregar()
    } catch (error) {
      console.error('Erro ao salvar empresa:', error)
      toast.error(error.message || 'Erro ao salvar empresa.')
    } finally {
      setSaving(false)
    }
  }

  async function adicionarUsuario(event) {
    event.preventDefault()

    if (!canManageUsers) {
      toast.error('Você não tem permissão para gerenciar usuários por empresa.')
      return
    }

    if (!usuarioForm.empresa_id || !usuarioForm.email.trim()) {
      toast.error('Selecione a empresa e informe o e-mail do usuário.')
      return
    }

    setSaving(true)

    try {
      await adminApiFetch('/api/admin/empresas', {
        method: 'POST',
        body: {
          action: 'add_user',
          ...usuarioForm,
        },
      })

      toast.success('Usuário vinculado à empresa.')
      setUsuarioForm(emptyUsuario)
      await carregar()
    } catch (error) {
      console.error('Erro ao vincular usuário:', error)
      toast.error(error.message || 'Erro ao vincular usuário.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <Toaster position="top-right" />
      <div className="relative z-10 px-4 sm:px-6 md:px-8 pb-12 animate-fade-in-up">
        <header className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 mb-10">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#6be12f]/20 bg-[#6be12f]/10 px-4 py-2 text-[11px] font-extrabold uppercase tracking-widest text-[#8cf059] mb-4">
              <Building2 size={13} />
              Sprint 5 — Multiempresa
            </div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
              Empresas e usuários por cliente
            </h1>
            <p className="text-sm text-neutral-500 mt-2 max-w-2xl">
              Crie empresas, vincule usuários, acompanhe hotspots, MikroTiks, anúncios e leads por tenant.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            {canCreate && (
              <button onClick={abrirNovaEmpresa} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/[0.06] bg-white/[0.03] px-5 py-4 text-sm font-extrabold text-white hover:bg-white/[0.06]">
                <Building2 size={17} />
                Nova empresa
              </button>
            )}
            <button onClick={carregar} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#6be12f] px-5 py-4 text-sm font-extrabold text-black hover:bg-[#8cf059]">
              <RefreshCw size={17} />
              Atualizar
            </button>
          </div>
        </header>

        <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-5 mb-8">
          <Kpi icon={Building2} label="Empresas" value={empresas.length} />
          <Kpi icon={Users} label="Usuários" value={resumo.usuarios} />
          <Kpi icon={Wifi} label="Hotspots" value={resumo.hotspots} />
          <Kpi icon={Router} label="MikroTiks" value={resumo.mikrotiks} />
          <Kpi icon={Megaphone} label="Anúncios" value={resumo.anuncios} />
          <Kpi icon={UserPlus} label="Leads" value={resumo.leads} />
        </section>

        <section className="rounded-[2rem] border border-white/[0.05] bg-white/[0.02] p-5 sm:p-6 mb-8">
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_1fr_auto] gap-4 items-end">
            <label>
              <span className="text-[11px] uppercase tracking-widest font-extrabold text-neutral-500 mb-2 flex items-center gap-2">
                <Search size={13} className="text-[#6be12f]" />
                Buscar
              </span>
              <input
                value={busca}
                onChange={(event) => setBusca(event.target.value)}
                onKeyDown={(event) => { if (event.key === 'Enter') carregar() }}
                placeholder="Empresa, responsável, e-mail, telefone ou cidade..."
                className="w-full bg-[#0a0a0a] border border-white/[0.05] text-white text-sm font-medium rounded-2xl block px-5 py-3.5 outline-none"
              />
            </label>

            <label>
              <span className="text-[11px] uppercase tracking-widest font-extrabold text-neutral-500 mb-2 block">Status</span>
              <select value={status} onChange={(event) => setStatus(event.target.value)} className="w-full bg-[#0a0a0a] border border-white/[0.05] text-white text-sm font-medium rounded-2xl block px-5 py-3.5 outline-none">
                {statusOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
            </label>

            <button onClick={carregar} className="rounded-2xl border border-white/[0.06] bg-white/[0.03] px-5 py-3.5 text-sm font-bold text-white hover:bg-white/[0.06]">
              Filtrar
            </button>
          </div>
        </section>

        {editingId && (
          <div ref={editorRef}>
            <EmpresaForm
            form={empresaForm}
            setForm={setEmpresaForm}
            onSubmit={salvarEmpresa}
            onClose={fecharEditor}
            saving={saving}
            title={editingId === 'nova' ? 'Nova empresa' : 'Editar empresa'}
            planos={planos}
          />
          </div>
        )}

        {canManageUsers && empresas.length > 0 && (
          <section className="rounded-[2rem] border border-[#6be12f]/15 bg-[#6be12f]/5 p-5 sm:p-6 mb-8">
            <div className="flex items-center gap-3 mb-5">
              <UserPlus className="text-[#8cf059]" size={20} />
              <div>
                <h2 className="text-xl font-black text-white tracking-tight">Vincular usuário a empresa</h2>
                <p className="text-sm text-neutral-500">Defina o papel do usuário dentro da empresa selecionada.</p>
              </div>
            </div>
            <form onSubmit={adicionarUsuario} className="grid grid-cols-1 lg:grid-cols-5 gap-4 items-end">
              <FieldSelect label="Empresa" value={usuarioForm.empresa_id} onChange={(value) => setUsuarioForm((current) => ({ ...current, empresa_id: value }))} options={[{ value: '', label: 'Selecione' }, ...empresas.map((empresa) => ({ value: empresa.id, label: empresa.nome_empresa }))]} />
              <FieldInput label="Nome" value={usuarioForm.nome} onChange={(value) => setUsuarioForm((current) => ({ ...current, nome: value }))} placeholder="Nome do usuário" />
              <FieldInput label="E-mail" type="email" value={usuarioForm.email} onChange={(value) => setUsuarioForm((current) => ({ ...current, email: value }))} placeholder="usuario@empresa.com" />
              <FieldSelect label="Papel" value={usuarioForm.role} onChange={(value) => setUsuarioForm((current) => ({ ...current, role: value }))} options={roleOptions} />
              <button disabled={saving} className="rounded-2xl bg-[#6be12f] px-5 py-3.5 text-sm font-black text-black hover:bg-[#8cf059] disabled:opacity-60 flex items-center justify-center gap-2">
                <UserPlus size={16} />
                Vincular
              </button>
            </form>
          </section>
        )}

        <section className="rounded-[2rem] border border-white/[0.05] bg-white/[0.02] p-5 sm:p-6">
          {loading ? (
            <div className="py-24 flex items-center justify-center"><div className="w-14 h-14 rounded-full border-t-2 border-[#6be12f]/60 animate-spin" /></div>
          ) : empresas.length === 0 ? (
            <div className="rounded-3xl border border-white/[0.05] bg-[#050505] p-12 text-center">
              <Building2 size={34} className="mx-auto text-neutral-600 mb-4" />
              <h3 className="text-lg font-bold text-white">Nenhuma empresa encontrada</h3>
              <p className="text-sm text-neutral-500 mt-2">Crie uma empresa ou ajuste os filtros aplicados.</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {empresas.map((empresa) => (
                <EmpresaCard key={empresa.id} empresa={empresa} canUpdate={canUpdate} onEdit={() => editarEmpresa(empresa)} />
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  )
}

function EmpresaForm({ title, form, setForm, onSubmit, onClose, saving, planos = [] }) {
  return (
    <section className="rounded-[2rem] border border-[#6be12f]/15 bg-[#6be12f]/5 p-5 sm:p-6 mb-8">
      <div className="flex items-center justify-between gap-4 mb-5">
        <div>
          <h2 className="text-xl font-black text-white tracking-tight">{title}</h2>
          <p className="text-sm text-neutral-500">Dados principais da empresa/tenant.</p>
        </div>
        <button onClick={onClose} className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-3 text-white hover:bg-white/[0.06]" type="button">
          <X size={16} />
        </button>
      </div>

      <form onSubmit={onSubmit} className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <FieldInput label="Empresa" value={form.nome_empresa} onChange={(value) => setForm((current) => ({ ...current, nome_empresa: value }))} />
        <FieldInput label="Responsável" value={form.nome_responsavel} onChange={(value) => setForm((current) => ({ ...current, nome_responsavel: value }))} />
        <FieldInput label="E-mail" type="email" value={form.email} onChange={(value) => setForm((current) => ({ ...current, email: value }))} />
        <FieldInput label="Telefone" value={form.telefone} onChange={(value) => setForm((current) => ({ ...current, telefone: value }))} />
        <FieldSelect label="Plano" value={form.plano_id} onChange={(value) => setForm((current) => ({ ...current, plano_id: value }))} options={[{ value: '', label: 'Sem plano definido' }, ...planos.map((plano) => ({ value: plano.id, label: planoLabel(plano) }))]} />
        <FieldInput label="CPF/CNPJ" value={form.cpf_cnpj} onChange={(value) => setForm((current) => ({ ...current, cpf_cnpj: value }))} />
        <FieldInput label="Cidade" value={form.cidade} onChange={(value) => setForm((current) => ({ ...current, cidade: value }))} />
        <FieldInput label="Estado" value={form.estado} onChange={(value) => setForm((current) => ({ ...current, estado: value }))} />
        <FieldSelect label="Status" value={form.status} onChange={(value) => setForm((current) => ({ ...current, status: value }))} options={statusOptions.filter((item) => item.value)} />
        <div className="lg:col-span-3">
          <FieldInput label="Endereço" value={form.endereco} onChange={(value) => setForm((current) => ({ ...current, endereco: value }))} />
        </div>
        <button disabled={saving} className="rounded-2xl bg-[#6be12f] px-5 py-3.5 text-sm font-black text-black hover:bg-[#8cf059] disabled:opacity-60 flex items-center justify-center gap-2 self-end">
          <Save size={16} />
          {saving ? 'Salvando...' : 'Salvar'}
        </button>
      </form>
    </section>
  )
}

function EmpresaCard({ empresa, canUpdate, onEdit }) {
  const resumo = empresa.resumo || {}

  return (
    <div className="rounded-3xl border border-white/[0.05] bg-[#050505] p-5">
      <div className="grid grid-cols-1 xl:grid-cols-[1.35fr_1fr_1fr_auto] gap-5 items-start">
        <div>
          <span className="inline-flex rounded-full border border-[#6be12f]/20 bg-[#6be12f]/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-[#8cf059] mb-3">
            {empresa.status || 'ativo'}
          </span>
          <h3 className="text-lg font-black text-white">{empresa.nome_empresa}</h3>
          <p className="text-sm text-neutral-500 mt-1">{empresa.nome_responsavel || 'Responsável não informado'}</p>
          <p className="text-xs text-neutral-600 mt-2">{empresa.email || 'Sem e-mail'} · {empresa.telefone || 'Sem telefone'}</p>
          <p className="text-xs text-neutral-600 mt-1">{empresa.cidade || 'Cidade não informada'} {empresa.estado ? `/${empresa.estado}` : ''}</p>
          <p className="mt-3 inline-flex rounded-full border border-white/[0.06] bg-white/[0.03] px-3 py-1 text-[11px] font-bold text-neutral-300">
            {planoLabel(empresa.planos)}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Mini label="Hotspots" value={resumo.hotspots} />
          <Mini label="MikroTiks" value={resumo.mikrotiks} />
          <Mini label="Anúncios" value={resumo.anuncios} />
          <Mini label="Leads" value={resumo.leads} />
        </div>

        <div>
          <p className="text-[10px] uppercase tracking-widest font-extrabold text-neutral-600 mb-3">Usuários</p>
          <div className="grid gap-2">
            {(empresa.usuarios || []).slice(0, 4).map((usuario) => (
              <div key={usuario.id} className="rounded-2xl border border-white/[0.05] bg-black/20 p-3">
                <p className="text-xs font-black text-white truncate">{usuario.nome || usuario.email}</p>
                <p className="text-[11px] text-neutral-500 truncate">{usuario.email} · {roleLabel(usuario.role)}</p>
              </div>
            ))}
            {(empresa.usuarios || []).length === 0 && <p className="text-xs text-neutral-600">Nenhum usuário vinculado.</p>}
          </div>
        </div>

        <div className="grid gap-2">
          <a href={`/dashboard/contratos/gerar?source=empresa&id=${empresa.id}`} className="rounded-2xl border border-[#6be12f]/20 bg-[#6be12f]/10 px-4 py-3 text-xs font-black text-[#8cf059] hover:bg-[#6be12f]/15 flex items-center justify-center gap-2">
            <FileText size={15} />
            Gerar contrato
          </a>

          {canUpdate && (
            <button type="button" onClick={onEdit} className="rounded-2xl border border-white/[0.06] bg-white/[0.03] px-4 py-3 text-xs font-black text-white hover:bg-white/[0.06] flex items-center justify-center gap-2">
              <Edit3 size={15} />
              Editar
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function Kpi({ icon: Icon, label, value }) {
  return (
    <div className="rounded-3xl border border-white/[0.05] bg-white/[0.02] p-6">
      <div className="flex items-center justify-between mb-6">
        <p className="text-[11px] uppercase tracking-widest font-extrabold text-neutral-500">{label}</p>
        <Icon size={18} className="text-[#8cf059]" />
      </div>
      <p className="text-4xl font-light text-white">{formatNumber(value)}</p>
    </div>
  )
}

function Mini({ label, value }) {
  return (
    <div className="rounded-2xl border border-white/[0.05] bg-black/20 p-3">
      <p className="text-[10px] uppercase tracking-widest font-extrabold text-neutral-600">{label}</p>
      <p className="text-lg font-black text-white mt-1">{formatNumber(value)}</p>
    </div>
  )
}

function FieldInput({ label, value, onChange, placeholder = '', type = 'text' }) {
  return (
    <label>
      <span className="text-[11px] uppercase tracking-widest font-extrabold text-neutral-500 mb-2 block">{label}</span>
      <input type={type} value={value || ''} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="w-full bg-[#0a0a0a] border border-white/[0.05] text-white text-sm font-medium rounded-2xl block px-5 py-3.5 outline-none" />
    </label>
  )
}

function FieldSelect({ label, value, onChange, options }) {
  return (
    <label>
      <span className="text-[11px] uppercase tracking-widest font-extrabold text-neutral-500 mb-2 block">{label}</span>
      <select value={value || ''} onChange={(event) => onChange(event.target.value)} className="w-full bg-[#0a0a0a] border border-white/[0.05] text-white text-sm font-medium rounded-2xl block px-5 py-3.5 outline-none">
        {options.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
      </select>
    </label>
  )
}
