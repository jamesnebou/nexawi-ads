'use client'

import { useEffect, useMemo, useState } from 'react'
import { Award, Crown, Eye, EyeOff, Flame, Minus, Plus, RotateCcw, Sparkles, Trophy } from 'lucide-react'

const STORAGE_KEY = 'nexawi-pontuacao-dan-v1'

const initialTeams = [
  { id: 'se-vira', number: 1, name: 'Se Vira', score: 0 },
  { id: 'meta-dada-meta-batida', number: 2, name: 'Meta dada Meta Batida', score: 0 },
  { id: 'sobe-a-barra', number: 3, name: 'Sobe a Barra', score: 0 },
  { id: 'gestao-sem-mimimi', number: 4, name: 'Gestão sem MIMIMI', score: 0 },
  { id: 'nao-nada-passa-nada', number: 5, name: 'Não Passa Nada', score: 0 },
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
  const otherTeams = ranking.slice(1)
  const totalScore = teams.reduce((sum, team) => sum + Number(team.score || 0), 0)
  const revealedTeam = finalRanking[revealIndex]
  const winnerIsShowing = revealIndex === finalRanking.length - 1

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

  return (
    <main className="min-h-screen overflow-hidden bg-[#050505] text-white selection:bg-orange-500/30">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute left-1/2 top-[-220px] h-[560px] w-[980px] -translate-x-1/2 rounded-full bg-orange-700/12 blur-[130px]" />
        <div className="absolute bottom-[-220px] right-[-160px] h-[560px] w-[560px] rounded-full bg-orange-500/10 blur-[130px]" />
        <div className="absolute inset-0 opacity-[0.035] bg-[linear-gradient(to_right,#ffffff_1px,transparent_1px),linear-gradient(to_bottom,#ffffff_1px,transparent_1px)] bg-[size:92px_92px]" />
      </div>

      <section className="relative z-10 mx-auto flex min-h-screen w-full max-w-[1800px] flex-col px-5 py-5 sm:px-8 lg:px-10">
        <header className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-3 rounded-full border border-orange-500/20 bg-orange-500/10 px-5 py-3 text-base font-black uppercase tracking-[0.22em] text-orange-300 shadow-[0_0_30px_rgba(249,115,22,0.08)]">
              <Flame size={22} />
              DAN - Desenvolvimento e Aceleração de Negócios.
            </div>
            <h1 className="text-5xl font-black tracking-[-0.07em] text-white sm:text-7xl lg:text-8xl">
              Placar <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-300 via-orange-500 to-orange-900">ao vivo</span>
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <BigStat label="Total" value={formatNumber(totalScore)} />
            <BigStat label="Equipes" value="5" />
            <button onClick={() => setShowControls((value) => !value)} className="inline-flex items-center gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.04] px-5 py-4 text-base font-black text-neutral-300 transition hover:bg-white/[0.08] hover:text-white">
              {showControls ? <EyeOff size={20} /> : <Eye size={20} />}
              {showControls ? 'Ocultar controles' : 'Controles'}
            </button>
            <button onClick={startFinal} className="inline-flex items-center gap-2 rounded-2xl border border-orange-500/30 bg-orange-500/15 px-5 py-4 text-base font-black text-orange-300 transition hover:bg-orange-500/25">
              <Trophy size={20} />
              Final
            </button>
          </div>
        </header>

        <section className="grid flex-1 grid-cols-1 gap-5 xl:grid-cols-[1fr_420px]">
          <div className="grid min-h-0 grid-rows-[auto_1fr] gap-5">
            <LeaderCard team={leader} maxScore={maxScore} showControls={showControls} customPoints={customPoints} onUpdate={updateScore} />

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {otherTeams.map((team, index) => (
                <TeamCard
                  key={team.id}
                  team={team}
                  position={index + 2}
                  maxScore={maxScore}
                  showControls={showControls}
                  customPoints={customPoints}
                  onUpdate={updateScore}
                />
              ))}
            </div>
          </div>

          <aside className="space-y-5">
            <section className="rounded-[2.2rem] border border-orange-500/15 bg-gradient-to-br from-orange-500/10 via-white/[0.025] to-black p-6 shadow-2xl shadow-black/40">
              <div className="mb-5 flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-[1.4rem] bg-orange-500 text-black shadow-[0_0_35px_rgba(249,115,22,0.32)]">
                  <Crown size={32} />
                </div>
                <div>
                  <p className="text-base font-black uppercase tracking-[0.22em] text-orange-300">Líder</p>
                  <h2 className="text-3xl font-black leading-tight text-white">{leader?.name || '—'}</h2>
                </div>
              </div>
              <div className="rounded-[2rem] border border-white/[0.08] bg-black/35 p-6">
                <p className="text-lg font-black text-neutral-500">Pontuação</p>
                <p className="mt-1 text-8xl font-black tracking-[-0.09em] text-white">{formatNumber(leader?.score || 0)}</p>
              </div>
            </section>

            {showControls && (
              <section className="rounded-[2.2rem] border border-white/[0.06] bg-[#0a0a0a]/85 p-5 shadow-2xl shadow-black/40 backdrop-blur-xl">
                <div className="mb-5 flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-orange-500/20 bg-orange-500/10 text-orange-300">
                    <Sparkles size={22} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-white">Operação</h2>
                    <p className="text-sm text-neutral-500">Pontuar durante a prova.</p>
                  </div>
                </div>

                <label className="mb-5 block">
                  <span className="mb-2 block text-sm font-black uppercase tracking-[0.2em] text-neutral-600">Pontos</span>
                  <input
                    type="number"
                    min="1"
                    value={customPoints}
                    onChange={(event) => setCustomPoints(Number(event.target.value || 0))}
                    className="w-full rounded-2xl border border-white/[0.08] bg-black/70 px-5 py-5 text-3xl font-black text-white outline-none transition focus:border-orange-500/40"
                  />
                </label>

                <div className="grid gap-3">
                  {teams.map((team) => (
                    <div key={team.id} className="rounded-2xl border border-white/[0.06] bg-white/[0.025] p-3">
                      <p className="mb-3 text-lg font-black text-white">{team.number}. {team.name}</p>
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

            {showControls && (
              <button onClick={resetScores} className="w-full rounded-2xl border border-red-500/20 bg-red-500/10 px-5 py-5 text-lg font-black text-red-300 transition hover:bg-red-500/15">
                <RotateCcw className="mr-2 inline" size={20} />
                Zerar pontuações
              </button>
            )}
          </aside>
        </section>
      </section>

      {finalMode && revealedTeam && (
        <FinalReveal
          key={revealIndex}
          team={revealedTeam}
          revealIndex={revealIndex}
          totalTeams={finalRanking.length}
          winnerIsShowing={winnerIsShowing}
          onNext={nextReveal}
          onClose={() => setFinalMode(false)}
        />
      )}

      <style jsx global>{`
        @keyframes floatUp {
          0% { transform: translateY(28px) scale(.97); opacity: 0; }
          100% { transform: translateY(0) scale(1); opacity: 1; }
        }
        @keyframes pulseGlow {
          0%, 100% { box-shadow: 0 0 55px rgba(249, 115, 22, .18), inset 0 0 45px rgba(249, 115, 22, .035); }
          50% { box-shadow: 0 0 140px rgba(249, 115, 22, .36), inset 0 0 80px rgba(249, 115, 22, .075); }
        }
        @keyframes championPulse {
          0%, 100% { transform: scale(1); box-shadow: 0 0 120px rgba(249, 115, 22, .28); }
          50% { transform: scale(1.018); box-shadow: 0 0 240px rgba(249, 115, 22, .55); }
        }
        @keyframes crownBurst {
          0% { transform: scale(.35) rotate(-18deg); opacity: 0; filter: blur(8px); }
          55% { transform: scale(1.22) rotate(8deg); opacity: 1; filter: blur(0); }
          100% { transform: scale(1) rotate(0); opacity: 1; filter: blur(0); }
        }
        @keyframes ringExpand {
          0% { transform: translate(-50%, -50%) scale(.25); opacity: .72; }
          100% { transform: translate(-50%, -50%) scale(2.4); opacity: 0; }
        }
        @keyframes spotlightSweep {
          0% { transform: rotate(-26deg) translateX(-25%); opacity: .05; }
          50% { opacity: .22; }
          100% { transform: rotate(26deg) translateX(25%); opacity: .05; }
        }
        @keyframes mysteryPulse {
          0%, 100% { transform: scale(1); filter: blur(0); opacity: .82; }
          50% { transform: scale(1.08); filter: blur(1px); opacity: 1; }
        }
        @keyframes mysteryScan {
          0% { transform: translateX(-120%); }
          100% { transform: translateX(120%); }
        }
        @keyframes mysteryFloat {
          0%, 100% { transform: translateY(0) rotate(-2deg); opacity: .58; }
          50% { transform: translateY(-18px) rotate(2deg); opacity: 1; }
        }
        @keyframes revealPop {
          0% { transform: scale(.82) translateY(24px); opacity: 0; filter: blur(14px); }
          100% { transform: scale(1) translateY(0); opacity: 1; filter: blur(0); }
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
        @keyframes championSpark {
          0% { transform: translateY(0) scale(.6) rotate(0deg); opacity: 0; }
          15% { opacity: 1; }
          100% { transform: translateY(-95vh) scale(1.2) rotate(540deg); opacity: 0; }
        }
        @keyframes barGlow {
          0%, 100% { filter: brightness(1); }
          50% { filter: brightness(1.35); }
        }
        .animate-float-up { animation: floatUp .45s ease-out both; }
        .animate-pulse-glow { animation: pulseGlow 2.4s ease-in-out infinite; }
        .animate-champion-pulse { animation: championPulse 1.8s ease-in-out infinite; }
        .animate-crown-burst { animation: crownBurst .85s cubic-bezier(.2,1.4,.35,1) both; }
        .animate-mystery-pulse { animation: mysteryPulse 1.45s ease-in-out infinite; }
        .animate-reveal-pop { animation: revealPop .65s cubic-bezier(.2,1.3,.25,1) both; }
        .animate-bar-glow { animation: barGlow 1.8s ease-in-out infinite; }
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

function BigStat({ label, value }) {
  return (
    <div className="rounded-3xl border border-white/[0.06] bg-white/[0.025] px-6 py-4 backdrop-blur-xl">
      <p className="text-sm font-black uppercase tracking-[0.22em] text-neutral-600">{label}</p>
      <p className="text-4xl font-black tracking-[-0.08em] text-white">{value}</p>
    </div>
  )
}

function LeaderCard({ team, maxScore, showControls, customPoints, onUpdate }) {
  const progress = Math.min(100, Math.round((Number(team?.score || 0) / maxScore) * 100))

  return (
    <section className="animate-pulse-glow relative overflow-hidden rounded-[3rem] border border-orange-500/35 bg-gradient-to-br from-orange-500/[0.18] via-[#121212] to-black p-8 shadow-2xl shadow-orange-950/20">
      <div className="absolute right-[-90px] top-[-130px] h-[320px] w-[320px] rounded-full bg-orange-500/20 blur-[80px]" />
      <div className="absolute bottom-[-140px] left-[18%] h-[260px] w-[420px] rounded-full bg-orange-900/25 blur-[90px]" />

      <div className="relative z-10 grid gap-8 xl:grid-cols-[1fr_360px] xl:items-center">
        <div>
          <div className="mb-5 inline-flex items-center gap-3 rounded-full bg-orange-500 px-5 py-3 text-xl font-black uppercase tracking-[0.18em] text-black">
            <Crown size={28} />
            1º lugar
          </div>
          <h2 className="text-6xl font-black leading-[0.9] tracking-[-0.08em] text-white sm:text-7xl 2xl:text-8xl">
            {team?.name || '—'}
          </h2>
          <p className="mt-4 text-2xl font-black uppercase tracking-[0.2em] text-orange-300">Equipe {team?.number || '—'}</p>
        </div>

        <div className="rounded-[2.5rem] border border-white/[0.08] bg-black/35 p-7 text-right backdrop-blur-xl">
          <p className="text-2xl font-black uppercase tracking-[0.18em] text-neutral-500">Pontos</p>
          <p className="text-8xl font-black leading-none tracking-[-0.1em] text-white 2xl:text-9xl">{formatNumber(team?.score || 0)}</p>
        </div>
      </div>

      <div className="relative z-10 mt-8 h-8 overflow-hidden rounded-full bg-black/55 ring-1 ring-white/[0.08]">
        <div className="animate-bar-glow h-full rounded-full bg-gradient-to-r from-orange-950 via-orange-600 to-orange-300 transition-all duration-700" style={{ width: `${progress}%` }} />
      </div>

      {showControls && (
        <div className="relative z-10 mt-6 flex flex-wrap gap-3">
          <ControlButton onClick={() => onUpdate(team.id, -customPoints)} variant="ghost"><Minus size={20} /> {customPoints}</ControlButton>
          <ControlButton onClick={() => onUpdate(team.id, customPoints)}><Plus size={20} /> {customPoints}</ControlButton>
        </div>
      )}
    </section>
  )
}

function TeamCard({ team, position, maxScore, showControls, customPoints, onUpdate }) {
  const progress = Math.min(100, Math.round((Number(team.score || 0) / maxScore) * 100))

  return (
    <section className="animate-float-up rounded-[2.4rem] border border-white/[0.07] bg-[#0b0b0b]/85 p-6 shadow-xl shadow-black/30 backdrop-blur-xl transition-all duration-500">
      <div className="mb-5 flex items-center justify-between gap-5">
        <div className="flex min-w-0 items-center gap-5">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-[1.6rem] border border-white/[0.08] bg-white/[0.04] text-4xl font-black text-orange-300">
            {position}º
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-4xl font-black tracking-[-0.06em] text-white 2xl:text-5xl">{team.name}</h3>
            <p className="mt-1 text-xl font-black uppercase tracking-[0.18em] text-neutral-600">Equipe {team.number}</p>
          </div>
        </div>

        <div className="text-right">
          <p className="text-lg font-black uppercase tracking-[0.18em] text-neutral-600">Pontos</p>
          <p className="text-6xl font-black tracking-[-0.09em] text-white 2xl:text-7xl">{formatNumber(team.score)}</p>
        </div>
      </div>

      <div className="h-6 overflow-hidden rounded-full bg-white/[0.055] ring-1 ring-white/[0.06]">
        <div className="h-full rounded-full bg-gradient-to-r from-orange-950 via-orange-600 to-orange-300 transition-all duration-700" style={{ width: `${progress}%` }} />
      </div>

      {showControls && (
        <div className="mt-5 flex flex-wrap gap-3">
          <ControlButton onClick={() => onUpdate(team.id, -customPoints)} variant="ghost"><Minus size={18} /> {customPoints}</ControlButton>
          <ControlButton onClick={() => onUpdate(team.id, customPoints)}><Plus size={18} /> {customPoints}</ControlButton>
        </div>
      )}
    </section>
  )
}

function ControlButton({ children, onClick, variant = 'solid' }) {
  return (
    <button
      onClick={onClick}
      className={variant === 'ghost'
        ? 'inline-flex items-center gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.035] px-5 py-3 text-lg font-black text-neutral-200 transition hover:bg-white/[0.08]'
        : 'inline-flex items-center gap-2 rounded-2xl bg-orange-500 px-5 py-3 text-lg font-black text-black transition hover:bg-orange-400'}
    >
      {children}
    </button>
  )
}

function SmallButton({ children, onClick }) {
  return (
    <button onClick={onClick} className="rounded-xl border border-orange-500/20 bg-orange-500/10 px-3 py-3 text-base font-black text-orange-300 transition hover:bg-orange-500 hover:text-black">
      {children}
    </button>
  )
}

function FinalReveal({ team, revealIndex, totalTeams, winnerIsShowing, onNext, onClose }) {
  const [secondNameRevealed, setSecondNameRevealed] = useState(false)
  const isSecondPlace = revealIndex === totalTeams - 2
  const shouldHideSecondName = isSecondPlace && !secondNameRevealed

  if (shouldHideSecondName) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-black/95 px-5 backdrop-blur-2xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(249,115,22,0.22),transparent_38%)]" />
        <div className="absolute left-1/2 top-1/2 h-[720px] w-[720px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-orange-500/15" style={{ animation: 'ringExpand 2.4s ease-out infinite' }} />
        <div className="absolute left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-orange-500/20" style={{ animation: 'ringExpand 2.4s ease-out .55s infinite' }} />
        <div className="absolute inset-y-[-30%] left-1/2 w-[260px] origin-center bg-orange-500/10 blur-2xl" style={{ animation: 'spotlightSweep 2.8s ease-in-out infinite' }} />

        {Array.from({ length: 18 }).map((_, index) => (
          <span
            key={index}
            className="absolute text-6xl font-black text-orange-500/20"
            style={{
              left: `${8 + ((index * 17) % 84)}%`,
              top: `${8 + ((index * 23) % 78)}%`,
              animation: `mysteryFloat ${2.8 + (index % 5) * .35}s ease-in-out ${(index % 6) * .18}s infinite`,
            }}
          >
            ?
          </span>
        ))}

        <div className="relative z-10 w-full max-w-6xl overflow-hidden rounded-[3.5rem] border border-orange-500/25 bg-[#080808] p-10 text-center shadow-[0_0_130px_rgba(249,115,22,0.2)]">
          <div className="absolute inset-0 opacity-30" style={{ background: 'linear-gradient(90deg, transparent, rgba(249,115,22,.24), transparent)', animation: 'mysteryScan 1.55s linear infinite' }} />

          <div className="relative z-10 mx-auto mb-9 flex h-32 w-32 animate-mystery-pulse items-center justify-center rounded-[2.4rem] border border-orange-500/30 bg-orange-500/10 text-8xl font-black text-orange-300 shadow-[0_0_70px_rgba(249,115,22,0.28)]">
            ?
          </div>

          <p className="relative z-10 mb-6 text-3xl font-black uppercase tracking-[0.35em] text-orange-300">
            Atenção...
          </p>

          <h2 className="relative z-10 mb-7 text-7xl font-black tracking-[-0.08em] text-white sm:text-8xl 2xl:text-9xl">
            Quem ficou em <span className="text-orange-400">2º lugar?</span>
          </h2>

          <p className="relative z-10 mx-auto mb-10 max-w-4xl text-3xl font-black uppercase tracking-[0.18em] text-neutral-500">
            O vice-campeão será revelado agora
          </p>

          <div className="relative z-10 flex justify-center gap-4">
            <button onClick={() => setSecondNameRevealed(true)} className="rounded-2xl bg-orange-500 px-12 py-6 text-2xl font-black text-black transition hover:bg-orange-400">
              Revelar 2º colocado
            </button>
            <button onClick={onClose} className="rounded-2xl border border-white/[0.08] bg-white/[0.03] px-10 py-6 text-2xl font-black text-white transition hover:bg-white/[0.06]">
              Fechar
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center overflow-hidden px-5 backdrop-blur-2xl ${winnerIsShowing ? 'bg-black/96' : 'bg-black/92'}`}>
      {winnerIsShowing && (
        <>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(249,115,22,0.35),transparent_38%)]" />
          <div className="absolute left-1/2 top-1/2 h-[820px] w-[820px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-orange-400/25" style={{ animation: 'ringExpand 1.8s ease-out infinite' }} />
          <div className="absolute left-1/2 top-1/2 h-[620px] w-[620px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-orange-300/25" style={{ animation: 'ringExpand 1.8s ease-out .35s infinite' }} />
          <div className="absolute left-1/2 top-1/2 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-orange-200/25" style={{ animation: 'ringExpand 1.8s ease-out .7s infinite' }} />
          <div className="absolute inset-y-[-30%] left-1/2 w-[320px] origin-center bg-orange-400/12 blur-2xl" style={{ animation: 'spotlightSweep 2.15s ease-in-out infinite' }} />
          <div className="absolute inset-y-[-30%] left-1/2 w-[320px] origin-center bg-orange-800/12 blur-2xl" style={{ animation: 'spotlightSweep 2.15s ease-in-out .95s infinite reverse' }} />
        </>
      )}

      {Array.from({ length: winnerIsShowing ? 96 : 56 }).map((_, index) => (
        <span
          key={index}
          className={`absolute rounded-full ${winnerIsShowing ? 'h-7 w-3 bg-orange-400' : 'h-5 w-2 bg-orange-500/80'}`}
          style={{
            left: `${(index * 19) % 100}%`,
            animation: `${winnerIsShowing ? 'championSpark' : 'confettiFall'} ${2.3 + (index % 7) * 0.22}s linear ${(index % 9) * 0.11}s infinite`,
          }}
        />
      ))}

      <div className={`relative z-10 w-full text-center ${winnerIsShowing ? 'max-w-7xl animate-champion-pulse rounded-[4rem] border-2 border-orange-400/40 bg-gradient-to-br from-orange-500/18 via-[#080808] to-black p-10 shadow-[0_0_180px_rgba(249,115,22,0.34)] sm:p-14' : 'max-w-6xl rounded-[3.5rem] border border-orange-500/30 bg-[#080808] p-8 shadow-[0_0_130px_rgba(249,115,22,0.22)] sm:p-12'}`}>
        <div className={`mx-auto mb-8 flex items-center justify-center bg-orange-500 text-black shadow-[0_0_80px_rgba(249,115,22,0.48)] ${winnerIsShowing ? 'animate-crown-burst h-40 w-40 rounded-[2.8rem]' : 'h-32 w-32 rounded-[2.4rem]'}`}>
          {winnerIsShowing ? <Crown size={86} /> : <Award size={64} />}
        </div>

        <p className={`mb-5 font-black uppercase text-orange-300 ${winnerIsShowing ? 'text-4xl tracking-[0.38em]' : 'text-2xl tracking-[0.35em]'}`}>
          {winnerIsShowing ? 'É CAMPEÃO!' : getRevealPosition(revealIndex)}
        </p>

        {winnerIsShowing && (
          <p className="mb-5 text-3xl font-black uppercase tracking-[0.24em] text-white/70">
            A equipe vencedora da gincana é
          </p>
        )}

        <h2 className={`text-shimmer mb-7 font-black tracking-[-0.08em] ${winnerIsShowing ? 'text-8xl sm:text-9xl 2xl:text-[11rem]' : 'text-7xl sm:text-8xl 2xl:text-9xl'} animate-reveal-pop`}>
          {team.name}
        </h2>

        <div className={`mx-auto mb-9 rounded-[2.4rem] border border-white/[0.08] bg-white/[0.035] p-7 ${winnerIsShowing ? 'max-w-2xl' : 'max-w-xl'}`}>
          <p className="text-xl font-black uppercase tracking-[0.22em] text-neutral-500">Pontuação final</p>
          <p className={`mt-2 font-black tracking-[-0.08em] text-white ${winnerIsShowing ? 'text-9xl' : 'text-8xl'}`}>{formatNumber(team.score)}</p>
        </div>

        {winnerIsShowing && (
          <div className="mx-auto mb-9 max-w-4xl rounded-[2rem] border border-orange-500/25 bg-orange-500/10 px-8 py-5">
            <p className="text-3xl font-black uppercase tracking-[0.18em] text-orange-200">
              Agora é hora de comemorar!
            </p>
          </div>
        )}

        <div className="flex flex-col justify-center gap-4 sm:flex-row">
          <button onClick={onNext} className="rounded-2xl bg-orange-500 px-10 py-5 text-xl font-black text-black transition hover:bg-orange-400">
            {winnerIsShowing ? 'Encerrar' : 'Revelar próximo'}
          </button>
          <button onClick={onClose} className="rounded-2xl border border-white/[0.08] bg-white/[0.03] px-10 py-5 text-xl font-black text-white transition hover:bg-white/[0.06]">
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}
