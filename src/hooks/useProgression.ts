/**
 * useProgression — Hook for managing player progression state
 *
 * Centraliza toda la lógica de progresión: XP, niveles, logros,
 * economía, rachas y recompensas diarias.
 */
import { useState, useCallback, useEffect } from 'react'
import type {
  PlayerProgress,
  Achievement,
  GameStats,
  PowerUpType,
} from '../game/types'
import {
  loadProgress,
  saveProgress,
  addXp,
  recordWordFound,
  claimDaily,
  getDailyRewardForDay,
  getDateKey,
  getLevel,
  getXpForNextLevel,
  getUnlockedCategories,
  getRank,
  startNewGame,
  completeGame,
  allWords,
  categories,
} from '../game/progression'
import type { AddXpResult } from '../game/progression'
import { consumePowerUp, addPowerUp, POWER_UP_COSTS } from '../game/powerups'

export function useProgression() {
  const [progress, setProgress] = useState<PlayerProgress>(() => {
    const loaded = loadProgress()
    const unlocked = getUnlockedCategories(getLevel(loaded.xp))
    return {
      ...loaded,
      unlockedCategories: unlocked.length > loaded.unlockedCategories.length ? unlocked : loaded.unlockedCategories,
    }
  })

  // Listen for sync events from App
  useEffect(() => {
    const handler = (e: Event) => {
      const merged = (e as CustomEvent<PlayerProgress>).detail
      setProgress(prev => ({ ...prev, ...merged }))
    }
    window.addEventListener('sopa-progress-sync', handler)
    return () => window.removeEventListener('sopa-progress-sync', handler)
  }, [])

  // Track pending achievements for notification
  const [pendingAchievements, setPendingAchievements] = useState<Achievement[]>([])
  const [leveledUp, setLeveledUp] = useState(false)
  const [newLevel, setNewLevel] = useState(0)
  const [newCategories, setNewCategories] = useState<string[]>([])

  const persist = useCallback((p: PlayerProgress) => {
    saveProgress(p)
    setProgress(p)
  }, [])

  const handleFindWord = useCallback((word: string, category: string, difficulty: string): AddXpResult => {
    let p = { ...progress }
    p = recordWordFound(p, word, category, difficulty)
    const result = addXp(p, 20, difficulty)
    p = result.progress

    // Check level up
    if (result.leveledUp) {
      setLeveledUp(true)
      setNewLevel(p.level)
      const newlyUnlocked = categories.filter(
        c => c.unlockLevel <= p.level && !p.unlockedCategories.includes(c.id),
      )
      if (newlyUnlocked.length > 0) {
        p.unlockedCategories = [...new Set([...p.unlockedCategories, ...newlyUnlocked.map(c => c.id)])]
        setNewCategories(newlyUnlocked.map(c => c.id))
      }
    }

    // Check new achievements
    if (result.newAchievements.length > 0) {
      // Mark as completed in progress
      p.achievements = p.achievements.map(a => {
        const completed = result.newAchievements.find(na => na.id === a.id)
        if (completed) return { ...a, completed: true, completedAt: Date.now() }
        return a
      })
      setPendingAchievements(prev => [...prev, ...result.newAchievements])
    }

    persist(p)
    return result
  }, [progress, persist])

  const handleNewGame = useCallback((mode: string, category?: string) => {
    let p = startNewGame(progress, mode, category)
    persist(p)
    return p
  }, [progress, persist])

  const handleCompleteGame = useCallback((won: boolean) => {
    const p = completeGame(progress, won)
    persist(p)
  }, [progress, persist])

  const handleClaimDaily = useCallback(() => {
    const result = claimDaily(progress)
    if (!result) return null
    persist(result.progress)
    return result.rewards
  }, [progress, persist])

  const handleUsePowerUp = useCallback((type: PowerUpType) => {
    const newInv = consumePowerUp(progress.powerUps, type)
    if (newInv === progress.powerUps) return false
    const p = { ...progress, powerUps: newInv }
    persist(p)
    return true
  }, [progress, persist])

  const handleBuyPowerUp = useCallback((type: PowerUpType) => {
    const cost = POWER_UP_COSTS[type]
    if ((progress.coins ?? 0) < cost) return false
    const p = { ...progress }
    p.coins = (p.coins ?? 0) - cost
    p.powerUps = addPowerUp(p.powerUps, type, 1)
    persist(p)
    return true
  }, [progress, persist])

  // Clear pending notifications
  const clearPendingAchievements = useCallback(() => setPendingAchievements([]), [])
  const clearLevelUp = useCallback(() => {
    setLeveledUp(false)
    setNewCategories([])
  }, [])

  // Stats
  const stats: GameStats = {
    currentXp: progress.xp,
    level: progress.level,
    xpForNext: getXpForNextLevel(progress.level),
    xpInCurrentLevel: progress.xp - (progress.level - 1) * (progress.level - 1) * 100,
    wordsFound: progress.totalWordsFound,
    totalWords: allWords.length,
    categoriesUnlocked: progress.unlockedCategories,
    rank: getRank(progress.xp),
    achievementCount: progress.achievements.filter(a => a.completed).length,
    totalAchievements: progress.achievements.length,
    completionPercent: allWords.length > 0 ? Math.round((progress.totalWordsFound / allWords.length) * 100) : 0,
  }

  return {
    progress,
    stats,
    pendingAchievements,
    leveledUp,
    newLevel,
    newCategories,
    handleFindWord,
    handleNewGame,
    handleCompleteGame,
    handleClaimDaily,
    handleUsePowerUp,
    handleBuyPowerUp,
    clearPendingAchievements,
    clearLevelUp,
    getDailyRewardForDay,
    getDateKey,
  }
}
