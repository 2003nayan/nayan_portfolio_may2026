import type { HopperField } from './hopperSurface'

/**
 * The outline of a hopper's open throat, as a closed loop in x/z.
 *
 * Taken as the convex hull of the throat columns' footprints rather than traced
 * round the grid: the cells are a few millimetres across, and a traced outline
 * comes out as a staircase that reads as stacked blocks, not as material filling
 * a round-cornered opening. The hull is then resampled to points `spacing`
 * apart, so the column's walls are evenly subdivided for its relief.
 *
 * Null when the probe found no throat.
 */
export function throatOutline(field: HopperField, spacing: number): [number, number][] | null {
  const corners: [number, number][] = []
  for (let k = 0; k < field.throat.length; k++) {
    if (!field.throat[k]) continue
    const i = k % field.cols
    const j = (k - i) / field.cols
    const x = field.minX + i * field.cell
    const z = field.minZ + j * field.cell
    corners.push([x, z], [x + field.cell, z], [x, z + field.cell], [x + field.cell, z + field.cell])
  }
  if (corners.length === 0) return null
  const hull = convexHull(corners)
  if (hull.length < 3) return null
  return resampleLoop(hull, spacing)
}

/** Andrew's monotone chain. Counter-clockwise in (x, z), no repeated end point. */
export function convexHull(points: [number, number][]): [number, number][] {
  const sorted = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1])
  const cross = (o: [number, number], a: [number, number], b: [number, number]) =>
    (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
  const lower: [number, number][] = []
  for (const p of sorted) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop()
    lower.push(p)
  }
  const upper: [number, number][] = []
  for (let n = sorted.length - 1; n >= 0; n--) {
    const p = sorted[n]
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop()
    upper.push(p)
  }
  return [...lower.slice(0, -1), ...upper.slice(0, -1)]
}

/** Points evenly spaced round a closed polygon, starting at its first vertex. */
export function resampleLoop(loop: [number, number][], spacing: number): [number, number][] {
  const lengths = loop.map((p, n) => {
    const q = loop[(n + 1) % loop.length]
    return Math.hypot(q[0] - p[0], q[1] - p[1])
  })
  const perimeter = lengths.reduce((a, b) => a + b, 0)
  const count = Math.max(loop.length, Math.round(perimeter / spacing))
  const step = perimeter / count
  const out: [number, number][] = []
  let edge = 0
  let edgeStart = 0
  for (let n = 0; n < count; n++) {
    const s = n * step
    while (edge < loop.length - 1 && s > edgeStart + lengths[edge]) {
      edgeStart += lengths[edge]
      edge++
    }
    const p = loop[edge]
    const q = loop[(edge + 1) % loop.length]
    const t = lengths[edge] > 0 ? (s - edgeStart) / lengths[edge] : 0
    out.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t])
  }
  return out
}
