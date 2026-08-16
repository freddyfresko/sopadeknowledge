/**
 * Game Screens — Sopa de Knowledge
 *
 * Todas las pantallas del juego organizadas como componentes exportables.
 * Importan desde data/index para tener acceso a todas las palabras.
 */
import { useState } from 'react'
import type { PlayerProgress, GameStats, Achievement, PowerUpType } from './game/types'
import type { SessionContextPayload } from './lib/sdk/types'
import { allWords, categories } from './data/index'
import { ACHIEVEMENTS } from './data/achievements'
import { getRank } from './game/progression'
import { DAILY_REWARDS } from './game/economy'
import { Button, Card, Chip, Progress, ScreenHeader, CounterDisplay } from './components/ui'
import { IconBook, IconCart, IconStar } from './components/icons'

/* ─── Store Screen (enhanced with functional purchases) ─── */

export function StoreScreen({ progress, onBuy }: {
  progress: PlayerProgress
  onBuy: (type: PowerUpType) => void
}) {
  const hintPacks = [
    { type: 'hint' as PowerUpType, name: 'Pack de Pistas', desc: '5 pistas', count: 5, price: 15 },
    { type: 'reveal' as PowerUpType, name: 'Revelar Palabra', desc: '1 revelación', count: 1, price: 30 },
    { type: 'shuffle' as PowerUpType, name: 'Mezclar Grid', desc: '1 mezcla', count: 1, price: 20 },
    { type: 'eliminate' as PowerUpType, name: 'Eliminar Letras', desc: '1 eliminación', count: 1, price: 20 },
    { type: 'freeze' as PowerUpType, name: 'Congelar Tiempo', desc: '1 congelación', count: 1, price: 25 },
  ]
  const powerUpIcon = (type: PowerUpType) =>
    type === 'hint' ? '💡' : type === 'reveal' ? '👁️' : type === 'shuffle' ? '🔀' : type === 'freeze' ? '❄️' : '🗑️'
  const powerUpHelp = (type: PowerUpType) =>
    type === 'hint' ? 'Destella primera letra' : type === 'reveal' ? 'Muestra posición' : type === 'shuffle' ? 'Reordena letras' : type === 'freeze' ? 'Pausa 15s' : 'Elimina letras'

  return (
    <div className="flex-1 flex flex-col overflow-y-auto bg-bg-primary">
      <ScreenHeader
        title="Tienda"
        right={<CounterDisplay icon={<IconCart size={14} />} value={progress.coins?.toLocaleString() || '0'} />}
      />
      <div className="px-4 py-5 max-w-lg mx-auto w-full space-y-5 pb-24">
        {/* Power-ups */}
        <div>
          <h3 className="text-overline text-[10px] text-text-muted mb-3">Power-Ups</h3>
          <div className="space-y-2.5">
            {hintPacks.map(pack => (
              <Card key={pack.type} className="px-4 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xl">{powerUpIcon(pack.type)}</span>
                  <div>
                    <div className="text-sm font-bold text-white">{pack.name}</div>
                    <div className="text-[10px] text-text-muted">{pack.desc} · {powerUpHelp(pack.type)}</div>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant={(progress.coins ?? 0) >= pack.price ? 'primary' : 'ghost'}
                  onClick={() => onBuy(pack.type)}
                  disabled={(progress.coins ?? 0) < pack.price}
                >
                  🪙 {pack.price}
                </Button>
              </Card>
            ))}
          </div>
        </div>

        {/* Inventory */}
        <Card className="px-4 py-4">
          <h3 className="text-overline text-[10px] text-text-muted mb-3">Tu Inventario</h3>
          <div className="flex gap-2 flex-wrap">
            {(['hint', 'reveal', 'shuffle', 'freeze', 'eliminate'] as PowerUpType[]).map(type => (
              <div key={type} className="bg-bg-elevated/60 rounded-lg px-3 py-2 border border-border-card text-center min-w-[60px]">
                <div className="text-lg">{powerUpIcon(type)}</div>
                <div className="text-[10px] text-white font-bold">×{progress.powerUps?.[type] ?? 0}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}

/* ─── Daily Challenges Screen (functional) ─── */

export function ChallengesScreen({ progress, onClaimDaily }: {
  progress: PlayerProgress
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
      <ScreenHeader
        title="Recompensas"
        right={<CounterDisplay icon={<IconStar size={14} />} value={progress.dailyStreak} color="text-orange-400" />}
      />
      <div className="px-4 py-5 max-w-lg mx-auto w-full space-y-4 pb-24">

        {/* Daily Rewards Calendar */}
        <Card className="px-4 py-4">
          <h3 className="text-overline text-[10px] text-text-muted mb-3 text-center">Recompensa Diaria</h3>
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
          <Button
            fullWidth
            variant={claimed ? 'ghost' : 'primary'}
            onClick={handleClaim}
            disabled={claimed}
            className="mt-3"
          >
            {claimed ? 'Reclamado ✓' : '¡Reclamar!'}
          </Button>
          {rewardMsg && (
            <p className="text-[10px] text-center mt-2 text-yellow-neon font-bold animate-pulse">{rewardMsg}</p>
          )}
        </Card>

        {/* Streak info */}
        <Card className="px-4 py-4 text-center">
          <div className="text-3xl mb-2">🔥</div>
          <h3 className="text-sm font-bold text-white">Racha de {progress.dailyStreak} {progress.dailyStreak === 1 ? 'día' : 'días'}</h3>
          <p className="text-[10px] text-text-muted mt-1">¡Sigue así para multiplicar tu XP!</p>
          <div className="flex justify-center gap-2 mt-3">
            {[3, 7, 14, 30].map(m => (
              <Chip key={m} active={progress.dailyStreak >= m}>
                {m}d{progress.dailyStreak >= m ? ' ✓' : ''}
              </Chip>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}

function getDateKey(): string {
  const d = new Date()
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
}

/* ─── Enhanced Collection Screen ─── */

export function CollectionScreen({ progress }: { progress: PlayerProgress }) {
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
      <ScreenHeader
        title="Colección"
        right={<CounterDisplay icon={<IconBook size={14} />} value={`${progress.totalWordsFound}/${allWords.length}`} />}
      />

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
                  <Progress value={found} max={total || 1} height="sm" color={cat.color} className="mb-1.5" />
                )}
                {isExpanded && unlocked && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {words.map(word => {
                      const isFound = progress.wordsFound.some(fw => fw.word === word)
                      return (
                        <Chip key={word} active={isFound} className="text-[9px] px-2 py-0.5">
                          {isFound ? '✓ ' : ''}{word}
                        </Chip>
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

export function ProfileScreen({
  progress,
  stats,
  lobbyCtx,
  onResetProgress,
}: {
  progress: PlayerProgress
  stats: GameStats
  lobbyCtx?: SessionContextPayload | null
  onResetProgress?: () => void
}) {
  const rank = getRank(progress.xp)
  const completedAch = progress.achievements.filter(a => a.completed).length
  const totalAch = progress.achievements.length

  // ─── Identidad del jugador ───
  // El lobby manda displayName y (opcional) avatarUrl via session_context.
  // Si el lobby está disponible lo usamos; si no (standalone), caemos al
  // perfil local. El avatar del lobby puede ser una URL o un emoji short.
  const displayName = lobbyCtx?.displayName ?? progress.profile.displayName
  const avatarEmoji = lobbyCtx?.avatarUrl ?? progress.profile.avatarEmoji
  const isGuest = lobbyCtx?.isGuest ?? false

  // El reset solo tiene sentido con progreso real (evita el botón muerto
  // para usuarios nuevos que recién abren el juego).
  const hasProgress = progress.xp > 0 || progress.totalWordsFound > 0

  return (
    <div className="flex-1 overflow-y-auto px-4 pb-24 pt-4">
      <div className="max-w-lg mx-auto w-full">
        {/* Profile Card — identidad + rango (nivel/XP/estadísticas viven en el Hall) */}
        <Card className="overflow-hidden mb-4" glow="purple">
          {/* Avatar & Rank banner */}
          <div className="relative pt-6 pb-4 px-5 text-center" style={{ background: `linear-gradient(180deg, ${rank.color}22, transparent)` }}>
            <div className="w-16 h-16 rounded-full mx-auto mb-2 flex items-center justify-center text-3xl shadow-lg overflow-hidden" style={{ background: `linear-gradient(135deg, ${rank.color}, transparent)` }}>
              {avatarEmoji.startsWith('http')
                ? <img src={avatarEmoji} alt={displayName} className="w-full h-full object-cover" />
                : avatarEmoji}
            </div>
            <h2 className="font-bold text-base text-white">{displayName}</h2>
            {isGuest && (
              <span className="inline-block mt-1 text-[9px] font-bold uppercase tracking-widest text-yellow-neon/80 bg-yellow-neon/10 border border-yellow-neon/30 rounded-full px-2 py-0.5">
                Invitado
              </span>
            )}
            <div className="flex items-center justify-center gap-1.5 mt-1">
              <span style={{ color: rank.color }}>{rank.icon}</span>
              <span className="text-overline text-[10px] font-bold" style={{ color: rank.color }}>{rank.name}</span>
            </div>
          </div>
        </Card>

        {/* Stats exclusivas del perfil (no repetidas del Hall) */}
        <div className="grid grid-cols-3 gap-2.5 mb-4">
          {[
            { label: 'Sopas', value: progress.totalGames, icon: '🔤' },
            { label: 'Completado', value: `${stats.completionPercent}%`, icon: '📊' },
            { label: 'Logros', value: `${completedAch}/${totalAch}`, icon: '🏆' },
          ].map(s => (
            <div key={s.label} className="bg-bg-card rounded-xl p-3 text-center border border-border-card">
              <div className="text-lg mb-0.5">{s.icon}</div>
              <div className="text-heading text-base text-yellow-neon">{s.value}</div>
              <div className="text-overline text-[8px] text-text-muted mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Achievements */}
        <Card className="px-4 py-4 mb-4">
          <h3 className="text-overline text-[10px] text-text-muted mb-3">Logros ({completedAch}/{totalAch})</h3>
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
        </Card>

        {/* Reset Progress — solo con progreso real */}
        {onResetProgress && hasProgress && (
          <button
            onClick={onResetProgress}
            className="w-full mt-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold uppercase tracking-wider hover:bg-red-500/20 transition-colors"
          >
            🗑️ Reiniciar progreso
          </button>
        )}
      </div>
    </div>
  )
}

/* ─── Achievement Notification Modal ─── */

export function AchievementNotification({ achievements, onClose }: { achievements: Achievement[]; onClose: () => void }) {
  if (achievements.length === 0) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto" onClick={onClose}>
      <div
        className="card-enter relative my-auto max-w-sm w-full rounded-2xl overflow-hidden border border-yellow-neon/30 bg-bg-card shadow-[0_24px_64px_rgba(0,0,0,0.45)]"
        onClick={e => e.stopPropagation()}
      >
        <div className="absolute -inset-1 bg-gradient-to-b from-yellow-neon/15 to-transparent rounded-3xl pointer-events-none" />
        <div className="relative px-5 pt-5 pb-3 text-center">
          <div className="text-3xl mb-2">🏆</div>
          <h2 className="text-heading text-base text-yellow-neon uppercase tracking-wider mb-3">¡Nuevos Logros!</h2>
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
        <div className="relative px-5 pb-5">
          <Button variant="primary" fullWidth onClick={onClose}>¡Genial!</Button>
        </div>
      </div>
    </div>
  )
}
