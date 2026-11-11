import * as THREE from 'three'
import { fbm } from './noise'

/**
 * The noodler hopper, measured off its own geometry.
 *
 * Everything about the material in the hopper is derived from a single probe of
 * the real funnel mesh: where its surface sits on a grid, which columns are open
 * throat, where the brim is, and how much volume it holds up to that brim. The
 * PLC reports a percentage, and a percentage is only meaningful against a
 * measured capacity - so this is what turns `level = 33` into a height in the
 * scene.
 */
export interface HopperField {
  minX: number
  minZ: number
  cell: number
  cols: number
  rows: number
  /** Height of the hopper's own surface per column - rim, walls, basin. */
  height: Float64Array
  /** 1 where the funnel is open to the screws below. */
  throat: Uint8Array
  /** 1 for columns that miss the hopper mesh entirely. */
  outside: Uint8Array
  /** Footprint of the mouth, used to aim falling material into the opening. */
  mouthMinX: number
  mouthMaxX: number
  mouthMinZ: number
  mouthMaxZ: number
  /** The brim. Fill past this and material spills over the lip. */
  ceiling: number
  /** Volume held between the probed surface and the brim. */
  capacity: number
  /**
   * Fillable columns ordered by depth, deepest first, with a running sum of
   * their heights. Sorting once at probe time is what makes the fill height
   * solvable in closed form instead of by search - see solveFillHeight.
   */
  order: Int32Array
  sortedHeights: Float64Array
  heightPrefix: Float64Array
}

/** `object`'s transform as if `scene` sat at the identity transform. */
function getSceneRelativeMatrix(object: THREE.Object3D, scene: THREE.Object3D, target: THREE.Matrix4) {
  scene.updateWorldMatrix(true, false)
  object.updateWorldMatrix(true, false)
  return target.copy(scene.matrixWorld).invert().multiply(object.matrixWorld)
}

/**
 * Probes the hopper from above on a grid and records where its surface sits,
 * giving material the real funnel to sit in - rim, sloping walls, basin and the
 * open throat - instead of an invented flat floor.
 *
 * `columns` sets the grid resolution across the hopper's width. The funnel is
 * only ~320 triangles, so a 50-column grid costs about 65 ms once at mount.
 *
 * Note what this deliberately does NOT do: decide which columns are "inside"
 * the hopper from how low they are. An earlier version called a column inside
 * if it sat some fraction below the highest point, and that let material rest
 * on the funnel's outer rim and on its steep walls.
 */
export function probeHopperSurface(
  scene: THREE.Object3D,
  hopperMeshName: string,
  columns: number,
): HopperField | null {
  const hopper = scene.getObjectByName(hopperMeshName) as THREE.Mesh | undefined
  if (!hopper || !hopper.geometry) return null

  hopper.geometry.computeBoundingBox()
  const box = hopper.geometry
    .boundingBox!.clone()
    .applyMatrix4(getSceneRelativeMatrix(hopper, scene, new THREE.Matrix4()))
  const cell = (box.max.x - box.min.x) / columns
  if (!(cell > 0)) return null
  const cols = Math.max(2, Math.ceil((box.max.x - box.min.x) / cell))
  const rows = Math.max(2, Math.ceil((box.max.z - box.min.z) / cell))
  const height = new Float64Array(cols * rows)
  const empty = new Uint8Array(cols * rows)

  // Rays are cast in world space, so points go out through the scene's matrix
  // and results come back through its inverse. The round trip cancels, which
  // keeps this correct even on the first frame - before the model's ground
  // alignment has been applied and scene.position is still zero.
  scene.updateWorldMatrix(true, false)
  const toWorld = scene.matrixWorld
  const toLocal = new THREE.Matrix4().copy(toWorld).invert()
  const raycaster = new THREE.Raycaster()
  const down = new THREE.Vector3(0, -1, 0).transformDirection(toWorld).normalize()
  const origin = new THREE.Vector3()

  let lowest = Number.POSITIVE_INFINITY
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const k = j * cols + i
      origin.set(box.min.x + (i + 0.5) * cell, box.max.y + cell, box.min.z + (j + 0.5) * cell).applyMatrix4(toWorld)
      raycaster.set(origin, down)
      const hit = raycaster.intersectObject(hopper, true)[0]
      if (hit) {
        height[k] = hit.point.clone().applyMatrix4(toLocal).y
        lowest = Math.min(lowest, height[k])
      } else {
        empty[k] = 1
      }
    }
  }
  if (!Number.isFinite(lowest)) return null

  // Two very different things produce a column with no hit: the funnel's open
  // throat, and the slack between the mesh and its bounding box, since the grid
  // rounds up to whole cells. Telling them apart matters - treating the slack as
  // throat spreads material past the hopper altogether.
  //
  // A flood fill from the border separates them: empty columns reachable from
  // the edge of the grid are outside the mesh, and empty columns walled off by
  // geometry are the throat.
  const outside = new Uint8Array(cols * rows)
  const queue: number[] = []
  for (let i = 0; i < cols; i++) {
    for (const k of [i, (rows - 1) * cols + i]) if (empty[k] && !outside[k]) { outside[k] = 1; queue.push(k) }
  }
  for (let j = 0; j < rows; j++) {
    for (const k of [j * cols, j * cols + cols - 1]) if (empty[k] && !outside[k]) { outside[k] = 1; queue.push(k) }
  }
  for (let head = 0; head < queue.length; head++) {
    const k = queue[head]
    const i = k % cols
    const j = (k - i) / cols
    const neighbours = [
      i > 0 ? k - 1 : -1,
      i < cols - 1 ? k + 1 : -1,
      j > 0 ? k - cols : -1,
      j < rows - 1 ? k + cols : -1,
    ]
    for (const n of neighbours) {
      if (n >= 0 && empty[n] && !outside[n]) { outside[n] = 1; queue.push(n) }
    }
  }

  // The throat is enclosed empty space. Give it the basin's own floor level so
  // that it holds material like the rest of the basin - what the screws draw
  // off is reported by the PLC as a falling level, not modelled as a hole.
  const throat = new Uint8Array(cols * rows)
  for (let k = 0; k < empty.length; k++) {
    if (empty[k] && !outside[k]) { throat[k] = 1; height[k] = lowest }
  }

  // The brim: the lowest point of the lip separating the inside from the
  // outside. Fill past this and material spills over the edge, so it is both
  // the ceiling for the fill and the right basis for the hopper's capacity.
  let spill = Number.POSITIVE_INFINITY
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const k = j * cols + i
      if (outside[k]) continue
      const onEdge =
        i === 0 || i === cols - 1 || j === 0 || j === rows - 1 ||
        outside[k - 1] === 1 || outside[k + 1] === 1 || outside[k - cols] === 1 || outside[k + cols] === 1
      if (onEdge) spill = Math.min(spill, height[k])
    }
  }
  if (!Number.isFinite(spill)) return null

  // Every column below the brim is somewhere material can end up. Collected in
  // depth order so the fill height can be solved directly.
  const fillable: number[] = []
  let mouthMinX = Number.POSITIVE_INFINITY
  let mouthMaxX = Number.NEGATIVE_INFINITY
  let mouthMinZ = Number.POSITIVE_INFINITY
  let mouthMaxZ = Number.NEGATIVE_INFINITY
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const k = j * cols + i
      if (outside[k] || height[k] >= spill) continue
      fillable.push(k)
      const x = box.min.x + (i + 0.5) * cell
      const z = box.min.z + (j + 0.5) * cell
      mouthMinX = Math.min(mouthMinX, x)
      mouthMaxX = Math.max(mouthMaxX, x)
      mouthMinZ = Math.min(mouthMinZ, z)
      mouthMaxZ = Math.max(mouthMaxZ, z)
    }
  }
  if (fillable.length === 0 || !Number.isFinite(mouthMinX)) return null

  fillable.sort((a, b) => height[a] - height[b])
  const order = Int32Array.from(fillable)
  const sortedHeights = new Float64Array(order.length)
  const heightPrefix = new Float64Array(order.length + 1)
  let capacity = 0
  for (let n = 0; n < order.length; n++) {
    sortedHeights[n] = height[order[n]]
    heightPrefix[n + 1] = heightPrefix[n] + sortedHeights[n]
    capacity += (spill - sortedHeights[n]) * cell * cell
  }

  return {
    minX: box.min.x,
    minZ: box.min.z,
    cell,
    cols,
    rows,
    height,
    throat,
    outside,
    mouthMinX,
    mouthMaxX,
    mouthMinZ,
    mouthMaxZ,
    ceiling: spill,
    capacity,
    order,
    sortedHeights,
    heightPrefix,
  }
}

/** Below every fillable column - the hopper reads as empty. */
export const EMPTY_FILL = Number.NEGATIVE_INFINITY

// --- surface relief ------------------------------------------------------
//
// The same loose product that is in the mixer is what lands in the hopper, so
// it is given the same treatment MixerFill uses: a flat albedo, flat shading,
// and all of the surface interest coming from displaced geometry rather than
// from a texture. A mirror-flat plane lit by a flat colour reads as liquid;
// these two noise scales are what make it read as crumb.
//
// What is deliberately NOT carried over is MixerFill's dome. The mixer's mass
// mounds up because the blades fold it that way; the hopper's surface height is
// a measurement from the plant, so the mean stays level and only the relief
// around it is invented.

// Both scales are measured in grid cells rather than in scene units, so the
// relief is always resolved by the mesh that carries it. In absolute units a
// lump can come out finer than the grid - which averages it away to nothing and
// leaves a flat sheet - or so broad that only one or two sit across the whole
// hopper, which reads as a gently bowed plate rather than as loose product.
//
// Two scales, as MixerFill layers over its dome: clumps where the material has
// folded, and a finer grain so no facet matches its neighbour.
const LUMP_WAVELENGTH_CELLS = 8
const LUMP_AMPLITUDE_CELLS = 3.2
const GRAIN_WAVELENGTH_CELLS = 3
const GRAIN_AMPLITUDE_CELLS = 1.2

// Relief is faded out over this depth of material. Where the surface meets the
// funnel wall there is almost nothing lying there, and a lump displaced upward
// on a knife-edge of material would hang through the wall - so the relief dies
// away as the material thins, and the surface meets the wall flat. Kept short:
// fading it over too much depth flattens the rim, which is the edge most in
// view against the funnel wall.
const RELIEF_TAPER_CELLS = 3

/**
 * Vertices per filled column: two triangles for the top surface, two more for
 * the underside beneath it.
 *
 * The material has to be a closed body, for the same reason MixerFill builds
 * one: the hopper's opacity is user-controllable, and the moment anyone makes
 * the funnel see-through, a lone top surface shows as a lid with nothing under
 * it. Where the funnel rises to meet the fill height the two sheets close
 * against each other, so the solid seals itself without needing a separate rim.
 */
const VERTICES_PER_COLUMN = 12

/**
 * How far the underside is held off the funnel it sits in, in cells.
 *
 * MixerFill does the same thing and says why: two surfaces at the same height
 * z-fight and flicker as the camera moves, so its trough curve is biased to sit
 * just inside the bowl's shell rather than on it. Getting this too SMALL is its
 * own failure and a more confusing one - at a quarter of a cell the underside
 * lands on the funnel wall, reads as the funnel rather than as material, and
 * leaves the hopper looking emptier than no underside at all.
 */
export const SKIN_INSET_CELLS = 1.5

/** The relief at a point on the surface, in scene units, averaging to zero. */
function relief(x: number, z: number, cell: number): number {
  const lumpWave = cell * LUMP_WAVELENGTH_CELLS
  const grainWave = cell * GRAIN_WAVELENGTH_CELLS
  return (
    fbm(x / lumpWave, z / lumpWave) * cell * LUMP_AMPLITUDE_CELLS +
    fbm(x / grainWave + 31.7, z / grainWave + 19.1) * cell * GRAIN_AMPLITUDE_CELLS
  )
}

/**
 * The height a level surface sits at when the hopper holds `fraction` of its
 * measured capacity.
 *
 * Solved in closed form rather than by searching. The volume under a surface at
 * y is the sum over every submerged column of (y - its own height) x the column's
 * area, so if exactly n columns are submerged:
 *
 *     V = A * (n * y - sum of those n heights)   =>   y = (V / A + prefix[n]) / n
 *
 * Columns are pre-sorted by depth, so "the submerged ones" are always a prefix
 * and the candidate n can simply be walked upward until the y it implies
 * actually falls between the n-th and (n+1)-th column heights - the point where
 * the assumption about how many columns are covered is self-consistent.
 */
export function solveFillHeight(field: HopperField, fraction: number): number {
  const target = Math.max(0, Math.min(1, fraction)) * field.capacity
  if (target <= 0) return EMPTY_FILL

  const area = field.cell * field.cell
  const count = field.order.length
  for (let n = 1; n <= count; n++) {
    const y = (target / area + field.heightPrefix[n]) / n
    // Deep enough to cover the n-th column, but not so deep it would have
    // covered the next one too.
    if (y < field.sortedHeights[n - 1]) continue
    const next = n < count ? field.sortedHeights[n] : field.ceiling
    if (y <= next) return Math.min(y, field.ceiling)
  }
  return field.ceiling
}

/** How many columns sit under a surface at `y`. The order is sorted, so this is a prefix. */
export function submergedCount(field: HopperField, y: number): number {
  let lo = 0
  let hi = field.order.length
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (field.sortedHeights[mid] < y) lo = mid + 1
    else hi = mid
  }
  return lo
}

/**
 * The buffers behind the material's top surface.
 *
 * `positions` is written into every time the level moves; the other two never
 * change and are what let that write stay a single pass with no noise
 * evaluation per frame.
 */
export interface FillSurface {
  /** Four triangles per fillable column - top surface and underside. Only y is ever rewritten. */
  positions: Float32Array
  /**
   * Per-face normals, rewritten alongside the positions.
   *
   * Written explicitly rather than left to `flatShading` to derive: relief is
   * pointless if the lighting cannot see it, and a surface with no usable
   * normals renders as one uniform sheet of colour - which is exactly what a
   * flat white slab looks like.
   */
  normals: Float32Array
  /** Relief at each vertex, in scene units - see relief(). */
  offset: Float32Array
  /** Height of the funnel under each vertex, for fading the relief out. */
  floor: Float32Array
}

/**
 * Builds the surface buffers for a hopper.
 *
 * Corners are addressed by whole grid indices rather than by cell centre plus a
 * half-cell, so a corner shared between neighbouring columns is computed from
 * the identical expression in both. That matters: the relief is a function of
 * position, so identical corners give identical displacement and the surface
 * stays sealed. Half-cell offsets would leave the two copies a rounding error
 * apart and split the surface along every column boundary.
 */
export function createFillSurface(field: HopperField): FillSurface {
  const vertices = field.order.length * VERTICES_PER_COLUMN
  const positions = new Float32Array(vertices * 3)
  const normals = new Float32Array(vertices * 3)
  const offset = new Float32Array(vertices)
  const floor = new Float32Array(vertices)

  // Deepest of the columns meeting at a corner. The relief is faded by how much
  // material lies under it, and taking the shallowest depth here - that is, the
  // highest floor - keeps the fade conservative at the funnel wall.
  const floorAt = (i: number, j: number) => {
    let highest = Number.NEGATIVE_INFINITY
    for (let dj = -1; dj <= 0; dj++) {
      for (let di = -1; di <= 0; di++) {
        const ci = i + di
        const cj = j + dj
        if (ci < 0 || ci >= field.cols || cj < 0 || cj >= field.rows) continue
        highest = Math.max(highest, field.height[cj * field.cols + ci])
      }
    }
    return Number.isFinite(highest) ? highest : field.ceiling
  }

  // Two triangles over the column, wound counter-clockwise seen from above so
  // the top surface faces up. Reversing the list reverses both triangles, which
  // is what turns the same four corners into a downward-facing underside.
  const TOP = [
    [0, 0], [0, 1], [1, 1],
    [0, 0], [1, 1], [1, 0],
  ]
  const BOTTOM = [...TOP].reverse()

  for (let n = 0; n < field.order.length; n++) {
    const k = field.order[n]
    const i = k % field.cols
    const j = (k - i) / field.cols
    for (let c = 0; c < VERTICES_PER_COLUMN; c++) {
      const [di, dj] = c < 6 ? TOP[c] : BOTTOM[c - 6]
      const ci = i + di
      const cj = j + dj
      const x = field.minX + ci * field.cell
      const z = field.minZ + cj * field.cell
      const v = n * VERTICES_PER_COLUMN + c
      positions[v * 3] = x
      positions[v * 3 + 2] = z
      offset[v] = relief(x, z, field.cell)
      floor[v] = floorAt(ci, cj)
    }
  }

  return { positions, normals, offset, floor }
}

/**
 * Writes the material sitting at height `y` into the buffers - the top surface
 * and the underside nested in the funnel below it.
 *
 * The columns are stored deepest first, so the ones under the surface are a
 * contiguous prefix and the mesh is trimmed with a draw range rather than
 * rebuilt. The relief rides on top of `y` and averages to zero, so the volume
 * the surface encloses still matches the level that asked for it - it is the
 * mean that carries the measurement, and the lumps only sit around it.
 *
 * Returns the vertex count to draw.
 */
export function writeFillSurface(field: HopperField, y: number, surface: FillSurface): number {
  const count = submergedCount(field, y)
  const { positions, normals, offset, floor } = surface
  const vertices = count * VERTICES_PER_COLUMN
  const taper = field.cell * RELIEF_TAPER_CELLS
  const inset = field.cell * SKIN_INSET_CELLS

  for (let v = 0; v < vertices; v++) {
    if (v % VERTICES_PER_COLUMN < 6) {
      // Top surface: the solved level, with the relief riding on it, faded out
      // as the material thins toward the funnel wall.
      const depth = y - floor[v]
      const fade = depth <= 0 ? 0 : depth >= taper ? 1 : depth / taper
      // Never let a lump rise past the brim - above that it would be sitting on
      // the outside of the hopper.
      positions[v * 3 + 1] = Math.min(y + offset[v] * fade, field.ceiling)
    } else {
      // Underside: nested inside the funnel, so the material fills the space
      // rather than capping it. Clamped to the level so that where the funnel
      // rises to meet the surface the two sheets close against each other.
      positions[v * 3 + 1] = Math.min(floor[v] + inset, y)
    }
  }

  // One normal per triangle, shared by its three vertices, so each facet catches
  // the light at its own angle and the relief actually shows.
  for (let t = 0; t < vertices; t += 3) {
    const a = t * 3
    const b = (t + 1) * 3
    const c = (t + 2) * 3
    const ax = positions[b] - positions[a]
    const ay = positions[b + 1] - positions[a + 1]
    const az = positions[b + 2] - positions[a + 2]
    const bx = positions[c] - positions[a]
    const by = positions[c + 1] - positions[a + 1]
    const bz = positions[c + 2] - positions[a + 2]
    let nx = ay * bz - az * by
    let ny = az * bx - ax * bz
    let nz = ax * by - ay * bx
    const len = Math.hypot(nx, ny, nz)
    if (len > 0) {
      nx /= len
      ny /= len
      nz /= len
    } else {
      // Degenerate triangle - fall back to straight up rather than to zero,
      // which would leave the facet unlit.
      nx = 0
      ny = 1
      nz = 0
    }
    for (let k = 0; k < 3; k++) {
      normals[a + k * 3] = nx
      normals[a + k * 3 + 1] = ny
      normals[a + k * 3 + 2] = nz
    }
  }

  return vertices
}
