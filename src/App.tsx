/**
 * Sopa de Knowledge — Main App
 * 
 * Game orchestration, lobby integration, and UI routing.
 * Uses useProgression hook for all state management.
 */
import { useState, useCallback, useRef, useEffect } from 'react'
import type { GridCell, GameSession, WordEntry, PowerUpType, FoundWord } from './game/types'
import {
  generateGrid, buildCells, checkWord, pickWordsForGame,
  getWordData, getCategory, getDailySeed,
} from './game/engine'
import { allWords, categories } from './data/index'
import {
  getHintTarget, getRevealTarget, shuffleGrid, eliminateLetters,
} from './game/powerups'
import { useProgression } from './hooks/useProgression'
import SplashScreen from './components/SplashScreen'
import ScorePopup from './components/ScorePopup'
import ParticleBurst from './components/ParticleBurst'
import {
  StoreScreen, ChallengesScreen, ModesScreen, StoryScreen,
  CollectionScreen, ProfileScreen, SettingsScreen,
  AchievementNotification,
} from './screens'
import useAudio from './hooks/useAudio'
import { getSupabase } from './lib/supabase'
import { loadProgress, saveProgress } from './game/progression'
import { syncToSupabase, syncFromSupabase, mergeProgress } from './lib/supabase-sync'
import { createLobbyClient } from './lib/sdk/lobby-client'
import type { LobbyClientInstance } from './lib/sdk/lobby-client'

/* ─── Direction snapping for mobile ─── */

function getLineCells(origin: [number, number], target: [number, number]): [number, number][] {
  const [or, oc] = origin
  const [tr, tc] = target
  let dr = tr - or
  let dc = tc - oc
  if (dr === 0 && dc === 0) return [[or, oc]]
  const absDr = Math.abs(dr)
  const absDc = Math.abs(dc)
  let ndr = 0
  let ndc = 0
  if (absDr === 0) { ndc = dc > 0 ? 1 : -1 }
  else if (absDc === 0) { ndr = dr > 0 ? 1 : -1 }
  else {
    const ratio = absDr / absDc
    if (ratio >= 0.25 && ratio <= 4.0) { ndr = dr > 0 ? 1 : -1; ndc = dc > 0 ? 1 : -1 }
    else if (ratio < 0.25) { ndc = dc > 0 ? 1 : -1 }
    else { ndr = dr > 0 ? 1 : -1 }
  }
  let steps = 0
  if (ndr !== 0 && ndc !== 0) steps = Math.min(Math.floor(dr / ndr), Math.floor(dc / ndc))
  else if (ndr !== 0) steps = Math.floor(dr / ndr)
  else steps = Math.floor(dc / ndc)
  if (steps < 0) steps = 0
  const cells: [number, number][] = []
  for (let i = 0; i <= steps; i++) cells.push([or + ndr * i, oc + ndc * i])
  return cells
}

/* ─── Constants ─── */

const HIGHLIGHT_COLORS: Record<string, string> = {
  breaking: '#f97316',
  mcing: '#22c55e',
  djing: '#3b82f6',
  graffiti: '#ec4899',
  cultura: '#8b5cf6',
  historia: '#a855f7',
  beatbox: '#14b8a6',
  produccion: '#fbbf24',
  chile: '#dc2626',
}

type Screen = 'home' | 'categories' | 'collection' | 'profile' | 'store' | 'challenges' | 'modes' | 'story' | 'settings'

/* ─── Board Sub-component ─── */

function Board({ cells, onCellPointerDown, onCellPointerEnter, onCellPointerUp, foundWords, gameWords }: {
  cells: GridCell[][]
  onCellPointerDown: (r: number, c: number) => void
  onCellPointerEnter: (r: number, c: number) => void
  onCellPointerUp: () => void
  foundWords: string[]
  gameWords: { word: string; category: string; positions: [number, number][] }[]
}) {
  const gridRef = useRef<HTMLDivElement>(null)
  const foundColorMap = new Map<string, string>()
  for (const gw of gameWords) {
    if (!foundWords.includes(gw.word)) continue
    const color = HIGHLIGHT_COLORS[gw.category] || '#8E44AD'
    for (const [r, c] of gw.positions) foundColorMap.set(`${r}-${c}`, color)
  }

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!gridRef.current) return
    const els = document.elementsFromPoint(e.clientX, e.clientY)
    const cellEl = els.find(el => el.getAttribute('role') === 'gridcell')
    if (!cellEl) return
    const r = parseInt(cellEl.getAttribute('data-r') ?? '', 10)
    const c = parseInt(cellEl.getAttribute('data-c') ?? '', 10)
    if (!isNaN(r) && !isNaN(c)) onCellPointerEnter(r, c)
  }, [onCellPointerEnter])

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault()
    ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
    const el = (e.target as HTMLElement)
    const r = parseInt(el.getAttribute('data-r') ?? '', 10)
    const c = parseInt(el.getAttribute('data-c') ?? '', 10)
    if (!isNaN(r) && !isNaN(c)) onCellPointerDown(r, c)
  }, [onCellPointerDown])

  return (
    <div className="select-none touch-none" onContextMenu={e => e.preventDefault()}>
      <div
        ref={gridRef}
        className="grid gap-[2px] mx-auto"
        style={{ gridTemplateColumns: `repeat(${cells.length}, minmax(0, 1fr))`, maxWidth: '100%' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={onCellPointerUp}
        onPointerLeave={onCellPointerUp}
      >
        {cells.map((row, r) =>
          row.map((cell, c) => {
            const isFound = foundColorMap.has(`${r}-${c}`)
            const isSelected = cell.selected || cell.highlighted
            const hlColor = foundColorMap.get(`${r}-${c}`)
            return (
              <div
                key={`${r}-${c}`}
                data-r={r}
                data-c={c}
                className={`aspect-square flex items-center justify-center text-sm md:text-base lg:text-lg font-extrabold rounded-sm transition-all duration-75 cursor-pointer select-none ${isFound ? 'text-white font-black shadow-sm' : isSelected ? 'bg-white/25 text-white scale-105' : 'bg-white text-black hover:bg-white/90'}`}
                style={isFound && hlColor ? { backgroundColor: hlColor, boxShadow: `0 0 10px ${hlColor}44` } : isSelected ? { backgroundColor: '#8E44AD' } : undefined}
                role="gridcell"
              >
                {cell.letter}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

/* ─── Knowledge Modal ─── */

function KnowledgeModal({ word, onClose }: { word: string | null; onClose: () => void }) {
  const entry = getWordData(word ?? '')
  const cat = entry ? getCategory(entry.category) : null
  if (!entry || !word) return null
  const color = cat?.color ?? '#8E44AD'
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-bg-card rounded-2xl border border-border-card max-w-md w-full card-enter shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 pt-4 pb-1">
          <div className="flex items-center gap-2">
            <span className="text-yellow-neon text-lg">👑</span>
            <span className="font-heading text-white text-sm uppercase tracking-wider">¡BIEN!</span>
          </div>
          <span className="text-[9px] text-text-muted uppercase tracking-wider bg-white/5 px-2 py-0.5 rounded-full">{cat?.name ?? entry.category}</span>
        </div>
        <div className="mx-5 h-40 rounded-xl flex items-center justify-center overflow-hidden relative" style={{ background: `linear-gradient(135deg, ${color}44, ${color}11)` }}>
          <span className="text-6xl opacity-50 drop-shadow-lg">{cat?.icon ?? '📖'}</span>
          {cat && (
            <div className="absolute top-2 left-2 bg-black/40 backdrop-blur-sm rounded-lg px-2 py-1 flex items-center gap-1">
              <span className="text-xs">{cat.icon}</span>
              <span className="text-[9px] text-white font-semibold uppercase tracking-wider">{cat.name}</span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-bg-card/60 via-transparent to-transparent" />
          <div className="absolute bottom-2 left-3 right-3">
            <h2 className="font-graffiti text-2xl text-white drop-shadow-lg tracking-wide">{word}</h2>
          </div>
        </div>
        <div className="px-5 py-3">
          <div className="bg-bg-elevated/60 rounded-xl p-3.5 mb-2.5">
            <p className="text-sm text-white/80 leading-relaxed">{entry.knowledge.description}</p>
          </div>
          <div className="rounded-xl p-3.5 mb-3 border" style={{ borderColor: `${color}33`, background: `${color}0D` }}>
            <div className="text-[9px] uppercase tracking-widest mb-1 font-bold" style={{ color }}>¿POR QUÉ ES IMPORTANTE?</div>
            <p className="text-xs text-white/70 leading-relaxed">{entry.knowledge.importance}</p>
          </div>
          {entry.knowledge.funFact && (
            <div className="rounded-xl p-3 mb-3 bg-yellow-neon/10 border border-yellow-neon/20">
              <div className="text-[9px] uppercase tracking-widest mb-1 font-bold text-yellow-neon">🤯 DATO CURIOSO</div>
              <p className="text-xs text-white/70">{entry.knowledge.funFact}</p>
            </div>
          )}
          {entry.knowledge.related && entry.knowledge.related.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {entry.knowledge.related.map(r => (
                <span key={r} className="text-[9px] uppercase tracking-wider bg-white/5 px-2 py-0.5 rounded-full text-text-muted border border-border-subtle">{r}</span>
              ))}
            </div>
          )}
        </div>
        <button onClick={onClose} className="w-full py-3.5 bg-yellow-neon text-black font-heading text-sm tracking-wider hover:brightness-110 transition-all uppercase">CONTINUAR</button>
      </div>
    </div>
  )
}

/* ─── Category Unlock ─── */

function CategoryUnlock({ newCategories, onClose }: { newCategories: string[]; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-bg-card rounded-2xl border border-yellow-neon/30 p-6 max-w-sm w-full card-enter text-center" onClick={e => e.stopPropagation()}>
        <div className="text-3xl mb-2">🎉</div>
        <h2 className="font-heading text-lg mb-3 text-white">¡Nuevas Categorías!</h2>
        <div className="space-y-2">
          {newCategories.map(catId => {
            const cat = getCategory(catId)
            if (!cat) return null
            return (
              <div key={catId} className="bg-bg-elevated rounded-xl p-3 flex items-center gap-3 border border-border-card">
                <span className="text-xl">{cat.icon}</span>
                <div className="text-left">
                  <div className="font-bold text-sm text-white">{cat.name}</div>
                  <div className="text-xs text-text-muted">{cat.description}</div>
                </div>
              </div>
            )
          })}
        </div>
        <button onClick={onClose} className="mt-4 w-full py-2.5 bg-yellow-neon hover:bg-yellow-neon-dark text-black font-bold rounded-xl text-sm transition-colors uppercase tracking-wider">¡A Jugar!</button>
      </div>
    </div>
  )
}

/* ─── Level Up Modal ─── */

function LevelUpModal({ newLevel, onClose }: { newLevel: number; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-bg-card rounded-2xl border border-yellow-neon/30 p-6 max-w-sm w-full card-enter text-center" onClick={e => e.stopPropagation()}>
        <div className="text-4xl mb-2">⬆️</div>
        <h2 className="font-heading text-xl text-yellow-neon mb-1">¡SUBISTE DE NIVEL!</h2>
        <div className="text-5xl font-graffiti text-white my-3 text-stroke-yellow">{newLevel}</div>
        <p className="text-xs text-text-muted mb-4">Sigue así, tu conocimiento crece</p>
        <button onClick={onClose} className="w-full py-2.5 bg-yellow-neon text-black font-bold rounded-xl text-sm transition-colors hover:brightness-110 uppercase tracking-wider">¡Sí!</button>
      </div>
    </div>
  )
}

/* ─── Level Complete Modal ─── */

function LevelComplete({ foundCount, totalWords, elapsedSeconds, onNext, onSummary, mode }: {
  foundCount: number; totalWords: number; elapsedSeconds: number
  onNext: () => void; onSummary: () => void; mode: string
}) {
  const earnedXp = foundCount * 20
  const precision = totalWords > 0 ? Math.round((foundCount / totalWords) * 100) : 0
  const earnedCoins = foundCount * 25
  const earnedKnowledge = foundCount
  const timeStr = `${String(Math.floor(elapsedSeconds / 60)).padStart(2, '0')}:${String(elapsedSeconds % 60).padStart(2, '0')}`
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
      <div className="bg-bg-card rounded-2xl border border-yellow-neon/20 max-w-sm w-full card-enter overflow-hidden shadow-2xl text-center">
        <div className="px-6 pt-6 pb-3">
          <div className="flex items-center justify-center gap-2 mb-1">
            <span className="text-xl">👑</span>
            <h2 className="font-heading text-base text-yellow-neon uppercase tracking-wider">¡Completado!</h2>
            <span className="text-xl">👑</span>
          </div>
          <div className="relative mx-auto my-5 w-24 h-24">
            <div className="absolute inset-0 rounded-full bg-yellow-neon/10 animate-pulse" />
            <div className="absolute inset-2 rounded-full bg-yellow-neon/20" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-yellow-neon/30 to-purple-neon/20 flex items-center justify-center border-2 border-yellow-neon/40 shadow-lg shadow-yellow-neon/20">
                <span className="text-2xl">{mode === 'timed' ? '⏱️' : mode === 'survival' ? '💪' : '📻'}</span>
              </div>
            </div>
          </div>
          <div className="flex justify-center gap-3 mb-4">
            <div className="bg-bg-elevated/60 rounded-xl px-3 py-2.5 border border-border-card">
              <div className="text-[9px] text-text-muted uppercase tracking-wider mb-1">XP</div>
              <div className="text-sm font-bold text-yellow-neon">+{earnedXp}</div>
            </div>
            <div className="bg-bg-elevated/60 rounded-xl px-3 py-2.5 border border-border-card">
              <div className="text-[9px] text-text-muted uppercase tracking-wider mb-1">Tiempo</div>
              <div className="text-sm font-bold text-white">{timeStr}</div>
            </div>
            <div className="bg-bg-elevated/60 rounded-xl px-3 py-2.5 border border-border-card">
              <div className="text-[9px] text-text-muted uppercase tracking-wider mb-1">Precisión</div>
              <div className="text-sm font-bold text-green-neon">{precision}%</div>
            </div>
          </div>
          <div className="flex justify-center gap-4 mb-1">
            <div className="flex items-center gap-1.5 text-xs"><span className="text-yellow-neon text-lg">🪙</span><span className="text-white font-bold">+{earnedCoins}</span></div>
            <div className="flex items-center gap-1.5 text-xs"><span className="text-purple-neon-light text-lg">💎</span><span className="text-white font-bold">+{earnedKnowledge}</span></div>
            <div className="flex items-center gap-1.5 text-xs"><span className="text-yellow-neon text-lg">📖</span><span className="text-white font-bold">+{foundCount}</span></div>
          </div>
        </div>
        <button onClick={onNext} className="w-full py-3.5 bg-yellow-neon text-black font-heading text-sm uppercase tracking-wider hover:brightness-110 transition-all font-bold">SIGUIENTE</button>
        <button onClick={onSummary} className="w-full py-2.5 bg-white/5 text-text-muted text-xs hover:bg-white/10 transition-colors uppercase tracking-wider">Ver Colección</button>
      </div>
    </div>
  )
}

/* ─── Hint Modal ─── */

function HintModal({ powerUps, onUseHint, onUseReveal, onUseShuffle, onUseEliminate, onClose }: {
  powerUps: Record<string, number>
  onUseHint: () => void; onUseReveal: () => void; onUseShuffle: () => void; onUseEliminate: () => void; onClose: () => void
}) {
  const items = [
    { label: 'PISTA', icon: '💡', desc: 'Destella primera letra', cost: 0, count: powerUps.hint ?? 0, action: onUseHint },
    { label: 'REVELAR', icon: '👁️', desc: 'Muestra posición', cost: 0, count: powerUps.reveal ?? 0, action: onUseReveal },
    { label: 'MEZCLAR', icon: '🔀', desc: 'Reordena letras', cost: 0, count: powerUps.shuffle ?? 0, action: onUseShuffle },
    { label: 'ELIMINAR', icon: '🗑️', desc: 'Quita letras falsas', cost: 0, count: powerUps.eliminate ?? 0, action: onUseEliminate },
  ]
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-bg-card rounded-t-2xl border border-border-card w-full max-w-sm p-5 card-enter" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-2 mb-4">
          <span className="text-lg">💡</span>
          <h3 className="font-bold text-sm text-white">PISTAS</h3>
        </div>
        {items.map(h => (
          <button key={h.label} disabled={h.count <= 0} onClick={h.action} className={`w-full flex items-center justify-between py-3 px-4 rounded-xl mb-2 transition-colors ${h.count > 0 ? 'bg-bg-elevated/60 hover:bg-white/10 border border-border-card' : 'bg-white/[0.02] border border-border-subtle opacity-40'}`}>
            <div className="flex items-center gap-2">
              <span>{h.icon}</span>
              <div className="text-left">
                <span className="text-sm font-semibold text-white block">{h.label}</span>
                <span className="text-[8px] text-text-muted">{h.desc}</span>
              </div>
            </div>
            <span className="text-xs text-text-muted">×{h.count}</span>
          </button>
        ))}
        <p className="text-[9px] text-text-muted text-center mt-2">Compra más power-ups en la Tienda</p>
      </div>
    </div>
  )
}

/* ─── Game Over Modal (for timed/survival) ─── */

function GameOver({ foundCount, totalWords, mode, onRetry, onExit }: {
  foundCount: number; totalWords: number; mode: string
  onRetry: () => void; onExit: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
      <div className="bg-bg-card rounded-2xl border border-red-500/30 max-w-sm w-full card-enter text-center p-6">
        <div className="text-4xl mb-2">{mode === 'timed' ? '⏰' : '💀'}</div>
        <h2 className="font-heading text-lg text-red-400 mb-2">
          {mode === 'timed' ? '¡TIEMPO! ⏱️' : 'GAME OVER'}
        </h2>
        <p className="text-xs text-text-muted mb-4">
          Encontraste {foundCount} de {totalWords} palabras
        </p>
        <div className="flex gap-3">
          <button onClick={onRetry} className="flex-1 py-3 bg-yellow-neon text-black font-bold text-sm rounded-xl hover:brightness-110 uppercase tracking-wider">Reintentar</button>
          <button onClick={onExit} className="flex-1 py-3 bg-white/10 text-white font-bold text-sm rounded-xl hover:bg-white/15 uppercase tracking-wider">Salir</button>
        </div>
      </div>
    </div>
  )
}

/* ─── Header ─── */

function Header({ stats, onEncyclopedia, onReset }: { stats: { level: number; currentXp: number; xpForNext: number; wordsFound: number }; onEncyclopedia: () => void; onReset: () => void }) {
  const pct = stats.xpForNext > 0 ? Math.min(100, (stats.currentXp / stats.xpForNext) * 100) : 100
  return (
    <header className="bg-bg-card border-b border-border-subtle">
      <div className="max-w-lg mx-auto w-full flex items-center justify-between px-4 py-3">
        <div>
          <h1 className="font-graffiti text-xl md:text-2xl tracking-wide text-yellow-neon">SOPA DE <span className="text-white">KNOWLEDGE</span></h1>
          <p className="text-[9px] text-text-muted uppercase tracking-[0.15em]">JuegaHipHop</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-xs font-bold text-white/80">NIVEL {stats.level}</div>
            <div className="w-20 md:w-28 h-1 bg-white/10 rounded-full mt-1 overflow-hidden">
              <div className="h-full bg-yellow-neon rounded-full transition-all" style={{ width: `${pct}%` }} />
            </div>
          </div>
          <button onClick={onEncyclopedia} className="text-xs bg-bg-elevated hover:bg-white/10 px-3 py-1.5 rounded-lg transition-colors border border-border-card text-text-secondary">📚 {stats.wordsFound}</button>
          <button onClick={onReset} className="text-xs bg-white/5 hover:bg-white/10 px-2 py-1.5 rounded-lg transition-colors text-text-secondary">🔄</button>
        </div>
      </div>
    </header>
  )
}

/* ─── Home Screen ─── */

function HomeScreen({ onPlay, onDaily, onKnowledge, onStore, progress, stats }: {
  onPlay: () => void; onDaily: () => void; onKnowledge: () => void; onStore: () => void
  progress: { dailyStreak: number }; stats: { level: number; wordsFound: number }
}) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 pb-20 pt-6">
      <div className="text-center mb-1"><p className="text-[10px] text-text-muted uppercase tracking-[0.2em]">JUEGA HIP HOP</p></div>
      <div className="text-center mb-2 relative">
        <div className="relative inline-block">
          <h1 className="font-graffiti text-5xl md:text-6xl leading-none tracking-wide"><span className="text-white/90">SOPA DE</span></h1>
          <div className="flex items-center justify-center">
            <span className="font-graffiti text-5xl md:text-7xl leading-none text-yellow-neon text-stroke-yellow tracking-wide">KNOW</span>
            <span className="relative inline-flex items-center">
              <span className="font-graffiti text-5xl md:text-7xl leading-none text-yellow-neon text-stroke-yellow tracking-wide">W</span>
              <span className="absolute -top-6 -right-1 text-xl md:text-2xl drop-shadow-lg">👑</span>
            </span>
            <span className="font-graffiti text-5xl md:text-7xl leading-none text-yellow-neon text-stroke-yellow tracking-wide">LEDGE</span>
          </div>
        </div>
      </div>
      <p className="text-xs text-text-muted mt-1 mb-8 tracking-[0.15em] uppercase font-semibold">Aprende Hip Hop Jugando</p>
      <button onClick={onPlay} className="w-full max-w-xs py-4 bg-yellow-neon text-black font-heading text-base rounded-2xl shadow-lg shadow-yellow-neon/30 hover:scale-[1.02] active:scale-[0.98] transition-transform mb-3 uppercase tracking-wider font-bold">🎮 JUGAR</button>
      <button onClick={onDaily} className="w-full max-w-xs py-3.5 bg-purple-neon text-white font-bold text-sm rounded-2xl hover:brightness-110 active:brightness-90 transition-all mb-3 uppercase tracking-wider shadow-lg shadow-purple-neon/20">⭐ DESAFÍOS DIARIOS</button>
      <button onClick={onKnowledge} className="w-full max-w-xs py-3 bg-white/10 text-white/80 font-semibold text-sm rounded-2xl hover:bg-white/15 active:brightness-90 transition-all mb-2 uppercase tracking-wider border border-border-subtle">📖 MI KNOWLEDGE</button>
      <button onClick={onStore} className="w-full max-w-xs py-3 bg-white/10 text-white/80 font-semibold text-sm rounded-2xl hover:bg-white/15 active:brightness-90 transition-all mb-2 uppercase tracking-wider border border-border-subtle">🛒 TIENDA</button>
      <div className="flex gap-2 mt-5">
        <div className="flex items-center gap-1.5 text-xs bg-bg-elevated/60 px-3 py-1.5 rounded-full border border-border-subtle"><span className="text-yellow-neon">✦</span><span className="text-text-secondary">Nivel {stats.level}</span></div>
        <div className="flex items-center gap-1.5 text-xs bg-bg-elevated/60 px-3 py-1.5 rounded-full border border-border-subtle"><span className="text-yellow-neon">📖</span><span className="text-text-secondary">{stats.wordsFound} palabras</span></div>
        <div className="flex items-center gap-1.5 text-xs bg-bg-elevated/60 px-3 py-1.5 rounded-full border border-border-subtle"><span className="text-yellow-neon">🔥</span><span className="text-text-secondary">{progress.dailyStreak} días</span></div>
      </div>
    </div>
  )
}

/* ─── Categories Screen ─── */

function CategoriesScreen({ progress }: { progress: { unlockedCategories: string[]; wordsFound: { word: string; category: string }[]; coins?: number; knowledgePoints?: number } }) {
  return (
    <div className="flex-1 overflow-y-auto px-4 pb-24 pt-4">
      <div className="max-w-lg mx-auto w-full">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-heading text-base uppercase tracking-wider text-white">Categorías</h2>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1 text-yellow-neon font-bold"><span>🪙</span> {progress.coins?.toLocaleString() || '0'}</span>
            <span className="flex items-center gap-1 text-purple-neon-light font-bold"><span>💎</span> {progress.knowledgePoints || '0'}</span>
          </div>
        </div>
        <div className="space-y-2.5">
          {categories.map(cat => {
            const unlocked = progress.unlockedCategories.includes(cat.id)
            const count = progress.wordsFound.filter(fw => fw.category === cat.id).length
            const total = allWords.filter(w => w.category === cat.id).length
            const pct = total > 0 ? Math.round((count / total) * 100) : 0
            return (
              <div key={cat.id} className={`bg-bg-card rounded-xl p-3.5 border ${unlocked ? 'border-border-card' : 'border-border-subtle opacity-45'}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2.5">
                    <span className="text-lg">{unlocked ? cat.icon : '🔒'}</span>
                    <div>
                      <span className="font-bold text-sm text-white" style={{ color: unlocked ? cat.color : '#666' }}>{cat.name}</span>
                      {!unlocked && <span className="text-[10px] text-text-muted ml-2">(Nivel {cat.unlockLevel})</span>}
                    </div>
                  </div>
                  <span className="text-[11px] text-text-muted">{count}/{total}</span>
                </div>
                {unlocked && (
                  <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: cat.color }} />
                  </div>
                )}
                {unlocked && pct > 0 && <p className="text-[10px] text-text-muted mt-1">{pct}% completado</p>}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/* ─── Game Hub Screen ─── */

function GameHubScreen({ progress, stats, onStartGame, onBack, selectedMode, onChangeMode }: {
  progress: { level: number; xp: number; unlockedCategories: string[]; wordsFound: FoundWord[]; coins?: number; knowledgePoints?: number; dailyStreak: number; totalWordsFound: number; totalGames: number }
  stats: { currentXp: number; level: number; xpForNext: number; rank: { icon: string; name: string; color: string } }
  onStartGame: () => void; onBack: () => void
  selectedMode: string; onChangeMode: (mode: string) => void
}) {
  const pct = stats.xpForNext > 0 ? Math.min(100, (stats.currentXp / stats.xpForNext) * 100) : 100

  const catProgress = categories.map(cat => {
    const count = progress.wordsFound.filter(fw => fw.category === cat.id).length
    const total = allWords.filter(w => w.category === cat.id).length
    const unlocked = progress.unlockedCategories.includes(cat.id)
    return { ...cat, count, total, unlocked }
  })
  const unlockedCats = catProgress.filter(c => c.unlocked)

  const modeLabels: Record<string, { name: string; icon: string }> = {
    classic: { name: 'Clásico', icon: '🎮' },
    timed: { name: 'Contrarreloj', icon: '⏱️' },
    survival: { name: 'Supervivencia', icon: '💀' },
    category: { name: 'Por Categoría', icon: '🎯' },
    daily: { name: 'Desafío Diario', icon: '⭐' },
  }

  return (
    <div className="flex-1 flex flex-col overflow-y-auto bg-bg-primary">
      <div className="flex items-center justify-between px-4 py-3 bg-bg-card border-b border-border-subtle">
        <button onClick={onBack} className="flex items-center gap-1 text-sm text-text-muted hover:text-white transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Volver
        </button>
        <h2 className="font-graffiti text-lg text-yellow-neon tracking-wide">SOPA DE KNOWLEDGE</h2>
        <div className="w-16" />
      </div>
      <div className="flex-1 px-4 py-5 max-w-lg mx-auto w-full space-y-4 pb-24">
        {/* Mode selector */}
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {Object.entries(modeLabels).map(([id, m]) => (
            <button key={id} onClick={() => onChangeMode(id)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider whitespace-nowrap transition-all ${selectedMode === id ? 'bg-yellow-neon text-black' : 'bg-bg-elevated/60 text-text-muted border border-border-card hover:bg-white/10'}`}>
              <span>{m.icon}</span> {m.name}
            </button>
          ))}
        </div>

        {/* Player Card */}
        <div className="bg-bg-card rounded-2xl border border-border-card overflow-hidden">
          <div className="flex items-center gap-4 px-5 pt-5 pb-3">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-yellow-neon to-purple-neon flex items-center justify-center text-2xl shadow-lg shadow-yellow-neon/20 flex-shrink-0">🧢</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-bold text-base text-white">NIVEL {stats.level}</span>
                <span className="text-[10px] rounded-full font-semibold uppercase tracking-wider px-2 py-0.5" style={{ color: stats.rank.color, background: `${stats.rank.color}22` }}>{stats.rank.icon} {stats.rank.name}</span>
              </div>
              <div className="mt-1.5">
                <div className="flex justify-between text-[10px] text-text-muted mb-1"><span>✦ {stats.currentXp} XP</span><span>{stats.xpForNext} XP</span></div>
                <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-yellow-neon to-yellow-neon-300 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                </div>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-px bg-border-subtle mx-5 mb-4 rounded-xl overflow-hidden">
            {[
              { label: 'Palabras', value: `${progress.totalWordsFound}`, icon: '📖', color: 'text-yellow-neon' },
              { label: 'Monedas', value: `${progress.coins || 0}`, icon: '🪙', color: 'text-yellow-neon' },
              { label: 'Knowledge', value: `${progress.knowledgePoints || 0}`, icon: '💎', color: 'text-purple-neon-light' },
              { label: 'Racha', value: `${progress.dailyStreak}🔥`, icon: '🔥', color: 'text-orange-400' },
            ].map(s => (
              <div key={s.label} className="bg-bg-elevated/60 p-2.5 text-center">
                <div className="text-lg mb-0.5">{s.icon}</div>
                <div className={`text-sm font-bold ${s.color}`}>{s.value}</div>
                <div className="text-[8px] text-text-muted uppercase tracking-wider mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Play Button */}
        <button onClick={onStartGame} className="w-full py-4 bg-yellow-neon text-black font-heading text-lg rounded-2xl shadow-lg shadow-yellow-neon/30 hover:scale-[1.02] active:scale-[0.98] transition-all uppercase tracking-wider font-bold">
          🎮 COMENZAR
        </button>

        {/* Categories */}
        <div className="bg-bg-card rounded-2xl border border-border-card px-5 py-4">
          <h3 className="text-[10px] uppercase tracking-[0.15em] text-text-muted font-semibold mb-3">Progreso por Categoría</h3>
          <div className="space-y-2.5">
            {unlockedCats.slice(0, 5).map(cat => (
              <div key={cat.id} className="flex items-center gap-2.5">
                <span className="text-base flex-shrink-0">{cat.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-xs font-semibold text-white truncate" style={{ color: cat.color }}>{cat.name}</span>
                    <span className="text-[9px] text-text-muted flex-shrink-0 ml-2">{cat.count}/{cat.total}</span>
                  </div>
                  <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${cat.total > 0 ? (cat.count / cat.total) * 100 : 0}%`, background: cat.color }} />
                  </div>
                </div>
              </div>
            ))}
            {unlockedCats.length === 0 && <p className="text-xs text-text-muted text-center py-2">Desbloquea categorías subiendo de nivel</p>}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─── Bottom Nav ─── */

const NAV_ITEMS: { id: Screen; label: string; icon: string }[] = [
  { id: 'home', label: 'INICIO', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { id: 'categories', label: 'CATEGORÍAS', icon: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z' },
  { id: 'collection', label: 'COLECCIÓN', icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253' },
  { id: 'profile', label: 'PERFIL', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
]

function BottomNav({ active, onChange }: { active: Screen; onChange: (s: Screen) => void }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-bg-card/95 backdrop-blur-md border-t border-border-subtle safe-area-bottom">
      <div className="max-w-lg mx-auto w-full flex justify-around items-center h-14 px-2">
        {NAV_ITEMS.map(item => {
          const isActive = active === item.id
          return (
            <button key={item.id} onClick={() => onChange(item.id)} className="flex flex-col items-center gap-0.5 py-1 px-3 min-w-0">
              <svg className={`w-5 h-5 transition-colors ${isActive ? 'text-yellow-neon' : 'text-text-muted'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={isActive ? 2 : 1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
              </svg>
              <span className={`text-[9px] font-semibold tracking-widest transition-colors ${isActive ? 'text-yellow-neon' : 'text-text-muted'}`}>{item.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}

/* ─── Main App ─── */

export default function App() {
  const [splashDone, setSplashDone] = useState(false)
  const audio = useAudio()
  const lobbyRef = useRef<LobbyClientInstance | null>(null)

  const {
    progress, stats, pendingAchievements,
    leveledUp, newLevel, newCategories,
    handleFindWord, handleNewGame,
    handleClaimDaily, handleUsePowerUp, handleBuyPowerUp,
    clearPendingAchievements, clearLevelUp,
  } = useProgression()

  /* ─── SDK Lobby Communication ─── */

  useEffect(() => {
    if (!splashDone) return
    if (window.parent === window) return

    let lobbyOrigin = 'http://localhost:3000'
    try {
      const refUrl = new URL(document.referrer)
      lobbyOrigin = refUrl.origin
    } catch {}

    const lobby = createLobbyClient({ lobbyOrigin })
    lobby.onReady({ version: '1.0.0' })

    lobby.onPause(() => audio.pauseAll())
    lobby.onResume(() => audio.resumeAll())

    lobbyRef.current = lobby
    return () => { lobby.destroy(); lobbyRef.current = null }
  }, [splashDone, audio])

  /* ─── Navigation state ─── */

  const [screen, setScreen] = useState<Screen>('home')
  const [playing, setPlaying] = useState(false)
  const [gameMode, setGameMode] = useState<string>('classic')
  const [gameStarted, setGameStarted] = useState(false)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [showUnlock, setShowUnlock] = useState<string[] | null>(null)
  const [showLevelUp, setShowLevelUp] = useState(false)
  const [showHintModal, setShowHintModal] = useState(false)
  const [scorePopups, setScorePopups] = useState<{ id: number; amount: number; x: number; y: number }[]>([])
  const [particles, setParticles] = useState<{ id: number; x: number; y: number }[]>([])
  const popupIdRef = useRef(0)

  /* ─── Timed/Survival Mode State ─── */

  const [timeRemaining, setTimeRemaining] = useState(90)
  const [lives, setLives] = useState(3)
  const [gameOver, setGameOver] = useState(false)
  const freezeActive = useRef(false)

  /* ─── Reveal power-up state ─── */

  const [revealedWord, setRevealedWord] = useState<string | null>(null)

  /* ─── Supabase Sync ─── */

  const initialSyncDoneRef = useRef(false)

  useEffect(() => {
    const init = async () => {
      try {
        const supabase = getSupabase()
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const remote = await syncFromSupabase()
          if (remote) {
            const local = loadProgress()
            const merged = mergeProgress(local, remote)
            saveProgress(merged)
            window.dispatchEvent(new CustomEvent('sopa-progress-sync', { detail: merged }))
          }
        }
      } catch {}
      initialSyncDoneRef.current = true
    }
    init()
  }, [])

  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (!initialSyncDoneRef.current) return
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current)
    syncTimerRef.current = setTimeout(() => syncToSupabase(progress), 4000)
    return () => { if (syncTimerRef.current) clearTimeout(syncTimerRef.current) }
  }, [progress])

  /* ─── Handle leveled up from hook ─── */

  useEffect(() => {
    if (leveledUp) {
      setShowLevelUp(true)
      if (newCategories.length > 0) setShowUnlock(newCategories)
    }
  }, [leveledUp, newCategories])

  /* ─── Timer (game modes) ─── */

  useEffect(() => {
    if (gameStarted) {
      setElapsedSeconds(0)
      if (gameMode === 'timed') setTimeRemaining(90)
      if (gameMode === 'survival') setLives(3)
      setGameOver(false)

      timerRef.current = setInterval(() => {
        setElapsedSeconds(s => s + 1)

        if (gameMode === 'timed') {
          setTimeRemaining(prev => {
            if (freezeActive.current) return prev
            if (prev <= 1) { setGameOver(true); return 0 }
            return prev - 1
          })
        }
      }, 1000)
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [gameStarted, gameMode])

  /* ─── Game State ─── */

  const seedRef = useRef(Date.now().toString())
  const [gameWords, setGameWords] = useState<WordEntry[]>(() => pickWordsForGame(progress.unlockedCategories, 10, seedRef.current, gameMode))
  const [game, setGame] = useState<GameSession>(() => generateGrid(10, gameWords, seedRef.current))
  const [cells, setCells] = useState<GridCell[][]>(() => buildCells(game.grid))
  const [foundWords, setFoundWords] = useState<Set<string>>(new Set())
  const [wordPopup, setWordPopup] = useState<string | null>(null)

  const selectRef = useRef<[number, number][]>([])
  const isDownRef = useRef(false)

  const recordFind = useCallback((word: string, category: string) => {
    // Look up difficulty from word entry
    const entry = getWordData(word)
    const difficulty = entry?.difficulty ?? 'easy'

    const result = handleFindWord(word, category, difficulty)
    audio.play('found')
    if (result.leveledUp) audio.play('levelup')
    if (newCategories.length > 0) audio.play('unlock')

    // Notificar al lobby del progreso
    lobbyRef.current?.sendScoreUpdated({
      score: progress.xp + result.progress.xp,
      progress: foundWords.size / game.words.length,
    })

    // For survival mode, refill lives
    if (gameMode === 'survival') {
      setLives(prev => Math.min(prev + 1, 5))
    }
    // For timed mode, add time
    if (gameMode === 'timed') {
      setTimeRemaining(prev => Math.min(prev + 15, 120))
    }
  }, [handleFindWord, audio, newCategories.length, gameMode])

  const addScorePopup = useCallback((amount: number) => {
    const id = ++popupIdRef.current
    const x = 40 + Math.random() * 100
    const y = 50 + Math.random() * 50
    setScorePopups(prev => [...prev, { id, amount, x, y }])
    setTimeout(() => setScorePopups(prev => prev.filter(p => p.id !== id)), 900)
  }, [])

  const addParticles = useCallback((x: number, y: number) => {
    const id = ++popupIdRef.current
    setParticles(prev => [...prev, { id, x, y }])
    setTimeout(() => setParticles(prev => prev.filter(p => p.id !== id)), 600)
  }, [])

  const originRef = useRef<[number, number]>([0, 0])

  const onDown = useCallback((r: number, c: number) => {
    if (gameOver) return
    isDownRef.current = true
    originRef.current = [r, c]
    selectRef.current = [[r, c]]
    setCells(prev => {
      const next = prev.map(row => row.map(cell => ({ ...cell, selected: false })))
      next[r][c].selected = true
      return next
    })
    audio.play('select')
    navigator.vibrate?.(8)
  }, [audio, gameOver])

  const onEnter = useCallback((r: number, c: number) => {
    if (!isDownRef.current || gameOver) return
    const origin = originRef.current
    const snapped = getLineCells(origin, [r, c])
    const prev = selectRef.current
    if (snapped.length === prev.length && snapped.every(([pr, pc], i) => pr === prev[i]?.[0] && pc === prev[i]?.[1])) return
    selectRef.current = snapped
    setCells(prevCells => {
      const next = prevCells.map(row => row.map(cell => ({ ...cell, selected: false })))
      for (const [sr, sc] of snapped) if (next[sr]?.[sc]) next[sr][sc].selected = true
      return next
    })
  }, [gameOver])

  const onUp = useCallback(() => {
    if (!isDownRef.current || gameOver) return
    isDownRef.current = false
    const result = checkWord(cells, selectRef.current, game)
    if (result && !foundWords.has(result)) {
      const cat = game.words.find(w => w.word === result)?.category ?? ''
      recordFind(result, cat)
      setFoundWords(prev => new Set(prev).add(result))
      setWordPopup(result)
      addScorePopup(10)
      addParticles(150, 200)
      navigator.vibrate?.(25)
      setCells(prev => {
        const next = prev.map(row => row.map(cell => ({ ...cell, selected: false })))
        for (const w of game.words) {
          if (w.word === result || foundWords.has(w.word)) {
            for (const [pr, pc] of w.positions) next[pr][pc] = { ...next[pr][pc], found: true, partOfWord: w.word }
          }
        }
        return next
      })
    } else {
      // Wrong selection — survival mode loses a life
      if (gameMode === 'survival') {
        setLives(prev => {
          const next = prev - 1
          if (next <= 0) setGameOver(true)
          return Math.max(0, next)
        })
      }
      setCells(prev => prev.map(row => row.map(cell => ({ ...cell, selected: false }))))
    }
    selectRef.current = []
  }, [cells, foundWords, game, recordFind, addScorePopup, addParticles, gameMode, gameOver])

  const newGame = useCallback(() => {
    seedRef.current = Date.now().toString()
    const isDaily = gameMode === 'daily'
    const seed = isDaily ? getDailySeed() : seedRef.current
    const config = { size: 8, wordCount: 6 }
    const ws = pickWordsForGame(progress.unlockedCategories, config.wordCount, seed, gameMode)
    const g = generateGrid(config.size, ws, seed)
    setGameWords(ws)
    setGame(g)
    setCells(buildCells(g.grid))
    setFoundWords(new Set())
    setWordPopup(null)
    setRevealedWord(null)
    handleNewGame(gameMode)
  }, [progress.unlockedCategories, gameMode, handleNewGame])

  const handleStartGame = useCallback(() => {
    newGame()
    setGameStarted(true)
    // Notificar al lobby que el juego comenzó
    lobbyRef.current?.sendGameStarted()
  }, [newGame])

  /* ─── Power-up handlers ─── */

  const handleHint = useCallback(() => {
    const target = getHintTarget(game, foundWords)
    if (!target) return
    // Highlight the first letter cell briefly
    setCells(prev => {
      const next = prev.map(row => row.map(cell => ({ ...cell, highlighted: false })))
      const [r, c] = target.position
      if (next[r]?.[c]) next[r][c].highlighted = true
      return next
    })
    setTimeout(() => setCells(prev => prev.map(row => row.map(cell => ({ ...cell, highlighted: false })))), 2000)
    handleUsePowerUp('hint')
    setShowHintModal(false)
  }, [game, foundWords, handleUsePowerUp])

  const handleReveal = useCallback(() => {
    const target = getRevealTarget(game, foundWords)
    if (!target) return
    setRevealedWord(target.word)
    // Highlight all positions briefly
    setCells(prev => {
      const next = prev.map(row => row.map(cell => ({ ...cell, highlighted: false })))
      for (const [r, c] of target.positions) {
        if (next[r]?.[c]) next[r][c].highlighted = true
      }
      return next
    })
    setTimeout(() => {
      setCells(prev => prev.map(row => row.map(cell => ({ ...cell, highlighted: false }))))
      setRevealedWord(null)
    }, 2000)
    handleUsePowerUp('reveal')
    setShowHintModal(false)
  }, [game, foundWords, handleUsePowerUp])

  const handleShuffle = useCallback(() => {
    const newGrid = shuffleGrid(game.grid, game, foundWords)
    setCells(buildCells(newGrid))
    handleUsePowerUp('shuffle')
    setShowHintModal(false)
  }, [game, foundWords, handleUsePowerUp])

  const handleEliminate = useCallback(() => {
    const newCells = eliminateLetters(cells, game, foundWords, 8)
    setCells(newCells)
    handleUsePowerUp('eliminate')
    setShowHintModal(false)
  }, [cells, game, foundWords, handleUsePowerUp])

  const handleBuy = useCallback((type: PowerUpType) => {
    handleBuyPowerUp(type)
  }, [handleBuyPowerUp])

  /* ─── Game Timer/Freeze ─── */


  /* ─── Computed stats ─── */

  const headerStats = {
    level: stats.level,
    currentXp: stats.currentXp,
    xpForNext: stats.xpForNext,
    wordsFound: stats.wordsFound,
  }

  /* ─── Render ─── */

  if (!splashDone) {
    return <SplashScreen onFinish={() => { setSplashDone(true); audio.init() }} />
  }

  const allFound = foundWords.size === game.words.length && foundWords.size > 0 && !gameOver
  const timedMode = gameMode === 'timed' || gameMode === 'survival'

  return (
    <div className="h-screen bg-bg-primary flex flex-col overflow-hidden">
      {playing ? (gameStarted ? (
        <>
          {/* Game header bar */}
          <div className="flex items-center justify-between px-4 py-2.5 bg-bg-card border-b border-border-subtle">
            <button onClick={() => setGameStarted(false)} className="flex items-center gap-1 text-sm text-text-muted hover:text-white transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              Volver
            </button>
            <div className="flex items-center gap-2 text-xs">
              {timedMode && gameMode === 'timed' && (
                <span className={`font-mono font-bold ${timeRemaining <= 15 ? 'text-red-400 animate-pulse' : 'text-yellow-neon'}`}>
                  ⏱ {timeRemaining}s
                </span>
              )}
              {timedMode && gameMode === 'survival' && (
                <span className={`font-mono font-bold ${lives <= 1 ? 'text-red-400 animate-pulse' : 'text-green-neon'}`}>
                  {'❤️'.repeat(lives)}{'🖤'.repeat(Math.max(0, 3 - lives))}
                </span>
              )}
              <span className="text-white/40">{foundWords.size}/{game.words.length}</span>
              <span className="text-white/20">|</span>
              <span className="text-yellow-neon font-bold">✦ {progress.xp}</span>
              <span className="text-white/20">|</span>
              <span className="text-yellow-neon font-bold">🪙 {progress.coins || 0}</span>
            </div>
            <button onClick={newGame} className="text-xs bg-white/5 hover:bg-white/10 px-2 py-1.5 rounded-lg transition-colors text-text-muted" title="Nuevo juego">🔄</button>
          </div>

          <div className="flex-1 flex flex-col justify-center overflow-y-auto bg-bg-primary">
            <div className="flex flex-col items-center gap-1 px-0 pb-4">
              <div className="w-full max-w-[96vw] flex items-center justify-between px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className="text-purple-400 text-sm">🕺</span>
                  <span className="text-[9px] text-text-muted uppercase tracking-wider font-semibold">Modo {gameMode === 'classic' ? 'Clásico' : gameMode === 'timed' ? 'Contrarreloj' : gameMode === 'survival' ? 'Supervivencia' : gameMode === 'daily' ? 'Diario' : 'Categoría'}</span>
                </div>
                <span className="text-[10px] text-text-muted font-mono">{foundWords.size}/{game.words.length}</span>
              </div>

              {/* Revealed word label */}
              {revealedWord && (
                <div className="text-[10px] text-yellow-neon bg-yellow-neon/10 px-3 py-1 rounded-full mb-1 animate-pulse font-bold">
                  👁️ {revealedWord}
                </div>
              )}

              {/* Grid */}
              <div className="w-full max-w-[96vw] md:max-w-[520px]">
                <Board
                  cells={cells}
                  onCellPointerDown={onDown}
                  onCellPointerEnter={onEnter}
                  onCellPointerUp={onUp}
                  foundWords={[...foundWords]}
                  gameWords={game.words}
                />
              </div>

              {/* Controls */}
              <div className="flex items-center gap-4 text-xs mt-2">
                <button onClick={() => { if (foundWords.size < game.words.length) setShowHintModal(true) }}
                  disabled={foundWords.size >= game.words.length}
                  className="flex items-center gap-1.5 bg-bg-elevated/60 px-3 py-1.5 rounded-lg border border-border-card hover:bg-white/10 disabled:opacity-30 transition-colors text-text-secondary">
                  💡 Pista
                </button>
                <span className="text-text-muted font-mono text-[10px]">
                  ⏱ {String(Math.floor(elapsedSeconds / 60)).padStart(2, '0')}:{String(elapsedSeconds % 60).padStart(2, '0')}
                </span>
                <button onClick={newGame} className="flex items-center gap-1 bg-bg-elevated/60 px-3 py-1.5 rounded-lg border border-border-card hover:bg-white/10 transition-colors text-text-secondary">
                  🔀 Mezclar
                </button>
              </div>

              {/* Word List */}
              <div className="w-full max-w-[96vw] mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1.5 px-2">
                {game.words.map(w => {
                  const found = foundWords.has(w.word)
                  const color = HIGHLIGHT_COLORS[w.category] || '#8E44AD'
                  return (
                    <div key={w.word} className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: found ? color : '#444' }} />
                      <span className={`text-[10px] ${found ? 'text-white font-bold' : 'text-text-muted'}`}>{w.word}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </>
      ) : (
        <GameHubScreen
          progress={progress}
          stats={stats}
          onStartGame={handleStartGame}
          onBack={() => setPlaying(false)}
          selectedMode={gameMode}
          onChangeMode={setGameMode}
        />
      )) : (
        <>
          <Header stats={headerStats} onEncyclopedia={() => setScreen('collection')} onReset={newGame} />
          <div className="flex-1 flex flex-col overflow-y-auto pb-16">
            {screen === 'home' && (
              <HomeScreen
                onPlay={() => { setPlaying(true); setGameStarted(false) }}
                onDaily={() => { setPlaying(true); setGameStarted(false) }}
                onKnowledge={() => setScreen('collection')}
                onStore={() => setScreen('store')}
                progress={progress}
                stats={stats}
              />
            )}
            {screen === 'categories' && <CategoriesScreen progress={progress} />}
            {screen === 'collection' && <CollectionScreen progress={progress} onBack={() => setScreen('home')} />}
            {screen === 'profile' && <ProfileScreen progress={progress} stats={stats} />}
            {screen === 'store' && <StoreScreen progress={progress} onBack={() => setScreen('home')} onBuy={handleBuy} />}
            {screen === 'challenges' && <ChallengesScreen progress={progress} onBack={() => setScreen('home')} onClaimDaily={handleClaimDaily} />}
            {screen === 'modes' && <ModesScreen onBack={() => setScreen('home')} onSelect={(m) => { setGameMode(m); setPlaying(true); setGameStarted(false) }} />}
            {screen === 'story' && <StoryScreen onBack={() => setScreen('home')} />}
            {screen === 'settings' && <SettingsScreen onBack={() => setScreen('home')} />}
          </div>
          <BottomNav active={screen} onChange={setScreen} />
        </>
      )}

      {/* Modals */}
      <KnowledgeModal word={wordPopup} onClose={() => setWordPopup(null)} />
      {showUnlock && <CategoryUnlock newCategories={showUnlock} onClose={() => setShowUnlock(null)} />}
      {showLevelUp && <LevelUpModal newLevel={newLevel} onClose={() => { setShowLevelUp(false); clearLevelUp() }} />}
      {pendingAchievements.length > 0 && (
        <AchievementNotification achievements={pendingAchievements} onClose={clearPendingAchievements} />
      )}
      {allFound && (
        <LevelComplete
          foundCount={foundWords.size}
          totalWords={game.words.length}
          elapsedSeconds={elapsedSeconds}
          mode={gameMode}
          onNext={() => {
            lobbyRef.current?.sendGameCompleted({
              score: progress.xp,
              metadata: { mode: gameMode, wordsFound: foundWords.size, totalWords: game.words.length, time: elapsedSeconds },
            })
            newGame(); setGameStarted(false)
          }}
          onSummary={() => {
            lobbyRef.current?.sendGameCompleted({
              score: progress.xp,
              metadata: { mode: gameMode, wordsFound: foundWords.size, totalWords: game.words.length, time: elapsedSeconds },
            })
            setPlaying(false); setScreen('collection')
          }}
        />
      )}
      {gameOver && !allFound && (
        <GameOver
          foundCount={foundWords.size}
          totalWords={game.words.length}
          mode={gameMode}
          onRetry={() => { newGame(); setGameStarted(true) }}
          onExit={() => { setPlaying(false); setGameStarted(false) }}
        />
      )}
      {showHintModal && (
        <HintModal
          powerUps={progress.powerUps}
          onUseHint={handleHint}
          onUseReveal={handleReveal}
          onUseShuffle={handleShuffle}
          onUseEliminate={handleEliminate}
          onClose={() => setShowHintModal(false)}
        />
      )}

      {/* Effects */}
      {scorePopups.map(p => <ScorePopup key={p.id} amount={p.amount} x={p.x} y={p.y} />)}
      {particles.map(p => <ParticleBurst key={p.id} x={p.x} y={p.y} />)}
    </div>
  )
}
