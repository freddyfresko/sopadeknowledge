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
  StoreScreen, ChallengesScreen,
  CollectionScreen, ProfileScreen,
  AchievementNotification,
} from './screens'
import useAudio from './hooks/useAudio'
import { loadProgress, saveProgress } from './game/progression'
import { syncToLobby, syncFromLobby, mergeProgress } from './lib/lobby-persistence'
import { createLobbyClient } from './lib/sdk/lobby-client'
import type { LobbyClientInstance } from './lib/sdk/lobby-client'
import type { SessionContextPayload } from './lib/sdk/types'
import { Button, Card, Progress } from './components/ui'
import { IconPlay, IconStar, IconBook, IconCart, IconHome, IconGrid, IconProfile, IconHint, IconEye, IconShuffle, IconTrash } from './components/icons'

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

  /* Cápsulas continuas (estilo pegatina) para palabras encontradas y selección */
  const n = cells.length
  const capsuleFor = (pos: [number, number][], color: string) => {
    let cx = 0
    let cy = 0
    for (const [r, c] of pos) { cx += c + 0.5; cy += r + 0.5 }
    cx = (cx / pos.length) * (100 / n)
    cy = (cy / pos.length) * (100 / n)
    let angle = 0
    let wPct = 100 / n
    if (pos.length > 1) {
      const [r0, c0] = pos[0]
      const [r1, c1] = pos[pos.length - 1]
      const steps = pos.length - 1
      const unitR = (r1 - r0) / steps
      const unitC = (c1 - c0) / steps
      angle = Math.atan2(unitR, unitC) * 180 / Math.PI
      wPct = (steps * Math.sqrt(unitR * unitR + unitC * unitC) + 1) * (100 / n)
    }
    return { cx, cy, wPct, angle, color }
  }
  const capsules = gameWords
    .filter(gw => foundWords.includes(gw.word) && gw.positions.length > 0)
    .map(gw => ({ key: gw.word, ...capsuleFor(gw.positions, HIGHLIGHT_COLORS[gw.category] || '#8E44AD') }))

  /* Cápsula de selección en curso (drag o hint/reveal) */
  const selPos: [number, number][] = []
  for (let r = 0; r < cells.length; r++) {
    for (let c = 0; c < cells[r].length; c++) {
      if (cells[r][c].selected || cells[r][c].highlighted) selPos.push([r, c])
    }
  }
  const selCapsule = selPos.length > 0 ? capsuleFor(selPos, 'rgba(255, 193, 7, 0.55)') : null

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
        className="relative mx-auto rounded-3xl bg-gradient-to-b from-white to-stone-100 p-2.5 border border-black/5 shadow-[0_10px_36px_rgba(0,0,0,0.4)]"
        style={{ maxWidth: '100%' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={onCellPointerUp}
        onPointerLeave={onCellPointerUp}
      >
        {/* Letras sobre el tablero (sin celdas visibles) */}
        <div className="grid gap-0" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}>
          {cells.map((row, r) =>
            row.map((cell, c) => {
              const isFound = foundColorMap.has(`${r}-${c}`)
              const isSelected = cell.selected || cell.highlighted
              return (
                <div
                  key={`${r}-${c}`}
                  data-r={r}
                  data-c={c}
                  role="gridcell"
                  className={`aspect-square flex items-center justify-center text-sm md:text-base lg:text-lg font-extrabold transition-all duration-100 cursor-pointer select-none ${
                    isFound
                      ? 'text-white relative z-[1] drop-shadow-[0_1px_3px_rgba(0,0,0,0.55)]'
                      : isSelected
                        ? 'text-stone-900 relative z-[1]'
                        : 'text-stone-900 hover:bg-black/[0.06] hover:rounded-lg'
                  }`}
                >
                  {cell.letter}
                </div>
              )
            })
          )}
        </div>

        {/* Cápsulas de palabras encontradas */}
        <div className="absolute inset-2.5 pointer-events-none z-0">
          {capsules.map(cap => (
            <div
              key={cap.key}
              className="absolute"
              style={{
                left: `${cap.cx}%`,
                top: `${cap.cy}%`,
                width: `${cap.wPct}%`,
                height: `${100 / n}%`,
                transform: `translate(-50%, -50%) rotate(${cap.angle}deg)`,
                background: `linear-gradient(180deg, ${cap.color}F2 0%, ${cap.color}D9 100%)`,
                borderRadius: '9999px',
                boxShadow: `0 3px 10px ${cap.color}59, 0 1px 2px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.3)`,
              }}
            />
          ))}

          {/* Cápsula de selección en curso (drag) */}
          {selCapsule && (
            <div
              className="absolute"
              style={{
                left: `${selCapsule.cx}%`,
                top: `${selCapsule.cy}%`,
                width: `${selCapsule.wPct}%`,
                height: `${100 / n}%`,
                transform: `translate(-50%, -50%) rotate(${selCapsule.angle}deg)`,
                background: 'rgba(255, 193, 7, 0.55)',
                borderRadius: '9999px',
                border: '2px solid rgba(255, 193, 7, 0.85)',
                boxShadow: '0 2px 10px rgba(255,193,7,0.45), inset 0 1px 0 rgba(255,255,255,0.35)',
              }}
            />
          )}
        </div>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm overflow-y-auto" onClick={onClose}>
      <div className="card-enter relative my-auto max-w-md w-full rounded-2xl overflow-hidden border border-border-card bg-bg-card shadow-[0_24px_64px_rgba(0,0,0,0.4)]" onClick={e => e.stopPropagation()}>
        {/* Hero header con gradiente direccional */}
        <div className="relative h-40 overflow-hidden flex items-center justify-center"
             style={{ background: `linear-gradient(135deg, ${color}33 0%, ${color}08 60%, transparent 100%)` }}>
          <div className="absolute inset-0" style={{ background: `radial-gradient(circle at 30% 30%, ${color}22, transparent 60%)` }} />
          <span className="text-6xl drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)] relative z-10">{cat?.icon ?? '📖'}</span>
          {cat && (
            <div className="absolute top-3 left-3 rounded-full px-2.5 py-1 flex items-center gap-1.5 bg-black/40 backdrop-blur-sm border border-white/10">
              <span className="text-sm">{cat.icon}</span>
              <span className="text-[10px] text-white font-bold uppercase tracking-widest">{cat.name}</span>
            </div>
          )}
          <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-bg-card via-bg-card/70 to-transparent" />
          <div className="absolute bottom-3 left-5 right-5 flex items-baseline gap-2">
            <span className="text-yellow-neon text-lg">👑</span>
            <span className="text-overline text-[10px] text-yellow-neon">¡Bien!</span>
            <h2 className="text-display text-2xl text-white tracking-wide drop-shadow-lg ml-auto">{word}</h2>
          </div>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-3">
          <div className="rounded-xl p-3.5 bg-bg-elevated/60 border border-border-subtle">
            <p className="text-sm text-text-primary leading-relaxed">{entry.knowledge.description}</p>
          </div>

          <div className="rounded-xl p-3.5 border" style={{ borderColor: `${color}40`, background: `${color}0D` }}>
            <div className="text-overline text-[9px] mb-1.5 font-bold" style={{ color }}>¿Por qué es importante?</div>
            <p className="text-xs text-text-secondary leading-relaxed">{entry.knowledge.importance}</p>
          </div>

          {entry.knowledge.funFact && (
            <div className="rounded-xl p-3.5 bg-yellow-neon/10 border border-yellow-neon/25">
              <div className="text-overline text-[9px] mb-1.5 font-bold text-yellow-neon">🤯 Dato curioso</div>
              <p className="text-xs text-text-secondary leading-relaxed">{entry.knowledge.funFact}</p>
            </div>
          )}

          {entry.knowledge.related && entry.knowledge.related.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {entry.knowledge.related.map(r => (
                <span key={r} className="text-[9px] uppercase tracking-wider bg-white/5 px-2 py-0.5 rounded-full text-text-muted border border-border-subtle">{r}</span>
              ))}
            </div>
          )}
        </div>

        <button onClick={onClose}
          className="w-full py-3.5 bg-yellow-neon text-black text-heading text-sm tracking-wider btn-3d hover:brightness-110 uppercase">
          Continuar
        </button>
      </div>
    </div>
  )
}

/* ─── Category Unlock ─── */

function CategoryUnlock({ newCategories, onClose }: { newCategories: string[]; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto" onClick={onClose}>
      <div className="card-enter relative my-auto max-w-sm w-full rounded-2xl border border-yellow-neon/30 p-6 bg-bg-card text-center shadow-[0_24px_64px_rgba(0,0,0,0.45)]" onClick={e => e.stopPropagation()}>
        <div className="absolute -inset-1 bg-gradient-to-b from-yellow-neon/15 to-transparent rounded-3xl pointer-events-none" />
        <div className="relative">
          <div className="text-3xl mb-2">🎉</div>
          <h2 className="text-heading text-base mb-3 text-white uppercase tracking-wider">¡Nuevas categorías!</h2>
          <div className="space-y-2 text-left">
            {newCategories.map(catId => {
              const cat = getCategory(catId)
              if (!cat) return null
              return (
                <div key={catId} className="bg-bg-elevated/60 rounded-xl p-3 flex items-center gap-3 border border-border-card">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xl flex-shrink-0" style={{ background: `${cat.color}22` }}>
                    {cat.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm" style={{ color: cat.color }}>{cat.name}</div>
                    <div className="text-[11px] text-text-muted">{cat.description}</div>
                  </div>
                </div>
              )
            })}
          </div>
          <Button variant="primary" fullWidth onClick={onClose} className="mt-4">¡A jugar!</Button>
        </div>
      </div>
    </div>
  )
}

/* ─── Level Up Modal ─── */

function LevelUpModal({ newLevel, onClose }: { newLevel: number; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto" onClick={onClose}>
      <div className="card-enter relative my-auto max-w-sm w-full rounded-2xl border border-yellow-neon/30 p-6 bg-bg-card text-center shadow-[0_24px_64px_rgba(0,0,0,0.45)]" onClick={e => e.stopPropagation()}>
        <div className="absolute -inset-1 bg-gradient-to-b from-yellow-neon/15 to-transparent rounded-3xl pointer-events-none" />
        <div className="relative">
          <div className="text-4xl mb-2">⬆️</div>
          <h2 className="text-heading text-base text-yellow-neon mb-1 uppercase tracking-wider">¡Subiste de nivel!</h2>
          <div className="text-display text-6xl text-white my-3 text-stroke-yellow">{newLevel}</div>
          <p className="text-sm text-text-secondary mb-4">Sigue así, tu conocimiento crece</p>
          <Button variant="primary" fullWidth onClick={onClose}>¡Sí!</Button>
        </div>
      </div>
    </div>
  )
}

/* ─── Level Complete Modal ─── */

function LevelComplete({ foundCount, totalWords, stageSeconds, onNext, onSummary, mode, bestTime }: {
  foundCount: number; totalWords: number; stageSeconds: number
  onNext: () => void; onSummary: () => void; mode: string; bestTime?: number
}) {
  const earnedXp = foundCount * 20
  const precision = totalWords > 0 ? Math.round((foundCount / totalWords) * 100) : 0
  const earnedCoins = foundCount * 25
  const earnedKnowledge = foundCount
  const timeStr = `${String(Math.floor(stageSeconds / 60)).padStart(2, '0')}:${String(stageSeconds % 60).padStart(2, '0')}`
  // Récord personal: mejor tiempo de etapa en este modo (menos = mejor).
  const isRecord = bestTime == null || stageSeconds < bestTime
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm overflow-y-auto">
      <div className="card-enter relative my-auto max-w-sm w-full rounded-2xl overflow-hidden border border-yellow-neon/20 bg-bg-card shadow-[0_24px_64px_rgba(0,0,0,0.45)] text-center">
        {/* Glow background */}
        <div className="absolute -inset-1 bg-gradient-to-b from-yellow-neon/10 to-transparent rounded-3xl pointer-events-none" />

        <div className="relative px-6 pt-6 pb-3">
          <div className="flex items-center justify-center gap-2 mb-1">
            <span className="text-xl">👑</span>
            <h2 className="text-heading text-base text-yellow-neon uppercase tracking-wider">¡Completado!</h2>
            <span className="text-xl">👑</span>
          </div>

          <div className="relative mx-auto my-5 w-24 h-24">
            <div className="absolute inset-0 rounded-full bg-yellow-neon/10 animate-pulse" />
            <div className="absolute inset-2 rounded-full bg-yellow-neon/20" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-yellow-neon/30 to-purple-neon/20 flex items-center justify-center border-2 border-yellow-neon/40 shadow-[0_4px_20px_rgba(255,193,7,0.3)]">
                <span className="text-2xl">{mode === 'timed' ? '⏱️' : mode === 'survival' ? '💪' : '📻'}</span>
              </div>
            </div>
          </div>

          {/* Stats grid — staggered in */}
          <div className="grid grid-cols-3 gap-2 mb-4 stagger-in">
            <div className="bg-bg-elevated/60 rounded-lg py-2.5 px-2 border border-border-card">
              <div className="text-overline text-[8px] text-text-muted mb-1">XP</div>
              <div className="text-base font-bold text-yellow-neon">+{earnedXp}</div>
            </div>
            <div className="bg-bg-elevated/60 rounded-lg py-2.5 px-2 border border-border-card">
              <div className="text-overline text-[8px] text-text-muted mb-1">Tiempo</div>
              <div className="text-base font-bold text-white font-mono">{timeStr}</div>
              {isRecord && (
                <div className="text-[8px] text-yellow-neon font-bold mt-0.5 uppercase tracking-wider">🏆 ¡Récord!</div>
              )}
            </div>
            <div className="bg-bg-elevated/60 rounded-lg py-2.5 px-2 border border-border-card">
              <div className="text-overline text-[8px] text-text-muted mb-1">Precisión</div>
              <div className="text-base font-bold text-green-neon">{precision}%</div>
            </div>
          </div>

          {/* Reward chips */}
          <div className="flex justify-center gap-4 mb-2">
            <div className="flex items-center gap-1.5 text-sm">
              <span className="text-yellow-neon text-lg">🪙</span>
              <span className="text-white font-bold">+{earnedCoins}</span>
            </div>
            <div className="flex items-center gap-1.5 text-sm">
              <span className="text-purple-neon-light text-lg">💎</span>
              <span className="text-white font-bold">+{earnedKnowledge}</span>
            </div>
            <div className="flex items-center gap-1.5 text-sm">
              <span className="text-yellow-neon text-lg">📖</span>
              <span className="text-white font-bold">+{foundCount}</span>
            </div>
          </div>
        </div>

        <button onClick={onNext}
          className="w-full py-3.5 bg-yellow-neon text-black text-heading text-sm uppercase tracking-wider btn-3d hover:brightness-110 font-bold">
          Siguiente
        </button>
        <button onClick={onSummary}
          className="w-full py-2.5 bg-white/5 text-text-secondary text-xs hover:bg-white/10 transition-colors uppercase tracking-wider">
          Ver colección
        </button>
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
    { label: 'Pista',   icon: <IconHint size={18} />,    desc: 'Destella primera letra', count: powerUps.hint ?? 0, action: onUseHint },
    { label: 'Revelar', icon: <IconEye size={18} />,     desc: 'Muestra posición',       count: powerUps.reveal ?? 0, action: onUseReveal },
    { label: 'Mezclar', icon: <IconShuffle size={18} />, desc: 'Reordena letras',       count: powerUps.shuffle ?? 0, action: onUseShuffle },
    { label: 'Eliminar',icon: <IconTrash size={18} />,   desc: 'Quita letras falsas',   count: powerUps.eliminate ?? 0, action: onUseEliminate },
  ]
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm overflow-y-auto" onClick={onClose}>
      <div className="card-enter relative my-auto w-full max-w-sm rounded-t-2xl border border-border-card bg-bg-card pb-[env(safe-area-inset-bottom,0px)]" onClick={e => e.stopPropagation()}>
        {/* Drag handle */}
        <div className="flex justify-center pt-2.5 pb-1">
          <span className="block w-10 h-1 rounded-full bg-white/20" />
        </div>
        <div className="px-5 pb-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-yellow-neon"><IconHint size={20} /></span>
            <h3 className="text-heading text-sm text-white uppercase tracking-wider">Pistas</h3>
          </div>
          <div className="space-y-2">
            {items.map(h => {
              const enabled = h.count > 0
              return (
                <button key={h.label} disabled={!enabled} onClick={h.action}
                  className={[
                    'w-full flex items-center justify-between py-3 px-4 rounded-xl transition-all',
                    enabled
                      ? 'bg-bg-elevated/60 hover:bg-white/10 border border-border-card btn-3d cursor-pointer'
                      : 'bg-white/[0.02] border border-border-subtle opacity-40 cursor-not-allowed',
                  ].join(' ')}>
                  <div className="flex items-center gap-3">
                    <span className={enabled ? 'text-yellow-neon' : 'text-text-muted'}>{h.icon}</span>
                    <div className="text-left">
                      <span className="text-sm font-semibold text-white block">{h.label}</span>
                      <span className="text-[10px] text-text-muted">{h.desc}</span>
                    </div>
                  </div>
                  <span className={`text-xs font-bold ${enabled ? 'text-yellow-neon' : 'text-text-muted'}`}>×{h.count}</span>
                </button>
              )
            })}
          </div>
          <p className="text-overline text-[9px] text-text-muted text-center mt-3">Compra más power-ups en la Tienda</p>
        </div>
      </div>
    </div>
  )
}

/* ─── Game Over Modal (for timed/survival) ─── */

function GameOver({ foundCount, totalWords, mode, onRetry, onExit }: {
  foundCount: number; totalWords: number; mode: string
  onRetry: () => void; onExit: () => void
}) {
  const precision = totalWords > 0 ? Math.round((foundCount / totalWords) * 100) : 0
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm overflow-y-auto">
      <div className="card-enter relative my-auto max-w-sm w-full rounded-2xl overflow-hidden border border-red-500/30 bg-bg-card shadow-[0_24px_64px_rgba(0,0,0,0.45)] text-center">
        <div className="absolute -inset-1 bg-gradient-to-b from-red-500/10 to-transparent rounded-3xl pointer-events-none" />
        <div className="relative px-6 pt-7 pb-5">
          <div className="text-4xl mb-2">{mode === 'timed' ? '⏰' : '💀'}</div>
          <h2 className="text-heading text-lg text-red-400 mb-1">
            {mode === 'timed' ? '¡Tiempo!' : 'Game Over'}
          </h2>
          <p className="text-sm text-text-secondary mb-4">
            Encontraste <span className="font-bold text-white">{foundCount}</span> de <span className="font-bold text-white">{totalWords}</span> palabras
          </p>
          <div className="inline-flex items-center gap-2 bg-bg-elevated/60 rounded-full px-4 py-1.5 border border-border-card mb-5">
            <span className="text-overline text-[9px] text-text-muted">Precisión</span>
            <span className="text-sm font-bold text-green-neon">{precision}%</span>
          </div>
        </div>
        <div className="flex gap-2 px-5 pb-5">
          <Button variant="primary" onClick={onRetry} className="flex-1">Reintentar</Button>
          <Button variant="ghost" onClick={onExit} className="flex-1">Salir</Button>
        </div>
      </div>
    </div>
  )
}

/* ─── Reset Progress Modal (empezar de 0) ─── */

function ResetConfirmModal({ onCancel, onConfirm }: { onCancel: () => void; onConfirm: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto" onClick={onCancel}>
      <div className="card-enter relative my-auto max-w-sm w-full rounded-2xl border border-red-500/30 p-6 bg-bg-card text-center shadow-[0_24px_64px_rgba(0,0,0,0.45)]" onClick={e => e.stopPropagation()}>
        <div className="absolute -inset-1 bg-gradient-to-b from-red-500/10 to-transparent rounded-3xl pointer-events-none" />
        <div className="relative">
          <div className="text-4xl mb-2">🗑️</div>
          <h2 className="text-heading text-base text-red-400 mb-2 uppercase tracking-wider">¿Reiniciar progreso?</h2>
          <p className="text-xs text-text-secondary mb-5 leading-relaxed">
            Se borrará <span className="text-white font-bold">todo</span> tu progreso:
            palabras, XP, monedas, logros y ranking de este juego. No se puede deshacer.
          </p>
          <div className="flex gap-2">
            <button
              onClick={onCancel}
              className="flex-1 py-3 bg-white/5 text-text-secondary text-heading text-sm uppercase tracking-wider rounded-xl hover:bg-white/10 transition-colors border border-border-subtle"
            >
              Cancelar
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 py-3 bg-red-500 text-white text-heading text-sm uppercase tracking-wider rounded-xl btn-3d hover:brightness-110 font-bold"
            >
              Sí, reiniciar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─── Hall Sopa — pantalla única de entrada (fusión Home + Hub) ─── */

function HallScreen({ progress, stats, onStartGame, selectedMode, onChangeMode, onStore, onDaily }: {
  progress: { level: number; xp: number; unlockedCategories: string[]; wordsFound: FoundWord[]; coins?: number; knowledgePoints?: number; dailyStreak: number; totalWordsFound: number; totalGames: number }
  stats: { currentXp: number; level: number; xpForNext: number; rank: { icon: string; name: string; color: string } }
  onStartGame: () => void; selectedMode: string; onChangeMode: (mode: string) => void
  onStore: () => void; onDaily: () => void
}) {
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
    daily: { name: 'Sopa Diaria', icon: '⭐' },
  }

  return (
    <div className="flex-1 flex flex-col overflow-y-auto bg-bg-primary">
      <div className="flex-1 px-4 py-5 max-w-lg mx-auto w-full space-y-4 pb-24">
        {/* Branding */}
        <div className="text-center pt-1 pb-1">
          <p className="text-overline text-[10px] text-text-muted mb-2">Juega Hip Hop</p>
          <h1 className="text-display text-4xl md:text-5xl leading-none tracking-wide">
            <span className="text-white/90">SOPA DE</span>
          </h1>
          <div className="flex items-center justify-center">
            <span className="text-display text-4xl md:text-6xl leading-none text-yellow-neon text-stroke-yellow tracking-wide">KNOW</span>
            <span className="relative inline-flex items-center">
              <span className="text-display text-4xl md:text-6xl leading-none text-yellow-neon text-stroke-yellow tracking-wide">LEDGE</span>
              <span className="absolute -top-4 -right-2 text-base md:text-lg drop-shadow-lg" aria-hidden="true">👑</span>
            </span>
          </div>
          <p className="text-overline text-[11px] text-text-secondary mt-2">Aprende Hip Hop Jugando</p>
        </div>

        {/* Mode selector — responsive grid (sin scroll horizontal) */}
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(modeLabels).map(([id, m]) => {
            const isActive = selectedMode === id
            return (
              <button
                key={id}
                onClick={() => onChangeMode(id)}
                className={[
                  'flex flex-col items-center justify-center gap-1 px-2 py-2.5 rounded-lg',
                  'text-[10px] font-bold uppercase tracking-wider transition-all',
                  isActive
                    ? 'bg-yellow-neon text-black shadow-[0_3px_0_0_var(--btn-shadow-yellow)]'
                    : 'bg-bg-elevated/60 text-text-secondary border border-border-card hover:bg-white/10',
                ].join(' ')}
              >
                <span className="text-base leading-none">{m.icon}</span>
                <span className="text-center leading-tight">{m.name}</span>
              </button>
            )
          })}
        </div>

        {/* Player Card */}
        <Card className="overflow-hidden">
          <div className="flex items-center gap-4 px-5 pt-5 pb-3">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-yellow-neon to-purple-neon flex items-center justify-center text-2xl shadow-[var(--shadow-glow-yellow)] flex-shrink-0">
              🧢
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-heading text-base text-white">Nivel {stats.level}</span>
                <span className="text-[10px] rounded-full font-semibold uppercase tracking-wider px-2 py-0.5" style={{ color: stats.rank.color, background: `${stats.rank.color}22` }}>
                  {stats.rank.icon} {stats.rank.name}
                </span>
              </div>
              <div className="mt-2">
                <div className="flex justify-between text-[10px] text-text-muted mb-1">
                  <span>✦ {stats.currentXp} XP</span>
                  <span>{stats.xpForNext} XP</span>
                </div>
                <Progress value={stats.currentXp} max={stats.xpForNext} height="md" color="linear-gradient(90deg, #FFC107, #FFE480)" />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-px bg-border-subtle mx-5 mb-4 rounded-xl overflow-hidden">
            {(
              [
                { label: 'Palabras', value: progress.totalWordsFound, icon: '📖', color: 'text-yellow-neon' },
                { label: 'Monedas', value: progress.coins || 0, icon: '🪙', color: 'text-yellow-neon' },
                { label: 'Knowledge', value: progress.knowledgePoints || 0, icon: '💎', color: 'text-purple-neon-light' },
                { label: 'Racha', value: progress.dailyStreak, icon: '🔥', color: 'text-orange-400' },
              ] as const
            ).map(s => (
              <div key={s.label} className="bg-bg-elevated/60 p-2.5 text-center">
                <div className="text-base mb-0.5">{s.icon}</div>
                <div className={`text-sm font-bold ${s.color}`}>{s.value}</div>
                <div className="text-[8px] text-text-muted uppercase tracking-wider mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        </Card>

        {/* Play Button — inicia las etapas directo desde el hall */}
        <Button variant="primary" size="lg" fullWidth
          icon={<IconPlay size={22} />}
          onClick={onStartGame}
          className="!text-lg !py-4 !rounded-2xl shadow-[0_6px_20px_rgba(255,193,7,0.25)]"
        >
          Comenzar
        </Button>

        {/* Quick access */}
        <div className="grid grid-cols-2 gap-2">
          <button onClick={onStore} className="flex flex-col items-center justify-center gap-1 bg-bg-card rounded-xl border border-border-card py-3 hover:bg-white/5 transition-all btn-3d">
            <IconCart size={18} className="text-yellow-neon" />
            <span className="text-[9px] font-bold uppercase tracking-wider text-text-secondary">Tienda</span>
          </button>
          <button onClick={onDaily} className="flex flex-col items-center justify-center gap-1 bg-bg-card rounded-xl border border-border-card py-3 hover:bg-white/5 transition-all btn-3d">
            <IconStar size={18} className="text-orange-400" />
            <span className="text-[9px] font-bold uppercase tracking-wider text-text-secondary">Recompensas</span>
          </button>
        </div>

        {/* Categories */}
        <Card className="px-5 py-4">
          <h3 className="text-overline text-[10px] text-text-muted mb-3">Progreso por Categoría</h3>
          <div className="space-y-3">
            {unlockedCats.slice(0, 5).map(cat => (
              <div key={cat.id} className="flex items-center gap-2.5">
                <span className="text-base flex-shrink-0">{cat.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold truncate" style={{ color: cat.color }}>{cat.name}</span>
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
        </Card>
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

/* ─── Bottom Nav ─── */

const NAV_ITEMS: { id: Screen; label: string; icon: React.ReactNode }[] = [
  { id: 'home', label: 'Inicio', icon: <IconHome size={20} /> },
  { id: 'categories', label: 'Categorías', icon: <IconGrid size={20} /> },
  { id: 'collection', label: 'Colección', icon: <IconBook size={20} /> },
  { id: 'profile', label: 'Perfil', icon: <IconProfile size={20} /> },
]

function BottomNav({ active, onChange }: { active: Screen; onChange: (s: Screen) => void }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-bg-card/95 backdrop-blur-md border-t border-border-subtle safe-area-bottom">
      <div className="max-w-lg mx-auto w-full flex justify-around items-center h-14 px-2">
        {NAV_ITEMS.map(item => {
          const isActive = active === item.id
          return (
            <button key={item.id} onClick={() => onChange(item.id)} className="flex flex-col items-center justify-center gap-1 py-1 px-3 min-w-0">
              <span className={`transition-colors ${isActive ? 'text-yellow-neon' : 'text-text-muted'}`}>
                {item.icon}
              </span>
              <span className={`text-[9px] font-semibold tracking-widest transition-colors leading-none ${isActive ? 'text-yellow-neon' : 'text-text-muted'}`}>
                {item.label}
              </span>
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
  // Estabilizar la referencia de audio para que no dispare re-renders
  // del useEffect que crea el lobby (que destruiría el lobby en cada render).
  const audioRef = useRef(audio)
  audioRef.current = audio
  const lobbyRef = useRef<LobbyClientInstance | null>(null)
  // Contexto del lobby (displayName, avatar, level, isGuest, ...).
  // Cuando el juego corre dentro del iframe del lobby, el lobby nos lo envía
  // via jh:session_context. Null mientras tanto (modo standalone).
  const [lobbyCtx, setLobbyCtx] = useState<SessionContextPayload | null>(null)

  // Re-render cuando cambia el viewport (rotación, teclado móvil, barra del
  // navegador). h-dvh se recalcula solo, pero algunos layouts flex necesitan
  // un re-flow para re-centrarse (modales, grid).
  const [viewport, setViewport] = useState<{
    width?: number
    height?: number
    isFullscreen?: boolean
    orientation?: 'portrait' | 'landscape'
    devicePixelRatio?: number
  }>({})
  useEffect(() => {
    const onResize = () => setViewport((v) => ({ ...v }))
    window.addEventListener('resize', onResize)
    window.addEventListener('orientationchange', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      window.removeEventListener('orientationchange', onResize)
    }
  }, [])

  const {
    progress, stats, pendingAchievements,
    leveledUp, newLevel, newCategories,
    handleFindWord, handleNewGame,
    handleClaimDaily, handleUsePowerUp, handleBuyPowerUp,
    handleResetProgress, handleRecordStageTime,
    clearPendingAchievements, clearLevelUp,
  } = useProgression()

  /* ─── SDK Lobby Communication ─── */

  useEffect(() => {
    if (!splashDone) return
    if (window.parent === window) return

    let lobbyOrigin = 'http://localhost:3000'

    // 1. Intentar desde document.referrer (caso normal)
    if (document.referrer) {
      try {
        const refUrl = new URL(document.referrer)
        lobbyOrigin = refUrl.origin
      } catch {}
    }

    // 2. Intentar desde window.location.ancestorOrigins (Chrome/Firefox moderno)
    if (window.location.ancestorOrigins?.length) {
      try {
        const origin = window.location.ancestorOrigins[0]
        if (origin) lobbyOrigin = origin
      } catch {}
    }

    const lobby = createLobbyClient({
      lobbyOrigin,
      gameId: 'sopa',
      capabilities: ['save_progress', 'load_progress', 'achievements', 'campaigns'],
    })
    lobby.sendReady({ version: '1.0.0' })

    lobby.onPause(() => audioRef.current.pauseAll())
    lobby.onResume(() => audioRef.current.resumeAll())

    // El lobby cerró la sesión (navegó fuera, timeout, logout) — pausar audio.
    lobby.onEndSession(() => audioRef.current.pauseAll())

    // El lobby nos notifica el tamaño real del iframe (resize, fullscreen,
    // rotación). Guardamos el viewport y forzamos re-render para que los
    // layouts se re-centren correctamente en móvil.
    lobby.onViewportChanged((vp) => {
      console.log('[Sopa App] viewport_changed:', vp)
      setViewport((prev) => ({ ...prev, ...vp }))
    })

    // El lobby nos enviará el contexto del usuario una vez confirmado el ready.
    // Lo guardamos para personalizar la UI (ProfileScreen muestra displayName
    // y avatar del lobby en vez del perfil local hardcodeado) y disparamos
    // la carga de progreso.
    // Flag que bloquea el auto-save hasta que el progreso remoto
    // se haya cargado (y mergedo) desde el lobby.  Esto evita que el
    // juego suba su estado local (posiblemente incompleto o nivel 0)
    // antes de haber leído lo que el lobby ya tiene guardado en Supabase,
    // pisando el estado real del jugador.
    let syncFromLobbyDone = false

    lobby.onSessionContext((ctx) => {
      console.log('[Sopa App] session_context recibido:', {
        userId: ctx.userId,
        displayName: ctx.displayName,
        isGuest: ctx.isGuest,
        level: ctx.level,
        xp: ctx.xp,
      })
      setLobbyCtx(ctx)

      // Si el usuario es invitado, el lobby confirma guardados sin persistir.
      // El juego sigue funcionando con localStorage como cache local.
      if (ctx.isGuest) {
        initialSyncDoneRef.current = true
        syncFromLobbyDone = true
        return
      }

      // Cargar el progreso remoto desde el lobby (Supabase) al recibir
      // el contexto.  Este es el único punto desde donde disparamos la
      // carga inicial, porque aquí el lobby ya terminó su handshake y
      // garantizamos que lobbyRef.current existe.
      void (async () => {
        try {
          const remote = await syncFromLobby(lobbyRef.current)
          const resetPending = localStorage.getItem('sopa_reset_pending')
          if (remote && resetPending) {
            // Reset local reciente (bandera activa) pero el lobby aún tiene
            // estado pre-reset (el reset del server no llegó o un save viejo
            // en vuelo lo re-subió). El merge normal usaría Math.max y
            // reviviría el progreso viejo. La verdad es el LOCAL post-reset:
            // lo dejamos como está y sobre-escribimos el server con él.
            const local = loadProgress()
            console.log('[Sopa App] reset pendiente — ignorando remoto viejo, subiendo estado post-reset al lobby')
            saveProgress(local)
            window.dispatchEvent(new CustomEvent('sopa-progress-sync', { detail: local }))
            const saved = await syncToLobby(lobbyRef.current, local)
            if (saved.success) localStorage.removeItem('sopa_reset_pending')
          } else if (remote) {
            const local = loadProgress()
            const merged = mergeProgress(local, remote)
            saveProgress(merged)
            window.dispatchEvent(new CustomEvent('sopa-progress-sync', { detail: merged }))
          }
        } catch (err) {
          console.warn('[Sopa App] Error cargando progreso remoto:', err)
        } finally {
          syncFromLobbyDone = true
          initialSyncDoneRef.current = true
        }
      })()
    })

    // Safety net: si el lobby nunca envía session_context (ej: orígen no
    // permitido o bug del lobby), habilitamos el auto-save después de 12s
    // para no dejar al jugador sin persistencia por toda la sesión.
    setTimeout(() => {
      if (!syncFromLobbyDone) {
        console.warn('[Sopa App] session_context no llegó en 12s — auto-save habilitado sin carga remota')
        initialSyncDoneRef.current = true
      }
    }, 12000)

    lobbyRef.current = lobby
    return () => { lobby.destroy(); lobbyRef.current = null }
  }, [splashDone]) // eslint-disable-line react-hooks/exhaustive-deps

  /* ─── Sync de logros con el lobby (REGLAS-GENERALES: unlockAchievement) ─── */

  // useProgression dispara 'sopa-achievement-unlocked' con los IDs nuevos;
  // acá los registramos en el lobby (tabla achievement_unlocks → perfil).
  useEffect(() => {
    const handler = (e: Event) => {
      const ids = (e as CustomEvent<string[]>).detail
      const lobby = lobbyRef.current
      for (const id of ids) {
        if (lobby) {
          lobby.unlockAchievement({ achievementId: `sopa_${id}` }).catch(() => { /* no crítico */ })
        }
      }
    }
    window.addEventListener('sopa-achievement-unlocked', handler)
    return () => window.removeEventListener('sopa-achievement-unlocked', handler)
  }, [])

  /* ─── Navigation state ─── */

  const [screen, setScreen] = useState<Screen>('home')
  const [gameMode, setGameMode] = useState<string>('classic')
  const [gameStarted, setGameStarted] = useState(false)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  // Cronómetro de la ETAPA actual: se resetea en cada newGame() (cada
  // tablero nuevo) y se congela al completar la etapa. Sirve para el
  // ranking de tiempos por etapas (los tiempos de etapa viajan en el
  // metadata del game_completed al lobby).
  const [stageSeconds, setStageSeconds] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  // Congela el cronómetro cuando la etapa está completa o la partida terminó
  // (el modal de victoria/derrota está abierto — el tiempo NO debe seguir).
  const pauseTimerRef = useRef(false)
  // XP acumulado al inicio de la partida actual — para reportar al lobby el
  // score REAL de esta partida (progreso.xp - xpInicial), no el total histórico.
  const startXpRef = useRef(0)
  // Niveles completados en esta partida (para metadata + completed).
  const sessionLevelsRef = useRef(0)
  // Tiempos (segundos) de cada etapa completada en ESTA partida — se
  // mandan al lobby en metadata.stageTimes para el ranking por etapas.
  const stageTimesRef = useRef<number[]>([])
  // Guard: solo UN game_completed por partida (el lobby ignora el segundo).
  const gameCompletedRef = useRef(false)
  // Ref del progress para usarlo dentro de useCallbacks sin agregar deps.
  const progressRef = useRef(progress)
  progressRef.current = progress
  const [showUnlock, setShowUnlock] = useState<string[] | null>(null)
  const [showLevelUp, setShowLevelUp] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)
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

  /* ─── Lobby Sync (el lobby es el cerebro; no tocamos Supabase) ─── */

  // initialSyncDoneRef se settea TRUE solo en el callback onSessionContext
  // del lobby (o tras un safety-net de 12s si el lobby no responde).
  // El auto-save de abajo NO sube nada hasta que esto sea true, evitando
  // pisar el progreso remoto con un estado local incompleto.
  const initialSyncDoneRef = useRef(false)

  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (!initialSyncDoneRef.current) return
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current)
    syncTimerRef.current = setTimeout(() => syncToLobby(lobbyRef.current, progress), 4000)
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
        // Etapa completa o partida terminada → cronómetro congelado
        if (pauseTimerRef.current) return
        setElapsedSeconds(s => s + 1)
        setStageSeconds(s => s + 1)

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

  const newGame = useCallback((mode?: string) => {
    seedRef.current = Date.now().toString()
    const m = mode ?? gameMode
    const isDaily = m === 'daily'
    const seed = isDaily ? getDailySeed() : seedRef.current
    const config = { size: 8, wordCount: 6 }
    const ws = pickWordsForGame(progress.unlockedCategories, config.wordCount, seed, m)
    const g = generateGrid(config.size, ws, seed)
    setGameWords(ws)
    setGame(g)
    setCells(buildCells(g.grid))
    setFoundWords(new Set())
    setWordPopup(null)
    setRevealedWord(null)
    // Nueva etapa → el cronómetro de etapa parte de 0.
    setStageSeconds(0)
    handleNewGame(m)
  }, [progress.unlockedCategories, gameMode, handleNewGame])

  const handleStartGame = useCallback((mode?: string) => {
    const m = mode ?? gameMode
    if (mode) setGameMode(mode)
    newGame(mode)
    setGameStarted(true)
    // ─── Partida nueva (REGLAS-GENERALES v2): anclar el XP de inicio,
    // resetear contadores y avisar al lobby con el modo como difficulty. ───
    startXpRef.current = progressRef.current.xp
    sessionLevelsRef.current = 0
    stageTimesRef.current = []
    gameCompletedRef.current = false
    lobbyRef.current?.sendGameStarted({ difficulty: m })
  }, [newGame, gameMode])

  /**
   * Cierra la partida con UN solo game_completed (el lobby ignora envíos
   * posteriores de la misma sesión). completed SIEMPRE explícito.
   * score = XP ganado en ESTA partida (nunca el histórico).
   */
  const finishPartida = useCallback((completed: boolean) => {
    if (gameCompletedRef.current) return
    gameCompletedRef.current = true
    lobbyRef.current?.sendGameCompleted({
      score: Math.max(0, progressRef.current.xp - startXpRef.current),
      completed,
      timeSpent: elapsedSeconds,
      difficulty: gameMode,
      metadata: {
        mode: gameMode,
        levelsCompleted: sessionLevelsRef.current,
        time: elapsedSeconds,
        // Tiempos de cada etapa completada — el lobby los persiste en
        // game_sessions.metadata (merge JSONB) → base del ranking por etapas.
        stageTimes: stageTimesRef.current,
      },
    })
  }, [elapsedSeconds, gameMode])

  /**
   * Volver al hub: si completó niveles, cierra la partida como completada;
   * si no, no reporta nada (el lobby la cierra como abandonada).
   */
  const handleExitToHub = useCallback(() => {
    if (sessionLevelsRef.current > 0) finishPartida(true)
    setGameStarted(false)
    setScreen('home')
  }, [finishPartida])

  /* ─── Reiniciar progreso (empezar de 0) ─── */

  const handleConfirmReset = useCallback(async () => {
    // 1) Lobby: borra TODO el progreso del usuario en Supabase.
    //    confirm: true es OBLIGATORIO (el lobby rechaza sin él).
    //    Invitado/standalone → el lobby responde error: seguimos con el
    //    reset local igual (localStorage es el cache del juego).
    try {
      const res = await lobbyRef.current?.resetProgress({ confirm: true })
      if (res && !res.success) {
        console.warn('[Sopa] El lobby rechazó el reset:', res.error)
      }
    } catch (err) {
      console.warn('[Sopa] resetProgress del lobby falló (¿invitado/standalone?):', err)
    }
    // 2) Reset local: estado React + localStorage → juego como recién instalado.
    handleResetProgress()
    // Bandera: mientras exista, al cargar progreso del lobby IGNORAMOS el
    // remoto si sigue con el estado pre-reset (merge usa Math.max y
    // reviviría la experiencia vieja si el reset del server no llegó:
    // invitado, standalone o RPC caída). Se limpia al primer save exitoso
    // post-reset (syncToLobby).
    localStorage.setItem('sopa_reset_pending', '1')
    setGameStarted(false)
    setGameOver(false)
    setScreen('home')
    setConfirmReset(false)
  }, [handleResetProgress])

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

  const allFound = foundWords.size === game.words.length && foundWords.size > 0 && !gameOver
  const timedMode = gameMode === 'timed' || gameMode === 'survival'

  // Sincroniza el guard del cronómetro: etapa completa o game over → pausa.
  useEffect(() => {
    pauseTimerRef.current = allFound || gameOver
  }, [allFound, gameOver])

  /* ─── Render ─── */

  if (!splashDone) {
    return <SplashScreen onFinish={() => { setSplashDone(true); audio.init() }} />
  }

  return (
    <div
      className="h-dvh bg-bg-primary flex flex-col overflow-hidden"
      style={{
        // Exponer el viewport real del iframe (enviado por el lobby) como
        // variables CSS para que los componentes puedan reaccionar
        // (ej: compactar el grid en landscape móvil).
        ['--game-vw' as string]: viewport.width ? `${viewport.width}px` : undefined,
        ['--game-vh' as string]: viewport.height ? `${viewport.height}px` : undefined,
        ['--game-dpr' as string]: viewport.devicePixelRatio ? String(viewport.devicePixelRatio) : undefined,
      }}
    >
      {gameStarted ? (
        <>
          {/* Game header bar */}
          <div className="flex items-center justify-between px-4 py-2.5 bg-bg-card border-b border-border-subtle">
            <button onClick={handleExitToHub} className="flex items-center gap-1 text-sm text-text-muted hover:text-white transition-colors">
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
          </div>

          <div className="flex-1 flex flex-col justify-center overflow-y-auto bg-bg-primary">
            <div className="flex flex-col items-center gap-1 px-0 pb-4">
              <div className="w-full max-w-[96vw] flex items-center justify-between px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className="text-purple-400 text-sm">🕺</span>
                  <span className="text-[9px] text-text-muted uppercase tracking-wider font-semibold">Modo {gameMode === 'classic' ? 'Clásico' : gameMode === 'timed' ? 'Contrarreloj' : gameMode === 'survival' ? 'Supervivencia' : 'Sopa Diaria'}</span>
                </div>
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
                  ⏱ {String(Math.floor(stageSeconds / 60)).padStart(2, '0')}:{String(stageSeconds % 60).padStart(2, '0')}
                </span>
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
        <>
          {screen === 'home' ? (
            <HallScreen
              progress={progress}
              stats={stats}
              onStartGame={() => handleStartGame()}
              selectedMode={gameMode}
              onChangeMode={setGameMode}
              onStore={() => setScreen('store')}
              onDaily={() => setScreen('challenges')}
            />
          ) : (
            <div className="flex-1 flex flex-col overflow-y-auto pb-16">
              {screen === 'categories' && <CategoriesScreen progress={progress} />}
              {screen === 'collection' && <CollectionScreen progress={progress} />}
              {screen === 'profile' && <ProfileScreen progress={progress} stats={stats} lobbyCtx={lobbyCtx} onResetProgress={() => setConfirmReset(true)} />}
              {screen === 'store' && <StoreScreen progress={progress} onBuy={handleBuy} />}
              {screen === 'challenges' && <ChallengesScreen progress={progress} onClaimDaily={handleClaimDaily} />}
            </div>
          )}
          <BottomNav active={screen} onChange={setScreen} />
        </>
      )}

      {/* Modals — orden: el logro primero en DOM para que el modal de
          conocimiento de la palabra quede ENCIMA (mismo z-index, último gana) */}
      {pendingAchievements.length > 0 && (
        <AchievementNotification achievements={pendingAchievements} onClose={clearPendingAchievements} />
      )}
      <KnowledgeModal word={wordPopup} onClose={() => setWordPopup(null)} />
      {confirmReset && (
        <ResetConfirmModal
          onCancel={() => setConfirmReset(false)}
          onConfirm={() => { void handleConfirmReset() }}
        />
      )}
      {showUnlock && <CategoryUnlock newCategories={showUnlock} onClose={() => setShowUnlock(null)} />}
      {showLevelUp && <LevelUpModal newLevel={newLevel} onClose={() => { setShowLevelUp(false); clearLevelUp() }} />}
      {allFound && (
        <LevelComplete
          foundCount={foundWords.size}
          totalWords={game.words.length}
          stageSeconds={stageSeconds}
          mode={gameMode}
          bestTime={progress.bestStageTimes?.[gameMode]}
          onNext={async () => {
            // Nivel completado: la partida SIGUE (misma sesión). El
            // game_completed va al final, UNA vez por partida.
            sessionLevelsRef.current += 1
            // Tiempo de la etapa completada (cronómetro congelado) →
            // ranking de tiempos por etapas (local + lobby).
            stageTimesRef.current.push(stageSeconds)
            handleRecordStageTime(gameMode, stageSeconds)
            // Ad interstitial entre niveles (placements: game_level_complete).
            // Si el lobby no tiene campaña, resuelve de inmediato y sigue.
            try {
              await lobbyRef.current?.requestCampaign({
                placement: 'game_level_complete',
                rewardIds: [],
              })
            } catch { /* timeout o sin campaña — seguir */ }
            // Siguiente etapa: nuevo tablero, misma partida (el cronómetro
            // se reanuda solo al bajar allFound). NO salir al hub.
            newGame()
          }}
          onSummary={async () => {
            // Partida terminada con éxito: UN game_completed con el score
            // total ganado en ella (completed SIEMPRE explícito).
            sessionLevelsRef.current += 1
            // Última etapa: registrar su tiempo (ranking por etapas).
            stageTimesRef.current.push(stageSeconds)
            handleRecordStageTime(gameMode, stageSeconds)
            finishPartida(true)
            try {
              await lobbyRef.current?.requestCampaign({
                placement: 'game_level_complete',
                rewardIds: [],
              })
            } catch { /* seguir */ }
            setGameStarted(false); setScreen('collection')
            setFoundWords(new Set())
          }}
        />
      )}
      {gameOver && !allFound && (
        <GameOver
          foundCount={foundWords.size}
          totalWords={game.words.length}
          mode={gameMode}
          onRetry={async () => {
            // Perdió pero REINTENTA: la partida sigue abierta (no se cierra
            // todavía). El game_completed va al final, UNA vez por partida.
            // Ad interstitial al morir (placement: game_results)
            try {
              await lobbyRef.current?.requestCampaign({
                placement: 'game_results',
                rewardIds: [],
              })
            } catch { /* seguir */ }
            newGame(); setGameStarted(true)
          }}
          onExit={() => {
            // Derrota: cerrar la partida. completed=true solo si completó
            // algún nivel antes; si no, false (perdió) — los puntos suman.
            finishPartida(sessionLevelsRef.current > 0)
            setGameStarted(false); setScreen('home')
          }}
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
