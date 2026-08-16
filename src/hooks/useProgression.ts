/**
 * useProgression — Hook for managing player progression state
 *
 * Centraliza toda la lógica de progresión: XP, niveles, logros,
 * economía, rachas y recompensas diarias.
 */
import { useState, useCallback, useEffect, useRef } from 'react'
import type {
  PlayerProgress,
  Achievement,
  GameStats,
  PowerUpType,
} from '../game/types'
import {
  loadProgress,
  saveProgress,
  defaultProgress,
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
  recordStageTime,
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

  // Ref del progress SIEMPRE fresco (se actualiza en cada render Y en cada
  // persist). Evita el stale-closure: dos handlers encadenados en el mismo
  // tick (ej: handleRecordStageTime → handleNewGame en onNext) leen el
  // estado MÁS RECIENTE, no el del render viejo — sin esto, el segundo
  // persist pisa campos que el primero acaba de guardar (bug real:
  // bestStageTimes desaparecía de localStorage).
  const progressRef = useRef(progress)
  progressRef.current = progress

  // Listen for sync events from App
  useEffect(() => {
    const handler = (e: Event) => {
      const merged = (e as CustomEvent<PlayerProgress>).detail
      setProgress(prev => {
        const next = { ...prev, ...merged }
        progressRef.current = next
        return next
      })
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
    progressRef.current = p
    saveProgress(p)
    setProgress(p)
  }, [])

  const handleFindWord = useCallback((word: string, category: string, difficulty: string): AddXpResult => {
    let p = { ...progressRef.current }
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
      // Solo el batch RECIÉN logrado — reemplaza, no acumula. Si
      // acumuláramos, la notificación mostraría logros que el jugador
      // ya vio/desbloqueó antes en la sesión ("los que ya tengo").
      setPendingAchievements(result.newAchievements)
      // Avisar al lobby (App escucha esto) para registrar los logros nuevos
      // en el perfil del jugador (achievement_unlocks).
      window.dispatchEvent(new CustomEvent('sopa-achievement-unlocked', {
        detail: result.newAchievements.map(a => a.id),
      }))
    }

    persist(p)
    return result
  }, [persist])

  const handleNewGame = useCallback((mode: string, category?: string) => {
    let p = startNewGame(progressRef.current, mode, category)
    persist(p)
    return p
  }, [persist])

  const handleCompleteGame = useCallback((won: boolean) => {
    const p = completeGame(progressRef.current, won)
    persist(p)
  }, [persist])

  // Mejor tiempo de etapa por modo (ranking de tiempos por etapas).
  const handleRecordStageTime = useCallback((mode: string, seconds: number) => {
    const p = recordStageTime(progressRef.current, mode, seconds)
    if (p !== progressRef.current) persist(p)
  }, [persist])

  const handleClaimDaily = useCallback(() => {
    const result = claimDaily(progressRef.current)
    if (!result) return null
    persist(result.progress)
    return result.rewards
  }, [persist])

  const handleUsePowerUp = useCallback((type: PowerUpType) => {
    const newInv = consumePowerUp(progressRef.current.powerUps, type)
    if (newInv === progressRef.current.powerUps) return false
    const p = { ...progressRef.current, powerUps: newInv }
    persist(p)
    return true
  }, [persist])

  const handleBuyPowerUp = useCallback((type: PowerUpType) => {
    const cost = POWER_UP_COSTS[type]
    if ((progressRef.current.coins ?? 0) < cost) return false
    const p = { ...progressRef.current }
    p.coins = (p.coins ?? 0) - cost
    p.powerUps = addPowerUp(p.powerUps, type, 1)
    persist(p)
    return true
  }, [persist])

  // Clear pending notifications
  const clearPendingAchievements = useCallback(() => setPendingAchievements([]), [])
  const clearLevelUp = useCallback(() => {
    setLeveledUp(false)
    setNewCategories([])
  }, [])

  // Reset completo del progreso local (estado React + localStorage).
  // El lobby se resetea aparte (lobby.resetProgress) — este es el lado local.
  const handleResetProgress = useCallback(() => {
    const fresh = defaultProgress()
    persist(fresh)
    setPendingAchievements([])
    setLeveledUp(false)
    setNewLevel(0)
    setNewCategories([])
    return fresh
  }, [persist])

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
    handleRecordStageTime,
    handleClaimDaily,
    handleUsePowerUp,
    handleBuyPowerUp,
    handleResetProgress,
    clearPendingAchievements,
    clearLevelUp,
    getDailyRewardForDay,
    getDateKey,
  }
}
