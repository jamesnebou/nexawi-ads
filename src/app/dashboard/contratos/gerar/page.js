'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient as createBrowserSupabaseClient } from '@/lib/supabase/admin-client'
import { ArrowLeft, Building2, Copy, Database, FileText, Mail, Printer, RefreshCw, Save } from 'lucide-react'
import Link from 'next/link'
import toast, { Toaster } from 'react-hot-toast'

const supabase = createBrowserSupabaseClient()

const tabs = [
  { id: 'cliente', label: 'Cliente' },
  { id: 'plano', label: 'Plano' },
  { id: 'exclusividade', label: 'Exclusividade' },
  { id: 'condicoes', label: 'Condições' },
  { id: 'previa', label: 'Prévia' },
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

function flatten(fields = {}) {
  return {
    ...(fields.contratante || {}),
    ...Object.fromEntries(Object.entries(fields.plano || {}).map(([key, value]) => [`plano_${key}`, value])),
    ...Object.fromEntries(Object.entries(fields.exclusividade || {}).map(([key, value]) => [`exclusividade_${key}`, value])),
    ...Object.fromEntries(Object.entries(fields.condicoes || {}).map(([key, value]) => [`condicoes_${key}`, value])),
  }
}

function fieldValue(form, key) {
  const value = form?.[key]
  if (typeof value === 'boolean') return value ? 'Sim' : 'Não'
  return value ?? ''
}

function isValidEmail(value = '') {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim())
}

function escapeHtml(value = '') {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

export default function GerarContratoPage() {
  const searchParams = useSearchParams()
  const source = searchParams.get('source') || 'empresa'
  const id = searchParams.get('id') || ''

  const [activeTab, setActiveTab] = useState('cliente')
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [savingDraft, setSavingDraft] = useState(false)
  const [sending, setSending] = useState(false)
  const [data, setData] = useState(null)
  const [form, setForm] = useState({})
  const [contratoSalvo, setContratoSalvo] = useState(null)

  const html = data?.html || ''
  const title = useMemo(() => {
    const nome = data?.fields?.contratante?.nome_razao_social || 'Cliente'
    return `Contrato NexaWi — ${nome}`
  }, [data])

  useEffect(() => {
    carregar()
  }, [source, id])

  async function gerarContratoAtualizado() {
    return adminApiFetch('/api/admin/contratos/gerar', {
      method: 'POST',
      body: {
        source,
        id,
        updates: form,
      },
    })
  }

  async function carregar(updates = null) {
    if (!id) {
      toast.error('ID não informado para gerar contrato.')
      setLoading(false)
      return
    }

    setLoading(true)

    try {
      const result = await adminApiFetch('/api/admin/contratos/gerar', {
        method: 'POST',
        body: {
          source,
          id,
          updates,
        },
      })

      setData(result)
      setForm(flatten(result.fields || {}))
    } catch (error) {
      console.error('Erro ao carregar contrato:', error)
      toast.error(error.message || 'Erro ao gerar contrato.')
    } finally {
      setLoading(false)
    }
  }

  async function atualizarPrevia() {
    setGenerating(true)

    try {
      const result = await gerarContratoAtualizado()

      setData(result)
      setForm(flatten(result.fields || {}))
      toast.success('Prévia atualizada.')
      return result
    } catch (error) {
      console.error('Erro ao atualizar prévia:', error)
      toast.error(error.message || 'Erro ao atualizar prévia.')
      return null
    } finally {
      setGenerating(false)
    }
  }

  async function salvarRascunho() {
    setSavingDraft(true)

    try {
      const result = await gerarContratoAtualizado()
      setData(result)
      setForm(flatten(result.fields || {}))

      const saved = await adminApiFetch('/api/admin/contratos', {
        method: 'POST',
        body: {
          id: contratoSalvo?.id,
          source,
          empresa_id: result.fields?.meta?.empresa_id || '',
          cliente_id: result.fields?.meta?.cliente_id || '',
          fields: result.fields,
          status: 'rascunho',
        },
      })

      setContratoSalvo(saved.contrato)
      toast.success('Contrato salvo como rascunho.')
      return { result, saved }
    } catch (error) {
      console.error('Erro ao salvar rascunho:', error)
      toast.error(error.message || 'Erro ao salvar rascunho.')
      return null
    } finally {
      setSavingDraft(false)
    }
  }

  async function enviarContrato() {
    setSending(true)

    try {
      const result = await gerarContratoAtualizado()
      setData(result)
      setForm(flatten(result.fields || {}))

      const clienteEmail = String(result.fields?.contratante?.email || '').trim()
      const nexawiEmail = 'contato@nexawi.com.br'

      if (!isValidEmail(clienteEmail)) {
        setActiveTab('cliente')
        toast.error('Confira o e-mail do cliente antes de enviar.')
        return
      }

      const confirmado = window.confirm(
        `Confirma o envio deste contrato?\n\nCliente: ${clienteEmail}\nCópia NexaWi: ${nexawiEmail}\n\nAtenção: confira se o e-mail do cliente está correto.`
      )

      if (!confirmado) {
        toast('Envio cancelado para conferência do e-mail.')
        return
      }

      const response = await adminApiFetch('/api/admin/contratos/enviar', {
        method: 'POST',
        body: {
          id: contratoSalvo?.id,
          source,
          empresa_id: result.fields?.meta?.empresa_id || '',
          cliente_id: result.fields?.meta?.cliente_id || '',
          fields: result.fields,
          html: result.html,
          cliente_email: clienteEmail,
          nexawi_email: nexawiEmail,
        },
      })

      if (response.contrato) {
        setContratoSalvo(response.contrato)
      }

      if (response.ok) {
        toast.success('Contrato enviado para o cliente e para a NexaWi.')
      } else {
        toast.error(response.message || 'Contrato salvo, mas o envio não foi concluído.')
      }
    } catch (error) {
      console.error('Erro ao enviar contrato:', error)
      toast.error(error.message || 'Erro ao enviar contrato.')
    } finally {
      setSending(false)
    }
  }

  function updateField(key, value) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  async function copiarContrato() {
    const text = document.querySelector('#contract-preview')?.innerText || ''

    try {
      await navigator.clipboard.writeText(text)
      toast.success('Contrato copiado.')
    } catch {
      toast.error('Não foi possível copiar automaticamente.')
    }
  }

  function imprimir() {
    if (!html) {
      toast.error('Atualize a prévia antes de imprimir.')
      return
    }

    const printWindow = window.open('', '_blank', 'width=1000,height=1200,scrollbars=yes')

    if (!printWindow) {
      toast.error('O navegador bloqueou a janela de impressão. Permita pop-ups para este site.')
      return
    }

    printWindow.document.open()
    printWindow.document.write(`<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; padding: 28px; background: #ffffff; color: #111111; }
    .contract-document { font-family: Arial, sans-serif; color: #111; line-height: 1.55; font-size: 12.5px; max-width: 900px; margin: 0 auto; }
    .contract-document h1 { font-size: 20px; text-align: center; margin: 0 0 18px; }
    .contract-document h2 { font-size: 14px; margin: 22px 0 10px; border-bottom: 1px solid #ddd; padding-bottom: 5px; break-after: avoid; }
    .contract-document p { margin: 8px 0; }
    .contract-document .muted { color: #555; text-align: center; }
    .contract-document table { width: 100%; border-collapse: collapse; margin: 12px 0; break-inside: avoid; }
    .contract-document th, .contract-document td { border: 1px solid #ddd; padding: 8px; text-align: left; vertical-align: top; }
    .contract-document th { width: 32%; background: #f5f5f5; }
    .contract-document .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-top: 36px; break-inside: avoid; }
    @media print {
      body { padding: 0; }
      @page { margin: 14mm; }
      .contract-document { max-width: none; font-size: 11.5px; }
      .contract-document h1 { font-size: 18px; }
      .contract-document h2 { font-size: 13px; }
    }
  </style>
</head>
<body>
  ${html}
  <script>
    window.addEventListener('load', function () {
      setTimeout(function () {
        window.focus();
        window.print();
      }, 300);
    });
  </script>
</body>
</html>`)
    printWindow.document.close()
  }

  return (
    <>
      <Toaster position="top-right" />

      <div className="relative z-10 px-4 sm:px-6 md:px-8 pb-12 animate-fade-in-up print:p-0">
        <header className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 mb-8 print:hidden">
          <div>
            <Link href={source === 'cliente' ? '/dashboard/clientes' : '/dashboard/empresas'} className="inline-flex items-center gap-2 text-xs font-bold text-neutral-500 hover:text-white mb-4">
              <ArrowLeft size={14} />
              Voltar
            </Link>

            <div className="inline-flex items-center gap-2 rounded-full border border-[#6be12f]/20 bg-[#6be12f]/10 px-4 py-2 text-[11px] font-extrabold uppercase tracking-widest text-[#8cf059] mb-4">
              <FileText size={13} />
              Gerador de Contratos
            </div>

            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
              Gerador automático de contrato
            </h1>

            <p className="text-sm text-neutral-500 mt-2 max-w-2xl">
              Revise os dados preenchidos automaticamente antes de salvar, imprimir, gerar PDF ou enviar ao cliente.
            </p>

            {contratoSalvo?.id && (
              <div className="mt-4 inline-flex items-center gap-2 rounded-2xl border border-[#6be12f]/20 bg-[#6be12f]/10 px-4 py-2 text-xs font-bold text-[#8cf059]">
                <Database size={14} />
                {contratoSalvo.status === 'enviado' ? 'Contrato enviado' : 'Rascunho salvo'}: {contratoSalvo.id.slice(0, 8)}
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button onClick={atualizarPrevia} disabled={generating || loading || sending} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/[0.06] bg-white/[0.03] px-5 py-4 text-sm font-extrabold text-white hover:bg-white/[0.06] disabled:opacity-60">
              <RefreshCw size={17} />
              Atualizar prévia
            </button>
            <button onClick={salvarRascunho} disabled={savingDraft || loading || sending} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#6be12f]/20 bg-[#6be12f]/10 px-5 py-4 text-sm font-extrabold text-[#8cf059] hover:bg-[#6be12f]/15 disabled:opacity-60">
              <Database size={17} />
              {savingDraft ? 'Salvando...' : 'Salvar rascunho'}
            </button>
            <button onClick={enviarContrato} disabled={sending || loading || !html} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-blue-500/20 bg-blue-500/10 px-5 py-4 text-sm font-extrabold text-blue-300 hover:bg-blue-500/15 disabled:opacity-60">
              <Mail size={17} />
              {sending ? 'Enviando...' : 'Enviar por e-mail'}
            </button>
            <button onClick={copiarContrato} disabled={!html || sending} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/[0.06] bg-white/[0.03] px-5 py-4 text-sm font-extrabold text-white hover:bg-white/[0.06] disabled:opacity-60">
              <Copy size={17} />
              Copiar
            </button>
            <button onClick={imprimir} disabled={!html || sending} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#6be12f] px-5 py-4 text-sm font-extrabold text-black hover:bg-[#8cf059] disabled:opacity-60">
              <Printer size={17} />
              Imprimir/PDF
            </button>
          </div>
        </header>

        {loading ? (
          <div className="py-24 flex items-center justify-center print:hidden"><div className="w-14 h-14 rounded-full border-t-2 border-[#6be12f]/60 animate-spin" /></div>
        ) : !data ? (
          <div className="rounded-3xl border border-white/[0.05] bg-[#050505] p-12 text-center print:hidden">
            <Building2 size={34} className="mx-auto text-neutral-600 mb-4" />
            <h3 className="text-lg font-bold text-white">Contrato não encontrado</h3>
            <p className="text-sm text-neutral-500 mt-2">Verifique o cliente/empresa selecionado.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-[440px_1fr] gap-6 print:block">
            <aside className="rounded-[2rem] border border-white/[0.05] bg-white/[0.02] p-5 sm:p-6 h-fit print:hidden">
              <div className="mb-5">
                <h2 className="text-lg font-black text-white">Campos editáveis</h2>
                <p className="text-xs text-neutral-500 mt-1">Altere e clique em “Atualizar prévia”, “Salvar rascunho” ou “Enviar por e-mail”.</p>
              </div>

              <div className="flex gap-2 overflow-x-auto pb-3 mb-5">
                {tabs.map((tab) => (
                  <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`rounded-2xl px-4 py-2 text-xs font-black whitespace-nowrap border ${activeTab === tab.id ? 'bg-[#6be12f] text-black border-[#6be12f]' : 'bg-white/[0.03] text-neutral-400 border-white/[0.05]'}`}>
                    {tab.label}
                  </button>
                ))}
              </div>

              {activeTab === 'cliente' && (
                <FieldGroup>
                  <Field label="Nome/Razão Social" value={fieldValue(form, 'nome_razao_social')} onChange={(v) => updateField('nome_razao_social', v)} />
                  <Field label="CPF/CNPJ" value={fieldValue(form, 'cpf_cnpj')} onChange={(v) => updateField('cpf_cnpj', v)} />
                  <Field label="Endereço completo" value={fieldValue(form, 'endereco_completo')} onChange={(v) => updateField('endereco_completo', v)} />
                  <Field label="Nome do responsável" value={fieldValue(form, 'nome_responsavel')} onChange={(v) => updateField('nome_responsavel', v)} />
                  <Field label="Nacionalidade" value={fieldValue(form, 'nacionalidade')} onChange={(v) => updateField('nacionalidade', v)} />
                  <Field label="Estado civil" value={fieldValue(form, 'estado_civil')} onChange={(v) => updateField('estado_civil', v)} />
                  <Field label="Profissão/Cargo" value={fieldValue(form, 'profissao_cargo')} onChange={(v) => updateField('profissao_cargo', v)} />
                  <Field label="CPF do responsável" value={fieldValue(form, 'cpf_responsavel')} onChange={(v) => updateField('cpf_responsavel', v)} />
                  <Field label="E-mail" value={fieldValue(form, 'email')} onChange={(v) => updateField('email', v)} />
                  <Field label="Telefone" value={fieldValue(form, 'telefone')} onChange={(v) => updateField('telefone', v)} />
                </FieldGroup>
              )}

              {activeTab === 'plano' && (
                <FieldGroup>
                  <Field label="Plano contratado" value={fieldValue(form, 'plano_nome')} onChange={(v) => updateField('plano_nome', v)} />
                  <Field label="Tipo do plano" value={fieldValue(form, 'plano_tipo')} onChange={(v) => updateField('plano_tipo', v)} />
                  <Field label="Valor mensal" type="number" value={fieldValue(form, 'plano_valor_mensal')} onChange={(v) => updateField('plano_valor_mensal', v)} />
                  <Field label="Setup/implantação" type="number" value={fieldValue(form, 'plano_setup_implantacao')} onChange={(v) => updateField('plano_setup_implantacao', v)} />
                  <Field label="Forma de pagamento" value={fieldValue(form, 'plano_forma_pagamento')} onChange={(v) => updateField('plano_forma_pagamento', v)} />
                  <Field label="Dia de vencimento" value={fieldValue(form, 'plano_dia_vencimento')} onChange={(v) => updateField('plano_dia_vencimento', v)} />
                  <Field label="Hotspots incluídos" type="number" value={fieldValue(form, 'plano_quantidade_hotspots')} onChange={(v) => updateField('plano_quantidade_hotspots', v)} />
                  <Field label="Campanhas incluídas" type="number" value={fieldValue(form, 'plano_quantidade_campanhas')} onChange={(v) => updateField('plano_quantidade_campanhas', v)} />
                  <Field label="Usuários incluídos" type="number" value={fieldValue(form, 'plano_quantidade_usuarios')} onChange={(v) => updateField('plano_quantidade_usuarios', v)} />
                  <Field label="Data de início" type="date" value={fieldValue(form, 'plano_data_inicio')} onChange={(v) => updateField('plano_data_inicio', v)} />
                  <Field label="Data de término" type="date" value={fieldValue(form, 'plano_data_termino')} onChange={(v) => updateField('plano_data_termino', v)} />
                  <Field label="Observações" value={fieldValue(form, 'plano_observacoes')} onChange={(v) => updateField('plano_observacoes', v)} textarea />
                </FieldGroup>
              )}

              {activeTab === 'exclusividade' && (
                <FieldGroup>
                  <Field label="Texto padrão" value={fieldValue(form, 'exclusividade_texto_padrao')} onChange={(v) => updateField('exclusividade_texto_padrao', v)} textarea />
                  <Field label="Tipo" value={fieldValue(form, 'exclusividade_tipo')} onChange={(v) => updateField('exclusividade_tipo', v)} />
                  <Field label="Categoria protegida" value={fieldValue(form, 'exclusividade_categoria_protegida')} onChange={(v) => updateField('exclusividade_categoria_protegida', v)} />
                  <Field label="Local/região" value={fieldValue(form, 'exclusividade_local_regiao')} onChange={(v) => updateField('exclusividade_local_regiao', v)} />
                  <Field label="Hotspots protegidos" value={fieldValue(form, 'exclusividade_hotspots_protegidos')} onChange={(v) => updateField('exclusividade_hotspots_protegidos', v)} />
                  <Field label="Prazo" value={fieldValue(form, 'exclusividade_prazo')} onChange={(v) => updateField('exclusividade_prazo', v)} />
                  <Field label="Valor" value={fieldValue(form, 'exclusividade_valor')} onChange={(v) => updateField('exclusividade_valor', v)} />
                  <Field label="Observações" value={fieldValue(form, 'exclusividade_observacoes')} onChange={(v) => updateField('exclusividade_observacoes', v)} textarea />
                </FieldGroup>
              )}

              {activeTab === 'condicoes' && (
                <FieldGroup>
                  <Field label="Foro" value={fieldValue(form, 'condicoes_foro')} onChange={(v) => updateField('condicoes_foro', v)} />
                  <Field label="Número de vias" type="number" value={fieldValue(form, 'condicoes_numero_vias')} onChange={(v) => updateField('condicoes_numero_vias', v)} />
                  <Field label="Local de assinatura" value={fieldValue(form, 'condicoes_local_assinatura')} onChange={(v) => updateField('condicoes_local_assinatura', v)} />
                  <Field label="Data de assinatura" type="date" value={fieldValue(form, 'condicoes_data_assinatura')} onChange={(v) => updateField('condicoes_data_assinatura', v)} />
                  <Field label="Canais de suporte" value={fieldValue(form, 'condicoes_suporte_canais')} onChange={(v) => updateField('condicoes_suporte_canais', v)} textarea />
                  <Field label="Horário de atendimento" value={fieldValue(form, 'condicoes_horario_atendimento')} onChange={(v) => updateField('condicoes_horario_atendimento', v)} textarea />
                </FieldGroup>
              )}

              {activeTab === 'previa' && (
                <div className="rounded-3xl border border-[#6be12f]/20 bg-[#6be12f]/10 p-5">
                  <FileText className="text-[#8cf059] mb-3" size={24} />
                  <h3 className="text-base font-black text-white">Pronto para revisar</h3>
                  <p className="text-sm text-neutral-400 mt-2">Clique em atualizar prévia, salvar rascunho, enviar por e-mail ou imprimir/PDF.</p>
                </div>
              )}
            </aside>

            <main className="rounded-[2rem] border border-white/[0.05] bg-white p-5 sm:p-8 text-black print:border-0 print:rounded-none print:p-0">
              <div className="print:hidden mb-5 flex items-center justify-between gap-4 border-b border-black/10 pb-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-neutral-500">Prévia</p>
                  <h2 className="text-xl font-black text-black">{title}</h2>
                </div>
                <button onClick={atualizarPrevia} className="inline-flex items-center gap-2 rounded-xl bg-black px-4 py-2 text-xs font-black text-white">
                  <Save size={14} />
                  Aplicar edição
                </button>
              </div>

              <div id="contract-preview" className="contract-preview" dangerouslySetInnerHTML={{ __html: html }} />
            </main>
          </div>
        )}
      </div>

      <style jsx global>{`
        .contract-preview .contract-document { font-family: Arial, sans-serif; color: #111; line-height: 1.55; font-size: 13px; max-width: 900px; margin: 0 auto; }
        .contract-preview h1 { font-size: 22px; text-align: center; margin: 0 0 18px; }
        .contract-preview h2 { font-size: 15px; margin: 24px 0 10px; border-bottom: 1px solid #ddd; padding-bottom: 5px; }
        .contract-preview p { margin: 8px 0; }
        .contract-preview .muted { color: #555; text-align: center; }
        .contract-preview table { width: 100%; border-collapse: collapse; margin: 12px 0; }
        .contract-preview th, .contract-preview td { border: 1px solid #ddd; padding: 8px; text-align: left; vertical-align: top; }
        .contract-preview th { width: 32%; background: #f5f5f5; }
        .contract-preview .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-top: 36px; }
        @media print {
          body { background: #fff !important; }
          .contract-preview .contract-document { max-width: none; font-size: 11.5px; }
          .contract-preview h1 { font-size: 18px; }
          .contract-preview h2 { font-size: 13px; break-after: avoid; }
          .contract-preview table, .contract-preview p { break-inside: avoid; }
        }
      `}</style>
    </>
  )
}

function FieldGroup({ children }) {
  return <div className="grid gap-4">{children}</div>
}

function Field({ label, value, onChange, type = 'text', textarea = false }) {
  return (
    <label>
      <span className="text-[11px] uppercase tracking-widest font-extrabold text-neutral-500 mb-2 block">{label}</span>
      {textarea ? (
        <textarea value={value || ''} onChange={(event) => onChange(event.target.value)} rows={3} className="w-full bg-[#0a0a0a] border border-white/[0.05] text-white text-sm font-medium rounded-2xl block px-5 py-3.5 outline-none resize-none" />
      ) : (
        <input type={type} value={value || ''} onChange={(event) => onChange(event.target.value)} className="w-full bg-[#0a0a0a] border border-white/[0.05] text-white text-sm font-medium rounded-2xl block px-5 py-3.5 outline-none" />
      )}
    </label>
  )
}
