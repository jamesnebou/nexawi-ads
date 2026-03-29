'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { Users, Plus, Pencil, Trash2, X, Check, Search, Phone, Mail, MapPin, CreditCard, Building, User, Briefcase } from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const statusOpcoes = ['Ativo', 'Inativo', 'Inadimplente']
const statusCores = {
  Ativo: 'bg-green-400/10 text-green-400',
  Inativo: 'bg-gray-400/10 text-gray-400',
  Inadimplente: 'bg-red-400/10 text-red-400'
}

const estadosBR = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO']

// --- Funções de Validação ---
const validatePhoneNumber = (phone) => {
  const cleanedPhone = phone.replace(/\D/g, '');
  return cleanedPhone.length === 11;
};

const validateCpfCnpj = (doc) => {
  const cleanedDoc = doc.replace(/\D/g, '');

  if (cleanedDoc.length === 11) {
    let sum = 0;
    let remainder;
    if (cleanedDoc === '00000000000') return false;
    for (let i = 1; i <= 9; i++) sum = sum + parseInt(cleanedDoc.substring(i - 1, i)) * (11 - i);
    remainder = (sum * 10) % 11;
    if ((remainder === 10) || (remainder === 11)) remainder = 0;
    if (remainder !== parseInt(cleanedDoc.substring(9, 10))) return false;
    sum = 0;
    for (let i = 1; i <= 10; i++) sum = sum + parseInt(cleanedDoc.substring(i - 1, i)) * (12 - i);
    remainder = (sum * 10) % 11;
    if ((remainder === 10) || (remainder === 11)) remainder = 0;
    if (remainder !== parseInt(cleanedDoc.substring(10, 11))) return false;
    return true;
  } else if (cleanedDoc.length === 14) {
    let cnpj = cleanedDoc;
    if (cnpj === '00000000000000' || cnpj === '11111111111111' || cnpj === '22222222222222' ||
        cnpj === '33333333333333' || cnpj === '44444444444444' || cnpj === '55555555555555' ||
        cnpj === '66666666666666' || cnpj === '77777777777777' || cnpj === '88888888888888' ||
        cnpj === '99999999999999') return false;

    let size = cnpj.length - 2;
    let numbers = cnpj.substring(0, size);
    let digits = cnpj.substring(size);
    let sum = 0;
    let pos = size - 7;
    for (let i = size; i >= 1; i--) {
      sum += parseInt(numbers.charAt(size - i)) * pos--;
      if (pos < 2) pos = 9;
    }
    remainder = sum % 11 < 2 ? 0 : 11 - (sum % 11);
    if (remainder !== parseInt(digits.charAt(0))) return false;

    size = size + 1;
    numbers = cnpj.substring(0, size);
    sum = 0;
    pos = size - 7;
    for (let i = size; i >= 1; i--) {
      sum += parseInt(numbers.charAt(size - i)) * pos--;
      if (pos < 2) pos = 9;
    }
    remainder = sum % 11 < 2 ? 0 : 11 - (sum % 11);
    if (remainder !== parseInt(digits.charAt(1))) return false;

    return true;
  }
  return false;
};
// --- Fim das Funções de Validação ---

export default function Clientes() {
  const [clientes, setClientes] = useState([])
  const [planos, setPlanos] = useState([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('Todos')
  const [modalAberto, setModalAberto] = useState(false)
  const [clienteSelecionado, setClienteSelecionado] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [salvando, setSalvando] = useState(false)

  // Estados para mensagens de erro de validação
  const [nomeEmpresarioError, setNomeEmpresarioError] = useState('');
  const [nomeEmpresaError, setNomeEmpresaError] = useState('');
  const [nomeResponsavelError, setNomeResponsavelError] = useState('');
  const [telefoneError, setTelefoneError] = useState('');
  const [cpfCnpjError, setCpfCnpjError] = useState('');

  // Estado do formulário com os campos atualizados
  const [form, setForm] = useState({
    nome: '', // Empresário
    nome_empresa: '', // Empresa
    nome_responsavel: '', // Responsável
    email: '',
    telefone: '',
    cpf_cnpj: '',
    endereco: '',
    cidade: '',
    estado: '',
    plano_id: '',
    status: 'Ativo'
  })

  useEffect(() => { buscarDados() }, [])

  async function buscarDados() {
    setLoading(true)
    const [{ data: clientesData }, { data: planosData }] = await Promise.all([
      supabase.from('clientes').select('*, planos(nome)').order('created_at', { ascending: false }),
      supabase.from('planos').select('id, nome, preco')
    ])
    setClientes(clientesData || [])
    setPlanos(planosData || [])
    setLoading(false)
  }

  function abrirModal(cliente = null) {
    if (cliente) {
      setClienteSelecionado(cliente)
      setForm({
        nome: cliente.nome || '',
        nome_empresa: cliente.nome_empresa || '',
        nome_responsavel: cliente.nome_responsavel || '',
        email: cliente.email || '',
        telefone: cliente.telefone || '',
        cpf_cnpj: cliente.cpf_cnpj || '',
        endereco: cliente.endereco || '',
        cidade: cliente.cidade || '',
        estado: cliente.estado || '',
        plano_id: cliente.plano_id || '',
        status: cliente.status || 'Ativo'
      })
    } else {
      setClienteSelecionado(null)
      setForm({
        nome: '', nome_empresa: '', nome_responsavel: '', email: '', telefone: '', cpf_cnpj: '',
        endereco: '', cidade: '', estado: '', plano_id: '', status: 'Ativo'
      })
    }
    // Limpa todos os erros ao abrir o modal
    setNomeEmpresarioError('');
    setNomeEmpresaError('');
    setNomeResponsavelError('');
    setTelefoneError('');
    setCpfCnpjError('');
    setModalAberto(true)
  }

  function fecharModal() {
    setModalAberto(false)
    setClienteSelecionado(null)
    // Limpa todos os erros ao fechar o modal
    setNomeEmpresarioError('');
    setNomeEmpresaError('');
    setNomeResponsavelError('');
    setTelefoneError('');
    setCpfCnpjError('');
  }

  const handleChange = (e) => {
    const { name, value } = e.target;
    let cleanedValue = value;

    // Limpeza e validação em tempo real para telefone e CPF/CNPJ
    if (name === 'telefone') {
      cleanedValue = value.replace(/\D/g, ''); // Remove não-dígitos
      if (cleanedValue.length > 0 && !validatePhoneNumber(cleanedValue)) {
        setTelefoneError('Telefone inválido (11 dígitos).');
      } else {
        setTelefoneError('');
      }
    } else if (name === 'cpf_cnpj') {
      cleanedValue = value.replace(/\D/g, ''); // Remove não-dígitos
      if (cleanedValue.length > 0 && !validateCpfCnpj(cleanedValue)) {
        setCpfCnpjError('CPF ou CNPJ inválido.');
      } else {
        setCpfCnpjError('');
      }
    } else if (name === 'nome') {
      if (value.trim().length === 0) {
        setNomeEmpresarioError('Empresário é obrigatório.');
      } else {
        setNomeEmpresarioError('');
      }
    } else if (name === 'nome_empresa') {
      if (value.trim().length === 0) {
        setNomeEmpresaError('Empresa é obrigatória.');
      } else {
        setNomeEmpresaError('');
      }
    } else if (name === 'nome_responsavel') {
      if (value.trim().length === 0) {
        setNomeResponsavelError('Responsável é obrigatório.');
      } else {
        setNomeResponsavelError('');
      }
    }

    setForm(prevForm => ({ ...prevForm, [name]: cleanedValue }));
  };

  async function salvarCliente() {
    // Validações finais antes de salvar
    let isValid = true;

    if (!form.nome.trim()) { setNomeEmpresarioError('Empresário é obrigatório.'); isValid = false; } else { setNomeEmpresarioError(''); }
    if (!form.nome_empresa.trim()) { setNomeEmpresaError('Empresa é obrigatória.'); isValid = false; } else { setNomeEmpresaError(''); }
    if (!form.nome_responsavel.trim()) { setNomeResponsavelError('Responsável é obrigatório.'); isValid = false; } else { setNomeResponsavelError(''); }
    if (!form.telefone.trim() || !validatePhoneNumber(form.telefone)) { setTelefoneError('Telefone inválido (11 dígitos).'); isValid = false; } else { setTelefoneError(''); }
    if (!form.cpf_cnpj.trim() || !validateCpfCnpj(form.cpf_cnpj)) { setCpfCnpjError('CPF ou CNPJ inválido.'); isValid = false; } else { setCpfCnpjError(''); }

    if (!isValid) {
      toast.error('Por favor, corrija os erros no formulário.');
      return;
    }

    setSalvando(true)
    try {
      const payload = { ...form, plano_id: form.plano_id || null }
      if (clienteSelecionado) {
        const { error } = await supabase.from('clientes').update(payload).eq('id', clienteSelecionado.id)
        if (error) throw error;
        toast.success('Cliente atualizado com sucesso!');
      } else {
        const { error } = await supabase.from('clientes').insert([payload])
        if (error) throw error;
        toast.success('Cliente cadastrado com sucesso!');
      }
      await buscarDados()
      fecharModal()
    } catch (error) {
      console.error('Erro ao salvar cliente:', error)
      toast.error(`Erro ao salvar cliente: ${error.message}`);
    } finally {
      setSalvando(false)
    }
  }

  async function excluirCliente(id) {
    setSalvando(true)
    try {
      const { error } = await supabase.from('clientes').delete().eq('id', id)
      if (error) throw error;
      toast.success('Cliente excluído com sucesso!');
      await buscarDados()
      setConfirmDelete(null)
    } catch (error) {
      console.error('Erro ao excluir cliente:', error)
      toast.error(`Erro ao excluir cliente: ${error.message}`);
    } finally {
      setSalvando(false)
    }
  }

  const clientesFiltrados = clientes.filter(cliente => {
    const termoBusca = busca.toLowerCase()
    const statusCorresponde = filtroStatus === 'Todos' || cliente.status === filtroStatus
    const buscaCorresponde = (
      cliente.nome?.toLowerCase().includes(termoBusca) ||
      cliente.nome_empresa?.toLowerCase().includes(termoBusca) ||
      cliente.nome_responsavel?.toLowerCase().includes(termoBusca) ||
      cliente.email?.toLowerCase().includes(termoBusca) ||
      cliente.telefone?.includes(termoBusca) ||
      cliente.cpf_cnpj?.includes(termoBusca) ||
      cliente.cidade?.toLowerCase().includes(termoBusca) ||
      cliente.planos?.nome?.toLowerCase().includes(termoBusca)
    )
    return statusCorresponde && buscaCorresponde
  })

  return (
    <>
      <Toaster position="bottom-right" reverseOrder={false} />
      <main className="container mx-auto px-4 py-8 text-white">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-semibold flex items-center gap-3">
            <Users size={24} className="text-green-500" /> Clientes
          </h1>
          <button
            onClick={() => abrirModal()}
            className="bg-green-500 hover:bg-green-400 text-black font-semibold py-2 px-4 rounded-xl text-sm transition-colors flex items-center gap-2"
          >
            <Plus size={18} /> Novo Cliente
          </button>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                placeholder="Buscar por empresário, empresa, responsável, email, telefone, CPF/CNPJ..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-green-500 transition-colors"
              />
            </div>
            <div className="relative">
              <select
                value={filtroStatus}
                onChange={(e) => setFiltroStatus(e.target.value)}
                className="w-full md:w-48 bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-green-500 transition-colors appearance-none pr-8"
              >
                <option value="Todos">Todos os Status</option>
                {statusOpcoes.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-10 text-gray-400">Carregando clientes...</div>
        ) : clientesFiltrados.length === 0 ? (
          <div className="text-center py-10 text-gray-400">Nenhum cliente encontrado.</div>
        ) : (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-800">
                <thead className="bg-gray-800">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Empresário / Empresa
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Contato
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Plano
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {clientesFiltrados.map((cliente) => (
                    <tr key={cliente.id} className="hover:bg-gray-800 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-400/10 flex items-center justify-center text-blue-400 font-semibold text-sm">
                            {cliente.nome?.charAt(0).toUpperCase() || '?'}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-white">{cliente.nome}</div>
                            <div className="text-xs text-gray-400">{cliente.nome_empresa}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-300 flex items-center gap-1"><Mail size={14} /> {cliente.email}</div>
                        <div className="text-sm text-gray-300 flex items-center gap-1"><Phone size={14} /> {cliente.telefone}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {cliente.planos?.nome || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusCores[cliente.status]}`}>
                          {cliente.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => abrirModal(cliente)}
                          className="text-green-500 hover:text-green-400 mr-3"
                          title="Editar"
                        >
                          <Pencil size={18} />
                        </button>
                        <button
                          onClick={() => setConfirmDelete(cliente.id)}
                          className="text-red-500 hover:text-red-400"
                          title="Excluir"
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {modalAberto && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-2xl">
            <div className="flex justify-between items-center p-6 border-b border-gray-800">
              <h2 className="text-xl font-semibold text-white">{clienteSelecionado ? 'Editar Cliente' : 'Novo Cliente'}</h2>
              <button onClick={fecharModal} className="text-gray-400 hover:text-white transition-colors">
                <X size={24} />
              </button>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Campo: Empresário */}
              <div>
                <label htmlFor="nome" className="block text-sm font-medium text-gray-300 mb-1">Empresário</label>
                <div className="relative">
                  <Briefcase size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type="text"
                    id="nome"
                    name="nome"
                    value={form.nome}
                    onChange={handleChange}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors"
                    placeholder="Nome do empresário"
                    required
                  />
                </div>
                {nomeEmpresarioError && <p className="text-red-500 text-xs mt-1">{nomeEmpresarioError}</p>}
              </div>

              {/* Campo: Empresa */}
              <div>
                <label htmlFor="nome_empresa" className="block text-sm font-medium text-gray-300 mb-1">Empresa</label>
                <div className="relative">
                  <Building size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type="text"
                    id="nome_empresa"
                    name="nome_empresa"
                    value={form.nome_empresa}
                    onChange={handleChange}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors"
                    placeholder="Nome da empresa"
                    required
                  />
                </div>
                {nomeEmpresaError && <p className="text-red-500 text-xs mt-1">{nomeEmpresaError}</p>}
              </div>

              {/* Campo: Responsável */}
              <div>
                <label htmlFor="nome_responsavel" className="block text-sm font-medium text-gray-300 mb-1">Responsável</label>
                <div className="relative">
                  <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type="text"
                    id="nome_responsavel"
                    name="nome_responsavel"
                    value={form.nome_responsavel}
                    onChange={handleChange}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors"
                    placeholder="Nome do responsável pela venda"
                    required
                  />
                </div>
                {nomeResponsavelError && <p className="text-red-500 text-xs mt-1">{nomeResponsavelError}</p>}
              </div>

              {/* Campo: Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1">Email</label>
                <div className="relative">
                  <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors"
                    placeholder="email@exemplo.com"
                  />
                </div>
              </div>

              {/* Campo: Telefone */}
              <div>
                <label htmlFor="telefone" className="block text-sm font-medium text-gray-300 mb-1">Telefone</label>
                <div className="relative">
                  <Phone size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type="text"
                    id="telefone"
                    name="telefone"
                    value={form.telefone}
                    onChange={handleChange}
                    maxLength={11}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors"
                    placeholder="DDD + 9 dígitos (ex: 11987654321)"
                    required
                  />
                </div>
                {telefoneError && <p className="text-red-500 text-xs mt-1">{telefoneError}</p>}
              </div>

              {/* Campo: CPF/CNPJ */}
              <div>
                <label htmlFor="cpf_cnpj" className="block text-sm font-medium text-gray-300 mb-1">CPF/CNPJ</label>
                <div className="relative">
                  <CreditCard size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type="text"
                    id="cpf_cnpj"
                    name="cpf_cnpj"
                    value={form.cpf_cnpj}
                    onChange={handleChange}
                    maxLength={14}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors"
                    placeholder="Somente números"
                    required
                  />
                </div>
                {cpfCnpjError && <p className="text-red-500 text-xs mt-1">{cpfCnpjError}</p>}
              </div>

              {/* Campo: Endereço */}
              <div className="md:col-span-2">
                <label htmlFor="endereco" className="block text-sm font-medium text-gray-300 mb-1">Endereço</label>
                <div className="relative">
                  <MapPin size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type="text"
                    id="endereco"
                    name="endereco"
                    value={form.endereco}
                    onChange={handleChange}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors"
                    placeholder="Rua, número, bairro"
                  />
                </div>
              </div>

              {/* Campo: Cidade */}
              <div>
                <label htmlFor="cidade" className="block text-sm font-medium text-gray-300 mb-1">Cidade</label>
                <input
                  type="text"
                  id="cidade"
                  name="cidade"
                  value={form.cidade}
                  onChange={handleChange}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors"
                  placeholder="Cidade"
                />
              </div>

              {/* Campo: Estado */}
              <div>
                <label htmlFor="estado" className="block text-sm font-medium text-gray-300 mb-1">Estado</label>
                <div className="relative">
                  <select
                    id="estado"
                    name="estado"
                    value={form.estado}
                    onChange={handleChange}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl py-2 px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-green-500 appearance-none pr-8"
                  >
                    <option value="">Selecione</option>
                    {estadosBR.map(estado => <option key={estado} value={estado}>{estado}</option>)}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                  </div>
                </div>
              </div>

              {/* Campo: Plano */}
              <div>
                <label htmlFor="plano_id" className="block text-sm font-medium text-gray-300 mb-1">Plano</label>
                <div className="relative">
                  <select
                    id="plano_id"
                    name="plano_id"
                    value={form.plano_id}
                    onChange={handleChange}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl py-2 px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-green-500 appearance-none pr-8"
                  >
                    <option value="">Nenhum</option>
                    {planos.map(plano => (
                      <option key={plano.id} value={plano.id}>{plano.nome}</option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                  </div>
                </div>
              </div>

              {/* Campo: Status */}
              <div>
                <label htmlFor="status" className="block text-sm font-medium text-gray-300 mb-1">Status</label>
                <div className="relative">
                  <select
                    id="status"
                    name="status"
                    value={form.status}
                    onChange={handleChange}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl py-2 px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-green-500 appearance-none pr-8"
                  >
                    {statusOpcoes.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 p-6 border-t border-gray-800">
              <button
                onClick={fecharModal}
                className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium py-2.5 rounded-xl text-sm transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={salvarCliente}
                disabled={salvando || nomeEmpresarioError || nomeEmpresaError || nomeResponsavelError || telefoneError || cpfCnpjError || !form.nome.trim() || !form.nome_empresa.trim() || !form.nome_responsavel.trim() || !form.telefone.trim() || !form.cpf_cnpj.trim()}
                className="flex-1 bg-green-500 hover:bg-green-400 disabled:opacity-50 disabled:cursor-not-allowed text-black font-semibold py-2.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
              >
                {salvando ? (
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                ) : (
                  <><Check size={15} />{clienteSelecionado ? 'Salvar alterações' : 'Cadastrar'}</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-sm p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-red-400/10 flex items-center justify-center mx-auto mb-4">
              <Trash2 size={20} className="text-red-400" />
            </div>
            <h2 className="text-base font-semibold text-white mb-2">Excluir cliente?</h2>
            <p className="text-sm text-gray-400 mb-6">Todos os pagamentos vinculados também serão excluídos.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)} className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium py-2.5 rounded-xl text-sm transition-colors">
                Cancelar
              </button>
              <button onClick={() => excluirCliente(confirmDelete)} className="flex-1 bg-red-500 hover:bg-red-400 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors">
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}