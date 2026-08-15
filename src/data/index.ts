/**
 * Data Index — combina el contenido GENERADO desde la ENCICLOPEDIA
 * (fuente de la verdad) con el contenido legacy de la Sopa.
 *
 * words.generated.ts → generado por Enciclopedia HH/scripts/generar_sopa.py
 * words.ts / words-extra.ts → legacy manual (se migra a la enciclopedia
 *   progresivamente; hasta entonces se conserva como puente)
 *
 * DEDUP: la enciclopedia manda — si un word legacy duplica uno generado,
 * gana el generado (también resuelve los homónimos legacy por disciplina).
 */
import { words as baseWords, categories } from './words'
import { extraWords } from './words-extra'
import { generatedWords } from './words.generated'

const seen = new Set<string>()
export const allWords = [...generatedWords, ...baseWords, ...extraWords].filter((w) => {
  const key = w.word.toUpperCase()
  if (seen.has(key)) return false
  seen.add(key)
  return true
})
export { categories }
