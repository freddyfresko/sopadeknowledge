/**
 * Supabase Sync — Sopa de Knowledge
 *
 * Estrategia: localStorage es source of truth (funciona offline).
 * Supabase es backup cuando el usuario está autenticado.
 *
 * Tablas usadas:
 *   - game_state (game_id = 'sopa') → progreso completo del jugador
 *   - player_profiles                → XP, nivel, racha (compartido)
 *   - game_completions                → cada palabra encontrada
 */

import type { PlayerProgress } from '../game/types'
import { getSupabase } from './supabase'

const GAME_ID = 'sopa'

// ─── Tipos para las tablas de Supabase ───

interface DBPlayerProfile {
  user_id: string
  xp: number
  level: number
  total_games_completed: number
  current_streak: number
  last_played_date: string | null
}

interface DBGameState {
  user_id: string
  game_id: string
  state: SopaState
  best_score: number
  total_plays: number
  last_played_at: string
  updated_at: string
}

interface DBGameCompletion {
  user_id: string
  game_id: string
  item_id: string
  difficulty: string
  score: number
  metadata: Record<string, unknown>
  completed_at: string
}

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
  profile: PlayerProgress['profile']
}

// ─── Sync functions ───

interface SyncResult {
  success: boolean
  message: string
}

function toDBProfile(p: PlayerProgress, userId: string): DBPlayerProfile {
  return {
    user_id: userId,
    xp: p.xp,
    level: p.level,
    total_games_completed: p.totalGames,
    current_streak: p.dailyStreak,
    last_played_date: p.lastDaily,
  }
}

function toDBState(p: PlayerProgress, userId: string): DBGameState {
  return {
    user_id: userId,
    game_id: GAME_ID,
    state: {
      wordsFound: p.wordsFound,
      unlockedCategories: p.unlockedCategories,
      totalWordsFound: p.totalWordsFound,
      totalGames: p.totalGames,
      gamesWon: p.gamesWon,
      coins: p.coins,
      knowledgePoints: p.knowledgePoints,
      powerUps: p.powerUps,
      achievements: p.achievements,
      profile: p.profile,
    },
    best_score: p.xp,
    total_plays: p.totalGames,
    last_played_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
}

function toDBCompletion(
  userId: string,
  word: string,
  category: string,
  timestamp: number,
): DBGameCompletion {
  return {
    user_id: userId,
    game_id: GAME_ID,
    item_id: word,
    difficulty: 'easy',
    score: 20,
    metadata: { category, timestamp },
    completed_at: new Date(timestamp).toISOString(),
  }
}

/**
 * Sube el progreso local a Supabase.
 */
export async function syncToSupabase(progress: PlayerProgress): Promise<SyncResult> {
  try {
    const supabase = getSupabase()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, message: 'No autenticado' }
    }

    const userId = user.id

    // 1. Upsert player_profiles
    const { error: profileErr } = await supabase
      .from('player_profiles')
      .upsert(toDBProfile(progress, userId) as never, { onConflict: 'user_id' })

    if (profileErr) throw profileErr

    // 2. Upsert game_state
    const { error: stateErr } = await supabase
      .from('game_state')
      .upsert(toDBState(progress, userId) as never, { onConflict: 'user_id, game_id' })

    if (stateErr) throw stateErr

    // 3. Sync new word completions
    const lastSyncKey = `sopa_last_sync_${userId}`
    const lastSync = parseInt(localStorage.getItem(lastSyncKey) ?? '0', 10)
    const newWords = progress.wordsFound.filter(fw => fw.timestamp > lastSync)

    for (const fw of newWords) {
      const { error: compErr } = await supabase
        .from('game_completions')
        .upsert(toDBCompletion(userId, fw.word, fw.category, fw.timestamp) as never, {
          onConflict: 'user_id, game_id, item_id, difficulty',
        })

      if (compErr) throw compErr
    }

    if (newWords.length > 0) {
      localStorage.setItem(lastSyncKey, String(Date.now()))
    }

    return { success: true, message: 'Sync completado' }
  } catch (err) {
    console.error('[Sync] Error al sincronizar:', err)
    return { success: false, message: 'Sync falló' }
  }
}

/**
 * Carga el progreso desde Supabase y lo mergea con localStorage.
 */
export async function syncFromSupabase(): Promise<PlayerProgress | null> {
  try {
    const supabase = getSupabase()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return null

    const userId = user.id

    // 1. Cargar game_state
    const { data: stateRow } = await supabase
      .from('game_state')
      .select('state, best_score, total_plays')
      .eq('user_id', userId)
      .eq('game_id', GAME_ID)
      .single()

    if (!stateRow) return null

    const s = stateRow as unknown as { state: SopaState; best_score: number; total_plays: number }

    // 2. Cargar player_profiles
    const { data: profileRow } = await supabase
      .from('player_profiles')
      .select('xp, level, current_streak, last_played_date')
      .eq('user_id', userId)
      .single()

    const p = profileRow as unknown as {
      xp: number
      level: number
      current_streak: number
      last_played_date: string | null
    } | null

    // 3. Construir progreso combinado
    const merged: PlayerProgress = {
      xp: p?.xp ?? s.best_score ?? 0,
      level: p?.level ?? 1,
      wordsFound: s.state.wordsFound ?? [],
      unlockedCategories: s.state.unlockedCategories ?? [],
      dailyStreak: p?.current_streak ?? 0,
      lastDaily: p?.last_played_date ?? null,
      dailyClaimed: false,
      totalGames: s.state.totalGames ?? s.total_plays ?? 0,
      totalWordsFound: s.state.totalWordsFound ?? 0,
      gamesWon: s.state.gamesWon ?? 0,
      coins: s.state.coins ?? 0,
      knowledgePoints: s.state.knowledgePoints ?? 0,
      gems: 0,
      powerUps: s.state.powerUps ?? { hint: 0, reveal: 0, shuffle: 0, freeze: 0, eliminate: 0 },
      achievements: s.state.achievements ?? [],
      profile: s.state.profile ?? { displayName: 'BBOYKNOWLEDGE', avatarEmoji: '🧢', title: 'Novato', rank: 'bronze_1', joinedAt: Date.now() },
    }

    return merged
  } catch (err) {
    console.error('[Sync] Error al cargar:', err)
    return null
  }
}

/**
 * Mergea progreso remoto con local (local gana).
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
    achievements: local.achievements ?? [],
    profile: { ...local.profile },
  }
}

function mergeWordsFound(
  local: PlayerProgress['wordsFound'],
  remote: PlayerProgress['wordsFound'],
): PlayerProgress['wordsFound'] {
  const seen = new Set(local.map(fw => fw.word))
  const merged = [...local]
  for (const fw of remote) {
    if (!seen.has(fw.word)) {
      merged.push(fw)
      seen.add(fw.word)
    }
  }
  return merged
}
