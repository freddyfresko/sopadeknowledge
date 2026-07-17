import { useEffect, useState } from 'react'

const COLORS = ['#f97316', '#fbbf24', '#fb923c', '#d97706', '#ea580c', '#fdba74']

export default function ParticleBurst({ x, y }: { x: number; y: number }) {
  const [particles, setParticles] = useState<{ i: number; dx: number; dy: number; color: string }[]>([])

  useEffect(() => {
    const p = Array.from({ length: 10 }, (_, i) => ({
      i,
      dx: (Math.random() - 0.5) * 80,
      dy: -(Math.random() * 60 + 20),
      color: COLORS[i % COLORS.length],
    }))
    setParticles(p)
    const t = setTimeout(() => setParticles([]), 500)
    return () => clearTimeout(t)
  }, [x, y])

  if (particles.length === 0) return null

  return (
    <div className="absolute inset-0 pointer-events-none z-10" style={{ left: x - 20, top: y - 20 }}>
      {particles.map(p => (
        <div
          key={p.i}
          className="absolute w-2 h-2 rounded-full"
          style={{
            background: p.color,
            left: 20,
            top: 20,
            animation: `particle 0.5s ease-out forwards`,
            '--dx': `${p.dx}px`,
            '--dy': `${p.dy}px`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  )
}
