/**
 * Lobby Persistence — Sopa de Knowledge
 *
 * Estrategia nueva (arquitectura 3.0 — lobby = cerebro):
 *   - localStorage sigue siendo el cache local (funciona offline)
 *   - El lobby es la fuente de verdad para el backend
 *   - El juego NO toca Supabase: le pide al lobby que guarde/carge
 *
 * El SDK expone lobby.saveProgress() / lobby.loadProgress() que
 * disparan postMessage al lobby (request/response con requestId).
 *
 * Este módulo traduce entre la forma interna (PlayerProgress) y
 * el DTO que viaja por el protocolo (Record<string, unknown>).
 */

import type { PlayerProgress } from '../game/types'
import { getLevel } from '../game/progression'
import { allWords } from '../data/index'
import type { LobbyClientInstance } from './sdk/lobby-client'

const GAME_ID = 'sopa'
const SCHEMA_VERSION = '1.0.0'

// ─── Forma del estado serializado que manda la sopa al lobby ───

interface SopaState {
  wordsFound: PlayerProgress['wordsFound']
  unlockedCategories: string[]
  totalWordsFound: number
  totalGames: number
  gamesWon: number
  coins: number
  knowledgePoints: number
  powerUps: PlayerProgress['powerUps']
  achievements: PlayerProgress['achievements']
  bestStageTimes: Record<string, number>
  profile: PlayerProgress['profile']
}

// ─── Serialización ───

function toSopaState(p: PlayerProgress): SopaState {
  return {
    wordsFound: p.wordsFound,
    unlockedCategories: p.unlockedCategories,
    totalWordsFound: p.totalWordsFound,
    totalGames: p.totalGames,
    gamesWon: p.gamesWon,
    coins: p.coins,
    knowledgePoints: p.knowledgePoints,
    powerUps: p.powerUps,
    achievements: p.achievements,
    bestStageTimes: p.bestStageTimes ?? {},
    profile: p.profile,
  }
}

function fromSopaState(s: SopaState, bestScore?: number): PlayerProgress {
  // El lobby guarda el estado opaco (SopaState) y el best_score (XP total).
  // Recalculamos level desde xp con la curva de la sopa (getLevel),
  // porque el level se deriva de xp, no se guarda como estado independiente.
  const xp = bestScore ?? 0
  return {
    xp,
    level: getLevel(xp),
    wordsFound: s.wordsFound ?? [],
    unlockedCategories: s.unlockedCategories ?? [],
    dailyStreak: 0,
    lastDaily: null,
    dailyClaimed: false,
    totalGames: s.totalGames ?? 0,
    totalWordsFound: s.totalWordsFound ?? 0,
    gamesWon: s.gamesWon ?? 0,
    coins: s.coins ?? 0,
    knowledgePoints: s.knowledgePoints ?? 0,
    gems: 0,
    powerUps: s.powerUps ?? { hint: 0, reveal: 0, shuffle: 0, freeze: 0, eliminate: 0 },
    achievements: s.achievements ?? [],
    bestStageTimes: s.bestStageTimes ?? {},
    profile: s.profile ?? {
      displayName: 'BBOYKNOWLEDGE',
      avatarEmoji: '🧢',
      title: 'Novato',
      rank: 'bronze_1',
      joinedAt: Date.now(),
    },
  }
}

// ─── API pública ───

export interface SaveResult {
  success: boolean
  message: string
}

/**
 * Sube el progreso al lobby (el lobby lo persiste en Supabase).
 * No bloquea: si el lobby no está disponible (ej: ejecución standalone),
 * responde success=true silenciosamente — el juego sigue funcionando
 * con localStorage como cache local.
 */
export async function syncToLobby(
  lobby: LobbyClientInstance | null,
  progress: PlayerProgress,
): Promise<SaveResult> {
  if (!lobby) {
    // Modo standalone (fuera del iframe): el lobby no está disponible.
    // localStorage sigue siendo la verdad local. No es un error.
    console.log('[Sopa syncToLobby] sin lobby (standalone) — solo local')
    return { success: true, message: 'Sin lobby (standalone) — solo local' }
  }

  try {
    console.log('[Sopa syncToLobby] guardando en lobby:', {
      xp: progress.xp,
      level: progress.level,
      wordsFoundCount: progress.wordsFound.length,
      totalWordsFound: progress.totalWordsFound,
    })
    const result = await lobby.saveProgress({
      gameState: toSopaState(progress) as unknown as Record<string, unknown>,
      score: progress.xp,
      // Progreso REAL para las cards del lobby (protocolo v2): el avance
      // del juego, no partidas jugadas. Sin esto el lobby cae al fallback.
      progress: {
        current: progress.wordsFound.length,
        total: allWords.length,
        label: 'Palabras',
      },
      metadata: {
        game: GAME_ID,
        schemaVersion: SCHEMA_VERSION,
        totalGames: progress.totalGames,
        totalWordsFound: progress.totalWordsFound,
        gamesWon: progress.gamesWon,
      },
    })

    if (!result.success) {
      console.warn('[Sopa] El lobby reportó error al guardar:', result.error)
      return { success: false, message: result.error ?? 'Error en el lobby' }
    }

    // El server ya tiene el estado post-reset → la bandera de reset ya no
    // es necesaria (el remoto ya no puede revivir el progreso viejo).
    localStorage.removeItem('sopa_reset_pending')

    return { success: true, message: 'Guardado en el lobby' }
  } catch (err) {
    // Timeout o lobby caído: no es crítico, el juego sigue con localStorage.
    console.warn('[Sopa] No se pudo sincronizar con el lobby:', err)
    return { success: false, message: 'Lobby no respondió' }
  }
}

/**
 * Carga el progreso desde el lobby (el lobby lo lee de Supabase).
 * Devuelve PlayerProgress o null si no hay datos previos.
 */
export async function syncFromLobby(
  lobby: LobbyClientInstance | null,
): Promise<PlayerProgress | null> {
  if (!lobby) {
    console.log('[Sopa syncFromLobby] sin lobby (standalone) → null')
    return null
  }

  try {
    console.log('[Sopa syncFromLobby] pidiendo progreso al lobby...')
    const data = await lobby.loadProgress({ schemaVersion: SCHEMA_VERSION })
    console.log('[Sopa syncFromLobby] respuesta del lobby:', {
      success: data.success,
      hasGameState: !!data.gameState,
      bestScore: data.bestScore,
      error: data.error,
    })

    if (!data.success || !data.gameState) {
      console.log('[Sopa syncFromLobby] sin datos guardados — empezando nuevo')
      return null
    }

    const state = data.gameState as unknown as SopaState
    const progress = fromSopaState(state, data.bestScore)
    console.log('[Sopa syncFromLobby] progreso reconstruido:', {
      xp: progress.xp,
      level: progress.level,
      wordsFoundCount: progress.wordsFound.length,
      totalWordsFound: progress.totalWordsFound,
    })
    return progress
  } catch (err) {
    console.warn('[Sopa syncFromLobby] no se pudo cargar progreso del lobby:', err)
    return null
  }
}

/**
 * Mergea progreso remoto con local (local gana en empates, pero
 * incorpora elementos que el remoto tiene y el local no).
 */
export function mergeProgress(local: PlayerProgress, remote: PlayerProgress): PlayerProgress {
  return {
    xp: Math.max(local.xp, remote.xp),
    level: Math.max(local.level, remote.level),
    wordsFound: mergeWordsFound(local.wordsFound, remote.wordsFound),
    unlockedCategories: [
      ...new Set([...local.unlockedCategories, ...remote.unlockedCategories]),
    ],
    dailyStreak: Math.max(local.dailyStreak, remote.dailyStreak),
    lastDaily: local.lastDaily ?? remote.lastDaily,
    dailyClaimed: local.dailyClaimed || remote.dailyClaimed,
    totalGames: Math.max(local.totalGames, remote.totalGames),
    totalWordsFound: Math.max(local.totalWordsFound, remote.totalWordsFound),
    gamesWon: Math.max(local.gamesWon, remote.gamesWon),
    coins: Math.max(local.coins, remote.coins),
    knowledgePoints: Math.max(local.knowledgePoints, remote.knowledgePoints),
    gems: Math.max(local.gems, remote.gems),
    powerUps: { ...local.powerUps },
    achievements: mergeAchievements(local.achievements, remote.achievements),
    bestStageTimes: mergeBestStageTimes(local.bestStageTimes ?? {}, remote.bestStageTimes ?? {}),
    profile: { ...local.profile },
  }
}

/**
 * Une los mejores tiempos de etapa por modo: por cada modo se queda con
 * el MENOR tiempo (menos segundos = mejor) de cualquiera de los dos lados.
 */
function mergeBestStageTimes(
  local: Record<string, number>,
  remote: Record<string, number>,
): Record<string, number> {
  const merged: Record<string, number> = { ...local }
  for (const [mode, seconds] of Object.entries(remote)) {
    const cur = merged[mode]
    if (cur == null || seconds < cur) merged[mode] = seconds
  }
  return merged
}

/**
 * Une logros local+remoto con semántica de unión: un logro queda
 * completado/reclamado si CUALQUIERA de los dos lados lo tiene. Evita
 * que un logro ya desbloqueado (ej: en otro dispositivo, vía el estado
 * que el juego guarda en el lobby) se vuelva a "desbloquear" en el
 * juego y se muestre como nuevo en la notificación.
 */
function mergeAchievements(
  local: PlayerProgress['achievements'],
  remote: PlayerProgress['achievements'],
): PlayerProgress['achievements'] {
  const remoteById = new Map(remote.map((a) => [a.id, a]))
  return local.map((a) => {
    const r = remoteById.get(a.id)
    if (!r) return a
    return {
      id: a.id,
      current: Math.max(a.current, r.current),
      completed: a.completed || r.completed,
      claimed: a.claimed || r.claimed,
      completedAt: a.completedAt ?? r.completedAt,
    }
  })
}

function mergeWordsFound(
  local: PlayerProgress['wordsFound'],
  remote: PlayerProgress['wordsFound'],
): PlayerProgress['wordsFound'] {
  const seen = new Set(local.map((fw) => fw.word))
  const merged = [...local]
  for (const fw of remote) {
    if (!seen.has(fw.word)) {
      merged.push(fw)
      seen.add(fw.word)
    }
  }
  return merged
}
