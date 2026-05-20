'use client'

import { useEffect, useMemo, useState } from 'react'
import { Award, Crown, Eye, EyeOff, Flame, Minus, Plus, RotateCcw, Sparkles, Trophy } from 'lucide-react'

const STORAGE_KEY = 'nexawi-pontuacao-dan-v1'

const initialTeams = [
  { id: 'se-vira', number: 1, name: 'Se Vira', score: 0 },
  { id: 'meta-dada-meta-batida', number: 2, name: 'Meta dada Meta Batida', score: 0 },
  { id: 'sobe-a-barra', number: 3, name: 'Sobe a Barra', score: 0 },
  { id: 'gestao-sem-mimimi', number: 4, name: 'Gestão sem MIMIMI', score: 0 },
  { id: 'nao-nada-eu-quero-e-venda', number: 5, name: 'Não Nada eu Quero é Venda', score: 0 },
]

function sortTeams(teams) {
  return [...teams].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    return a.number - b.number
  })
}

function formatNumber(value) {
  return new Intl.NumberFormat('pt-BR').format(Number(value || 0))
}

function getPositionLabel(index) {
  return `${index + 1}º`
}

function getRevealPosition(index) {
  return `${5 - index}º colocado`
}

export default function PontuacaoDanPage() {
  const [teams, setTeams] = useState(initialTeams)
  const [customPoints, setCustomPoints] = useState(10)
  const [showControls, setShowControls] = useState(true)
  const [finalMode, setFinalMode] = useState(false)
  const [revealIndex, setRevealIndex] = useState(0)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed?.teams)) {
          const merged = initialTeams.map((team) => {
            const saved = parsed.teams.find((item) => item.id === team.id)
            return saved ? { ...team, score: Number(saved.score || 0) } : team
          })
          setTeams(merged)
        }
      }
    } catch (error) {
      console.error('Erro ao carregar placar:', error)
    } finally {
      setHydrated(true)
    }
  }, [])

  useEffect(() => {
    if (!hydrated) return
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ teams }))
  }, [teams, hydrated])

  const ranking = useMemo(() => sortTeams(teams), [teams])
  const finalRanking = useMemo(() => [...ranking].reverse(), [ranking])
  const maxScore = Math.max(...teams.map((team) => team.score), 1)
  const leader = ranking[0]
  const totalScore = teams.reduce((sum, team) => sum + Number(team.score || 0), 0)

  function updateScore(teamId, delta) {
    setTeams((current) => current.map((team) => {
      if (team.id !== teamId) return team
      return { ...team, score: Math.max(0, Number(team.score || 0) + Number(delta || 0)) }
    }))
  }

  function resetScores() {
    if (!window.confirm('Tem certeza que deseja zerar todas as pontuações?')) return
    setTeams(initialTeams)
    setFinalMode(false)
    setRevealIndex(0)
  }

  function startFinal() {
    setRevealIndex(0)
    setFinalMode(true)
  }

  function nextReveal() {
    if (revealIndex >= finalRanking.length - 1) {
      setFinalMode(false)
      setRevealIndex(0)
      return
    }
    setRevealIndex((current) => current + 1)
  }

  const revealedTeam = finalRanking[revealIndex]
  const winnerIsShowing = revealIndex === finalRanking.length - 1

  return (
    <main className="min-h-screen overflow-hidden bg-[#050505] text-white selection:bg-orange-500/30">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute left-1/2 top-[-140px] h-[420px] w-[760px] -translate-x-1/2 rounded-full bg-orange-700/10 blur-[120px]" />
        <div className="absolute bottom-[-180px] right-[-120px] h-[460px] w-[460px] rounded-full bg-orange-500/10 blur-[130px]" />
        <div className="absolute inset-0 opacity-[0.04] bg-[linear-gradient(to_right,#ffffff_1px,transparent_1px),linear-gradient(to_bottom,#ffffff_1px,transparent_1px)] bg-[size:72px_72px]" />
      </div>

      <section className="relative z-10 mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8">
        <header className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-orange-500/20 bg-orange-500/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.28em] text-orange-300 shadow-[0_0_30px_rgba(249,115,22,0.08)]">
              <Flame size={14} />
              Gincana Dan
            </div>
            <h1 className="max-w-4xl text-4xl font-black tracking-[-0.06em] text-white sm:text-6xl lg:text-7xl">
              Pontuação <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-300 via-orange-500 to-orange-800">ao vivo</span>
            </h1>
            <p className="mt-4 max-w-2xl text-sm font-medium leading-6 text-neutral-500 sm:text-base">
              Ranking automático por maior pontuação. Atualize os pontos durante a gincana e a ordem das equipes muda em tempo real.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 sm:min-w-[460px]">
            <StatCard label="Líder" value={leader?.name || '—'} compact />
            <StatCard label="Total" value={formatNumber(totalScore)} />
            <StatCard label="Equipes" value="5" />
          </div>
        </header>

        <div className="grid flex-1 grid-cols-1 gap-6 xl:grid-cols-[1fr_390px]">
          <section className="rounded-[2rem] border border-white/[0.06] bg-white/[0.025] p-4 shadow-2xl shadow-black/40 backdrop-blur-xl sm:p-6">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-black tracking-tight text-white">Ranking geral</h2>
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-neutral-600">Maior pontuação no topo</p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button onClick={() => setShowControls((value) => !value)} className="inline-flex items-center gap-2 rounded-2xl border border-white/[0.06] bg-white/[0.03] px-4 py-3 text-xs font-black text-neutral-300 transition hover:bg-white/[0.06] hover:text-white">
                  {showControls ? <EyeOff size={15} /> : <Eye size={15} />}
                  {showControls ? 'Ocultar controles' : 'Mostrar controles'}
                </button>
                <button onClick={startFinal} className="inline-flex items-center gap-2 rounded-2xl border border-orange-500/25 bg-orange-500/10 px-4 py-3 text-xs font-black text-orange-300 transition hover:bg-orange-500/15">
                  <Trophy size={15} />
                  Modo final
                </button>
              </div>
            </div>

            <div className="grid gap-3">
              {ranking.map((team, index) => (
                <RankingRow
                  key={team.id}
                  team={team}
                  index={index}
                  maxScore={maxScore}
                  showControls={showControls}
                  customPoints={customPoints}
                  onUpdate={updateScore}
                />
              ))}
            </div>
          </section>

          <aside className="space-y-6">
            {showControls && (
              <section className="rounded-[2rem] border border-white/[0.06] bg-[#0a0a0a]/80 p-5 shadow-2xl shadow-black/40 backdrop-blur-xl">
                <div className="mb-5 flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-orange-500/20 bg-orange-500/10 text-orange-300">
                    <Sparkles size={20} />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-white">Controle rápido</h2>
                    <p className="text-xs text-neutral-500">Use durante a competição.</p>
                  </div>
                </div>

                <label className="mb-4 block">
                  <span className="mb-2 block text-[11px] font-black uppercase tracking-[0.22em] text-neutral-600">Pontuação personalizada</span>
                  <input
                    type="number"
                    min="1"
                    value={customPoints}
                    onChange={(event) => setCustomPoints(Number(event.target.value || 0))}
                    className="w-full rounded-2xl border border-white/[0.06] bg-black/60 px-5 py-4 text-lg font-black text-white outline-none transition focus:border-orange-500/40"
                  />
                </label>

                <div className="grid gap-3">
                  {teams.map((team) => (
                    <div key={team.id} className="rounded-2xl border border-white/[0.05] bg-white/[0.025] p-3">
                      <p className="mb-3 text-sm font-black text-white">Equipe {team.number} · {team.name}</p>
                      <div className="grid grid-cols-4 gap-2">
                        <SmallButton onClick={() => updateScore(team.id, 1)}>+1</SmallButton>
                        <SmallButton onClick={() => updateScore(team.id, 5)}>+5</SmallButton>
                        <SmallButton onClick={() => updateScore(team.id, 10)}>+10</SmallButton>
                        <SmallButton onClick={() => updateScore(team.id, customPoints)}>+{customPoints || 0}</SmallButton>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <section className="rounded-[2rem] border border-orange-500/15 bg-gradient-to-br from-orange-500/10 via-white/[0.025] to-black p-5 shadow-2xl shadow-black/40">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-500 text-black shadow-[0_0_35px_rgba(249,115,22,0.28)]">
                  <Crown size={21} />
                </div>
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.22em] text-orange-300">Líder atual</p>
                  <h2 className="text-xl font-black text-white">{leader?.name || '—'}</h2>
                </div>
              </div>
              <div className="rounded-3xl border border-white/[0.06] bg-black/35 p-5">
                <p className="text-sm font-bold text-neutral-500">Pontuação</p>
                <p className="mt-1 text-6xl font-black tracking-[-0.08em] text-white">{formatNumber(leader?.score || 0)}</p>
              </div>
            </section>

            {showControls && (
              <button onClick={resetScores} className="w-full rounded-2xl border border-red-500/20 bg-red-500/10 px-5 py-4 text-sm font-black text-red-300 transition hover:bg-red-500/15">
                <RotateCcw className="mr-2 inline" size={16} />
                Zerar pontuações
              </button>
            )}
          </aside>
        </div>
      </section>

      {finalMode && revealedTeam && (
        <FinalReveal
          team={revealedTeam}
          revealIndex={revealIndex}
          winnerIsShowing={winnerIsShowing}
          onNext={nextReveal}
          onClose={() => setFinalMode(false)}
        />
      )}

      <style jsx global>{`
        @keyframes floatUp {
          0% { transform: translateY(30px) scale(.94); opacity: 0; }
          100% { transform: translateY(0) scale(1); opacity: 1; }
        }
        @keyframes pulseGlow {
          0%, 100% { box-shadow: 0 0 40px rgba(249, 115, 22, .16); }
          50% { box-shadow: 0 0 95px rgba(249, 115, 22, .34); }
        }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes confettiFall {
          0% { transform: translateY(-30vh) rotate(0deg); opacity: 0; }
          10% { opacity: 1; }
          100% { transform: translateY(115vh) rotate(720deg); opacity: 0; }
        }
        .animate-float-up { animation: floatUp .45s ease-out both; }
        .animate-pulse-glow { animation: pulseGlow 2.4s ease-in-out infinite; }
        .text-shimmer {
          background: linear-gradient(90deg, #fff, #fb923c, #fff, #9a3412);
          background-size: 220% 100%;
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          animation: shimmer 4s linear infinite;
        }
      `}</style>
    </main>
  )
}

function StatCard({ label, value, compact = false }) {
  return (
    <div className="rounded-3xl border border-white/[0.06] bg-white/[0.025] p-4 backdrop-blur-xl">
      <p className="mb-2 text-[10px] font-black uppercase tracking-[0.22em] text-neutral-600">{label}</p>
      <p className={`${compact ? 'text-sm leading-tight' : 'text-3xl'} font-black text-white`}>{value}</p>
    </div>
  )
}

function RankingRow({ team, index, maxScore, showControls, customPoints, onUpdate }) {
  const progress = Math.min(100, Math.round((Number(team.score || 0) / maxScore) * 100))
  const isLeader = index === 0

  return (
    <div className={`animate-float-up rounded-[1.7rem] border p-4 transition-all duration-500 ${isLeader ? 'border-orange-500/30 bg-orange-500/[0.08] animate-pulse-glow' : 'border-white/[0.06] bg-[#0b0b0b]/70'}`} style={{ animationDelay: `${index * 60}ms` }}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
        <div className="flex flex-1 items-center gap-4">
          <div className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl text-xl font-black ${isLeader ? 'bg-orange-500 text-black' : 'bg-white/[0.05] text-white'}`}>
            {getPositionLabel(index)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <p className="truncate text-xl font-black tracking-tight text-white sm:text-2xl">{team.name}</p>
              {isLeader && <span className="rounded-full bg-orange-500 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-black">Líder</span>}
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-white/[0.05]">
              <div className="h-full rounded-full bg-gradient-to-r from-orange-900 via-orange-500 to-orange-300 transition-all duration-700" style={{ width: `${progress}%` }} />
            </div>
            <p className="mt-2 text-xs font-bold uppercase tracking-[0.18em] text-neutral-600">Equipe {team.number}</p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 lg:min-w-[270px]">
          <div className="text-right">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-neutral-600">Pontos</p>
            <p className="text-4xl font-black tracking-[-0.08em] text-white">{formatNumber(team.score)}</p>
          </div>

          {showControls && (
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => onUpdate(team.id, -customPoints)} className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.03] text-neutral-300 transition hover:bg-white/[0.06] hover:text-white">
                <Minus size={16} />
              </button>
              <button onClick={() => onUpdate(team.id, customPoints)} className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-500 text-black transition hover:bg-orange-400">
                <Plus size={16} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function SmallButton({ children, onClick }) {
  return (
    <button onClick={onClick} className="rounded-xl border border-orange-500/20 bg-orange-500/10 px-3 py-2 text-xs font-black text-orange-300 transition hover:bg-orange-500 hover:text-black">
      {children}
    </button>
  )
}

function FinalReveal({ team, revealIndex, winnerIsShowing, onNext, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-black/90 px-5 backdrop-blur-2xl">
      {Array.from({ length: 42 }).map((_, index) => (
        <span
          key={index}
          className="absolute h-3 w-1.5 rounded-full bg-orange-500/80"
          style={{
            left: `${(index * 19) % 100}%`,
            animation: `confettiFall ${3.2 + (index % 7) * 0.25}s linear ${(index % 9) * 0.18}s infinite`,
          }}
        />
      ))}

      <div className="relative z-10 w-full max-w-4xl rounded-[3rem] border border-orange-500/25 bg-[#080808] p-6 text-center shadow-[0_0_110px_rgba(249,115,22,0.18)] sm:p-10">
        <div className="mx-auto mb-7 flex h-24 w-24 items-center justify-center rounded-[2rem] bg-orange-500 text-black shadow-[0_0_55px_rgba(249,115,22,0.38)]">
          {winnerIsShowing ? <Crown size={44} /> : <Award size={44} />}
        </div>

        <p className="mb-4 text-[12px] font-black uppercase tracking-[0.35em] text-orange-300">
          {winnerIsShowing ? 'Grande campeão' : getRevealPosition(revealIndex)}
        </p>

        <h2 className="text-shimmer mb-5 text-5xl font-black tracking-[-0.08em] sm:text-7xl">
          {team.name}
        </h2>

        <div className="mx-auto mb-8 max-w-sm rounded-[2rem] border border-white/[0.08] bg-white/[0.035] p-5">
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-neutral-500">Pontuação final</p>
          <p className="mt-2 text-6xl font-black tracking-[-0.08em] text-white">{formatNumber(team.score)}</p>
        </div>

        <div className="flex flex-col justify-center gap-3 sm:flex-row">
          <button onClick={onNext} className="rounded-2xl bg-orange-500 px-8 py-4 text-sm font-black text-black transition hover:bg-orange-400">
            {winnerIsShowing ? 'Encerrar apresentação' : 'Revelar próximo'}
          </button>
          <button onClick={onClose} className="rounded-2xl border border-white/[0.08] bg-white/[0.03] px-8 py-4 text-sm font-black text-white transition hover:bg-white/[0.06]">
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}
