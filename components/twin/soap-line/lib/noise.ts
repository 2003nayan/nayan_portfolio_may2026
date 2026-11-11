// Deterministic value noise, shared by everything that shapes material.
//
// Seeded rather than Math.random so a surface looks identical on every mount
// and every reload - material that reshuffles each time a component remounts
// would be distracting.
//
// MixerFill carries its own copy of these, coupled to its shader displacement.
// This module is where later ones live, so the count stays at two rather than
// growing with each new piece of material.

export function hash2(ix: number, iy: number): number {
  let h = Math.imul(ix, 374761393) + Math.imul(iy, 668265263)
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

export function valueNoise(x: number, y: number): number {
  const xi = Math.floor(x)
  const yi = Math.floor(y)
  const xf = x - xi
  const yf = y - yi
  // Smoothstep the interpolants so the lumps have rounded shoulders instead of
  // the diamond-shaped creases plain linear interpolation produces.
  const u = xf * xf * (3 - 2 * xf)
  const v = yf * yf * (3 - 2 * yf)
  const a = hash2(xi, yi)
  const b = hash2(xi + 1, yi)
  const c = hash2(xi, yi + 1)
  const d = hash2(xi + 1, yi + 1)
  return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v
}

/** Fractal sum, roughly [-1, 1]. Octaves step by 2.1 so they never line up. */
export function fbm(x: number, y: number, octaves = 4): number {
  let sum = 0
  let amplitude = 0.5
  let frequency = 1
  for (let i = 0; i < octaves; i++) {
    sum += amplitude * (valueNoise(x * frequency, y * frequency) * 2 - 1)
    frequency *= 2.1
    amplitude *= 0.5
  }
  return sum
}
