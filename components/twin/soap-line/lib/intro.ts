import { useEffect, useState } from 'react'

// The 3D area's opening cover: it stays up for at least INTRO_MS from the
// moment the dashboard first opens, while the models download and the scene
// is laid out behind it, so the operator never watches a half-built line pop
// in. Kept free of three/drei imports - LineTwinViewer starts the clock before
// the scene's lazy chunk has arrived.
export const INTRO_MS = 10_000

// Module state, so it lasts for the page's lifetime: the clock starts once,
// and once the cover has lifted, later visits to the dashboard (the models
// are cached in memory by then) skip it. A full page reload starts over.
let startedAt: number | null = null
let done = false

/** Starts the clock on first call; returns when it started. */
export function introStart(): number {
  if (startedAt === null) startedAt = performance.now()
  return startedAt
}

export function isIntroDone(): boolean {
  return done
}

export function markIntroDone(): void {
  done = true
}

/** 0-100: how much of the minimum intro time has passed. Ticks while mounted. */
export function useIntroTimePct(): number {
  const [now, setNow] = useState(() => performance.now())
  const start = introStart()
  const finished = now - start >= INTRO_MS

  useEffect(() => {
    if (finished) return
    const id = setInterval(() => setNow(performance.now()), 100)
    return () => clearInterval(id)
  }, [finished])

  return Math.min(100, ((now - start) / INTRO_MS) * 100)
}
