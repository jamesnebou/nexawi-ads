'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  ArrowRight,
  CheckCircle2,
  Circle,
  ClipboardCheck,
  FileText,
  Globe2,
  Megaphone,
  Network,
  RefreshCcw,
  Router,
  ShieldCheck,
  Wifi,
} from 'lucide-react'

const STORAGE_KEY = 'nexawi_checklist_nova_cidade_v1'

const grupos = [
  {
    id: 'comercial',
    titulo: 'Comercial e contrato',
    descricao: 'Confirma se a cidade pode virar operacao antes da configuracao tecnica.',
    icon: FileText,
    items: [
      {
        id: 'cliente-definido',
        texto: 'Cliente, cidade e responsavel comercial definidos.',
        rota: '/dashboard/clientes',
      },
      {
        id: 'plano-definido',
        texto: 'Plano, valor, prazo e escopo de midia local definidos.',
        rota: '/dashboard/financeiro',
      },
      {
        id: 'contrato-gerado',
        texto: 'Contrato gerado, enviado e vinculado ao cliente.',
        rota: '/dashboard/contratos',
      },
    ],
  },
  {
    id: 'landing',
    titulo: 'Landing da cidade',
    descricao: 'Prepara a pagina comercial da cidade para capturar novos anunciantes.',
    icon: Globe2,
    items: [
      {
        id: 'cidade-cadastrada',
        texto: 'Cidade cadastrada com slug, headline, CTA e WhatsApp.',
        rota: '/dashboard/cidades',
      },
      {
        id: 'precos-validos',
        texto: 'Planos e precos da landing conferidos.',
        rota: '/dashboard/cidades',
      },
      {
        id: 'pagina-publica-testada',
        texto: 'Pagina publica da cidade aberta e testada no celular.',
        rota: '/dashboard/cidades',
      },
    ],
  },
  {
    id: 'hotspot',
    titulo: 'Hotspot e local',
    descricao: 'Garante que o ponto Wi-Fi existe no painel e esta ligado a cidade correta.',
    icon: Wifi,
    items: [
      {
        id: 'hotspot-cadastrado',
        texto: 'Hotspot/local cadastrado com nome, cidade, endereco e status ativo.',
        rota: '/dashboard/hotspots',
      },
      {
        id: 'portal-slug',
        texto: 'Slug do portal conferido para /portal/[slug].',
        rota: '/dashboard/hotspots',
      },
      {
        id: 'hotspot-mikrotik-vinculo',
        texto: 'Hotspot vinculado ao MikroTik correto.',
        rota: '/dashboard/mikrotiks',
      },
    ],
  },
  {
    id: 'mikrotik',
    titulo: 'MikroTik remoto',
    descricao: 'Fecha a comunicacao por WireGuard e RouterOS REST sem depender de cabo.',
    icon: Router,
    items: [
      {
        id: 'wireguard-ok',
        texto: 'WireGuard configurado e com handshake recente.',
        rota: '/dashboard/mikrotiks',
      },
      {
        id: 'routeros-rest-ok',
        texto: 'Diagnóstico RouterOS REST retornando 200 pela VPS.',
        rota: '/dashboard/mikrotiks',
      },
      {
        id: 'hotspot1-validado',
        texto: 'Hotspot server, bridge e sub-rede validados no assistente.',
        rota: '/dashboard/mikrotiks',
      },
    ],
  },
  {
    id: 'portal',
    titulo: 'Portal cativo',
    descricao: 'Valida a jornada obrigatória do usuário final antes de liberar internet.',
    icon: ShieldCheck,
    items: [
      {
        id: 'lgpd-cpf',
        texto: 'Formulário exige nome, e-mail, telefone, CPF e aceite LGPD.',
        rota: '/dashboard/configuracoes',
      },
      {
        id: 'anuncio-obrigatorio',
        texto: 'Anuncio obrigatório com timer testado antes da liberação.',
        rota: '/dashboard/anuncios',
      },
      {
        id: 'mensagem-inatividade',
        texto: 'Mensagem de inatividade/expiração revisada no portal.',
        rota: '/dashboard/configuracoes',
      },
    ],
  },
  {
    id: 'rede',
    titulo: 'Controle de rede',
    descricao: 'Aplica política de bloqueio, testa preset e confirma reversão.',
    icon: Network,
    items: [
      {
        id: 'presets-aplicados',
        texto: 'Presets fortes selecionados e política aplicada no MikroTik real.',
        rota: '/dashboard/rede',
      },
      {
        id: 'bloqueio-testado',
        texto: 'Bloqueio e desbloqueio testados no celular sem cabo físico.',
        rota: '/dashboard/rede',
      },
      {
        id: 'regras-conferidas',
        texto: 'Regras DNS, filter e NAT conferidas na tela operacional.',
        rota: '/dashboard/rede',
      },
    ],
  },
  {
    id: 'campanhas',
    titulo: 'Campanhas e relatorios',
    descricao: 'Confirma que a cidade ja pode entregar valor para o anunciante.',
    icon: Megaphone,
    items: [
      {
        id: 'campanha-vinculada',
        texto: 'Campanha vinculada ao cliente e ao hotspot da cidade.',
        rota: '/dashboard/anuncios',
      },
      {
        id: 'metricas-testadas',
        texto: 'Lead, impressão e clique de teste registrados.',
        rota: '/dashboard/leads',
      },
      {
        id: 'relatorio-pronto',
        texto: 'Relatório comercial da cidade revisado.',
        rota: '/dashboard/relatorios/comercial',
      },
    ],
  },
  {
    id: 'golive',
    titulo: 'Go-live',
    descricao: 'Última checagem antes de liberar a cidade para operação.',
    icon: ClipboardCheck,
    items: [
      {
        id: 'teste-final-celular',
        texto: 'Teste final feito no celular: portal, anúncio, CTA e internet.',
        rota: '/dashboard/hotspots',
      },
      {
        id: 'acessos-guardados',
        texto: 'IPs, usuário técnico e dados de acesso guardados em local seguro.',
      },
      {
        id: 'equipe-avisada',
        texto: 'Equipe avisada que a cidade esta pronta para vender e operar.',
        rota: '/dashboard/notificacoes',
      },
    ],
  },
]

const totalItens = grupos.reduce((total, grupo) => total + grupo.items.length, 0)

export default function ChecklistNovaCidadePage() {
  const [concluidos, setConcluidos] = useState({})
  const [carregado, setCarregado] = useState(false)

  useEffect(() => {
    try {
      const salvo = window.localStorage.getItem(STORAGE_KEY)
      if (salvo) {
        setConcluidos(JSON.parse(salvo))
      }
    } catch (error) {
      console.error('Erro ao carregar checklist de nova cidade:', error)
    } finally {
      setCarregado(true)
    }
  }, [])

  useEffect(() => {
    if (!carregado) return

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(concluidos))
  }, [carregado, concluidos])

  const totalConcluido = useMemo(
    () => Object.values(concluidos).filter(Boolean).length,
    [concluidos],
  )

  const progresso = Math.round((totalConcluido / totalItens) * 100)

  function alternarItem(id) {
    setConcluidos((atual) => ({
      ...atual,
      [id]: !atual[id],
    }))
  }

  function limparChecklist() {
    setConcluidos({})
  }

  return (
    <main className="flex-1 min-w-0 max-w-full overflow-x-hidden p-3 sm:p-5 md:p-6 overflow-y-auto custom-scrollbar relative z-10 animate-fade-in-up">
      <div className="absolute top-16 left-1/2 -translate-x-1/2 w-[900px] h-[420px] bg-[#6be12f]/5 rounded-full blur-[150px] pointer-events-none z-0" />

      <div className="relative z-10 max-w-7xl mx-auto w-full min-w-0 space-y-5">
        <section className="rounded-[1.5rem] sm:rounded-[2rem] border border-white/[0.06] bg-[#080808]/95 p-4 sm:p-6 shadow-[0_24px_60px_rgba(0,0,0,0.45)]">
          <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#6be12f]/20 bg-[#6be12f]/10 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-[#9cf76b] mb-5">
                <ClipboardCheck size={15} />
                Checklist operacional
              </div>

              <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                Nova cidade NexaWi
              </h1>

              <p className="text-sm sm:text-base text-neutral-400 mt-3 leading-relaxed">
                Use esta tela para abrir uma nova cidade sem pular etapas comerciais,
                técnicas, LGPD, portal, MikroTik, controle de rede e relatorios.
              </p>
            </div>

            <div className="min-w-[240px] rounded-3xl border border-white/[0.06] bg-black/50 p-5">
              <div className="flex items-center justify-between gap-4 mb-3">
                <span className="text-xs font-black uppercase tracking-[0.16em] text-neutral-500">
                  Progresso
                </span>
                <span className="text-2xl font-black text-[#6be12f]">{progresso}%</span>
              </div>

              <div className="h-3 rounded-full bg-white/[0.06] overflow-hidden">
                <div
                  className="h-full rounded-full bg-[#6be12f] transition-all duration-500"
                  style={{ width: `${progresso}%` }}
                />
              </div>

              <p className="text-xs text-neutral-500 mt-3 font-bold">
                {totalConcluido} de {totalItens} etapas concluidas
              </p>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6">
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {grupos.map((grupo) => {
              const Icon = grupo.icon
              const concluidosGrupo = grupo.items.filter((item) => concluidos[item.id]).length

              return (
                <article
                  key={grupo.id}
                  className="rounded-[1.75rem] border border-white/[0.06] bg-[#090909] p-5 shadow-[0_20px_50px_rgba(0,0,0,0.35)]"
                >
                  <div className="flex items-start justify-between gap-4 mb-5">
                    <div className="flex items-start gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-[#6be12f]/10 border border-[#6be12f]/20 flex items-center justify-center text-[#6be12f] flex-shrink-0">
                        <Icon size={20} />
                      </div>

                      <div>
                        <h2 className="text-lg font-black text-white">{grupo.titulo}</h2>
                        <p className="text-xs text-neutral-500 mt-1 leading-relaxed">
                          {grupo.descricao}
                        </p>
                      </div>
                    </div>

                    <span className="rounded-full border border-white/[0.06] bg-white/[0.03] px-3 py-1 text-xs font-black text-neutral-400 whitespace-nowrap">
                      {concluidosGrupo}/{grupo.items.length}
                    </span>
                  </div>

                  <div className="space-y-3">
                    {grupo.items.map((item) => {
                      const ativo = Boolean(concluidos[item.id])
                      const CheckIcon = ativo ? CheckCircle2 : Circle

                      return (
                        <div
                          key={item.id}
                          className={`rounded-2xl border p-4 transition-all ${
                            ativo
                              ? 'border-[#6be12f]/25 bg-[#6be12f]/10'
                              : 'border-white/[0.06] bg-black/40 hover:border-white/[0.12]'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <button
                              type="button"
                              onClick={() => alternarItem(item.id)}
                              className={`mt-0.5 transition-colors ${
                                ativo ? 'text-[#6be12f]' : 'text-neutral-500 hover:text-white'
                              }`}
                              aria-label={ativo ? 'Marcar como pendente' : 'Marcar como concluido'}
                            >
                              <CheckIcon size={20} />
                            </button>

                            <div className="min-w-0 flex-1">
                              <p
                                className={`text-sm font-bold leading-relaxed ${
                                  ativo ? 'text-white' : 'text-neutral-300'
                                }`}
                              >
                                {item.texto}
                              </p>

                              {item.rota ? (
                                <Link
                                  href={item.rota}
                                  className="inline-flex items-center gap-1.5 text-xs font-black text-[#9cf76b] hover:text-[#6be12f] mt-3"
                                >
                                  Abrir modulo
                                  <ArrowRight size={13} />
                                </Link>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </article>
              )
            })}
          </section>

          <aside className="space-y-5">
            <div className="rounded-[1.75rem] border border-white/[0.06] bg-[#090909] p-5 sticky top-6">
              <h2 className="text-lg font-black text-white mb-2">Atalhos do go-live</h2>
              <p className="text-xs text-neutral-500 leading-relaxed mb-5">
                Ordem recomendada para evitar cidade vendida sem operacao pronta.
              </p>

              <div className="space-y-3">
                {[
                  ['/dashboard/contratos', 'Contratos'],
                  ['/dashboard/cidades', 'Cidades'],
                  ['/dashboard/hotspots', 'Hotspots'],
                  ['/dashboard/mikrotiks', 'MikroTiks'],
                  ['/dashboard/rede', 'Controle de Rede'],
                  ['/dashboard/anuncios', 'Campanhas'],
                  ['/dashboard/relatorios/comercial', 'Relatorio Comercial'],
                ].map(([href, label]) => (
                  <Link
                    key={href}
                    href={href}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-white/[0.06] bg-black/40 px-4 py-3 text-sm font-black text-neutral-300 hover:text-white hover:border-[#6be12f]/25 hover:bg-[#6be12f]/10 transition-all"
                  >
                    {label}
                    <ArrowRight size={15} className="text-[#6be12f]" />
                  </Link>
                ))}
              </div>

              <button
                type="button"
                onClick={limparChecklist}
                className="mt-5 w-full rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm font-black text-neutral-300 hover:text-white hover:bg-white/[0.06] transition-all flex items-center justify-center gap-2"
              >
                <RefreshCcw size={16} />
                Limpar checklist
              </button>
            </div>
          </aside>
        </div>
      </div>
    </main>
  )
}
