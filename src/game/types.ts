/* ─── Core Game Types ─── */

export interface KnowledgeCard {
  title: string
  description: string
  importance: string
  funFact?: string
  related?: string[]
}

export interface WordEntry {
  word: string
  category: string
  difficulty: 'easy' | 'medium' | 'hard'
  knowledge: KnowledgeCard
}

export interface Category {
  id: string
  name: string
  icon: string
  description: string
  unlockLevel: number
  color: string
}

export interface FoundWord {
  word: string
  category: string
  timestamp: number
}

export interface GameSession {
  grid: string[][]
  words: {
    word: string
    category: string
    found: boolean
    positions: [number, number][]
  }[]
  size: number
  seed: string
}

export interface GridCell {
  letter: string
  row: number
  col: number
  selected: boolean
  found: boolean
  highlighted: boolean
  partOfWord?: string
}

/* ─── Achievements ─── */

export interface Achievement {
  id: string
  name: string
  description: string
  icon: string
  category: AchievementCategory
  requirement: AchievementRequirement
  xpReward: number
  coinReward: number
  titleReward?: string
}

export type AchievementCategory =
  | 'discovery'
  | 'mastery'
  | 'streak'
  | 'speed'
  | 'collection'
  | 'level'
  | 'social'
  | 'special'

export interface AchievementRequirement {
  type: 'words_found' | 'words_found_category' | 'total_xp' | 'level' | 'streak'
  | 'games_played' | 'category_complete' | 'words_in_time' | 'no_hints'
  | 'all_categories' | 'daily_claimed'
  target: number
  categoryId?: string
}

export interface AchievementProgress {
  id: string
  current: number
  completed: boolean
  completedAt?: number
  claimed: boolean
}

export interface Rank {
  id: string
  name: string
  description: string
  icon: string
  xpRequired: number
  color: string
}

/* ─── Player Profile ─── */

export interface PlayerProfile {
  displayName: string
  avatarEmoji: string
  title: string
  rank: string
  joinedAt: number
}

export interface PlayerProgress {
  /* Core progression */
  xp: number
  level: number
  wordsFound: FoundWord[]
  unlockedCategories: string[]

  /* Streak */
  dailyStreak: number
  lastDaily: string | null
  dailyClaimed: boolean

  /* Stats */
  totalGames: number
  totalWordsFound: number
  gamesWon: number

  /* Economy */
  coins: number
  knowledgePoints: number
  gems: number

  /* Power-ups inventory */
  powerUps: PowerUpInventory

  /* Achievements */
  achievements: AchievementProgress[]

  /* Profile */
  profile: PlayerProfile
}

/* ─── Power-ups ─── */

export type PowerUpType = 'hint' | 'reveal' | 'shuffle' | 'freeze' | 'eliminate'

export interface PowerUpDefinition {
  id: PowerUpType
  name: string
  description: string
  icon: string
  coinCost: number
  maxOwned: number
}

export type PowerUpInventory = Record<PowerUpType, number>

/* ─── Game Modes ─── */

export type GameMode =
  | 'classic'
  | 'timed'
  | 'survival'
  | 'category'
  | 'daily'

export interface GameConfig {
  mode: GameMode
  gridSize: number
  wordCount: number
  category?: string
  timeLimit?: number // seconds, for timed modes
  lives?: number     // for survival
}

/* ─── Daily Challenge ─── */

export interface DailyReward {
  day: number
  coinReward: number
  xpReward: number
  powerUpReward?: { type: PowerUpType; amount: number }
  title?: string
}

/* ─── Game Stats (computed) ─── */

export interface GameStats {
  currentXp: number
  level: number
  xpForNext: number
  xpInCurrentLevel: number
  wordsFound: number
  totalWords: number
  categoriesUnlocked: string[]
  rank: Rank
  achievementCount: number
  totalAchievements: number
  completionPercent: number
}
