'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { Package, Plus, Pencil, Trash2, X, Check, Star, Users, RefreshCw } from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const intervalos = ['diario', 'semanal', 'mensal']

export default function Planos() {
  const [planos, setPlanos] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [modalAberto, setModalAberto] = useState(false)
  const [planoSelecionado, setPlanoSelecionado] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [salvando, setSalvando] = useState(false)
  const [form, setForm] = useState({
    nome: '', preco: '', max_criativos: '', max_pontos: '', intervalo_relatorio: 'mensal'
  })

  useEffect(() => { buscarDados() }, [])

  async function buscarDados() {
    setCarregando(true)
    const { data } = await supabase.from('planos').select('*').order('preco', { ascending: true })
    setPlanos(data || [])
    setCarregando(false)
  }

  function abrirModal(plano = null) {
    if (plano) {
      setPlanoSelecionado(plano)
      setForm({
        nome: plano.nome || '',
        preco: plano.preco || '',
        max_criativos: plano.max_criativos || '',
        max_pontos: plano.max_pontos || '',
        intervalo_relatorio: plano.intervalo_relatorio || 'mensal'
      })
    } else {
      setPlanoSelecionado(null)
      setForm({ nome: '', preco: '', max_criativos: '', max_pontos: '', intervalo_relatorio: 'mensal' })
    }
    setModalAberto(true)
  }

  function fecharModal() {
    setModalAberto(false)
    setPlanoSelecionado(null)
  }

  async function salvarPlano() {
    if (!form.nome.trim() || !form.preco) return
    setSalvando(true)

    const payload = {
      ...form,
      preco: parseFloat(form.preco),
      max_criativos: parseInt(form.max_criativos) || 0,
      max_pontos: parseInt(form.max_pontos) || 0
    }

    if (planoSelecionado) {
      await supabase.from('planos').update(payload).eq('id', planoSelecionado.id)
      toast.success('Plano atualizado com sucesso!')
    } else {
      await supabase.from('planos').insert([payload])
      toast.success('Plano criado com sucesso!')
    }

    await buscarDados()
    setSalvando(false)
    fecharModal()
  }

  async function excluirPlano(id) {
    await supabase.from('planos').delete().eq('id', id)
    toast.success('Plano excluído!')
    setConfirmDelete(null)
    await buscarDados()
  }

  return (
    <>
      <Toaster 
        position="top-right" 
        toastOptions={{ 
          style: { background: '#0a0a0a', color: '#fff', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)' },
          success: { iconTheme: { primary: '#22c55e', secondary: '#0a0a0a' } },
          error: { iconTheme: { primary: '#ef4444', secondary: '#0a0a0a' } }
        }} 
      />

      <div className="relative z-10 px-4 sm:px-6 md:px-8 pb-12 animate-fade-in-up">

        {/* Header e Controles */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div>
            <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-neutral-500 tracking-tight flex items-center gap-3">
              <div className="p-2.5 bg-green-500/10 rounded-2xl border border-green-500/20">
                <Package className="text-green-500" size={24} />
              </div>
              Planos
            </h1>
            <p className="text-sm text-neutral-500 mt-2 font-medium">Gerencie os pacotes de assinatura do sistema</p>
          </div>

          <button
            onClick={() => abrirModal()}
            className="w-full sm:w-auto bg-green-500 hover:bg-green-400 text-black font-bold py-3.5 px-6 rounded-2xl text-sm transition-all duration-300 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(34,197,94,0.2)] hover:shadow-[0_0_30px_rgba(34,197,94,0.4)] hover:-translate-y-1"
          >
            <Plus size={18} strokeWidth={2.5} />
            Novo Plano
          </button>
        </div>

        {carregando ? (
          <div className="flex justify-center items-center py-32">
            <div className="relative w-16 h-16 flex items-center justify-center">
              <div className="absolute inset-0 border-t-2 border-green-500/50 rounded-full animate-spin"></div>
              <Package className="text-green-500 animate-pulse" size={24} />
            </div>
          </div>
        ) : planos.length === 0 ? (
          <div className="bg-white/[0.02] border border-white/[0.05] rounded-[2.5rem] py-24 text-center flex flex-col items-center justify-center backdrop-blur-xl shadow-2xl">
            <div className="w-20 h-20 bg-white/[0.02] rounded-full flex items-center justify-center mb-6 border border-white/[0.05]">
              <Package size={32} className="text-neutral-600" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2 tracking-tight">Nenhum plano cadastrado</h3>
            <p className="text-sm text-neutral-500 mb-8 max-w-md mx-auto">Crie seu primeiro pacote de assinatura para começar a vender seus serviços.</p>
            <button onClick={() => abrirModal()} className="bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.05] text-white font-bold py-3 px-6 rounded-2xl text-sm transition-all duration-300 flex items-center gap-2">
              <Plus size={18} /> Criar Primeiro Plano
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {planos.map((plano, index) => (
              <div 
                key={plano.id} 
                className="bg-[#0a0a0a] border border-white/[0.05] rounded-[2rem] p-8 hover:border-white/[0.1] hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(0,0,0,0.4)] transition-all duration-500 group flex flex-col relative overflow-hidden animate-fade-in-up"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                {/* Efeito de luz sutil no hover */}
                <div className="absolute -right-10 -top-10 w-32 h-32 bg-green-500/10 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"></div>

                <div className="flex items-start justify-between mb-8 relative z-10">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-[#050505] border border-white/[0.05] flex items-center justify-center text-neutral-400 group-hover:text-green-500 group-hover:border-green-500/30 transition-all duration-300 shadow-inner">
                      <Package size={24} />
                    </div>
                    <h3 className="text-xl font-bold text-white tracking-tight">{plano.nome}</h3>
                  </div>

                  {/* Ações ocultas que aparecem no hover */}
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <button
                      onClick={() => abrirModal(plano)}
                      className="w-9 h-9 rounded-xl bg-[#050505] border border-white/[0.05] hover:border-white/[0.1] hover:text-white text-neutral-500 flex items-center justify-center transition-all shadow-inner"
                      title="Editar"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => setConfirmDelete(plano.id)}
                      className="w-9 h-9 rounded-xl bg-[#050505] border border-white/[0.05] hover:border-red-500/30 hover:text-red-400 text-neutral-500 flex items-center justify-center transition-all shadow-inner"
                      title="Excluir"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <div className="mb-8 relative z-10">
                  <p className="text-5xl font-extrabold text-white tracking-tighter">
                    <span className="text-2xl text-neutral-500 font-bold mr-1">R$</span>
                    {Number(plano.preco).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-neutral-500 mt-2 uppercase tracking-widest font-bold">por mês</p>
                </div>

                <div className="space-y-4 pt-6 border-t border-white/[0.05] mt-auto relative z-10">
                  <div className="flex items-center justify-between group/item">
                    <div className="flex items-center gap-3 text-neutral-500 group-hover/item:text-neutral-300 transition-colors">
                      <Star size={16} className="text-neutral-600 group-hover/item:text-green-500 transition-colors" />
                      <span className="text-sm font-medium">Máx. criativos</span>
                    </div>
                    <span className="text-sm font-bold text-white">{plano.max_criativos}</span>
                  </div>
                  <div className="flex items-center justify-between group/item">
                    <div className="flex items-center gap-3 text-neutral-500 group-hover/item:text-neutral-300 transition-colors">
                      <Users size={16} className="text-neutral-600 group-hover/item:text-green-500 transition-colors" />
                      <span className="text-sm font-medium">Máx. pontos</span>
                    </div>
                    <span className="text-sm font-bold text-white">
                      {plano.max_pontos >= 999 ? 'Ilimitado' : plano.max_pontos}
                    </span>
                  </div>
                  <div className="flex items-center justify-between group/item">
                    <div className="flex items-center gap-3 text-neutral-500 group-hover/item:text-neutral-300 transition-colors">
                      <RefreshCw size={16} className="text-neutral-600 group-hover/item:text-green-500 transition-colors" />
                      <span className="text-sm font-medium">Relatório</span>
                    </div>
                    <span className="text-sm font-bold text-white capitalize">{plano.intervalo_relatorio}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de Criação/Edição Premium (Estilo da Imagem) */}
      {modalAberto && (
        <div className="fixed inset-0 bg-[#050505]/80 backdrop-blur-2xl flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
          <div className="bg-[#0a0a0a] border border-white/[0.05] rounded-[2.5rem] w-full max-w-md shadow-[0_20px_40px_rgba(0,0,0,0.5)] flex flex-col max-h-[90vh]">

            <div className="flex items-center justify-between p-8 border-b border-white/[0.05] flex-shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-white/[0.02] flex items-center justify-center border border-white/[0.05]">
                  <Package size={18} className="text-neutral-400" />
                </div>
                <h2 className="text-2xl font-bold text-white tracking-tight">
                  {planoSelecionado ? 'Editar Plano' : 'Novo Plano'}
                </h2>
              </div>
              <button onClick={fecharModal} className="p-2.5 text-neutral-500 hover:text-white hover:bg-white/[0.05] rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-8 space-y-6 overflow-y-auto custom-scrollbar">
              <div>
                <label className="block text-xs font-bold text-neutral-500 mb-3 uppercase tracking-widest">Nome do Plano *</label>
                <input
                  type="text"
                  placeholder="Ex: Dominância"
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  className="w-full bg-[#050505] border border-white/[0.05] rounded-2xl px-5 py-4 text-sm text-white placeholder-neutral-600 focus:outline-none focus:ring-1 focus:ring-green-500/30 focus:border-green-500/30 transition-all shadow-inner"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-500 mb-3 uppercase tracking-widest">Preço (R$) *</label>
                <div className="relative group/input">
                  <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                    <span className="text-neutral-500 text-sm font-bold group-focus-within/input:text-green-500 transition-colors">R$</span>
                  </div>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={form.preco}
                    onChange={(e) => setForm({ ...form, preco: e.target.value })}
                    className="w-full bg-[#050505] border border-white/[0.05] rounded-2xl pl-12 pr-5 py-4 text-sm text-white placeholder-neutral-600 focus:outline-none focus:ring-1 focus:ring-green-500/30 focus:border-green-500/30 transition-all shadow-inner"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-neutral-500 mb-3 uppercase tracking-widest">Máx. Criativos</label>
                  <input
                    type="number"
                    placeholder="Ex: 3"
                    value={form.max_criativos}
                    onChange={(e) => setForm({ ...form, max_criativos: e.target.value })}
                    className="w-full bg-[#050505] border border-white/[0.05] rounded-2xl px-5 py-4 text-sm text-white placeholder-neutral-600 focus:outline-none focus:ring-1 focus:ring-green-500/30 focus:border-green-500/30 transition-all shadow-inner"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-neutral-500 mb-3 uppercase tracking-widest">Máx. Pontos</label>
                  <input
                    type="number"
                    placeholder="Ex: 999"
                    value={form.max_pontos}
                    onChange={(e) => setForm({ ...form, max_pontos: e.target.value })}
                    className="w-full bg-[#050505] border border-white/[0.05] rounded-2xl px-5 py-4 text-sm text-white placeholder-neutral-600 focus:outline-none focus:ring-1 focus:ring-green-500/30 focus:border-green-500/30 transition-all shadow-inner"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-500 mb-3 uppercase tracking-widest">Intervalo do Relatório</label>
                <div className="relative group/select">
                  <select
                    value={form.intervalo_relatorio}
                    onChange={(e) => setForm({ ...form, intervalo_relatorio: e.target.value })}
                    className="w-full bg-[#050505] border border-white/[0.05] rounded-2xl px-5 py-4 text-sm text-white focus:outline-none focus:ring-1 focus:ring-green-500/30 focus:border-green-500/30 transition-all cursor-pointer appearance-none pr-12 capitalize shadow-inner"
                  >
                    {intervalos.map((i) => <option key={i} value={i} className="bg-[#050505]">{i}</option>)}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-5 text-neutral-600 group-hover/select:text-green-500 transition-colors">
                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-4 p-8 border-t border-white/[0.05] bg-white/[0.01] rounded-b-[2.5rem] flex-shrink-0">
              <button
                onClick={fecharModal}
                className="flex-1 py-4 rounded-2xl font-bold text-sm text-neutral-500 hover:text-white bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.05] transition-all duration-300"
              >
                Cancelar
              </button>
              <button
                onClick={salvarPlano}
                disabled={salvando || !form.nome.trim() || !form.preco}
                className="flex-1 bg-green-500 hover:bg-green-400 disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold py-4 rounded-2xl text-sm transition-all duration-300 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(34,197,94,0.2)] hover:shadow-[0_0_30px_rgba(34,197,94,0.4)] hover:-translate-y-1"
              >
                {salvando ? (
                  <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                ) : (
                  <><Check size={18} strokeWidth={2.5} /> {planoSelecionado ? 'Salvar' : 'Cadastrar'}</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão Premium */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-[#050505]/80 backdrop-blur-2xl flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
          <div className="bg-[#0a0a0a] border border-white/[0.05] rounded-[2.5rem] w-full max-w-md p-8 text-center shadow-[0_20px_40px_rgba(0,0,0,0.5)]">
            <div className="w-20 h-20 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(239,68,68,0.15)]">
              <Trash2 size={32} className="text-red-500" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-3 tracking-tight">Excluir plano?</h2>
            <p className="text-sm text-neutral-500 mb-8 leading-relaxed">Esta ação não pode ser desfeita. Clientes vinculados a este plano podem ser afetados.</p>
            <div className="flex gap-4">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 py-4 rounded-2xl font-bold text-sm text-neutral-500 hover:text-white bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.05] transition-all duration-300"
              >
                Cancelar
              </button>
              <button
                onClick={() => excluirPlano(confirmDelete)}
                className="flex-1 bg-red-500 hover:bg-red-400 text-white font-bold py-4 rounded-2xl text-sm transition-all duration-300 shadow-[0_0_20px_rgba(239,68,68,0.2)] hover:shadow-[0_0_30px_rgba(239,68,68,0.4)] hover:-translate-y-1"
              >
                Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Estilo para a barra de rolagem do modal */}
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
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