/**
 * Ranks System — JuegaHipHop Cross-Game Ranks
 *
 * Los rangos son compartidos entre todos los juegos del ecosistema.
 * Se basan en XP total acumulada (no nivel).
 */
import type { Rank } from './types'

export const RANKS: Rank[] = [
  {
    id: 'bronze_1',
    name: 'Novato',
    description: 'Estás dando tus primeros pasos en el hip hop',
    icon: '🌱',
    xpRequired: 0,
    color: '#CD7F32',
  },
  {
    id: 'bronze_2',
    name: 'B-Boy Aprendiz',
    description: 'Estás aprendiendo los fundamentos',
    icon: '🎧',
    xpRequired: 500,
    color: '#CD7F32',
  },
  {
    id: 'bronze_3',
    name: 'MC Novato',
    description: 'Tu flow empieza a formarse',
    icon: '🎤',
    xpRequired: 1500,
    color: '#CD7F32',
  },
  {
    id: 'silver_1',
    name: 'DJ en Ascenso',
    description: 'Ya mezclas bien los conocimientos',
    icon: '🎧',
    xpRequired: 3000,
    color: '#C0C0C0',
  },
  {
    id: 'silver_2',
    name: 'Graffitero',
    description: 'Dejas tu marca en la comunidad',
    icon: '🎨',
    xpRequired: 5000,
    color: '#C0C0C0',
  },
  {
    id: 'silver_3',
    name: 'Breaker Confiable',
    description: 'Ya tienes un repertorio sólido',
    icon: '💃',
    xpRequired: 8000,
    color: '#C0C0C0',
  },
  {
    id: 'gold_1',
    name: 'Conocedor',
    description: 'Tu biblioteca hip hop crece',
    icon: '📖',
    xpRequired: 12000,
    color: '#FFD700',
  },
  {
    id: 'gold_2',
    name: 'Historiador',
    description: 'Conoces la historia en profundidad',
    icon: '📜',
    xpRequired: 18000,
    color: '#FFD700',
  },
  {
    id: 'gold_3',
    name: 'Veterano',
    description: 'Has visto evolucionar el hip hop',
    icon: '👑',
    xpRequired: 25000,
    color: '#FFD700',
  },
  {
    id: 'platinum_1',
    name: 'Maestro del Micro',
    description: 'Tu conocimiento es respetado',
    icon: '🎙️',
    xpRequired: 35000,
    color: '#E5E4E2',
  },
  {
    id: 'platinum_2',
    name: 'Leyenda Urbana',
    description: 'Tu nombre suena en los cyphers',
    icon: '🏆',
    xpRequired: 50000,
    color: '#E5E4E2',
  },
  {
    id: 'platinum_3',
    name: 'Diamond MC',
    description: 'Eres referencia en la cultura',
    icon: '💎',
    xpRequired: 75000,
    color: '#E5E4E2',
  },
  {
    id: 'diamond_1',
    name: 'Knowledge Keeper',
    description: 'Guardian del conocimiento hip hop',
    icon: '📚',
    xpRequired: 100000,
    color: '#B9F2FF',
  },
  {
    id: 'diamond_2',
    name: 'Enciclopedista',
    description: 'Vives y respiras hip hop',
    icon: '🔮',
    xpRequired: 150000,
    color: '#B9F2FF',
  },
  {
    id: 'diamond_3',
    name: 'Dios del Knowledge',
    description: 'No hay nada que no sepas sobre hip hop',
    icon: '👑',
    xpRequired: 250000,
    color: '#B9F2FF',
  },
]

export function getRank(xp: number): Rank {
  let rank = RANKS[0]
  for (const r of RANKS) {
    if (xp >= r.xpRequired) rank = r
  }
  return rank
}

export function getNextRank(xp: number): Rank | null {
  for (const r of RANKS) {
    if (xp < r.xpRequired) return r
  }
  return null
}
