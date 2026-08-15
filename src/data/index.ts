/**
 * Data Index — Combina todas las palabras del juego
 *
 * words.ts tiene 396 palabras (breaking, mcing, djing)
 * words-extra.ts tiene 69 palabras (graffiti, cultura, historia, beatbox, produccion, chile)
 *
 * Total: 465 palabras únicas en 9 categorías
 */
import { words as baseWords, categories } from './words'
import { extraWords } from './words-extra'

export const allWords = [...baseWords, ...extraWords]
export { categories }