import { useRef, useCallback } from 'react'
import { Howl, Howler } from 'howler'

const SOUNDS = {
  select: { src: '/sounds/select.wav', vol: 0.3 },
  found: { src: '/sounds/found.wav', vol: 0.5 },
  levelup: { src: '/sounds/levelup.wav', vol: 0.6 },
  unlock: { src: '/sounds/unlock.wav', vol: 0.5 },
  complete: { src: '/sounds/complete.wav', vol: 0.6 },
} as const

type SfxName = keyof typeof SOUNDS

let bgmInstance: Howl | null = null

export default function useAudio() {
  const enabled = useRef(true)
  const musicEnabled = useRef(true)
  const howls = useRef<Record<SfxName, Howl> | null>(null)

  const init = useCallback(() => {
    if (howls.current) return
    howls.current = {} as Record<SfxName, Howl>
    for (const [name, cfg] of Object.entries(SOUNDS)) {
      howls.current[name as SfxName] = new Howl({
        src: [cfg.src],
        volume: cfg.vol,
        preload: true,
      })
    }
  }, [])

  const play = useCallback((name: SfxName) => {
    if (!enabled.current) return
    if (!howls.current) return
    howls.current[name]?.play()
  }, [])

  const startBgm = useCallback(() => {
    if (!musicEnabled.current || bgmInstance) return
    bgmInstance = new Howl({
      src: ['/sounds/bgm.wav'],
      volume: 0.25,
      loop: true,
    })
    bgmInstance.play()
  }, [])

  const stopBgm = useCallback(() => {
    bgmInstance?.stop()
    bgmInstance = null
  }, [])

  const toggle = useCallback(() => {
    enabled.current = !enabled.current
    if (!enabled.current) stopBgm()
    return enabled.current
  }, [stopBgm])

  const toggleMusic = useCallback(() => {
    musicEnabled.current = !musicEnabled.current
    if (musicEnabled.current) startBgm()
    else stopBgm()
    return musicEnabled.current
  }, [startBgm, stopBgm])

  const pauseAll = useCallback(() => {
    Howler.mute(true)
  }, [])

  const resumeAll = useCallback(() => {
    Howler.mute(false)
  }, [])

  return { init, play, startBgm, stopBgm, toggle, toggleMusic, pauseAll, resumeAll }
}
