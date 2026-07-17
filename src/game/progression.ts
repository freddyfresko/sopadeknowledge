/**
 * Progression Manager — Sopa de Knowledge
 *
 * Maneja XP, niveles, logros, rachas, recompensas diarias
 * y todo el ciclo de progresión del jugador.
 *
 * Diseñado para ser compartido entre juegos del ecosistema JuegaHipHop.
 */
import type { PlayerProgress, Achievement } from './types'
import { ACHIEVEMENTS } from '../data/achievements'
import { getLevel, getXpForNextLevel, getLevelUpCoins, getGridConfig, getDifficultyXpBonus, getStreakXpMultiplier, REWARDS, DAILY_REWARDS } from './economy'
import { getRank } from './ranks'
import { allWords, categories } from '../data/index'
import { defaultPowerUps, addPowerUp } from './powerups'

/* ─── Storage ─── */

const STORAGE_KEY = 'sopa-knowledge-progress'

export function loadProgress(): PlayerProgress {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return defaultProgress()
}

export function saveProgress(p: PlayerProgress): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(p))
}

export function defaultProgress(): PlayerProgress {
  return {
    xp: 0,
    level: 1,
    wordsFound: [],
    unlockedCategories: categories.filter(c => c.unlockLevel <= 1).map(c => c.id),
    dailyStreak: 0,
    lastDaily: null,
    dailyClaimed: false,
    totalGames: 0,
    totalWordsFound: 0,
    gamesWon: 0,
    coins: 0,
    knowledgePoints: 0,
    gems: 0,
    powerUps: defaultPowerUps(),
    achievements: ACHIEVEMENTS.map(a => ({
      id: a.id,
      current: 0,
      completed: false,
      claimed: false,
    })),
    profile: {
      displayName: 'BBOYKNOWLEDGE',
      avatarEmoji: '🧢',
      title: 'Novato',
      rank: 'bronze_1',
      joinedAt: Date.now(),
    },
  }
}

/* ─── XP & Level ─── */

export function getUnlockedCategories(level: number): string[] {
  return categories.filter(c => level >= c.unlockLevel).map(c => c.id)
}

export interface AddXpResult {
  progress: PlayerProgress
  leveledUp: boolean
  newlyUnlockedCategories: string[]
  newAchievements: Achievement[]
  coinsEarned: number
}

export function addXp(progress: PlayerProgress, amount: number, wordDifficulty?: string): AddXpResult {
  const streakMult = getStreakXpMultiplier(progress.dailyStreak)
  const diffBonus = getDifficultyXpBonus(wordDifficulty ?? '')
  const totalAmount = Math.floor((amount + diffBonus) * streakMult)
  const prevLevel = progress.level

  let p = { ...progress, xp: progress.xp + totalAmount }
  p.level = getLevel(p.xp)
  p.unlockedCategories = getUnlockedCategories(p.level)

  const leveledUp = p.level > prevLevel

  // Level up rewards
  let coinsEarned = 0
  if (leveledUp) {
    coinsEarned = getLevelUpCoins(p.level)
    p.coins = (p.coins || 0) + coinsEarned
  }

  // Check new achievements
  const newAchievements = checkAchievements(p)

  return { progress: p, leveledUp, newlyUnlockedCategories: [], newAchievements, coinsEarned }
}

/* ─── Words ─── */

export function recordWordFound(progress: PlayerProgress, word: string, category: string, _difficulty: string): PlayerProgress {
  const exists = progress.wordsFound.some(fw => fw.word === word)
  if (exists) return progress

  const p = {
    ...progress,
    wordsFound: [...progress.wordsFound, { word, category, timestamp: Date.now() }],
    totalWordsFound: progress.totalWordsFound + 1,
  }

  // Economy rewards
  p.coins = (p.coins || 0) + REWARDS.WORD_FOUND.coins
  p.knowledgePoints = (p.knowledgePoints || 0) + REWARDS.WORD_FOUND.knowledgePoints

  return p
}

/* ─── Daily ─── */

export function claimDaily(progress: PlayerProgress): { progress: PlayerProgress; rewards: { coins: number; xp: number; powerUp?: { type: string; amount: number } } } | null {
  const today = getDateKey()
  if (progress.lastDaily === today && progress.dailyClaimed) return null

  // Check if it's a new day
  const isNewDay = progress.lastDaily !== today
  const dayInCycle = isNewDay ? ((progress.dailyStreak % 7) + 1) : (progress.dailyStreak % 7) + 1
  const reward = DAILY_REWARDS.find(r => r.day === dayInCycle) ?? DAILY_REWARDS[0]

  const p = { ...progress }
  p.coins = (p.coins || 0) + reward.coinReward
  p.xp = p.xp + reward.xpReward
  p.lastDaily = today
  p.dailyClaimed = true

  if (isNewDay) {
    p.dailyStreak = progress.dailyStreak + 1
  }

  p.level = getLevel(p.xp)
  p.unlockedCategories = getUnlockedCategories(p.level)

  // Power-up reward
  let powerUpReward: { type: string; amount: number } | undefined
  if (reward.powerUpReward) {
    const pu = reward.powerUpReward
    p.powerUps = addPowerUp(p.powerUps, pu.type, pu.amount)
    powerUpReward = { type: pu.type, amount: pu.amount }
  }

  return {
    progress: p,
    rewards: {
      coins: reward.coinReward,
      xp: reward.xpReward,
      powerUp: powerUpReward,
    },
  }
}

export function getDailyRewardForDay(streak: number) {
  const dayInCycle = (streak % 7) + 1
  return DAILY_REWARDS.find(r => r.day === dayInCycle) ?? DAILY_REWARDS[0]
}

/* ─── Achievements ─── */

function checkAchievements(progress: PlayerProgress): Achievement[] {
  const completedIds = new Set(progress.achievements.filter(a => a.completed).map(a => a.id))
  const newlyCompleted: Achievement[] = []

  for (const ach of ACHIEVEMENTS) {
    if (completedIds.has(ach.id)) continue

    const prog = progress.achievements.find(a => a.id === ach.id)
    const current = getAchievementCurrent(progress, ach)
    if (prog) prog.current = current

    if (current >= ach.requirement.target) {
      newlyCompleted.push(ach)
    }
  }

  return newlyCompleted
}

function getAchievementCurrent(progress: PlayerProgress, ach: Achievement): number {
  const req = ach.requirement
  switch (req.type) {
    case 'words_found':
      return progress.totalWordsFound
    case 'words_found_category':
      return req.categoryId
        ? progress.wordsFound.filter(fw => fw.category === req.categoryId).length
        : progress.totalWordsFound
    case 'total_xp':
      return progress.xp
    case 'level':
      return progress.level
    case 'streak':
      return progress.dailyStreak
    case 'games_played':
      return progress.totalGames
    case 'category_complete':
      return req.categoryId ? (checkCategoryComplete(progress, req.categoryId) ? 1 : 0) : 0
    case 'all_categories':
      return categories.filter(c => checkCategoryComplete(progress, c.id)).length
    case 'no_hints':
      return 0 // Tracked externally
    case 'daily_claimed':
      return progress.achievements.find(a => a.id === 'daily_7')?.current ?? 0
    default:
      return 0
  }
}

export function checkCategoryComplete(progress: PlayerProgress, categoryId: string): boolean {
  const categoryWords = allWords.filter(w => w.category === categoryId)
  if (categoryWords.length === 0) return false
  const foundWords = progress.wordsFound.filter(fw => fw.category === categoryId)
  return foundWords.length >= categoryWords.length
}

export function claimAchievementReward(progress: PlayerProgress, achievementId: string): PlayerProgress | null {
  const achProg = progress.achievements.find(a => a.id === achievementId)
  if (!achProg || !achProg.completed || achProg.claimed) return null

  const ach = ACHIEVEMENTS.find(a => a.id === achievementId)
  if (!ach) return null

  const p = { ...progress }
  p.xp = p.xp + ach.xpReward
  p.coins = (p.coins || 0) + ach.coinReward
  p.level = getLevel(p.xp)

  // Apply title reward
  if (ach.titleReward) {
    p.profile = { ...p.profile, title: ach.titleReward }
  }

  // Mark as claimed
  p.achievements = p.achievements.map(a =>
    a.id === achievementId ? { ...a, claimed: true } : a,
  )

  return p
}

/* ─── Game lifecycle ─── */

export function startNewGame(progress: PlayerProgress, _mode: string, _category?: string): PlayerProgress {
  const p = { ...progress, totalGames: progress.totalGames + 1 }
  return p
}

export function completeGame(progress: PlayerProgress, won: boolean): PlayerProgress {
  const p = { ...progress }
  if (won) p.gamesWon = (p.gamesWon || 0) + 1
  return p
}

/* ─── Utils ─── */

export function getDateKey(): string {
  const d = new Date()
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
}

export function getDailySeed(): string {
  return getDateKey()
}

export function getWordData(word: string) {
  return allWords.find(w => w.word.toUpperCase() === word.toUpperCase())
}

export function getCategory(id: string) {
  return categories.find(c => c.id === id)
}

export { allWords, categories, getLevel, getXpForNextLevel, getGridConfig, getRank }
