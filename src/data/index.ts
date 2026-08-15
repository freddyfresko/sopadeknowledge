/**
 * Data Index — Combina todas las palabras del juego
 *
 * words.ts tiene 390 palabras (breaking, mcing, djing)
 * words-extra.ts tiene 66 palabras (graffiti, cultura, historia, beatbox, produccion, chile)
 *
 * Total: 456 palabras únicas en 9 categorías — auditoría factual ago-2026 (sin dudosas)
 */
import { words as baseWords, categories } from './words'
import { extraWords } from './words-extra'

export const allWords = [...baseWords, ...extraWords]
export { categories }