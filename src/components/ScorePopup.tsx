import { useEffect, useState } from 'react'

export default function ScorePopup({ amount, x, y }: { amount: number; x: number; y: number }) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const t = setTimeout(() => setVisible(false), 800)
    return () => clearTimeout(t)
  }, [])

  if (!visible) return null

  return (
    <div
      className="absolute pointer-events-none z-10 font-heading text-lg text-gold animate-score-float"
      style={{ left: x, top: y }}
    >
      +{amount}
    </div>
  )
}
