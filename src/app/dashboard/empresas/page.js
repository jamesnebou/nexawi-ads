'use client'

import { useEffect, useState } from 'react'
import { createClient as createBrowserSupabaseClient } from '@/lib/supabase/admin-client'
import { Building2, RefreshCw, Users, Wifi, Router, Megaphone } from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'

const supabase = createBrowserSupabaseClient()

async function adminApiFetch(path) {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession()

  if (sessionError || !sessionData?.session?.access_token) {
    throw new Error('Sessão administrativa não encontrada.')
  }

  const response = await fetch(path, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${sessionData.session.access_token}`,
    },
    cache: 'no-store',
  })

  const text = await response.text()
  const data = text ? JSON.parse(text) : null

  if (!response.ok) {
    throw new Error(data?.error || 'Erro ao carregar empresas.')
  }

  return data
}

function formatNumber(value) {
  return new Intl.NumberFormat('pt-BR').format(Number(value || 0))
}

export default function EmpresasPage() {
  const [empresas, setEmpresas] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    carregar()
  }, [])

  async function carregar() {
    setLoading(true)

    try {
      const data = await adminApiFetch('/api/admin/empresas')
      setEmpresas(data.empresas || [])
    } catch (error) {
      console.error('Erro ao carregar empresas:', error)
      toast.error(error.message || 'Erro ao carregar empresas.')
    } finally {
      setLoading(false)
    }
  }

  const resumo = empresas.reduce((acc, empresa) => {
    acc.usuarios += empresa.usuarios?.length || 0
    acc.hotspots += empresa.resumo?.hotspots || 0
    acc.mikrotiks += empresa.resumo?.mikrotiks || 0
    acc.anuncios += empresa.resumo?.anuncios || 0
    return acc
  }, { usuarios: 0, hotspots: 0, mikrotiks: 0, anuncios: 0 })

  return (
    <>
      <Toaster position="top-right" />
      <div className="relative z-10 px-4 sm:px-6 md:px-8 pb-12 animate-fade-in-up">
        <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-10">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#6be12f]/20 bg-[#6be12f]/10 px-4 py-2 text-[11px] font-extrabold uppercase tracking-widest text-[#8cf059] mb-4">
              <Building2 size={13} />
              Sprint 5 — Multiempresa
            </div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
              Empresas e escopo multiempresa
            </h1>
            <p className="text-sm text-neutral-500 mt-2 max-w-2xl">
              Base inicial para empresas/clientes, usuários por empresa, hotspots, MikroTiks e permissões por papel.
            </p>
          </div>

          <button onClick={carregar} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#6be12f] px-5 py-4 text-sm font-extrabold text-black hover:bg-[#8cf059]">
            <RefreshCw size={17} />
            Atualizar
          </button>
        </header>

        <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-5 mb-8">
          <Kpi icon={Building2} label="Empresas" value={empresas.length} />
          <Kpi icon={Users} label="Usuários" value={resumo.usuarios} />
          <Kpi icon={Wifi} label="Hotspots" value={resumo.hotspots} />
          <Kpi icon={Router} label="MikroTiks" value={resumo.mikrotiks} />
          <Kpi icon={Megaphone} label="Anúncios" value={resumo.anuncios} />
        </section>

        <section className="rounded-[2rem] border border-white/[0.05] bg-white/[0.02] p-5 sm:p-6">
          {loading ? (
            <div className="py-24 flex items-center justify-center"><div className="w-14 h-14 rounded-full border-t-2 border-[#6be12f]/60 animate-spin" /></div>
          ) : empresas.length === 0 ? (
            <div className="rounded-3xl border border-white/[0.05] bg-[#050505] p-12 text-center">
              <Building2 size={34} className="mx-auto text-neutral-600 mb-4" />
              <h3 className="text-lg font-bold text-white">Nenhuma empresa encontrada</h3>
              <p className="text-sm text-neutral-500 mt-2">A migração criou a estrutura. Cadastros novos podem ser feitos via API multiempresa.</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {empresas.map((empresa) => (
                <div key={empresa.id} className="rounded-3xl border border-white/[0.05] bg-[#050505] p-5">
                  <div className="grid grid-cols-1 xl:grid-cols-[1.4fr_1fr_1fr] gap-5 items-start">
                    <div>
                      <span className="inline-flex rounded-full border border-[#6be12f]/20 bg-[#6be12f]/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-[#8cf059] mb-3">
                        {empresa.status || 'ativo'}
                      </span>
                      <h3 className="text-lg font-black text-white">{empresa.nome_empresa}</h3>
                      <p className="text-sm text-neutral-500 mt-1">{empresa.nome_responsavel || 'Responsável não informado'}</p>
                      <p className="text-xs text-neutral-600 mt-2">{empresa.email || 'Sem e-mail'} · {empresa.telefone || 'Sem telefone'}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <Mini label="Hotspots" value={empresa.resumo?.hotspots} />
                      <Mini label="MikroTiks" value={empresa.resumo?.mikrotiks} />
                      <Mini label="Anúncios" value={empresa.resumo?.anuncios} />
                      <Mini label="Leads" value={empresa.resumo?.leads} />
                    </div>

                    <div>
                      <p className="text-[10px] uppercase tracking-widest font-extrabold text-neutral-600 mb-3">Usuários</p>
                      <div className="grid gap-2">
                        {(empresa.usuarios || []).slice(0, 4).map((usuario) => (
                          <div key={usuario.id} className="rounded-2xl border border-white/[0.05] bg-black/20 p-3">
                            <p className="text-xs font-black text-white truncate">{usuario.nome || usuario.email}</p>
                            <p className="text-[11px] text-neutral-500 truncate">{usuario.email} · {usuario.role}</p>
                          </div>
                        ))}
                        {(empresa.usuarios || []).length === 0 && <p className="text-xs text-neutral-600">Nenhum usuário vinculado.</p>}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </>
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
