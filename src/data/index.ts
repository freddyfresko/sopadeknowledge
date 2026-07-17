/**
 * Data Index — Combina todas las palabras del juego
 *
 * words.ts tiene 399 palabras (breaking, mcing, djing)
 * words-extra.ts tiene ~75 palabras (graffiti, cultura, historia, beatbox, produccion, chile)
 *
 * Total: ~474 palabras en 9 categorías
 */
import { words as baseWords, categories } from './words'
import { extraWords } from './words-extra'

export const allWords = [...baseWords, ...extraWords]
export { categories }