/**
 * Game Engine — Grid generation, word detection, seed RNG
 *
 * Core game logic adapted to work with the new progression system.
 */
import type { GameSession, GridCell, WordEntry, GameConfig } from './types'
import { allWords, categories } from '../data/index'
import { getGridConfig } from './economy'

const DIRECTIONS: [number, number][] = [
  [0, 1],   // →
  [0, -1],  // ←
  [1, 0],   // ↓
  [-1, 0],  // ↑
  [1, 1],   // ↘
  [-1, -1], // ↖
  [1, -1],  // ↙
  [-1, 1],  // ↗
]

function seededRandom(seed: string): () => number {
  let h = 0
  for (let i = 0; i < seed.length; i++) {
    h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0
  }
  return () => {
    h = (h ^ (h >>> 16)) * 0x45d9f3b | 0
    h = (h ^ (h >>> 16)) * 0x45d9f3b | 0
    return (h >>> 0) / 4294967296
  }
}

function shuffled<T>(arr: T[], rand: () => number): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function generateGrid(
  size: number,
  wordList: WordEntry[],
  seed: string,
): GameSession {
  const rand = seededRandom(seed)
  const sorted = [...wordList]
    .sort((a, b) => b.word.length - a.word.length)
    .slice(0, Math.min(wordList.length, size))

  const grid: string[][] = Array.from({ length: size }, () => Array(size).fill(''))
  const placed: GameSession['words'] = []

  for (const entry of sorted) {
    const w = entry.word.toUpperCase()
    const dirs = shuffled(DIRECTIONS, rand)
    let placed_ok = false

    for (const [dr, dc] of dirs) {
      const positions: [number, number][] = []
      const starts = shuffled(
        Array.from({ length: size * size }, (_, i) => [Math.floor(i / size), i % size] as [number, number]),
        rand,
      )
      for (const [r, c] of starts) {
        positions.length = 0
        let ok = true
        for (let i = 0; i < w.length; i++) {
          const nr = r + dr * i
          const nc = c + dc * i
          if (nr < 0 || nr >= size || nc < 0 || nc >= size) { ok = false; break }
          const cell = grid[nr][nc]
          if (cell !== '' && cell !== w[i]) { ok = false; break }
          positions.push([nr, nc])
        }
        if (ok) {
          positions.forEach(([pr, pc], i) => { grid[pr][pc] = w[i] })
          placed.push({ word: w, category: entry.category, found: false, positions })
          placed_ok = true
          break
        }
      }
      if (placed_ok) break
    }
  }

  // fill empty cells
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (grid[r][c] === '') {
        grid[r][c] = String.fromCharCode(65 + Math.floor(rand() * 26))
      }
    }
  }

  return { grid, words: placed, size, seed }
}

export function checkWord(
  cells: GridCell[][],
  selected: [number, number][],
  game: GameSession,
): string | null {
  const word = selected.map(([r, c]) => cells[r][c].letter).join('')
  const reverse = selected.map(([r, c]) => cells[r][c].letter).toReversed().join('')

  for (const gw of game.words) {
    if (gw.found) continue
    if (gw.word === word || gw.word === reverse) {
      return gw.word
    }
  }
  return null
}

export function buildCells(grid: string[][]): GridCell[][] {
  return grid.map((row, r) =>
    row.map((letter, c) => ({
      letter,
      row: r,
      col: c,
      selected: false,
      found: false,
      highlighted: false,
    })),
  )
}

export function pickWordsForGame(
  unlockedCategories: string[],
  count: number,
  seed: string,
  mode: string = 'classic',
  category?: string,
): WordEntry[] {
  const rand = seededRandom(seed + 'pick')

  let available: WordEntry[]
  if (mode === 'category' && category) {
    available = allWords.filter(w => w.category === category)
  } else {
    available = allWords.filter(w => unlockedCategories.includes(w.category))
  }

  // If we don't have enough words, reduce count
  const actualCount = Math.min(count, available.length)
  return shuffled(available, rand).slice(0, actualCount)
}

export function getDailySeed(): string {
  const d = new Date()
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
}

export function getGameConfig(level: number, mode: string, category?: string): GameConfig {
  const cfg = getGridConfig(level, mode)
  return {
    mode: mode as GameConfig['mode'],
    gridSize: cfg.size,
    wordCount: cfg.wordCount,
    category,
    timeLimit: mode === 'timed' ? 90 : undefined,
    lives: mode === 'survival' ? 3 : undefined,
  }
}

export function getWordData(word: string) {
  return allWords.find(w => w.word.toUpperCase() === word.toUpperCase())
}

export function getCategory(id: string) {
  return categories.find(c => c.id === id)
}

export { allWords as words, categories }
