'use client'

import { useEffect, useState } from 'react'
import { createClient as createBrowserSupabaseClient } from '@/lib/supabase/client'
import { Search, Plus, Pencil, Trash2, X, Check, Building, User, Users, Mail, Phone, MapPin, CreditCard, Briefcase } from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'

// Cliente Supabase usado apenas para pegar a sessão do admin logado.
// As operações sensíveis agora passam por /api/admin/clientes.
const supabase = createBrowserSupabaseClient()

const statusCores = {
  'Ativo': 'bg-[#6be12f]/10 text-[#8cf059] border border-[#6be12f]/20',
  'Inativo': 'bg-red-500/10 text-red-400 border border-red-500/20',
  'Inadimplente': 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20',
  'Cancelado': 'bg-white/[0.05] text-neutral-400 border border-white/[0.1]',
}

const statusOpcoes = ['Ativo', 'Inativo', 'Inadimplente', 'Cancelado']

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

export default function Clientes() {
  const [clientes, setClientes] = useState([])
  const [planos, setPlanos] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('Todos')
  const [modalAberto, setModalAberto] = useState(false)
  const [clienteSelecionado, setClienteSelecionado] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [salvando, setSalvando] = useState(false)

  // --- NOVOS STATES PARA O IBGE ---
  const [estadosIBGE, setEstadosIBGE] = useState([])
  const [cidadesIBGE, setCidadesIBGE] = useState([])

  const [form, setForm] = useState({
    nome: '', nome_empresa: '', nome_responsavel: '', email: '', telefone: '',
    cpf_cnpj: '', endereco: '', cidade: '', estado: '', plano_id: '', status: 'Ativo'
  })

  const [cpfCnpjError, setCpfCnpjError] = useState('')
  const [telefoneError, setTelefoneError] = useState('')
  const [nomeEmpresarioError, setNomeEmpresarioError] = useState('')
  const [nomeEmpresaError, setNomeEmpresaError] = useState('')
  const [nomeResponsavelError, setNomeResponsavelError] = useState('')

  // --- EFEITOS DO IBGE ---
  useEffect(() => {
    fetch("https://servicodados.ibge.gov.br/api/v1/localidades/estados?orderBy=nome")
      .then((res) => res.json())
      .then((dados) => setEstadosIBGE(dados))
      .catch(err => console.error("Erro ao buscar estados:", err));
  }, []);

  useEffect(() => {
    if (!form.estado) {
      setCidadesIBGE([]);
      return;
    }
    fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${form.estado}/municipios`)
      .then((res) => res.json())
      .then((dados) => setCidadesIBGE(dados))
      .catch(err => console.error("Erro ao buscar cidades:", err));
  }, [form.estado]);


  useEffect(() => {
    buscarDados()
  }, [busca, filtroStatus])

    async function buscarDados() {
    setCarregando(true)

    try {
      // Agora a aba Clientes não busca mais direto nas tabelas.
      // Ela chama a API protegida, que valida o admin e usa service_role no servidor.
      const params = new URLSearchParams()

      if (busca) params.set('busca', busca)
      if (filtroStatus) params.set('status', filtroStatus)

      const data = await adminApiFetch(`/api/admin/clientes?${params.toString()}`)

      setPlanos(data.planos || [])
      setClientes(data.clientes || [])
    } catch (error) {
      console.error('Erro ao buscar clientes:', error)
      toast.error(error.message || 'Erro ao carregar clientes.')
    } finally {
      setCarregando(false)
    }
  }

  const validarCpfCnpj = (valor) => {
    const numeros = valor.replace(/\D/g, '')
    if (numeros.length > 0 && numeros.length !== 11 && numeros.length !== 14) {
      return 'CPF deve ter 11 dígitos ou CNPJ 14 dígitos.'
    }
    return ''
  }

  const validarTelefone = (valor) => {
    const numeros = valor.replace(/\D/g, '')
    if (numeros.length > 0 && numeros.length < 10) {
      return 'Telefone inválido. Inclua o DDD.'
    }
    return ''
  }

  const validarNome = (valor, campo) => {
    if (valor.trim().length > 0 && valor.trim().length < 3) {
      return `${campo} deve ter pelo menos 3 caracteres.`
    }
    return ''
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    let newValue = value

    if (name === 'cpf_cnpj') {
      newValue = value.replace(/\D/g, '').slice(0, 14)
      setCpfCnpjError(validarCpfCnpj(newValue))
    } else if (name === 'telefone') {
      newValue = value.replace(/\D/g, '').slice(0, 11)
      setTelefoneError(validarTelefone(newValue))
    } else if (name === 'nome') {
      setNomeEmpresarioError(validarNome(newValue, 'Nome do empresário'))
    } else if (name === 'nome_empresa') {
      setNomeEmpresaError(validarNome(newValue, 'Nome da empresa'))
    } else if (name === 'nome_responsavel') {
      setNomeResponsavelError(validarNome(newValue, 'Nome do responsável'))
    }

    if (name === 'estado') {
      setForm({ ...form, [name]: newValue, cidade: '' })
    } else {
      setForm({ ...form, [name]: newValue })
    }
  }

  function abrirModal(cliente = null) {
    if (cliente) {
      setClienteSelecionado(cliente)
      setForm({
        nome: cliente.nome || '', nome_empresa: cliente.nome_empresa || '', nome_responsavel: cliente.nome_responsavel || '',
        email: cliente.email || '', telefone: cliente.telefone || '', cpf_cnpj: cliente.cpf_cnpj || '',
        endereco: cliente.endereco || '', cidade: cliente.cidade || '', estado: cliente.estado || '',
        plano_id: cliente.plano_id || '', status: cliente.status || 'Ativo'
      })
    } else {
      setClienteSelecionado(null)
      setForm({
        nome: '', nome_empresa: '', nome_responsavel: '', email: '', telefone: '',
        cpf_cnpj: '', endereco: '', cidade: '', estado: '', plano_id: '', status: 'Ativo'
      })
    }
    setCpfCnpjError('')
    setTelefoneError('')
    setNomeEmpresarioError('')
    setNomeEmpresaError('')
    setNomeResponsavelError('')
    setModalAberto(true)
  }

  function fecharModal() {
    setModalAberto(false)
    setClienteSelecionado(null)
  }

    async function salvarCliente() {
    if (cpfCnpjError || telefoneError || nomeEmpresarioError || nomeEmpresaError || nomeResponsavelError) {
      toast.error('Corrija os erros no formulário antes de salvar.')
      return
    }

    // E-mail agora continua obrigatório, mas a criação do usuário Auth
    // será feita no servidor, não mais pelo navegador.
    if (
      !form.nome.trim() ||
      !form.nome_empresa.trim() ||
      !form.nome_responsavel.trim() ||
      !form.telefone.trim() ||
      !form.cpf_cnpj.trim() ||
      !form.email.trim()
    ) {
      toast.error('Preencha todos os campos obrigatórios, incluindo o E-mail.')
      return
    }

    setSalvando(true)

    const dadosParaSalvar = {
      ...form,
      plano_id: form.plano_id || null,
    }

    try {
      if (clienteSelecionado) {
        // Atualização via API protegida.
        await adminApiFetch('/api/admin/clientes', {
          method: 'POST',
          body: {
            action: 'update',
            id: clienteSelecionado.id,
            cliente: dadosParaSalvar,
          },
        })

        toast.success('Cliente atualizado com sucesso!')
      } else {
        // Criação via API protegida.
        // A API cria o usuário no Supabase Auth e depois salva na tabela clientes.
        await adminApiFetch('/api/admin/clientes', {
          method: 'POST',
          body: {
            action: 'create',
            cliente: dadosParaSalvar,
          },
        })

        toast.success('Cliente cadastrado e acesso criado com sucesso!')
      }

      fecharModal()
      buscarDados()
    } catch (error) {
      console.error('Erro ao salvar:', error)
      toast.error(error.message || 'Erro ao salvar cliente.')
    } finally {
      setSalvando(false)
    }
  }

    async function excluirCliente(id) {
    try {
      // Exclusão via API protegida.
      // Não exclui o usuário do Supabase Auth por enquanto.
      // Se quiser, depois criamos vínculo cliente → auth_user_id para remover ambos.
      await adminApiFetch('/api/admin/clientes', {
        method: 'POST',
        body: {
          action: 'delete',
          id,
        },
      })

      toast.success('Cliente excluído com sucesso!')
      setConfirmDelete(null)
      buscarDados()
    } catch (error) {
      console.error('Erro ao excluir:', error)
      toast.error(error.message || 'Erro ao excluir cliente. Verifique se há dependências.')
    }
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
            <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-neutral-500 tracking-tight">Clientes</h1>
            <p className="text-sm text-neutral-500 mt-1.5 font-medium">Gerencie sua base de clientes e empresas</p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="relative w-full sm:w-72 group/input">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-600 group-focus-within/input:text-[#6be12f] transition-colors duration-300" />
              <input
                type="text"
                placeholder="Buscar cliente, empresa, CPF..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="w-full bg-[#0a0a0a] backdrop-blur-xl border border-white/[0.05] rounded-2xl pl-11 pr-5 py-3.5 text-sm text-white placeholder-neutral-600 focus:outline-none focus:ring-1 focus:ring-[#6be12f]/30 focus:border-[#6be12f]/30 transition-all shadow-inner"
              />
            </div>

            <div className="relative w-full sm:w-48 group/select">
              <select
                value={filtroStatus}
                onChange={(e) => setFiltroStatus(e.target.value)}
                className="w-full bg-[#0a0a0a] backdrop-blur-xl border border-white/[0.05] rounded-2xl pl-5 pr-12 py-3.5 text-sm text-white appearance-none focus:outline-none focus:ring-1 focus:ring-[#6be12f]/30 focus:border-[#6be12f]/30 transition-all cursor-pointer shadow-inner"
              >
                <option value="Todos" className="bg-[#0a0a0a]">Todos os Status</option>
                {statusOpcoes.map(s => <option key={s} value={s} className="bg-[#0a0a0a]">{s}</option>)}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-5 text-neutral-600 group-hover/select:text-[#6be12f] transition-colors">
                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
              </div>
            </div>

            <button
              onClick={() => abrirModal()}
              className="w-full sm:w-auto bg-[#6be12f] hover:bg-[#8cf059] text-black font-bold py-3.5 px-6 rounded-2xl text-sm transition-all duration-300 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(34,197,94,0.2)] hover:shadow-[0_0_30px_rgba(34,197,94,0.4)] hover:-translate-y-1"
            >
              <Plus size={18} strokeWidth={2.5} />
              Novo Cliente
            </button>
          </div>
        </div>

        {/* Tabela */}
        {carregando ? (
          <div className="flex justify-center items-center py-32">
            <div className="relative w-16 h-16 flex items-center justify-center">
              <div className="absolute inset-0 border-t-2 border-[#6be12f]/50 rounded-full animate-spin"></div>
              <Users className="text-[#6be12f] animate-pulse" size={24} />
            </div>
          </div>
        ) : clientes.length === 0 ? (
          <div className="bg-white/[0.02] border border-white/[0.05] rounded-[2.5rem] py-24 text-center flex flex-col items-center justify-center backdrop-blur-xl shadow-2xl">
            <div className="w-20 h-20 bg-white/[0.02] rounded-full flex items-center justify-center mb-6 border border-white/[0.05]">
              <Users size={32} className="text-neutral-600" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2 tracking-tight">Nenhum cliente encontrado</h3>
            <p className="text-sm text-neutral-500 mb-8 max-w-md">Você ainda não tem clientes cadastrados ou nenhum resultado corresponde à sua busca.</p>
            <button onClick={() => abrirModal()} className="bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.05] text-white font-bold py-3 px-6 rounded-2xl text-sm transition-all duration-300 flex items-center gap-2">
              <Plus size={18} /> Cadastrar primeiro cliente
            </button>
          </div>
        ) : (
          <div className="bg-white/[0.02] border border-white/[0.05] rounded-3xl overflow-hidden shadow-2xl backdrop-blur-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/[0.05] bg-white/[0.01]">
                    <th className="text-xs font-bold text-neutral-500 uppercase tracking-widest py-5 px-6">Empresa / Contato</th>
                    <th className="text-xs font-bold text-neutral-500 uppercase tracking-widest py-5 px-6">Comunicação</th>
                    <th className="text-xs font-bold text-neutral-500 uppercase tracking-widest py-5 px-6">Localização</th>
                    <th className="text-xs font-bold text-neutral-500 uppercase tracking-widest py-5 px-6">Plano / Resp.</th>
                    <th className="text-xs font-bold text-neutral-500 uppercase tracking-widest py-5 px-6">Status</th>
                    <th className="text-xs font-bold text-neutral-500 uppercase tracking-widest py-5 px-6 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.02]">
                  {clientes.map((cliente) => (
                    <tr key={cliente.id} className="hover:bg-white/[0.02] transition-colors duration-300 group">
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-4">
                          <div className="w-11 h-11 rounded-full bg-[#0a0a0a] border border-white/[0.05] flex items-center justify-center text-neutral-400 font-bold text-sm shadow-inner flex-shrink-0 group-hover:text-white group-hover:border-white/[0.1] transition-colors">
                            {cliente.nome?.charAt(0).toUpperCase() || '?'}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-neutral-300 group-hover:text-white transition-colors">{cliente.nome || '—'}</p>
                            <p className="text-xs text-neutral-500 flex items-center gap-1.5 mt-1">
                              <Building size={12} className="text-neutral-600" /> {cliente.nome_empresa || '—'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center gap-2.5 text-neutral-500 group-hover:text-neutral-400 transition-colors">
                            <Phone size={14} className="text-neutral-600" />
                            <span className="text-xs font-medium">{cliente.telefone || '—'}</span>
                          </div>
                          <div className="flex items-center gap-2.5 text-neutral-500 group-hover:text-neutral-400 transition-colors">
                            <Mail size={14} className="text-neutral-600" />
                            <span className="text-xs font-medium truncate max-w-[150px]" title={cliente.email}>{cliente.email || '—'}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-2.5 text-neutral-400 mb-1.5">
                          <MapPin size={14} className="text-neutral-600" />
                          <span className="text-xs font-bold">{cliente.cidade || '—'}, {cliente.estado || '—'}</span>
                        </div>
                        <p className="text-xs text-neutral-600 truncate max-w-[180px] font-medium" title={cliente.endereco}>{cliente.endereco || '—'}</p>
                      </td>
                      <td className="px-6 py-5">
                        <p className="text-sm font-bold text-neutral-300">{cliente.planos?.nome || 'Sem plano'}</p>
                        <p className="text-xs text-neutral-500 flex items-center gap-1.5 mt-1 font-medium">
                          <User size={12} className="text-neutral-600" /> {cliente.nome_responsavel || '—'}
                        </p>
                      </td>
                      <td className="px-6 py-5">
                        <span className={`inline-flex items-center px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest ${statusCores[cliente.status] || 'bg-white/[0.05] text-neutral-400 border border-white/[0.1]'}`}>
                          {cliente.status || 'Desconhecido'}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-50 group-hover:opacity-100 transition-opacity duration-300">
                          <button
                            onClick={() => abrirModal(cliente)}
                            className="p-2.5 text-neutral-500 hover:text-white hover:bg-white/[0.05] rounded-xl transition-all duration-300 border border-transparent hover:border-white/[0.05]"
                            title="Editar cliente"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            onClick={() => setConfirmDelete(cliente.id)}
                            className="p-2.5 text-neutral-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all duration-300 border border-transparent hover:border-red-500/20"
                            title="Excluir cliente"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Modal de Criação/Edição Premium */}
      {modalAberto && (
        <div className="fixed inset-0 bg-[#050505]/80 backdrop-blur-2xl flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
          <div className="bg-[#0a0a0a] border border-white/[0.05] rounded-[2.5rem] w-full max-w-4xl flex flex-col max-h-[90vh] shadow-[0_20px_40px_rgba(0,0,0,0.5)]">

            <div className="flex items-center justify-between p-8 border-b border-white/[0.05] flex-shrink-0">
              <div>
                <h2 className="text-2xl font-bold text-white tracking-tight">{clienteSelecionado ? 'Editar Cliente' : 'Novo Cliente'}</h2>
                <p className="text-sm text-neutral-500 mt-1.5 font-medium">Preencha os dados da empresa e do contato principal</p>
              </div>
              <button onClick={fecharModal} className="p-2.5 text-neutral-500 hover:text-white hover:bg-white/[0.05] rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6 overflow-y-auto custom-scrollbar flex-grow">
              {/* Campo: Empresário */}
              <div>
                <label htmlFor="nome" className="block text-xs font-bold text-neutral-500 mb-3 uppercase tracking-widest">Empresário *</label>
                <div className="relative group/input">
                  <Briefcase size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-600 group-focus-within/input:text-[#6be12f] transition-colors duration-300" />
                  <input
                    type="text" id="nome" name="nome" value={form.nome} onChange={handleChange} placeholder="Nome completo"
                    className="w-full bg-[#050505] border border-white/[0.05] rounded-2xl pl-12 pr-5 py-4 text-sm text-white placeholder-neutral-600 focus:outline-none focus:ring-1 focus:ring-[#6be12f]/30 focus:border-[#6be12f]/30 transition-all shadow-inner"
                    required
                  />
                </div>
                {nomeEmpresarioError && <p className="text-red-400 text-xs mt-2 font-medium">{nomeEmpresarioError}</p>}
              </div>

              {/* Campo: Empresa */}
              <div>
                <label htmlFor="nome_empresa" className="block text-xs font-bold text-neutral-500 mb-3 uppercase tracking-widest">Empresa *</label>
                <div className="relative group/input">
                  <Building size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-600 group-focus-within/input:text-[#6be12f] transition-colors duration-300" />
                  <input
                    type="text" id="nome_empresa" name="nome_empresa" value={form.nome_empresa} onChange={handleChange} placeholder="Nome do negócio"
                    className="w-full bg-[#050505] border border-white/[0.05] rounded-2xl pl-12 pr-5 py-4 text-sm text-white placeholder-neutral-600 focus:outline-none focus:ring-1 focus:ring-[#6be12f]/30 focus:border-[#6be12f]/30 transition-all shadow-inner"
                    required
                  />
                </div>
                {nomeEmpresaError && <p className="text-red-400 text-xs mt-2 font-medium">{nomeEmpresaError}</p>}
              </div>

              {/* Campo: Responsável */}
              <div>
                <label htmlFor="nome_responsavel" className="block text-xs font-bold text-neutral-500 mb-3 uppercase tracking-widest">Responsável pela Venda *</label>
                <div className="relative group/input">
                  <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-600 group-focus-within/input:text-[#6be12f] transition-colors duration-300" />
                  <input
                    type="text" id="nome_responsavel" name="nome_responsavel" value={form.nome_responsavel} onChange={handleChange} placeholder="Quem fechou o negócio"
                    className="w-full bg-[#050505] border border-white/[0.05] rounded-2xl pl-12 pr-5 py-4 text-sm text-white placeholder-neutral-600 focus:outline-none focus:ring-1 focus:ring-[#6be12f]/30 focus:border-[#6be12f]/30 transition-all shadow-inner"
                    required
                  />
                </div>
                {nomeResponsavelError && <p className="text-red-400 text-xs mt-2 font-medium">{nomeResponsavelError}</p>}
              </div>

              {/* Campo: CPF/CNPJ */}
              <div>
                <label htmlFor="cpf_cnpj" className="block text-xs font-bold text-neutral-500 mb-3 uppercase tracking-widest">CPF/CNPJ *</label>
                <div className="relative group/input">
                  <CreditCard size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-600 group-focus-within/input:text-[#6be12f] transition-colors duration-300" />
                  <input
                    type="text" id="cpf_cnpj" name="cpf_cnpj" value={form.cpf_cnpj} onChange={handleChange} placeholder="Apenas números" maxLength={14}
                    className="w-full bg-[#050505] border border-white/[0.05] rounded-2xl pl-12 pr-5 py-4 text-sm text-white placeholder-neutral-600 focus:outline-none focus:ring-1 focus:ring-[#6be12f]/30 focus:border-[#6be12f]/30 transition-all shadow-inner"
                    required
                  />
                </div>
                {cpfCnpjError && <p className="text-red-400 text-xs mt-2 font-medium">{cpfCnpjError}</p>}
              </div>

              {/* Campo: Email (AGORA OBRIGATÓRIO) */}
              <div>
                <label htmlFor="email" className="block text-xs font-bold text-neutral-500 mb-3 uppercase tracking-widest">Email (Login) *</label>
                <div className="relative group/input">
                  <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-600 group-focus-within/input:text-[#6be12f] transition-colors duration-300" />
                  <input
                    type="email" id="email" name="email" value={form.email} onChange={handleChange} placeholder="contato@empresa.com"
                    className="w-full bg-[#050505] border border-white/[0.05] rounded-2xl pl-12 pr-5 py-4 text-sm text-white placeholder-neutral-600 focus:outline-none focus:ring-1 focus:ring-[#6be12f]/30 focus:border-[#6be12f]/30 transition-all shadow-inner"
                    required
                  />
                </div>
              </div>

              {/* Campo: Telefone */}
              <div>
                <label htmlFor="telefone" className="block text-xs font-bold text-neutral-500 mb-3 uppercase tracking-widest">Telefone / WhatsApp *</label>
                <div className="relative group/input">
                  <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-600 group-focus-within/input:text-[#6be12f] transition-colors duration-300" />
                  <input
                    type="text" id="telefone" name="telefone" value={form.telefone} onChange={handleChange} placeholder="DDD + Número" maxLength={11}
                    className="w-full bg-[#050505] border border-white/[0.05] rounded-2xl pl-12 pr-5 py-4 text-sm text-white placeholder-neutral-600 focus:outline-none focus:ring-1 focus:ring-[#6be12f]/30 focus:border-[#6be12f]/30 transition-all shadow-inner"
                    required
                  />
                </div>
                {telefoneError && <p className="text-red-400 text-xs mt-2 font-medium">{telefoneError}</p>}
              </div>

              {/* Campo: Endereço */}
              <div className="md:col-span-2">
                <label htmlFor="endereco" className="block text-xs font-bold text-neutral-500 mb-3 uppercase tracking-widest">Endereço Completo</label>
                <div className="relative group/input">
                  <MapPin size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-600 group-focus-within/input:text-[#6be12f] transition-colors duration-300" />
                  <input
                    type="text" id="endereco" name="endereco" value={form.endereco} onChange={handleChange} placeholder="Rua, número, complemento, bairro"
                    className="w-full bg-[#050505] border border-white/[0.05] rounded-2xl pl-12 pr-5 py-4 text-sm text-white placeholder-neutral-600 focus:outline-none focus:ring-1 focus:ring-[#6be12f]/30 focus:border-[#6be12f]/30 transition-all shadow-inner"
                  />
                </div>
              </div>

              {/* Campo: Estado (IBGE) */}
              <div>
                <label htmlFor="estado" className="block text-xs font-bold text-neutral-500 mb-3 uppercase tracking-widest">Estado</label>
                <div className="relative group/select">
                  <select
                    id="estado" name="estado" value={form.estado} onChange={handleChange}
                    className="w-full bg-[#050505] border border-white/[0.05] rounded-2xl py-4 px-5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#6be12f]/30 focus:border-[#6be12f]/30 appearance-none pr-12 transition-all cursor-pointer shadow-inner"
                  >
                    <option value="" className="bg-[#050505]">Selecione o UF</option>
                    {estadosIBGE.map(estado => (
                      <option key={estado.id} value={estado.sigla} className="bg-[#050505]">
                        {estado.nome} ({estado.sigla})
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-5 text-neutral-600 group-hover/select:text-[#6be12f] transition-colors">
                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                  </div>
                </div>
              </div>

              {/* Campo: Cidade (IBGE com Datalist) */}
              <div>
                <label htmlFor="cidade" className="block text-xs font-bold text-neutral-500 mb-3 uppercase tracking-widest">Cidade</label>
                <input
                  list="lista-cidades-ibge"
                  type="text" id="cidade" name="cidade" value={form.cidade} onChange={handleChange} 
                  placeholder={form.estado ? "Digite para buscar a cidade" : "Selecione o estado primeiro"}
                  disabled={!form.estado}
                  className="w-full bg-[#050505] border border-white/[0.05] rounded-2xl px-5 py-4 text-sm text-white placeholder-neutral-600 focus:outline-none focus:ring-1 focus:ring-[#6be12f]/30 focus:border-[#6be12f]/30 transition-all shadow-inner disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <datalist id="lista-cidades-ibge">
                  {cidadesIBGE.map((cidade) => (
                    <option key={cidade.id} value={cidade.nome} />
                  ))}
                </datalist>
              </div>

              {/* Campo: Plano */}
              <div>
                <label htmlFor="plano_id" className="block text-xs font-bold text-neutral-500 mb-3 uppercase tracking-widest">Plano Contratado</label>
                <div className="relative group/select">
                  <select
                    id="plano_id" name="plano_id" value={form.plano_id} onChange={handleChange}
                    className="w-full bg-[#050505] border border-white/[0.05] rounded-2xl py-4 px-5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#6be12f]/30 focus:border-[#6be12f]/30 appearance-none pr-12 transition-all cursor-pointer shadow-inner"
                  >
                    <option value="" className="bg-[#050505]">Sem plano vinculado</option>
                    {planos.map(plano => <option key={plano.id} value={plano.id} className="bg-[#050505]">{plano.nome}</option>)}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-5 text-neutral-600 group-hover/select:text-[#6be12f] transition-colors">
                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                  </div>
                </div>
              </div>

              {/* Campo: Status */}
              <div>
                <label htmlFor="status" className="block text-xs font-bold text-neutral-500 mb-3 uppercase tracking-widest">Status da Conta</label>
                <div className="relative group/select">
                  <select
                    id="status" name="status" value={form.status} onChange={handleChange}
                    className="w-full bg-[#050505] border border-white/[0.05] rounded-2xl py-4 px-5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#6be12f]/30 focus:border-[#6be12f]/30 appearance-none pr-12 transition-all cursor-pointer shadow-inner"
                  >
                    {statusOpcoes.map(s => <option key={s} value={s} className="bg-[#050505]">{s}</option>)}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-5 text-neutral-600 group-hover/select:text-[#6be12f] transition-colors">
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
                onClick={salvarCliente}
                disabled={salvando || nomeEmpresarioError || nomeEmpresaError || nomeResponsavelError || telefoneError || cpfCnpjError || !form.nome.trim() || !form.nome_empresa.trim() || !form.nome_responsavel.trim() || !form.telefone.trim() || !form.cpf_cnpj.trim() || !form.email.trim()}
                className="flex-1 bg-[#6be12f] hover:bg-[#8cf059] disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold py-4 rounded-2xl text-sm transition-all duration-300 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(34,197,94,0.2)] hover:shadow-[0_0_30px_rgba(34,197,94,0.4)] hover:-translate-y-1"
              >
                {salvando ? (
                  <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                ) : (
                  <><Check size={18} strokeWidth={2.5} /> {clienteSelecionado ? 'Salvar Alterações' : 'Cadastrar Cliente'}</>
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
            <h2 className="text-2xl font-bold text-white mb-3 tracking-tight">Excluir cliente?</h2>
            <p className="text-sm text-neutral-500 mb-8 leading-relaxed">Esta ação não pode ser desfeita. Todos os pagamentos e dados vinculados serão perdidos permanentemente.</p>
            <div className="flex gap-4">
              <button onClick={() => setConfirmDelete(null)} className="flex-1 py-4 rounded-2xl font-bold text-sm text-neutral-500 hover:text-white bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.05] transition-all duration-300">
                Cancelar
              </button>
              <button onClick={() => excluirCliente(confirmDelete)} className="flex-1 bg-red-500 hover:bg-red-400 text-white font-bold py-4 rounded-2xl text-sm transition-all duration-300 shadow-[0_0_20px_rgba(239,68,68,0.2)] hover:shadow-[0_0_30px_rgba(239,68,68,0.4)] hover:-translate-y-1">
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