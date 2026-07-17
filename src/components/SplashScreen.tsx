import { useEffect, useState } from 'react'

export default function SplashScreen({ onFinish }: { onFinish: () => void }) {
  const [progress, setProgress] = useState(0)
  const [fadeOut, setFadeOut] = useState(false)

  useEffect(() => {
    const t = setInterval(() => {
      setProgress(p => {
        if (p >= 100) {
          clearInterval(t)
          return 100
        }
        return p + 4
      })
    }, 40)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (progress >= 100) {
      const t = setTimeout(() => {
        setFadeOut(true)
        setTimeout(onFinish, 400)
      }, 300)
      return () => clearTimeout(t)
    }
  }, [progress, onFinish])

  return (
    <div className={`fixed inset-0 z-[100] bg-bg-primary flex flex-col items-center justify-center transition-opacity duration-400 ${fadeOut ? 'opacity-0' : 'opacity-100'}`}>
      {/* "JUEGA HIP HOP" tag */}
      <p className="text-[10px] text-text-muted uppercase tracking-[0.2em] mb-3">JUEGA HIP HOP</p>

      {/* Graffiti-style logo */}
      <div className="text-center mb-2">
        <div className="relative inline-block">
          <h1 className="font-graffiti text-4xl md:text-5xl leading-none tracking-wide text-white/90">
            SOPA DE
          </h1>
          <div className="flex items-center justify-center">
            <span className="font-graffiti text-4xl md:text-6xl leading-none text-yellow-neon text-stroke-yellow tracking-wide">KNOW</span>
            <span className="relative inline-flex items-center">
              <span className="font-graffiti text-4xl md:text-6xl leading-none text-yellow-neon text-stroke-yellow tracking-wide">W</span>
              <span className="absolute -top-5 -right-1 text-lg md:text-xl drop-shadow-lg">👑</span>
            </span>
            <span className="font-graffiti text-4xl md:text-6xl leading-none text-yellow-neon text-stroke-yellow tracking-wide">LEDGE</span>
          </div>
        </div>
      </div>

      <p className="text-xs text-text-muted mt-2 mb-6 tracking-[0.15em] uppercase font-semibold">Aprende Hip Hop Jugando</p>

      {/* Loading bar */}
      <div className="w-48 md:w-64 h-1 bg-white/10 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full bg-yellow-neon transition-all duration-75 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      <p className="mt-3 text-[10px] text-text-muted font-mono tracking-widest uppercase">
        {progress < 100 ? 'CARGANDO...' : '¡LISTO!'}
      </p>

      <p className="mt-3 text-[9px] text-text-muted/50">JuegaHipHop</p>
    </div>
  )
}
