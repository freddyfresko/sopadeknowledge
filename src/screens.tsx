/**
 * Game Screens — Sopa de Knowledge
 *
 * Todas las pantallas del juego organizadas como componentes exportables.
 * Importan desde data/index para tener acceso a todas las palabras.
 */
import { useState } from 'react'
import type { PlayerProgress, GameStats, Achievement, PowerUpType } from './game/types'
import { allWords, categories } from './data/index'
import { ACHIEVEMENTS } from './data/achievements'
import { getRank } from './game/progression'
import { DAILY_REWARDS } from './game/economy'
import { RANKS } from './game/ranks'

/* ─── Store Screen (enhanced with functional purchases) ─── */

export function StoreScreen({ progress, onBack, onBuy }: {
  progress: PlayerProgress
  onBack: () => void
  onBuy: (type: PowerUpType) => void
}) {
  const hintPacks = [
    { type: 'hint' as PowerUpType, name: 'Pack de Pistas', desc: '5 pistas', count: 5, price: 15 },
    { type: 'reveal' as PowerUpType, name: 'Revelar Palabra', desc: '1 revelación', count: 1, price: 30 },
    { type: 'shuffle' as PowerUpType, name: 'Mezclar Grid', desc: '1 mezcla', count: 1, price: 20 },
    { type: 'eliminate' as PowerUpType, name: 'Eliminar Letras', desc: '1 eliminación', count: 1, price: 20 },
    { type: 'freeze' as PowerUpType, name: 'Congelar Tiempo', desc: '1 congelación', count: 1, price: 25 },
  ]
  return (
    <div className="flex-1 flex flex-col overflow-y-auto bg-bg-primary">
      <div className="bg-bg-card border-b border-border-subtle">
        <div className="max-w-lg mx-auto w-full flex items-center justify-between px-4 py-3">
          <button onClick={onBack} className="flex items-center gap-1 text-sm text-text-muted hover:text-white transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            Volver
          </button>
          <h2 className="font-heading text-base text-white uppercase tracking-wider">Tienda</h2>
          <span className="flex items-center gap-1 text-yellow-neon font-bold text-xs">
            <span>🪙</span> {progress.coins?.toLocaleString() || '0'}
          </span>
        </div>
      </div>
      <div className="px-4 py-5 max-w-lg mx-auto w-full space-y-5 pb-24">
        {/* Power-ups */}
        <div>
          <h3 className="text-[10px] uppercase tracking-[0.15em] text-text-muted font-semibold mb-3">Power-Ups</h3>
          <div className="space-y-2.5">
            {hintPacks.map(pack => (
              <div key={pack.type} className="bg-bg-card rounded-xl border border-border-card p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xl">{pack.type === 'hint' ? '💡' : pack.type === 'reveal' ? '👁️' : pack.type === 'shuffle' ? '🔀' : pack.type === 'freeze' ? '❄️' : '🗑️'}</span>
                  <div>
                    <div className="text-sm font-bold text-white">{pack.name}</div>
                    <div className="text-[10px] text-text-muted">{pack.desc} · {pack.type === 'hint' ? 'Destella primera letra' : pack.type === 'reveal' ? 'Muestra posición' : pack.type === 'shuffle' ? 'Reordena letras' : pack.type === 'freeze' ? 'Pausa 15s' : 'Elimina letras'}</div>
                  </div>
                </div>
                <button
                  onClick={() => onBuy(pack.type)}
                  disabled={(progress.coins ?? 0) < pack.price}
                  className={`text-xs font-bold px-4 py-2 rounded-lg transition-all ${(progress.coins ?? 0) >= pack.price ? 'bg-yellow-neon text-black hover:brightness-110' : 'bg-white/10 text-text-muted'}`}
                >
                  🪙 {pack.price}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Inventory */}
        <div className="bg-bg-card rounded-xl border border-border-card p-4">
          <h3 className="text-[10px] uppercase tracking-[0.15em] text-text-muted font-semibold mb-3">Tu Inventario</h3>
          <div className="flex gap-2 flex-wrap">
            {(['hint', 'reveal', 'shuffle', 'freeze', 'eliminate'] as PowerUpType[]).map(type => (
              <div key={type} className="bg-bg-elevated/60 rounded-lg px-3 py-2 border border-border-card text-center min-w-[60px]">
                <div className="text-lg">{type === 'hint' ? '💡' : type === 'reveal' ? '👁️' : type === 'shuffle' ? '🔀' : type === 'freeze' ? '❄️' : '🗑️'}</div>
                <div className="text-[10px] text-white font-bold">×{progress.powerUps?.[type] ?? 0}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Support */}
        <div className="bg-bg-card rounded-xl border border-yellow-neon/20 p-4 text-center">
          <div className="text-3xl mb-2">👑</div>
          <h3 className="font-heading text-sm text-yellow-neon uppercase tracking-wider">Apoya JuegaHipHop</h3>
          <p className="text-[10px] text-text-muted mt-1 mb-3">Ayúdanos a seguir creando contenido gratuito</p>
          <button className="bg-gradient-to-r from-yellow-neon to-purple-neon text-black text-xs font-bold px-6 py-2 rounded-lg hover:brightness-110 transition-all uppercase tracking-wider">
            Apoyar
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── Daily Challenges Screen (functional) ─── */

export function ChallengesScreen({ progress, onBack, onClaimDaily }: {
  progress: PlayerProgress
  onBack: () => void
  onClaimDaily: () => { coins: number; xp: number; powerUp?: { type: string; amount: number } } | null
}) {
  const [claimed, setClaimed] = useState(progress.lastDaily === getDateKey() && progress.dailyClaimed)
  const [rewardMsg, setRewardMsg] = useState<string | null>(null)

  const handleClaim = () => {
    const rewards = onClaimDaily()
    if (!rewards) {
      setRewardMsg('Ya reclamaste hoy, ¡vuelve mañana!')
      setTimeout(() => setRewardMsg(null), 2500)
      return
    }
    setClaimed(true)
    let msg = `+${rewards.xp} XP · +${rewards.coins} 🪙`
    if (rewards.powerUp) msg += ` · +${rewards.powerUp.amount} ${rewards.powerUp.type === 'hint' ? '💡' : rewards.powerUp.type === 'reveal' ? '👁️' : '🔀'}`
    setRewardMsg(msg)
    setTimeout(() => setRewardMsg(null), 3000)
  }

  const dayInCycle = (progress.dailyStreak % 7) + 1

  return (
    <div className="flex-1 flex flex-col overflow-y-auto bg-bg-primary">
      <div className="bg-bg-card border-b border-border-subtle">
        <div className="max-w-lg mx-auto w-full flex items-center justify-between px-4 py-3">
          <button onClick={onBack} className="flex items-center gap-1 text-sm text-text-muted hover:text-white transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            Volver
          </button>
          <h2 className="font-heading text-base text-white uppercase tracking-wider">Desafíos</h2>
          <span className="flex items-center gap-1 text-orange-400 font-bold text-xs">
            🔥 {progress.dailyStreak}
          </span>
        </div>
      </div>
      <div className="px-4 py-5 max-w-lg mx-auto w-full space-y-4 pb-24">

        {/* Daily Rewards Calendar */}
        <div className="bg-bg-card rounded-xl border border-border-card p-4">
          <h3 className="text-[10px] uppercase tracking-[0.15em] text-text-muted font-semibold mb-3 text-center">Recompensa Diaria</h3>
          <div className="flex justify-center gap-1.5">
            {Array.from({ length: 7 }, (_, i) => {
              const reward = DAILY_REWARDS.find(r => r.day === i + 1) ?? DAILY_REWARDS[0]
              const isToday = i + 1 === dayInCycle
              const isUnlocked = i < dayInCycle
              const canClaim = isToday && !claimed
              return (
                <div key={i} className={`flex flex-col items-center gap-1 p-2 rounded-xl border transition-all w-12 ${canClaim ? 'bg-purple-neon/20 border-purple-neon/40 animate-pulse' : isUnlocked ? 'bg-yellow-neon/10 border-yellow-neon/30' : 'bg-white/5 border-border-subtle opacity-40'}`}>
                  <span className="text-xs">{canClaim ? '🎁' : isUnlocked ? '✅' : '🔒'}</span>
                  <span className="text-[9px] text-yellow-neon font-bold">{reward.coinReward}</span>
                  <span className="text-[7px] text-text-muted">Día {i + 1}</span>
                </div>
              )
            })}
          </div>
          <button
            onClick={handleClaim}
            disabled={claimed}
            className={`w-full mt-3 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${claimed ? 'bg-white/5 text-text-muted' : 'bg-yellow-neon text-black hover:brightness-110'}`}
          >
            {claimed ? 'Reclamado ✓' : '¡Reclamar!'}
          </button>
          {rewardMsg && (
            <p className="text-[10px] text-center mt-2 text-yellow-neon font-bold animate-pulse">{rewardMsg}</p>
          )}
        </div>

        {/* Streak info */}
        <div className="bg-bg-card rounded-xl border border-border-card p-4 text-center">
          <div className="text-3xl mb-2">🔥</div>
          <h3 className="text-sm font-bold text-white">Racha de {progress.dailyStreak} días</h3>
          <p className="text-[10px] text-text-muted mt-1">¡Sigue así para multiplicar tu XP!</p>
          <div className="flex justify-center gap-2 mt-3">
            {[3, 7, 14, 30].map(m => (
              <div key={m} className={`text-[8px] px-2 py-1 rounded-full ${progress.dailyStreak >= m ? 'bg-yellow-neon/20 text-yellow-neon border border-yellow-neon/30' : 'bg-white/5 text-text-muted border border-border-subtle'}`}>
                {m}d{progress.dailyStreak >= m ? ' ✓' : ''}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function getDateKey(): string {
  const d = new Date()
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
}

/* ─── Game Modes Screen (unchanged but connected) ─── */

export function ModesScreen({ onBack, onSelect }: { onBack: () => void; onSelect: (mode: string) => void }) {
  const modes = [
    { id: 'classic', name: 'Clásico', desc: 'Encuentra todas las palabras sin límite de tiempo', icon: '🎮', color: '#FFC107' },
    { id: 'timed', name: 'Contrarreloj', desc: '90 segundos. +15s por palabra encontrada', icon: '⏱️', color: '#F97316' },
    { id: 'survival', name: 'Supervivencia', desc: '3 vidas. Cada error te acerca al final', icon: '💀', color: '#EF4444' },
    { id: 'category', name: 'Por Categoría', desc: 'Elige una categoría y enfócate en ella', icon: '🎯', color: '#8B5CF6' },
    { id: 'daily', name: 'Desafío Diario', desc: 'La misma sopa para todos, ¡compite!', icon: '⭐', color: '#10B981' },
  ]
  return (
    <div className="flex-1 flex flex-col overflow-y-auto bg-bg-primary">
      <div className="bg-bg-card border-b border-border-subtle">
        <div className="max-w-lg mx-auto w-full flex items-center justify-between px-4 py-3">
          <button onClick={onBack} className="flex items-center gap-1 text-sm text-text-muted hover:text-white transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            Volver
          </button>
          <h2 className="font-heading text-base text-white uppercase tracking-wider">Modos de Juego</h2>
          <div className="w-16" />
        </div>
      </div>
      <div className="px-4 py-5 max-w-lg mx-auto w-full space-y-2.5 pb-24">
        {modes.map(m => (
          <button key={m.id} onClick={() => onSelect(m.id)} className="w-full bg-bg-card rounded-xl border border-border-card p-4 flex items-center gap-3.5 hover:bg-white/5 transition-all text-left">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl flex-shrink-0" style={{ background: `${m.color}22` }}>
              <span>{m.icon}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-white">{m.name}</div>
              <div className="text-[10px] text-text-muted mt-0.5">{m.desc}</div>
            </div>
            <svg className="w-4 h-4 text-text-muted flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </button>
        ))}
      </div>
    </div>
  )
}

/* ─── Story Mode Screen (unchanged) ─── */

export function StoryScreen({ onBack }: { onBack: () => void }) {
  const eras = [
    { year: '1970s', title: 'Los Orígenes', desc: 'El nacimiento del hip hop en el Bronx', icon: '🌆', unlocked: true, current: false },
    { year: '1980s', title: 'La Explosión', desc: 'El hip hop se vuelve comercial', icon: '💥', unlocked: true, current: true },
    { year: '1990s', title: 'La Era Dorada', desc: 'El mejor período del hip hop', icon: '👑', unlocked: true, current: false },
    { year: '2000s', title: 'Evolución', desc: 'El hip hop se globaliza', icon: '🌍', unlocked: false, current: false },
    { year: '2010s', title: 'Nuevas Voces', desc: 'Diversidad y nuevas corrientes', icon: '🎤', unlocked: false, current: false },
    { year: '2020s', title: 'El Futuro', desc: 'La nueva generación', icon: '🚀', unlocked: false, current: false },
  ]
  return (
    <div className="flex-1 flex flex-col overflow-y-auto bg-bg-primary">
      <div className="bg-bg-card border-b border-border-subtle">
        <div className="max-w-lg mx-auto w-full flex items-center justify-between px-4 py-3">
          <button onClick={onBack} className="flex items-center gap-1 text-sm text-text-muted hover:text-white transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            Volver
          </button>
          <h2 className="font-heading text-base text-white uppercase tracking-wider">Modo Historia</h2>
          <div className="w-16" />
        </div>
      </div>
      <div className="px-4 py-5 max-w-lg mx-auto w-full space-y-1 pb-24">
        {eras.map((era, i) => (
          <div key={era.year} className="flex items-start gap-4 relative">
            <div className="flex flex-col items-center pt-1">
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${era.current ? 'border-yellow-neon bg-yellow-neon/20' : era.unlocked ? 'border-green-neon bg-green-neon/20' : 'border-border-subtle bg-white/5'}`}>
                {era.unlocked ? <span className="text-[8px]">✓</span> : <span className="text-[8px] text-text-muted">🔒</span>}
              </div>
              {i < eras.length - 1 && <div className="w-0.5 flex-1 min-h-[24px] bg-border-subtle" />}
            </div>
            <div className={`flex-1 pb-4 ${!era.unlocked ? 'opacity-40' : ''}`}>
              <div className={`bg-bg-card rounded-xl border p-3.5 ${era.current ? 'border-yellow-neon/30' : 'border-border-card'}`}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{era.icon}</span>
                    <div>
                      <span className="text-xs font-bold text-white">{era.title}</span>
                      <span className="text-[9px] text-text-muted ml-2">{era.year}</span>
                    </div>
                  </div>
                  {era.current && <span className="text-[8px] text-yellow-neon bg-yellow-neon/10 px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">Actual</span>}
                </div>
                <p className="text-[10px] text-text-muted">{era.desc}</p>
                {era.unlocked && (
                  <button className="mt-2 text-[10px] bg-white/5 hover:bg-white/10 px-3 py-1 rounded-lg text-text-secondary transition-colors uppercase tracking-wider">
                    Jugar
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ─── Enhanced Collection Screen ─── */

export function CollectionScreen({ progress, onBack }: { progress: PlayerProgress; onBack: () => void }) {
  const [tab, setTab] = useState<'todos' | 'descubiertos' | 'faltantes'>('descubiertos')
  const [expandedCat, setExpandedCat] = useState<string | null>(null)

  // Group found words by category
  const grouped: Record<string, typeof progress.wordsFound> = {}
  for (const fw of progress.wordsFound) {
    if (!grouped[fw.category]) grouped[fw.category] = []
    grouped[fw.category].push(fw)
  }

  // Words NOT found, grouped by category
  const missing: Record<string, string[]> = {}
  for (const w of allWords) {
    if (!progress.wordsFound.some(fw => fw.word === w.word)) {
      if (!missing[w.category]) missing[w.category] = []
      missing[w.category].push(w.word)
    }
  }

  return (
    <div className="flex-1 flex flex-col overflow-y-auto bg-bg-primary">
      <div className="bg-bg-card border-b border-border-subtle">
        <div className="max-w-lg mx-auto w-full flex items-center justify-between px-4 py-3">
          <button onClick={onBack} className="flex items-center gap-1 text-sm text-text-muted hover:text-white transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            Volver
          </button>
          <h2 className="font-heading text-base text-white uppercase tracking-wider">Mi Knowledge</h2>
          <span className="text-[10px] text-yellow-neon font-bold">{progress.totalWordsFound}/{allWords.length}</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border-subtle">
        <div className="max-w-lg mx-auto w-full flex">
          {(['descubiertos', 'todos', 'faltantes'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} className={`flex-1 py-2.5 text-[10px] uppercase tracking-wider font-semibold transition-colors ${tab === t ? 'text-yellow-neon border-b-2 border-yellow-neon' : 'text-text-muted'}`}>
              {t === 'descubiertos' ? `Descubiertos (${progress.totalWordsFound})` : t === 'faltantes' ? `Faltantes (${allWords.length - progress.totalWordsFound})` : 'Todos'}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-lg mx-auto w-full px-4 py-4 space-y-4 pb-24">
          {/* Category Progress Summary */}
          {categories.map(cat => {
            const found = progress.wordsFound.filter(fw => fw.category === cat.id).length
            const total = allWords.filter(w => w.category === cat.id).length
            const pct = total > 0 ? Math.round((found / total) * 100) : 0
            const unlocked = progress.unlockedCategories.includes(cat.id)

            if (!unlocked && tab !== 'todos') return null

            const words = tab === 'faltantes'
              ? (missing[cat.id] || [])
              : tab === 'descubiertos'
                ? (grouped[cat.id] || []).map(fw => fw.word)
                : allWords.filter(w => w.category === cat.id).map(w => w.word)

            if (words.length === 0) return null

            const isExpanded = expandedCat === cat.id

            return (
              <div key={cat.id}>
                <button
                  onClick={() => setExpandedCat(isExpanded ? null : cat.id)}
                  className="w-full flex items-center gap-2.5 mb-1.5"
                >
                  <span className="text-base">{cat.icon}</span>
                  <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: cat.color }}>
                    {cat.name}
                  </span>
                  <span className="text-[9px] text-text-muted ml-auto">{found}/{total}</span>
                  {!unlocked && <span className="text-[9px] text-text-muted">🔒 Nivel {cat.unlockLevel}</span>}
                </button>
                {unlocked && (
                  <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden mb-1.5">
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: cat.color }} />
                  </div>
                )}
                {isExpanded && unlocked && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {words.map(word => {
                      const found = progress.wordsFound.some(fw => fw.word === word)
                      return (
                        <span key={word} className={`text-[9px] px-2 py-0.5 rounded-full border transition-colors ${found ? 'bg-yellow-neon/10 border-yellow-neon/30 text-yellow-neon font-bold' : 'bg-white/5 border-border-subtle text-text-muted'}`}>
                          {found ? '✓ ' : ''}{word}
                        </span>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}

          {tab === 'descubiertos' && progress.totalWordsFound === 0 && (
            <div className="text-center py-12">
              <span className="text-4xl block mb-3">📖</span>
              <p className="text-text-muted text-sm">Aún no has descubierto palabras</p>
              <p className="text-text-muted text-xs mt-1">¡Empieza a jugar!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ─── Enhanced Profile Screen ─── */

export function ProfileScreen({ progress, stats }: { progress: PlayerProgress; stats: GameStats }) {
  const pct = stats.xpForNext > 0 ? Math.min(100, (stats.currentXp / stats.xpForNext) * 100) : 100
  const rank = getRank(progress.xp)
  const nextRank = RANKS.find(r => r.xpRequired > progress.xp)
  const rankProgress = nextRank ? Math.min(100, Math.round(((progress.xp - rank.xpRequired) / (nextRank.xpRequired - rank.xpRequired)) * 100)) : 100
  const completedAch = progress.achievements.filter(a => a.completed).length
  const totalAch = progress.achievements.length

  return (
    <div className="flex-1 overflow-y-auto px-4 pb-24 pt-4">
      <div className="max-w-lg mx-auto w-full">
        {/* Profile Card */}
        <div className="bg-bg-card rounded-2xl border border-border-card overflow-hidden mb-4">
          {/* Avatar & Rank banner */}
          <div className="relative pt-6 pb-4 px-5 text-center" style={{ background: `linear-gradient(180deg, ${rank.color}22, transparent)` }}>
            <div className="w-16 h-16 rounded-full mx-auto mb-2 flex items-center justify-center text-3xl shadow-lg" style={{ background: `linear-gradient(135deg, ${rank.color}, transparent)` }}>
              {progress.profile.avatarEmoji}
            </div>
            <h2 className="font-bold text-base text-white">{progress.profile.displayName}</h2>
            <div className="flex items-center justify-center gap-1.5 mt-1">
              <span style={{ color: rank.color }}>{rank.icon}</span>
              <span className="text-[10px] uppercase tracking-wider font-bold" style={{ color: rank.color }}>{rank.name}</span>
            </div>
          </div>

          {/* Level & XP */}
          <div className="px-5 py-3">
            <div className="flex items-center justify-between mb-1">
              <span className="font-heading text-base text-white">NIVEL {stats.level}</span>
              <span className="text-[10px] text-text-muted">{stats.xpInCurrentLevel} / {stats.xpForNext} XP</span>
            </div>
            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${rank.color}, ${rank.color}88)` }} />
            </div>
          </div>

          {/* Rank Progress */}
          {nextRank && (
            <div className="px-5 pb-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[8px] uppercase tracking-wider text-text-muted">Próximo rango: {nextRank.name}</span>
                <span className="text-[8px] text-text-muted">{rankProgress}%</span>
              </div>
              <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${rankProgress}%`, background: nextRank.color }} />
              </div>
            </div>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-2.5 mb-4">
          {[
            { label: 'Sopas', value: progress.totalGames, icon: '🔤' },
            { label: 'Palabras', value: progress.totalWordsFound, icon: '📖' },
            { label: 'Racha', value: `${progress.dailyStreak}🔥`, icon: '🔥' },
            { label: 'Completado', value: `${stats.completionPercent}%`, icon: '📊' },
            { label: 'Logros', value: `${completedAch}/${totalAch}`, icon: '🏆' },
            { label: 'Knowledge', value: `💎${progress.knowledgePoints || 0}`, icon: '💎' },
          ].map(s => (
            <div key={s.label} className="bg-bg-card rounded-xl p-3 text-center border border-border-card">
              <div className="text-lg mb-0.5">{s.icon}</div>
              <div className="font-heading text-base text-yellow-neon">{s.value}</div>
              <div className="text-[8px] text-text-muted uppercase tracking-wider mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Achievements */}
        <div className="bg-bg-card rounded-2xl border border-border-card p-4 mb-4">
          <h3 className="text-xs font-bold text-text-muted mb-3 uppercase tracking-wider">Logros ({completedAch}/{totalAch})</h3>
          <div className="grid grid-cols-5 gap-2">
            {ACHIEVEMENTS.slice(0, 20).map(a => {
              const prog = progress.achievements.find(ap => ap.id === a.id)
              const done = prog?.completed ?? false
              return (
                <div key={a.id} className={`rounded-xl p-2 text-center border transition-all ${done ? 'bg-yellow-neon/10 border-yellow-neon/30' : 'bg-white/[0.02] border-border-subtle opacity-40'}`} title={a.name}>
                  <div className="text-lg mb-0.5">{done ? a.icon : '🔒'}</div>
                  <div className="text-[6px] text-text-muted uppercase leading-tight font-semibold truncate">{a.name}</div>
                </div>
              )
            })}
          </div>
          {ACHIEVEMENTS.length > 20 && (
            <p className="text-[9px] text-text-muted text-center mt-2">+{ACHIEVEMENTS.length - 20} logros más</p>
          )}
        </div>

        {/* Category Completion */}
        <div className="bg-bg-card rounded-2xl border border-border-card p-4">
          <h3 className="text-xs font-bold text-text-muted mb-3 uppercase tracking-wider">Progreso por Categoría</h3>
          <div className="space-y-2.5">
            {categories.filter(c => progress.unlockedCategories.includes(c.id)).map(cat => {
              const found = progress.wordsFound.filter(fw => fw.category === cat.id).length
              const total = allWords.filter(w => w.category === cat.id).length
              const pct = total > 0 ? Math.round((found / total) * 100) : 0
              return (
                <div key={cat.id} className="flex items-center gap-2">
                  <span className="text-base flex-shrink-0">{cat.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-[10px] font-semibold text-white truncate" style={{ color: cat.color }}>{cat.name}</span>
                      <span className="text-[8px] text-text-muted flex-shrink-0 ml-2">{found}/{total}</span>
                    </div>
                    <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: cat.color }} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─── Settings Screen ─── */

export function SettingsScreen({ onBack }: { onBack: () => void }) {
  const [soundOn, setSoundOn] = useState(true)
  const [musicOn, setMusicOn] = useState(true)
  const [hapticOn, setHapticOn] = useState(true)

  return (
    <div className="flex-1 flex flex-col overflow-y-auto bg-bg-primary">
      <div className="bg-bg-card border-b border-border-subtle">
        <div className="max-w-lg mx-auto w-full flex items-center justify-between px-4 py-3">
          <button onClick={onBack} className="flex items-center gap-1 text-sm text-text-muted hover:text-white transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            Volver
          </button>
          <h2 className="font-heading text-base text-white uppercase tracking-wider">Opciones</h2>
          <div className="w-16" />
        </div>
      </div>
      <div className="px-4 py-5 max-w-lg mx-auto w-full space-y-4 pb-24">
        <div className="bg-bg-card rounded-xl border border-border-card overflow-hidden">
          {[
            { label: 'Sonido', icon: '🔊', value: soundOn, set: setSoundOn },
            { label: 'Música', icon: '🎵', value: musicOn, set: setMusicOn },
            { label: 'Vibración', icon: '📳', value: hapticOn, set: setHapticOn },
          ].map(s => (
            <div key={s.label} className="flex items-center justify-between px-4 py-3.5 border-b border-border-subtle last:border-b-0">
              <div className="flex items-center gap-3">
                <span className="text-base">{s.icon}</span>
                <span className="text-sm text-white">{s.label}</span>
              </div>
              <button
                onClick={() => s.set(!s.value)}
                className={`w-12 h-6 rounded-full transition-colors relative ${s.value ? 'bg-yellow-neon' : 'bg-white/10'}`}
              >
                <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform ${s.value ? 'translate-x-6' : 'translate-x-0.5'}`} />
              </button>
            </div>
          ))}
        </div>
        <div className="bg-bg-card rounded-xl border border-border-card p-4 text-center">
          <p className="text-xs text-text-muted">Sopa de Knowledge v1.0</p>
          <p className="text-[9px] text-text-muted mt-1">© 2026 JuegaHipHop</p>
        </div>
      </div>
    </div>
  )
}

/* ─── Achievement Notification Modal ─── */

export function AchievementNotification({ achievements, onClose }: { achievements: Achievement[]; onClose: () => void }) {
  if (achievements.length === 0) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-bg-card rounded-2xl border border-yellow-neon/30 max-w-sm w-full card-enter overflow-hidden">
        <div className="px-5 pt-5 pb-3 text-center">
          <div className="text-3xl mb-2">🏆</div>
          <h2 className="font-heading text-base text-yellow-neon uppercase tracking-wider mb-3">¡Nuevos Logros!</h2>
          <div className="space-y-2">
            {achievements.map(a => (
              <div key={a.id} className="bg-bg-elevated/60 rounded-xl p-3 flex items-center gap-3 border border-border-card text-left">
                <span className="text-2xl">{a.icon}</span>
                <div>
                  <div className="text-xs font-bold text-white">{a.name}</div>
                  <div className="text-[9px] text-text-muted">{a.description}</div>
                  <div className="flex gap-2 mt-1">
                    <span className="text-[8px] text-yellow-neon font-bold">✦ +{a.xpReward} XP</span>
                    <span className="text-[8px] text-yellow-neon font-bold">🪙 +{a.coinReward}</span>
                    {a.titleReward && <span className="text-[8px] text-purple-neon-light font-bold">🏅 "{a.titleReward}"</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <button onClick={onClose} className="w-full py-3 bg-yellow-neon text-black font-heading text-sm uppercase tracking-wider hover:brightness-110 transition-all font-bold">
          ¡Genial!
        </button>
      </div>
    </div>
  )
}
