/**
 * Power-Up System — Sopa de Knowledge
 *
 * Implementación de power-ups funcionales:
 * - hint: Destella la primera letra de una palabra no encontrada
 * - reveal: Revela las posiciones de una palabra por 2s
 * - shuffle: Reordena las letras del grid (no las palabras)
 * - freeze: Pausa el timer por 15s
 * - eliminate: Elimina letras que no están en ninguna palabra
 */
import type { GameSession, GridCell, PowerUpType, PowerUpInventory } from './types'
import { POWER_UP_COSTS } from './economy'

export { POWER_UP_COSTS }

/* ─── Default inventory ─── */

export function defaultPowerUps(): PowerUpInventory {
  return {
    hint: 3,
    reveal: 1,
    shuffle: 2,
    freeze: 0,
    eliminate: 1,
  }
}

/* ─── Use a power-up ─── */

export function consumePowerUp(inventory: PowerUpInventory, type: PowerUpType): PowerUpInventory {
  const current = inventory[type] ?? 0
  if (current <= 0) return inventory
  return { ...inventory, [type]: current - 1 }
}

export function addPowerUp(inventory: PowerUpInventory, type: PowerUpType, amount: number): PowerUpInventory {
  return { ...inventory, [type]: (inventory[type] ?? 0) + amount }
}

export function canAfford(coins: number, type: PowerUpType): boolean {
  return coins >= POWER_UP_COSTS[type]
}

/* ─── Hint: pick a random unfound word and highlight its first letter ─── */

export function getHintTarget(
  game: GameSession,
  foundWords: Set<string>,
): { word: string; position: [number, number] } | null {
  const unfound = game.words.filter(w => !foundWords.has(w.word))
  if (unfound.length === 0) return null
  const target = unfound[Math.floor(Math.random() * unfound.length)]
  return { word: target.word, position: target.positions[0] }
}

/* ─── Reveal: show a word's positions briefly ─── */

export function getRevealTarget(
  game: GameSession,
  foundWords: Set<string>,
): { word: string; positions: [number, number][] } | null {
  const unfound = game.words.filter(w => !foundWords.has(w.word))
  if (unfound.length === 0) return null
  const target = unfound[Math.floor(Math.random() * unfound.length)]
  return { word: target.word, positions: target.positions }
}

/* ─── Shuffle: scramble filler letters (keep found words intact) ─── */

export function shuffleGrid(
  grid: string[][],
  game: GameSession,
  foundWords: Set<string>,
): string[][] {
  const size = grid.length
  const newGrid = grid.map(row => [...row])

  // Collect all filler positions (not part of any placed word)
  const fillerPositions: [number, number][] = []
  for (const gw of game.words) {
    if (foundWords.has(gw.word)) continue
    for (const [r, c] of gw.positions) {
      fillerPositions.push([r, c])
    }
  }

  // Also find all cells that are not part of ANY word
  const allWordCells = new Set<string>()
  for (const gw of game.words) {
    for (const [r, c] of gw.positions) {
      allWordCells.add(`${r}-${c}`)
    }
  }

  // Collect unfound word cells + pure filler cells
  const shuffleCells: [number, number][] = []
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const key = `${r}-${c}`
      if (!allWordCells.has(key)) {
        shuffleCells.push([r, c])
      }
    }
  }

  // Shuffle the letters
  const letters = shuffleCells.map(([r, c]) => newGrid[r][c])
  for (let i = letters.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [letters[i], letters[j]] = [letters[j], letters[i]]
  }

  for (let i = 0; i < shuffleCells.length; i++) {
    const [r, c] = shuffleCells[i]
    newGrid[r][c] = letters[i]
  }

  return newGrid
}

/* ─── Eliminate: remove N random filler letters ─── */

export function eliminateLetters(
  cells: GridCell[][],
  game: GameSession,
  _foundWords: Set<string>,
  count: number,
): GridCell[][] {
  const allWordCells = new Set<string>()
  for (const gw of game.words) {
    for (const [r, c] of gw.positions) {
      allWordCells.add(`${r}-${c}`)
    }
  }

  // Find all pure filler cells (not in any word)
  const fillerCells: [number, number][] = []
  for (let r = 0; r < cells.length; r++) {
    for (let c = 0; c < cells[r].length; c++) {
      if (!allWordCells.has(`${r}-${c}`)) {
        fillerCells.push([r, c])
      }
    }
  }

  // Pick random ones to "eliminate" (grey them out)
  const target = Math.min(count, fillerCells.length)
  const selected = new Set<string>()
  const newCells = cells.map(row => row.map(cell => ({ ...cell })))

  for (let i = 0; i < target; i++) {
    const available = fillerCells.filter(([r, c]) => !selected.has(`${r}-${c}`))
    if (available.length === 0) break
    const pick = available[Math.floor(Math.random() * available.length)]
    selected.add(`${pick[0]}-${pick[1]}`)
    newCells[pick[0]][pick[1]].highlighted = true
  }

  return newCells
}

/* ─── Check if a word was found via power-up → mark it ─── */

export function markWordAsFound(
  cells: GridCell[][],
  game: GameSession,
  word: string,
): { cells: GridCell[][]; wordCategory: string } {
  const gw = game.words.find(w => w.word === word)
  if (!gw) return { cells, wordCategory: '' }

  const newCells = cells.map(row => row.map(cell => ({ ...cell })))
  for (const [r, c] of gw.positions) {
    newCells[r][c] = { ...newCells[r][c], found: true, selected: false, partOfWord: word }
  }

  return { cells: newCells, wordCategory: gw.category }
}
