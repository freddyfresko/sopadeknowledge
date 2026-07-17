/**
 * Economy System — Sopa de Knowledge
 *
 * Define precios, recompensas y economía del juego.
 * Diseñado para que el jugador SIEMPRE gane algo jugando.
 * Sin pay-to-win — solo recompensas por esfuerzo.
 */
import type { PowerUpType, DailyReward } from './types'

/* ─── Rewards por acción ─── */

export const REWARDS = {
  WORD_FOUND: {
    xp: 20,
    coins: 25,
    knowledgePoints: 1,
  },
  LEVEL_UP_BASE: {
    coins: 50,
  },
  DAILY_BONUS_BASE: {
    coins: 100,
    xp: 50,
  },
  CATEGORY_COMPLETE: {
    xp: 100,
    coins: 150,
    knowledgePoints: 5,
  },
  GAME_COMPLETE: {
    xp: 30,
    coins: 20,
  },
  STREAK_MILESTONE: {
    coins: 200,
    xp: 100,
  },
} as const

/* ─── Power-Up Costs ─── */

export const POWER_UP_COSTS: Record<PowerUpType, number> = {
  hint: 15,
  reveal: 30,
  shuffle: 20,
  freeze: 25,
  eliminate: 20,
}

export const POWER_UP_NAMES: Record<PowerUpType, string> = {
  hint: 'Pista',
  reveal: 'Revelar',
  shuffle: 'Mezclar',
  freeze: 'Congelar',
  eliminate: 'Eliminar',
}

export const POWER_UP_ICONS: Record<PowerUpType, string> = {
  hint: '💡',
  reveal: '👁️',
  shuffle: '🔀',
  freeze: '❄️',
  eliminate: '🗑️',
}

export const POWER_UP_DESCRIPTIONS: Record<PowerUpType, string> = {
  hint: 'Destella la primera letra de una palabra',
  reveal: 'Muestra la posición de una palabra',
  shuffle: 'Reordena las letras del grid',
  freeze: 'Pausa el tiempo 15 segundos',
  eliminate: 'Elimina letras que no están en ninguna palabra',
}

/* ─── Daily Rewards (7-day cycle) ─── */

export const DAILY_REWARDS: DailyReward[] = [
  { day: 1, coinReward: 50, xpReward: 20 },
  { day: 2, coinReward: 75, xpReward: 30 },
  { day: 3, coinReward: 100, xpReward: 50, powerUpReward: { type: 'hint', amount: 1 } },
  { day: 4, coinReward: 125, xpReward: 60 },
  { day: 5, coinReward: 150, xpReward: 80, powerUpReward: { type: 'shuffle', amount: 1 } },
  { day: 6, coinReward: 175, xpReward: 100 },
  { day: 7, coinReward: 300, xpReward: 200, powerUpReward: { type: 'reveal', amount: 1 }, title: '¡Semana Completa!' },
]

/* ─── Level Up XP Curve ─── */

export function getLevel(xp: number): number {
  return Math.floor(Math.sqrt(xp / 100)) + 1
}

export function getXpForNextLevel(level: number): number {
  return level * level * 100
}

export function getXpInCurrentLevel(xp: number, level: number): number {
  const prevXp = (level - 1) * (level - 1) * 100
  return xp - prevXp
}

export function getLevelUpCoins(level: number): number {
  return REWARDS.LEVEL_UP_BASE.coins + level * 10
}

/* ─── Grid Scaling by Level ─── */

export function getGridConfig(level: number, mode: string): { size: number; wordCount: number } {
  if (mode === 'daily') return { size: 10, wordCount: 8 }

  switch (true) {
    case level <= 2:
      return { size: 8, wordCount: 6 }
    case level <= 5:
      return { size: 10, wordCount: 10 }
    case level <= 10:
      return { size: 12, wordCount: 12 }
    case level <= 20:
      return { size: 12, wordCount: 14 }
    default:
      return { size: 14, wordCount: 16 }
  }
}

/* ─── Difficulty Bonus ─── */

export function getDifficultyXpBonus(difficulty: string): number {
  switch (difficulty) {
    case 'hard': return 10
    case 'medium': return 5
    default: return 0
  }
}

/**
 * Da un multiplicador de XP por racha diaria
 */
export function getStreakXpMultiplier(streak: number): number {
  if (streak >= 30) return 2.0
  if (streak >= 14) return 1.5
  if (streak >= 7) return 1.25
  return 1.0
}
