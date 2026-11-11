"use client";
/* eslint-disable react-hooks/immutability, react-hooks/refs --
   React Three Fiber animates by mutating three.js objects inside useFrame and
   reads the latest props through refs; both are the library's intended
   pattern, which these React Compiler rules don't model. */

// Animated 3D twin of a sachet packaging machine, ported from the shopfloor
// platform's Digital Twin tab. Only the model and its motion are kept: roll
// spin, sealers, film feed, drive rollers, filler pistons, hopper level and
// the sachet mat stacking. Live data, use cases, labels, status markers and
// the part inspector were left out on purpose.
//
// The motion code is kept as close to the original as possible (part names,
// tuned constants and comments included), so it stays in that project's
// style rather than this repo's.

import {
  Component,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  type MutableRefObject,
  type ReactNode,
} from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useGLTF, useProgress } from '@react-three/drei'
import TwinControls, { type CameraView, type TwinApi } from './twin-controls'
import {
  Box3,
  BufferAttribute,
  CircleGeometry,
  DoubleSide,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  PMREMGenerator,
  Plane,
  Quaternion,
  Vector3,
  type Material,
  type Texture,
  type Object3D,
} from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import {
  MAT_DEBUG,
  PISTON_DEBUG,
  ROLL_SPIN,
  FRONT_VERTICAL_RANGE,
  SEALER_MOTION,
  type MatDebug,
  type PistonDebug,
  type RollSpin,
  type SealerView,
} from './controls'
import { PISTON_PARTS } from './piston-parts'
import {
  FRONT_HORIZONTAL_SEALER_PARTS,
  REAR_HORIZONTAL_SEALER_PARTS,
  REAR_SEALER_BAR_PARTS,
  REAR_SEALER_PARTS,
  ROLLER_PARTS,
  SEALER_BAR_PARTS,
  SEALER_PARTS,
} from './sealer-parts'

export const MACHINE_MODEL_URL = '/models/sachet-machine.glb'
const machineModelUrl = MACHINE_MODEL_URL
const matModelUrl = '/models/sachet-mat.glb'

/** A mesh this flat (thinnest / widest extent) is a sheet with no back face. */
const FLAT_RATIO = 0.01
/** Single-surface parts too curved to be caught as flat: the laminate film
 * running from the roll into the machine. */
const SHEET_NODES = new Set(['Machine Part | Machine_DSG'])

/**
 * Draws both faces of paper-thin parts, such as the laminate film running from
 * the roll into the machine.
 *
 * Those parts are a single surface, and the export leaves their materials
 * single-sided, so three skips the back face (backface culling) and the sheet
 * vanishes whenever it is seen from behind. Solid parts never show a back face,
 * so only flat meshes are switched — doubling all ~1,900 would cost draw time
 * for nothing. Materials are shared, so each flat mesh gets a double-sided copy
 * (one per original material). Runs once per loaded scene.
 */
function showBackFacesOfSheets(scene: Object3D) {
  if (scene.userData.sheetsDoubleSided) return
  scene.userData.sheetsDoubleSided = true

  const copies = new Map<Material, Material>()
  const doubleSided = (material: Material) => {
    if (material.side === DoubleSide) return material
    let copy = copies.get(material)
    if (!copy) {
      copy = material.clone()
      copy.side = DoubleSide
      copies.set(material, copy)
    }
    return copy
  }

  scene.traverse((node) => {
    if (!(node instanceof Mesh)) return
    const named = SHEET_NODES.has(node.userData.name) || SHEET_NODES.has(node.parent?.userData.name)
    node.geometry.computeBoundingBox()
    const size = node.geometry.boundingBox!.getSize(new Vector3())
    const widest = Math.max(size.x, size.y, size.z)
    const flat = widest > 0 && Math.min(size.x, size.y, size.z) / widest <= FLAT_RATIO
    if (!named && !flat) return
    node.material = Array.isArray(node.material)
      ? node.material.map(doubleSided)
      : doubleSided(node.material)
  })
}

/**
 * The GLB ships meshopt-compressed (EXT_meshopt_compression, ~15 MB from a
 * 116 MB Unreal export). drei enables the meshopt decoder by default and
 * bundles it locally, so there is no CDN fetch. Fetched lazily on first mount
 * and cached by drei for the rest of the session.
 */
function MachineModel({ url }: { url: string }) {
  const { scene } = useGLTF(url)
  useMemo(() => showBackFacesOfSheets(scene), [scene])

  // Hiding mutates the cached scene, so un-hide everything on the way out or
  // the next visit would open with parts missing.
  useEffect(
    () => () => {
      scene.traverse((node) => {
        node.visible = true
      })
    },
    [scene],
  )

  // Mounted once at a time, so the cached scene is used directly — cloning
  // ~1,900 meshes would double both the work and the memory.
  return <primitive object={scene} />
}

/**
 * Image-based lighting built in memory from three's procedural studio room.
 * Most of the model's materials are metallic, and a metal only shows what it
 * reflects — with no environment it renders near-black no matter how many
 * lights are added. drei's `<Environment preset>` would fetch an HDRI from a
 * CDN, which this air-gapped floor cannot reach.
 */
function StudioEnvironment() {
  const gl = useThree((state) => state.gl)
  const scene = useThree((state) => state.scene)
  const invalidate = useThree((state) => state.invalidate)

  useEffect(() => {
    const pmrem = new PMREMGenerator(gl)
    const room = new RoomEnvironment()
    const envMap = pmrem.fromScene(room, 0.04).texture
    scene.environment = envMap
    // Full strength washes the light-grey steel out; none leaves metal black.
    scene.environmentIntensity = 0.5
    invalidate()
    return () => {
      scene.environment = null
      envMap.dispose()
      room.dispose()
      pmrem.dispose()
    }
  }, [gl, scene, invalidate])

  return null
}

/** Raw glTF node name of the product hopper in Machine.glb. */
const HOPPER_NODE = 'Machine Part | Machine_pSphere2'
/**
 * Product level inside the hopper, as a fraction of its height: it drains
 * slowly as the machine consumes product, then a refill tops it back up.
 */
const FLUID_HIGH = 0.8
const FLUID_LOW = 0.4
const DRAIN_MS = 60_000
const REFILL_MS = 20_000
/** Height slices used to measure how wide the hopper is at each level. */
const PROFILE_SLICES = 48

/** Fill fraction at `ms` into the drain/refill loop. */
function hopperLevel(ms: number) {
  const t = ms % (DRAIN_MS + REFILL_MS)
  if (t < DRAIN_MS) return FLUID_HIGH - (FLUID_HIGH - FLUID_LOW) * (t / DRAIN_MS)
  const k = (t - DRAIN_MS) / REFILL_MS
  const eased = k * k * (3 - 2 * k) // a pour starts and settles gently
  return FLUID_LOW + (FLUID_HIGH - FLUID_LOW) * eased
}
const FLUID_COLOR = '#3F7FC4'

/**
 * The hopper's opacity setting and the shampoo inside it.
 *
 * The fluid is the hopper's own shape
 * shrunk slightly and cut off at the fill level by a clipping plane, with a
 * flat disc for the surface — so it follows the rounded bottom exactly. It is
 * opaque, glossy and faintly pearlescent like a thick shampoo; real
 * transmission would re-render all ~1,900 meshes a second time per frame.
 */
function HopperEffects({ url, opacity }: { url: string; opacity: number }) {
  const { scene } = useGLTF(url)
  const gl = useThree((state) => state.gl)
  const invalidate = useThree((state) => state.invalidate)

  const hopper = useMemo(() => {
    let found: Object3D | undefined
    scene.traverse((node) => {
      if (node.userData.name === HOPPER_NODE) found = node
    })
    return found
  }, [scene])

  const parts = useMemo(() => (hopper ? [hopper] : []), [hopper])
  usePartsOpacity(parts, opacity)

  const fluid = useRef<{
    plane: Plane
    surface: Mesh
    box: Box3
    /** Inner radius of the hopper per height slice, in world units. */
    profile: number[]
    rootInverse: Matrix4
  } | null>(null)

  // Fluid, built once per mount and torn down after.
  useEffect(() => {
    if (!hopper) return
    scene.updateMatrixWorld(true)

    const meshes: Mesh[] = []
    hopper.traverse((node) => {
      if (node instanceof Mesh) meshes.push(node)
    })
    const box = new Box3().setFromObject(hopper)
    const size = box.getSize(new Vector3())
    const level = box.min.y + size.y * FLUID_HIGH
    gl.localClippingEnabled = true

    const fluidMaterial = new MeshPhysicalMaterial({
      color: FLUID_COLOR,
      roughness: 0.12,
      metalness: 0,
      clearcoat: 1,
      clearcoatRoughness: 0.05,
      sheen: 0.6,
      sheenColor: '#bcd8f5',
      iridescence: 0.25,
      side: DoubleSide,
    })
    const bodyMaterial = fluidMaterial.clone()
    const plane = new Plane(new Vector3(0, -1, 0), level)
    bodyMaterial.clippingPlanes = [plane]

    const rootInverse = new Matrix4().copy(scene.matrixWorld).invert()
    const worldCenter = box.getCenter(new Vector3())
    const shrink = new Matrix4()
      .makeTranslation(worldCenter.x, worldCenter.y, worldCenter.z)
      .multiply(new Matrix4().makeScale(0.95, 0.97, 0.95))
      .multiply(new Matrix4().makeTranslation(-worldCenter.x, -worldCenter.y, -worldCenter.z))

    const added: Mesh[] = []
    const noPick = () => {}
    for (const mesh of meshes) {
      const body = new Mesh(mesh.geometry, bodyMaterial)
      body.matrixAutoUpdate = false
      body.matrix.copy(rootInverse).multiply(shrink).multiply(mesh.matrixWorld)
      body.raycast = noPick
      added.push(body)
    }

    // The hopper is rounded, so the surface disc is sized per level from the
    // widest vertex in each height slice (shrunk like the fluid body).
    const profile = new Array<number>(PROFILE_SLICES).fill(0)
    const v = new Vector3()
    for (const mesh of meshes) {
      const position = mesh.geometry.getAttribute('position')
      if (!position) continue
      for (let i = 0; i < position.count; i++) {
        v.fromBufferAttribute(position, i).applyMatrix4(mesh.matrixWorld)
        const slice = Math.min(PROFILE_SLICES - 1, Math.floor(((v.y - box.min.y) / size.y) * PROFILE_SLICES))
        const r = Math.hypot(v.x - worldCenter.x, v.z - worldCenter.z) * 0.95
        if (r > profile[slice]!) profile[slice] = r
      }
    }
    // Slices with no vertices borrow the nearest measured one below.
    for (let i = 1; i < PROFILE_SLICES; i++) if (!profile[i]) profile[i] = profile[i - 1]!

    const surfaceGeometry = new CircleGeometry(1, 64)
    const surface = new Mesh(surfaceGeometry, fluidMaterial)
    surface.rotation.x = -Math.PI / 2
    surface.raycast = noPick
    added.push(surface)

    for (const mesh of added) scene.add(mesh)
    fluid.current = { plane, surface, box, profile, rootInverse }
    invalidate()

    return () => {
      fluid.current = null
      for (const mesh of added) scene.remove(mesh)
      surfaceGeometry.dispose()
      fluidMaterial.dispose()
      bodyMaterial.dispose()
      invalidate()
    }
  }, [hopper, scene, gl, invalidate])

  const surfaceAt = useMemo(() => new Vector3(), [])
  useFrame(() => {
    const f = fluid.current
    if (!f) return
    const { box, profile } = f
    const fraction = hopperLevel(performance.now())
    const y = box.min.y + (box.max.y - box.min.y) * fraction

    f.plane.constant = y
    // Interpolate between slices so the disc edge glides with the level.
    const slice = Math.min(PROFILE_SLICES - 1.001, fraction * PROFILE_SLICES - 0.5)
    const lo = Math.max(0, Math.floor(slice))
    const hi = Math.min(PROFILE_SLICES - 1, lo + 1)
    const k = Math.max(0, slice - lo)
    const radius = (profile[lo]! * (1 - k) + profile[hi]! * k) * 0.98
    f.surface.scale.setScalar(radius)
    surfaceAt.set((box.min.x + box.max.x) / 2, y, (box.min.z + box.max.z) / 2).applyMatrix4(f.rootInverse)
    f.surface.position.copy(surfaceAt)
    // `frameloop="demand"`: the level moves every frame, so keep drawing.
    invalidate()
  })

  return null
}

/**
 * Fades a set of parts: 1 leaves them untouched, 0 hides them, anything in
 * between swaps in transparent material copies (one per original material,
 * since the model's parts share materials) and puts the originals back after.
 */
function usePartsOpacity(parts: Object3D[], opacity: number) {
  const invalidate = useThree((state) => state.invalidate)

  useEffect(() => {
    if (opacity >= 1) return
    const originals = new Map<Mesh, Material | Material[]>()
    const copies = new Map<Material, Material>()
    const faded = (material: Material) => {
      let copy = copies.get(material)
      if (!copy) {
        copy = material.clone()
        copy.transparent = true
        copy.opacity = opacity
        // Writing depth would hide what is behind the faded part.
        copy.depthWrite = false
        copies.set(material, copy)
      }
      return copy
    }
    for (const part of parts) {
      part.visible = opacity > 0
      part.traverse((node) => {
        if (!(node instanceof Mesh)) return
        originals.set(node, node.material)
        node.material = Array.isArray(node.material) ? node.material.map(faded) : faded(node.material)
      })
    }
    invalidate()
    return () => {
      originals.forEach((material, mesh) => {
        mesh.material = material
      })
      copies.forEach((copy) => copy.dispose())
      for (const part of parts) part.visible = true
      invalidate()
    }
  }, [parts, opacity, invalidate])
}

/** Raw glTF node name of the laminate roll in Machine.glb. */
const ROLL_NODE = 'Machine Part | Machine_R'

const findNode = (root: Object3D, name: string) => {
  let found: Object3D | undefined
  root.traverse((node) => {
    if (node.userData.name === name) found = node
  })
  return found
}

/** Sachet rows around the roll. The export's density is ~10.3 texture repeats
 * per unit of arc on a unit-radius roll (64.7 around); a whole number keeps
 * the wrap seamless. */
const ROLL_PRINT_REPEATS = 65
/** The roll's printed laminate material. The roll's core and end caps use a
 * palette texture too, so "has a map" is not enough to find the print. */
const ROLL_PRINT_MATERIAL = 'M_ST1'

const isPrintMesh = (node: Object3D): node is Mesh =>
  node instanceof Mesh &&
  !Array.isArray(node.material) &&
  node.material.name === ROLL_PRINT_MATERIAL &&
  Boolean(node.material.map)

/**
 * Rewraps the printed laminate texture evenly around the roll.
 *
 * The export projected the print flat from one side: V climbs across one half
 * of the roll and falls back across the other. That squashes the sachets near
 * the silhouette and mirrors the whole back half — invisible while the roll
 * stood still, obvious once it spins. U (across the roll's width) is fine and
 * kept; V is rebuilt from the angle around the roll's X axis.
 *
 * The geometry is made non-indexed first so a triangle straddling the ±180°
 * seam can take V past the wrap instead of smearing the whole texture across
 * itself. Done once per loaded model; `flip` only rewrites V.
 */
function rewrapRollPrint(roll: Object3D, flip: boolean) {
  roll.traverse((node) => {
    if (!isPrintMesh(node)) return

    if (!node.userData.printAngles) {
      const geometry = node.geometry.index ? node.geometry.toNonIndexed() : node.geometry
      const pos = geometry.getAttribute('position')
      const uv = geometry.getAttribute('uv')
      const angles = new Float32Array(pos.count)
      const across = new Float32Array(pos.count)
      for (let i = 0; i < pos.count; i++) angles[i] = Math.atan2(pos.getZ(i), pos.getY(i))
      for (let i = 0; i < pos.count; i += 3) {
        const a = angles.subarray(i, i + 3)
        if (Math.max(a[0]!, a[1]!, a[2]!) - Math.min(a[0]!, a[1]!, a[2]!) > Math.PI) {
          for (let k = 0; k < 3; k++) if (a[k]! < 0) a[k]! += 2 * Math.PI
        }
        // The texture is one strip: U 0–0.5 is the plain back of the laminate,
        // U 0.5–1 the printed front. Wrapped this way round the front reads
        // mirrored, so mirror it back within its own half (decided per
        // triangle, so a triangle is never split across the two halves).
        const u = [uv.getX(i), uv.getX(i + 1), uv.getX(i + 2)]
        const front = (u[0]! + u[1]! + u[2]!) / 3 >= 0.5
        for (let k = 0; k < 3; k++) {
          across[i + k] = front ? Math.min(Math.max(1.5 - u[k]!, 0.5), 0.9999) : u[k]!
        }
      }
      if (geometry !== node.geometry) node.geometry = geometry
      node.userData.printAngles = angles
      node.userData.printAcross = across
    }

    const angles = node.userData.printAngles as Float32Array
    const across = node.userData.printAcross as Float32Array
    const next = new Float32Array(angles.length * 2)
    for (let i = 0; i < angles.length; i++) {
      next[i * 2] = across[i]!
      next[i * 2 + 1] = ((flip ? -1 : 1) * angles[i]! * ROLL_PRINT_REPEATS) / (2 * Math.PI)
    }
    node.geometry.setAttribute('uv', new BufferAttribute(next, 2))
  })
}

/** Raw glTF node name of the laminate film running from the roll into the machine. */
const SHEET_NODE = 'Machine Part | Machine_DSG'

/**
 * Prints the roll's laminate onto the film, laid out like the roll: the same
 * strip across the width (plain back half, printed half mirrored the same way)
 * and the same sachet pitch along the web.
 *
 * The film is not one clean strip — it has joins and doubled runs — so "along"
 * is measured as the shortest distance over the mesh from the edge nearest the
 * roll (Dijkstra on the vertex graph, ignoring the across-width axis). That is
 * the arc length for a plain strip and stays continuous at the joins.
 *
 * The film gets its own double-sided copy of the roll material with its own
 * texture copy, so scrolling its offset moves only the film. Returns the
 * texture to scroll, or null when a node is missing.
 */
function printSheet(sheet: Object3D, roll: Object3D, scene: Object3D, flipAlong: boolean) {
  const meshes: Mesh[] = []
  sheet.traverse((node) => {
    if (node instanceof Mesh) meshes.push(node)
  })
  let rollMaterial: MeshStandardMaterial | undefined
  roll.traverse((node) => {
    if (isPrintMesh(node)) rollMaterial = node.material as MeshStandardMaterial
  })
  if (!rollMaterial?.map || meshes.length === 0) return null

  scene.updateMatrixWorld(true)
  const rollBox = new Box3().setFromObject(roll)
  const rollCentre = rollBox.getCenter(new Vector3())
  // Rotation about X leaves the Y extent at the diameter.
  const rollRadius = rollBox.getSize(new Vector3()).y / 2
  const repeatsPerMetre = ROLL_PRINT_REPEATS / (2 * Math.PI * rollRadius)

  for (const mesh of meshes) {
    if (!mesh.userData.sheetAlong) {
      const indexed = mesh.geometry
      const pos = indexed.getAttribute('position')
      const world = Array.from({ length: pos.count }, (_, i) =>
        new Vector3().fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld),
      )

      // Weld split vertices (normal seams) so the graph is connected.
      const ids = new Map<string, number>()
      const vertexId = world.map((v) => {
        const key = `${v.x.toFixed(4)},${v.y.toFixed(4)},${v.z.toFixed(4)}`
        if (!ids.has(key)) ids.set(key, ids.size)
        return ids.get(key)!
      })
      const nodes = ids.size
      const point = new Array<Vector3>(nodes)
      world.forEach((v, i) => (point[vertexId[i]!] = v))
      const edges = Array.from({ length: nodes }, () => new Map<number, number>())
      const index = indexed.index
      const triCount = index ? index.count / 3 : pos.count / 3
      const corner = (t: number, k: number) => vertexId[index ? index.getX(t * 3 + k) : t * 3 + k]!
      const along = (a: Vector3, b: Vector3) => Math.hypot(a.y - b.y, a.z - b.z)
      for (let t = 0; t < triCount; t++) {
        for (let k = 0; k < 3; k++) {
          const a = corner(t, k)
          const b = corner(t, (k + 1) % 3)
          const w = along(point[a]!, point[b]!)
          edges[a]!.set(b, w)
          edges[b]!.set(a, w)
        }
      }

      // Seed every vertex with its straight distance from the roll's contact
      // line scaled up, then relax along edges: the nearest edge wins, and a
      // piece not joined to the rest still starts from where it sits.
      const toRoll = point.map((v) => Math.hypot(v.y - rollCentre.y, v.z - rollCentre.z) - rollRadius)
      const start = Math.min(...toRoll)
      const dist = toRoll.map((d) => (d - start) * 4)
      const origin = toRoll.indexOf(start)
      dist[origin] = 0
      // Small graph (a few hundred vertices): simple label-correcting queue.
      const queue = [...dist.keys()].sort((a, b) => dist[a]! - dist[b]!)
      const queued = new Set(queue)
      while (queue.length) {
        const a = queue.shift()!
        queued.delete(a)
        edges[a]!.forEach((w, b) => {
          if (dist[a]! + w < dist[b]! - 1e-9) {
            dist[b] = dist[a]! + w
            if (!queued.has(b)) {
              queued.add(b)
              queue.push(b)
            }
          }
        })
      }

      // Across the width: same strip position as the roll at the same X.
      const xs = world.map((v) => v.x)
      const xMin = Math.min(...xs)
      const xSpan = Math.max(...xs) - xMin || 1
      const perVertexV = vertexId.map((id) => dist[id]! * repeatsPerMetre)
      const perVertexU = xs.map((x) => (x - xMin) / xSpan)

      const geometry = indexed.index ? indexed.toNonIndexed() : indexed
      const source = indexed.index
      const u = new Float32Array(geometry.getAttribute('position').count)
      const v = new Float32Array(u.length)
      for (let i = 0; i < u.length; i++) {
        const from = source ? source.getX(i) : i
        u[i] = perVertexU[from]!
        v[i] = perVertexV[from]!
      }
      // Mirror the printed half back within its own half, as on the roll.
      for (let i = 0; i < u.length; i += 3) {
        if ((u[i]! + u[i + 1]! + u[i + 2]!) / 3 < 0.5) continue
        for (let k = 0; k < 3; k++) u[i + k] = Math.min(Math.max(1.5 - u[i + k]!, 0.5), 0.9999)
      }
      if (geometry !== mesh.geometry) mesh.geometry = geometry
      mesh.userData.sheetAlong = v
      mesh.userData.sheetAcross = u
    }

    const u = mesh.userData.sheetAcross as Float32Array
    const v = mesh.userData.sheetAlong as Float32Array
    const uv = new Float32Array(u.length * 2)
    for (let i = 0; i < u.length; i++) {
      uv[i * 2] = u[i]!
      uv[i * 2 + 1] = flipAlong ? -v[i]! : v[i]!
    }
    mesh.geometry.setAttribute('uv', new BufferAttribute(uv, 2))
  }

  const map = rollMaterial.map.clone()
  const material = rollMaterial.clone()
  material.map = map
  material.side = DoubleSide
  for (const mesh of meshes) mesh.material = material
  return { map, material }
}

/**
 * Spins the laminate roll about its own centre. The roll's origin is not its
 * centre, so each frame rotates the saved rest pose about the bounding-box
 * centre instead of just turning `rotation`. "Auto" axis is the box dimension
 * unlike the other two — a roll is as tall as it is deep, and a different width.
 *
 * While spinning it asks for a frame every frame; paused, it is back to
 * rendering on demand.
 */
function RollEffects({ url, spin }: { url: string; spin: RollSpin }) {
  const { scene } = useGLTF(url)
  const invalidate = useThree((state) => state.invalidate)
  const roll = useMemo(() => findNode(scene, ROLL_NODE), [scene])

  const rest = useMemo(() => {
    if (!roll?.parent) return null
    scene.updateMatrixWorld(true)
    const box = new Box3().setFromObject(roll)
    const size = box.getSize(new Vector3()).toArray()
    const toParent = new Matrix4().copy(roll.parent.matrixWorld).invert()
    const centre = box.getCenter(new Vector3()).applyMatrix4(toParent)
    const total = size.reduce((a, b) => a + b, 0)
    const oddness = size.map((v) => Math.abs(v - (total - v) / 2))
    const odd = oddness.indexOf(Math.max(...oddness))
    return {
      position: roll.position.clone(),
      quaternion: roll.quaternion.clone(),
      centre,
      toParent,
      autoAxis: odd,
    }
  }, [roll, scene])

  useEffect(() => {
    if (!roll) return
    rewrapRollPrint(roll, spin.flipPrint)
    invalidate()
  }, [roll, spin.flipPrint, invalidate])

  // The film unwinding from the roll. Its material is ours, so hand the
  // original back on unmount.
  const sheet = useMemo(() => findNode(scene, SHEET_NODE), [scene])
  const sheetMap = useRef<Texture | null>(null)
  useEffect(() => {
    if (!roll || !sheet) return
    const originals = new Map<Mesh, Material | Material[]>()
    sheet.traverse((node) => {
      if (node instanceof Mesh) originals.set(node, node.material)
    })
    const printed = printSheet(sheet, roll, scene, spin.sheetFlipAlong)
    sheetMap.current = printed?.map ?? null
    invalidate()
    return () => {
      originals.forEach((material, mesh) => {
        mesh.material = material
      })
      printed?.map.dispose()
      printed?.material.dispose()
      sheetMap.current = null
    }
  }, [roll, sheet, scene, spin.sheetFlipAlong, invalidate])

  const angle = useRef(0)
  const playing = useRef(spin.playing)
  playing.current = spin.playing

  const axis = useMemo(() => {
    if (!rest) return new Vector3(1, 0, 0)
    const index = spin.axis === 'auto' ? rest.autoAxis : { x: 0, y: 1, z: 2 }[spin.axis]
    const world = new Vector3().setComponent(index, 1)
    return world.transformDirection(rest.toParent)
  }, [rest, spin.axis])

  const apply = () => {
    if (!roll || !rest) return
    const turn = new Quaternion().setFromAxisAngle(axis, angle.current)
    roll.quaternion.copy(turn).multiply(rest.quaternion)
    roll.position.copy(rest.position).sub(rest.centre).applyQuaternion(turn).add(rest.centre)
  }

  // Put the roll back to its rest pose when the viewer goes away.
  useEffect(
    () => () => {
      if (!roll || !rest) return
      roll.position.copy(rest.position)
      roll.quaternion.copy(rest.quaternion)
    },
    [roll, rest],
  )

  // Scrubbing the angle slider (only enabled while paused).
  useEffect(() => {
    if (playing.current) return
    angle.current = (spin.angle * Math.PI) / 180
    apply()
    invalidate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spin.angle])

  useEffect(() => {
    angle.current = 0
    apply()
    invalidate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spin.resetKey, axis])

  // Kick the demand loop when spinning starts.
  useEffect(() => {
    if (spin.playing) invalidate()
  }, [spin.playing, spin.rpm, invalidate])

  useFrame((_, delta) => {
    if (!spin.playing || spin.rpm === 0) return
    // Clamp: the first frame after an idle spell reports the whole idle time.
    const dt = Math.min(delta, 0.1)
    const direction = spin.reverse ? -1 : 1
    angle.current += direction * ((spin.rpm * 2 * Math.PI) / 60) * dt
    apply()
    // The film leaves the roll at the roll's surface speed: one revolution
    // feeds ROLL_PRINT_REPEATS sachet pitches, so scroll by that many repeats.
    if (sheetMap.current) {
      const feed = (spin.rpm / 60) * ROLL_PRINT_REPEATS * dt
      sheetMap.current.offset.y -= direction * (spin.sheetReverseFeed ? -1 : 1) * feed
    }
    invalidate()
  })

  return null
}

/**
 * Front and rear vertical sealers: an opacity setting for each side, and the
 * sealing stroke — both sides close on the film together from opposite sides.
 */
function SealerEffects({
  url,
  view,
  cycle,
}: {
  url: string
  view: SealerView
  cycle: React.MutableRefObject<SealCycle>
}) {
  const { scene } = useGLTF(url)
  const invalidate = useThree((state) => state.invalidate)

  // Each side's sealers plus the bar they are mounted on.
  const { front, rear, frontHorizontal, rearHorizontal } = useMemo(() => {
    const byName = new Map<string, Object3D>()
    scene.traverse((node) => {
      if (node.userData.name) byName.set(node.userData.name as string, node)
    })
    const resolve = (parts: string[]) =>
      parts.flatMap((part) => byName.get(`Machine Part | Machine_${part}`) ?? [])
    return {
      front: [...SEALER_PARTS.flatMap(resolve), ...resolve(SEALER_BAR_PARTS)],
      rear: [...REAR_SEALER_PARTS.flatMap(resolve), ...resolve(REAR_SEALER_BAR_PARTS)],
      frontHorizontal: resolve(FRONT_HORIZONTAL_SEALER_PARTS),
      rearHorizontal: resolve(REAR_HORIZONTAL_SEALER_PARTS),
    }
  }, [scene])

  usePartsOpacity(front, view.opacity)
  usePartsOpacity(rear, view.rearOpacity)

  // Sealing stroke: every sealer closes on the same cycle, front parts moving
  // one way and rear parts the other, each by its own jaw gap. Rest positions
  // are saved once per set of parts — never on a settings change, when the
  // parts are mid-stroke — and restored on unmount.
  const { motion, frontVerticalRange: range } = view
  const rest = useMemo(() => {
    type Group = 'front' | 'rear' | 'frontHorizontal' | 'rearHorizontal'
    const entries = new Map<Object3D, { position: Vector3; group: Group }>()
    const add = (parts: Object3D[], group: Group) => {
      for (const part of parts) entries.set(part, { position: part.position.clone(), group })
    }
    add(front, 'front')
    add(rear, 'rear')
    add(frontHorizontal, 'frontHorizontal')
    add(rearHorizontal, 'rearHorizontal')
    return entries
  }, [front, rear, frontHorizontal, rearHorizontal])
  useEffect(
    () => () => {
      rest.forEach(({ position }, part) => part.position.copy(position))
    },
    [rest],
  )

  const place = () => {
    // The model is posed open: front and rear jaw faces stand 30.8 mm apart
    // with the film between them. Closing moves each side in by the stroke
    // until the faces meet on the film, then back out to the model's pose.
    // The front vertical sealer runs between its own start and end offsets
    // (debug controls); the others travel from rest by their fixed stroke.
    const closed = sealerStroke(cycle.current.phase, motion.hold)
    const offsetMm = {
      front: range.startMm + (range.endMm - range.startMm) * closed,
      rear: -closed * motion.strokeMm,
      frontHorizontal: closed * motion.horizontalStrokeMm,
      rearHorizontal: -closed * motion.horizontalStrokeMm,
    }
    const sign = motion.reverse ? -1 : 1
    rest.forEach(({ position, group }, part) => {
      part.position.copy(position)
      part.position[motion.axis] += (sign * offsetMm[group]) / 1000
    })
  }

  // Re-place on any setting change, so a paused bar follows stroke/axis edits.
  useEffect(() => {
    place()
    invalidate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [motion, range.startMm, range.endMm, rest, invalidate])

  useFrame((_, delta) => {
    if (!motion.playing || motion.cpm === 0) return
    const c = cycle.current
    c.phase += (motion.cpm / 60) * Math.min(delta, 0.1)
    if (c.phase >= 1) {
      c.phase -= 1
      c.count += 1
    }
    place()
    invalidate()
  })

  return null
}

/**
 * Sealer position through one cycle, 0 = open (the model's pose) and 1 =
 * closed on the film: close, hold, open, then wait open for the same time as the hold. The
 * moves ease in and out like a cam rather than snapping.
 */
function sealerStroke(phase: number, hold: number) {
  const move = (1 - 2 * hold) / 2
  const ease = (t: number) => (1 - Math.cos(Math.PI * t)) / 2
  if (phase < move) return ease(phase / move)
  if (phase < move + hold) return 1
  if (phase < 2 * move + hold) return 1 - ease((phase - move - hold) / move)
  return 0
}

/** Film drive rollers, one per lane, left to right. */
const ROLLER_NODES = ROLLER_PARTS.map((name) => `Machine Part | Machine_${name}`)
/** Flip to -1 if the rollers turn against the film. */
const ROLLER_DIRECTION = 1

/** Film between the sealers; its print is one texture repeat per sachet. */
const SEALING_FILM_NODE = 'Machine Part | Machine_SS6'
/**
 * One sachet along the film, in metres: SS6's texture repeats 11.19 times
 * per metre of height (measured from the GLB), one repeat per sachet.
 */
const SACHET_PITCH_M = 1 / 11.194
/** Flip to -1 if the film's print steps up instead of down. */
const FILM_DIRECTION = 1

/**
 * Where the intermittent seal cycle is. The sealer effect advances it; the
 * film and rollers read it, so everything steps together.
 */
interface SealCycle {
  /** 0–1 through the current cycle. */
  phase: number
  /** Whole cycles completed. */
  count: number
}

/**
 * How many sachets the film has advanced: it moves one sachet per cycle, only
 * in the open wait after the jaws have pulled back, easing in and out, and is
 * still while the jaws close, hold and open.
 */
function filmFeed(cycle: SealCycle, hold: number) {
  const move = (1 - 2 * hold) / 2
  const start = 2 * move + hold
  if (hold === 0 || cycle.phase < start) return cycle.count
  const t = (cycle.phase - start) / hold
  return cycle.count + (1 - Math.cos(Math.PI * t)) / 2
}

/**
 * Steps the film between the sealers down one sachet per cycle, while the
 * jaws are open. SS6 gets its own material and texture copy so only its print
 * scrolls; the original goes back on unmount.
 */
function SealingFilmEffects({
  url,
  cycle,
  hold,
}: {
  url: string
  cycle: React.MutableRefObject<SealCycle>
  hold: number
}) {
  const { scene } = useGLTF(url)
  const film = useMemo(() => findNode(scene, SEALING_FILM_NODE), [scene])
  const map = useRef<Texture | null>(null)

  useEffect(() => {
    if (!(film instanceof Mesh) || Array.isArray(film.material)) return
    const original = film.material as MeshStandardMaterial
    if (!original.map) return
    const material = original.clone()
    material.map = original.map.clone()
    film.material = material
    map.current = material.map
    return () => {
      film.material = original
      material.map?.dispose()
      material.dispose()
      map.current = null
    }
  }, [film])

  // The flat strip feeding SS6 from above: same print, stepping with it.
  const feedMap = useRef<Texture | null>(null)
  useEffect(() => {
    if (!(film instanceof Mesh)) return
    const feed = findNode(scene, FEED_FILM_NODE)
    const printed = feed && printFeedFilm(feed, film, scene)
    if (!printed) return
    feedMap.current = printed.map
    return () => {
      printed.restore()
      feedMap.current = null
    }
  }, [film, scene])

  useFrame(() => {
    const offset = FILM_DIRECTION * filmFeed(cycle.current, hold)
    if (map.current) map.current.offset.y = offset
    if (feedMap.current) feedMap.current.offset.y = offset
  })

  return null
}

/** The flat film strip running across the top into SS6. */
const FEED_FILM_NODE = 'Machine Part | Machine_polySurface374'
/** Flip if the feed strip's print reads mirrored from above. */
const FEED_FILM_MIRROR = false

/**
 * Gives the feed strip SS6's printed sachet material, with UVs laid out as if
 * SS6 carried on up over the bend and back along the strip: across the width
 * by Z at SS6's scale, along the web at one repeat per sachet, starting from
 * SS6's top edge. The export gave it the roll's material, which showed the
 * plain back of the laminate and never moved.
 */
function printFeedFilm(feed: Object3D, ss6: Mesh, scene: Object3D) {
  if (Array.isArray(ss6.material) || !(ss6.material as MeshStandardMaterial).map) return null
  let strip: Mesh | undefined
  feed.traverse((node) => {
    if (node instanceof Mesh && !Array.isArray(node.material) && node.material.name === ROLL_PRINT_MATERIAL) {
      strip = node
    }
  })
  if (!strip) return null

  scene.updateMatrixWorld(true)
  const ss6Box = new Box3().setFromObject(ss6)
  const ss6Uv = ss6.geometry.getAttribute('uv')
  let ss6TopV = -Infinity
  for (let i = 0; i < ss6Uv.count; i++) ss6TopV = Math.max(ss6TopV, ss6Uv.getY(i))
  const perMetre = 1 / SACHET_PITCH_M

  const pos = strip.geometry.getAttribute('position')
  const world = Array.from({ length: pos.count }, (_, i) =>
    new Vector3().fromBufferAttribute(pos, i).applyMatrix4(strip!.matrixWorld),
  )
  const box = new Box3().setFromPoints(world)
  // Gap over the bend, from the strip's SS6 end down to SS6's top edge.
  const bend = Math.hypot(ss6Box.min.x - box.max.x, box.max.y - ss6Box.max.y)
  const centreZ = (box.min.z + box.max.z) / 2
  // SS6's front print spans U 0.5–1 over its width in Z, decreasing with Z.
  const uPerMetre = 0.5 / (ss6Box.max.z - ss6Box.min.z)

  const uv = new Float32Array(pos.count * 2)
  world.forEach((p, i) => {
    const back = bend + (box.max.x - p.x) + (box.max.y - p.y)
    const u = 0.75 - (p.z - centreZ) * uPerMetre * (FEED_FILM_MIRROR ? -1 : 1)
    uv[i * 2] = Math.min(Math.max(u, 0.5), 0.9999)
    uv[i * 2 + 1] = ss6TopV + back * perMetre
  })

  const originalUv = strip.geometry.getAttribute('uv')
  const originalMaterial = strip.material
  const source = ss6.material as MeshStandardMaterial
  const material = source.clone()
  material.map = source.map!.clone()
  material.side = DoubleSide
  strip.geometry.setAttribute('uv', new BufferAttribute(uv, 2))
  strip.material = material

  const target = strip
  return {
    map: material.map,
    restore: () => {
      target.geometry.setAttribute('uv', originalUv)
      target.material = originalMaterial
      material.map?.dispose()
      material.dispose()
    },
  }
}

/**
 * Turns the film rollers about their own centres (their axis runs along the
 * sealer row, Z), only while the film advances: each step turns them through
 * one sachet of film over their radius, then they stop with the film.
 */
function RollerEffects({
  url,
  cycle,
  hold,
}: {
  url: string
  cycle: React.MutableRefObject<SealCycle>
  hold: number
}) {
  const { scene } = useGLTF(url)

  const rollers = useMemo(() => {
    scene.updateMatrixWorld(true)
    return ROLLER_NODES.flatMap((name) => {
      const node = findNode(scene, name)
      if (!node?.parent) return []
      const box = new Box3().setFromObject(node)
      const toParent = new Matrix4().copy(node.parent.matrixWorld).invert()
      return [
        {
          node,
          position: node.position.clone(),
          quaternion: node.quaternion.clone(),
          centre: box.getCenter(new Vector3()).applyMatrix4(toParent),
          axis: new Vector3(0, 0, 1).transformDirection(toParent),
          /** Radians per sachet of film. */
          perSachet: SACHET_PITCH_M / (box.getSize(new Vector3()).y / 2),
        },
      ]
    })
  }, [scene])

  useEffect(
    () => () => {
      for (const r of rollers) {
        r.node.position.copy(r.position)
        r.node.quaternion.copy(r.quaternion)
      }
    },
    [rollers],
  )

  const turn = useMemo(() => new Quaternion(), [])
  useFrame(() => {
    const sachets = filmFeed(cycle.current, hold) * ROLLER_DIRECTION
    for (const r of rollers) {
      turn.setFromAxisAngle(r.axis, sachets * r.perSachet)
      r.node.quaternion.copy(turn).multiply(r.quaternion)
      r.node.position.copy(r.position).sub(r.centre).applyQuaternion(turn).add(r.centre)
    }
  })

  return null
}

/** Output conveyor the finished sachet mat is folded onto. */
const CONVEYOR_NODE = 'Machine Part | Machine_AD1'
/** Sachet rows per mat level, and levels per mat. */
const ROWS_PER_LEVEL = 4
const MAT_LEVELS = 4
/** Most copies of a mat piece a level can hold, per direction (debug limit). */
const MAX_TILES = 8

/**
 * Folds the sealed film onto the conveyor as a 4-level mat.
 *
 * Each seal cycle one sachet row drops at the film line. The mat shuttles
 * along the belt under that point so the rows lay back and forth: level 1
 * one way, level 2 on top the other way, and so on — the drop point always
 * sits on the edge being laid. The conveyor model itself stays still. After 16 rows the mat slides along the belt and
 * is cut off at its end, and a new mat starts.
 *
 * Each piece in the mat GLB is a 4 × 4 block of sachets. A level repeats a
 * piece across and along the belt (debug counts; 3 × 1 gives 12 columns ×
 * 4 rows) as one instanced mesh, cycling through the three pieces level by
 * level. The level is fitted to the mat's
 * size and revealed row by row with a clipping plane, so nothing is rebuilt
 * per frame.
 */
function MatStackEffects({
  url,
  cycle,
  hold,
  debug,
}: {
  url: string
  cycle: React.MutableRefObject<SealCycle>
  hold: number
  /** Placement, size and orientation; see `MAT_DEBUG`. */
  debug: MatDebug
}) {
  const { scene } = useGLTF(url)
  const { scene: matScene } = useGLTF(matModelUrl)
  const gl = useThree((state) => state.gl)

  const conveyor = useMemo(() => findNode(scene, CONVEYOR_NODE), [scene])
  const film = useMemo(() => findNode(scene, SEALING_FILM_NODE), [scene])

  const stack = useMemo(() => {
    if (!conveyor || !film) return null
    scene.updateMatrixWorld(true)
    const belt = new Box3().setFromObject(conveyor)
    const filmBox = new Box3().setFromObject(film)

    const pieces: Mesh[] = []
    matScene.traverse((node) => {
      if (node instanceof Mesh) pieces.push(node)
    })
    pieces.sort((a, b) => (a.userData.name ?? a.name).localeCompare(b.userData.name ?? b.name))
    if (pieces.length === 0) return null

    const toRoot = new Matrix4().copy(scene.matrixWorld).invert()
    const levels = Array.from({ length: MAT_LEVELS }, (_, level) => {
      const piece = pieces[level % pieces.length]!
      const geometry = piece.geometry
      geometry.computeBoundingBox()
      const size = geometry.boundingBox!.getSize(new Vector3())
      const centre = geometry.boundingBox!.getCenter(new Vector3())
      const material = (piece.material as Material).clone()
      // Flips mirror the geometry, which turns its faces around.
      material.side = DoubleSide
      const lay = new Plane()
      const end = new Plane(new Vector3(1, 0, 0), -belt.min.x)
      material.clippingPlanes = [lay, end]
      // Room for the largest tile grid; the frame loop lays out the count used.
      const mesh = new InstancedMesh(geometry, material, MAX_TILES * MAX_TILES)
      mesh.frustumCulled = false
      mesh.matrixAutoUpdate = false
      mesh.raycast = () => {}
      mesh.visible = false
      return { mesh, material, lay, size, centre, fit: new Matrix4(), tiles: '' }
    })

    return {
      levels,
      toRoot,
      // The mat is centred under the film line when the conveyor is at rest.
      centreX: (filmBox.min.x + filmBox.max.x) / 2,
      centreZ: (filmBox.min.z + filmBox.max.z) / 2,
      beltTop: belt.max.y,
      beltEnd: belt.min.x,
    }
  }, [conveyor, film, matScene, scene])

  useEffect(() => {
    if (!stack || !conveyor) return
    gl.localClippingEnabled = true
    for (const level of stack.levels) scene.add(level.mesh)
    return () => {
      for (const level of stack.levels) {
        scene.remove(level.mesh)
        level.material.dispose()
      }
    }
  }, [stack, conveyor, scene, gl])

  // Read every frame, so the debug controls apply without rebuilding the mat.
  const settings = useRef(debug)
  settings.current = debug
  const invalidate = useThree((state) => state.invalidate)
  useEffect(() => invalidate(), [debug, invalidate])

  const at = useMemo(() => new Matrix4(), [])
  const turn = useMemo(() => new Matrix4(), [])
  const scale = useMemo(() => new Matrix4(), [])
  const shift = useMemo(() => new Matrix4(), [])
  const tile = useMemo(() => new Matrix4(), [])
  useFrame(() => {
    if (!stack || !conveyor) return
    const d = settings.current
    const { levels } = stack
    const len = d.levelLengthMm / 1000
    const thick = d.thicknessMm / 1000
    const width = d.widthMm / 1000
    const matRows = ROWS_PER_LEVEL * MAT_LEVELS
    // Which mat this is, and where in it: rows follow the stepped film feed,
    // but the finished mat slides off on the continuous clock — one smooth
    // move, not run-stop with the film.
    const period = matRows + d.slideCycles
    const matStart = Math.floor(cycle.current.count / period) * period
    const rows = filmFeed(cycle.current, hold) - matStart
    const clock = cycle.current.count + cycle.current.phase - matStart
    const laying = Math.min(Math.max(rows, 0), matRows)

    // Level being laid and how far along it is.
    const current = Math.min(Math.floor(laying / ROWS_PER_LEVEL), MAT_LEVELS - 1)
    const f = Math.min(Math.max(laying / ROWS_PER_LEVEL - current, 0), 1)
    // Even levels lay from the far end back, odd levels forward; the mat
    // shifts so the edge being laid stays under the film.
    const backward = (current % 2 === 0) !== d.swapStart
    const conveyorOffset = backward ? f * len - len / 2 : len / 2 - f * len

    const homeX = stack.centreX + d.offsetXMm / 1000
    const slideTo = stack.beltEnd - len
    const slideT = Math.min(Math.max((clock - matRows) / d.slideCycles, 0), 1)
    const slide = (1 - Math.cos(Math.PI * slideT)) / 2
    const centreX = homeX + conveyorOffset + slide * (slideTo - homeX)
    const centreZ = stack.centreZ + d.offsetZMm / 1000
    const quarterTurns = d.rotation / 90

    const minX = centreX - len / 2
    levels.forEach((level, i) => {
      const done = Math.min(Math.max(laying / ROWS_PER_LEVEL - i, 0), 1)
      level.mesh.visible = done > 0
      if (!level.mesh.visible) return
      if ((i % 2 === 0) !== d.swapStart) {
        level.lay.set(new Vector3(1, 0, 0), -(minX + len * (1 - done)))
      } else {
        level.lay.set(new Vector3(-1, 0, 0), minX + len * done)
      }

      // Piece axes: X = columns (across the belt, world Z), Y = rows (along
      // the belt, world X), Z = thickness (world Y). Rotation turns the print
      // in its own plane first, so width/length still fit the belt after it.
      const { size, centre } = level
      // Lay the tile grid out again only when the counts change.
      const tilesAcross = Math.min(Math.max(Math.round(d.tilesAcross), 1), MAX_TILES)
      const tilesAlong = Math.min(Math.max(Math.round(d.tilesAlong), 1), MAX_TILES)
      if (level.tiles !== `${tilesAcross}x${tilesAlong}`) {
        level.tiles = `${tilesAcross}x${tilesAlong}`
        let n = 0
        for (let a = 0; a < tilesAcross; a++) {
          for (let b = 0; b < tilesAlong; b++) {
            tile.makeTranslation(
              (a - (tilesAcross - 1) / 2) * size.x,
              (b - (tilesAlong - 1) / 2) * size.y,
              0,
            )
            level.mesh.setMatrixAt(n++, tile)
          }
        }
        level.mesh.count = n
        level.mesh.instanceMatrix.needsUpdate = true
      }

      const sideways = quarterTurns % 2 === 1
      const levelX = size.x * tilesAcross
      const levelY = size.y * tilesAlong
      const across = sideways ? levelY : levelX
      const along = sideways ? levelX : levelY
      shift.makeTranslation(-centre.x, -centre.y, -centre.z)
      turn.makeRotationZ((quarterTurns * Math.PI) / 2)
      scale.makeScale(
        ((d.flipAcross ? -1 : 1) * width) / across,
        ((d.flipAlong ? -1 : 1) * len) / along,
        thick / size.z,
      )
      level.fit
        .makeBasis(new Vector3(0, 0, 1), new Vector3(1, 0, 0), new Vector3(0, 1, 0))
        .multiply(scale)
        .multiply(turn)
        .multiply(shift)
      const y = stack.beltTop + d.offsetYMm / 1000 + thick * (i + 0.5)
      at.makeTranslation(centreX, y, centreZ)
      level.mesh.matrix.copy(stack.toRoot).multiply(at).multiply(level.fit)
    })
  })

  return null
}


/**
 * How far in from a piston's back (+X) end its vertical arm reaches. Parts
 * starting inside this are the arm (pCube469, its spring and fittings); the
 * rest — rod, cylinder and the pCube468 joint — are the horizontal pipe.
 */
const PISTON_ARM_DEPTH = 0.1

/**
 * The 12 filler pistons, each in two parts driven like the real pump: the
 * vertical arm tilts front/back on a fixed hinge at its bottom, and its upper
 * end slides the horizontal pipe front/back in a straight line by the same
 * distance, so the two stay joined. Forward (dose) while the sealers are
 * closed, back (refill) while they are open; same cycle and easing as the jaws.
 */
function PistonEffects({
  url,
  cycle,
  hold,
  debug,
}: {
  url: string
  cycle: React.MutableRefObject<SealCycle>
  hold: number
  debug: PistonDebug
}) {
  const { scene } = useGLTF(url)

  // Per piston: arm and pipe parts with their rest poses, the arm's hinge and
  // how high above it the pipe is joined. Saved once, restored on unmount.
  const pistons = useMemo(() => {
    const byName = new Map<string, Object3D>()
    scene.traverse((node) => {
      if (node.userData.name) byName.set(node.userData.name as string, node)
    })
    scene.updateMatrixWorld(true)
    const toRoot = new Matrix4().copy(scene.matrixWorld).invert()
    return PISTON_PARTS.map((names) => {
      const parts = names.flatMap((name) => byName.get(`Machine Part | Machine_${name}`) ?? [])
      const all = new Box3()
      for (const part of parts) all.expandByObject(part)
      const arm: Object3D[] = []
      const pipe: Object3D[] = []
      for (const part of parts) {
        const box = new Box3().setFromObject(part)
        ;(box.min.x > all.max.x - PISTON_ARM_DEPTH ? arm : pipe).push(part)
      }
      const armBox = new Box3()
      for (const part of arm) armBox.expandByObject(part)
      const pipeBox = new Box3()
      for (const part of pipe) pipeBox.expandByObject(part)
      const hinge = new Vector3(
        (armBox.min.x + armBox.max.x) / 2,
        armBox.min.y,
        (armBox.min.z + armBox.max.z) / 2,
      ).applyMatrix4(toRoot)
      const pose = (node: Object3D) => ({
        node,
        position: node.position.clone(),
        quaternion: node.quaternion.clone(),
      })
      return {
        arm: arm.map(pose),
        pipe: pipe.map(pose),
        hinge,
        // Height of the pipe's centre line above the hinge: the lever length.
        lever: (pipeBox.min.y + pipeBox.max.y) / 2 - armBox.min.y,
      }
    })
  }, [scene])

  useEffect(
    () => () => {
      for (const piston of pistons) {
        for (const p of [...piston.arm, ...piston.pipe]) {
          p.node.position.copy(p.position)
          p.node.quaternion.copy(p.quaternion)
        }
      }
    },
    [pistons],
  )

  const settings = useRef(debug)
  settings.current = debug

  const turn = useMemo(() => new Quaternion(), [])
  const zAxis = useMemo(() => new Vector3(0, 0, 1), [])
  useFrame(() => {
    const d = settings.current
    const forward = sealerStroke(cycle.current.phase, hold)
    const angle = ((d.startDeg + (d.endDeg - d.startDeg) * forward) * Math.PI) / 180
    // Tilting about Z moves the arm's top along X; the pipe follows it.
    turn.setFromAxisAngle(zAxis, angle)
    for (const piston of pistons) {
      for (const p of piston.arm) {
        p.node.quaternion.copy(turn).multiply(p.quaternion)
        p.node.position.copy(p.position).sub(piston.hinge).applyQuaternion(turn).add(piston.hinge)
      }
      const slide = -piston.lever * Math.sin(angle)
      for (const p of piston.pipe) {
        p.node.position.copy(p.position)
        p.node.position.x += slide
      }
    }
  })

  return null
}

/** Download progress, rendered over the canvas. `useProgress` reads drei's
 * global loading store, so it works outside the `<Canvas>` tree. */
function LoadOverlay() {
  // `loaded` / `total` count files, not bytes, so only the percentage is shown.
  const { active, progress } = useProgress()
  if (!active) return null

  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3 bg-bg/60">
      <p className="hud-label text-muted">Loading model · {Math.round(progress)}%</p>
      <div className="h-px w-40 overflow-hidden bg-line">
        <div className="h-full bg-accent transition-[width]" style={{ width: `${progress}%` }} />
      </div>
    </div>
  )
}

/** A failed fetch or a corrupt GLB throws during render; catch it so the tab
 * degrades to a message instead of taking the page down. */
class ModelBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}

/**
 * Heights up a plant tank part, measured from its lowest point (the feet), in
 * model units. The part is the whole tank plus its stand: feet and legs, then
 * a bottom valve, then the vessel — a cone, a straight wall, and a top dome.
 * All six tanks in `PlantLayout.glb` are the same shape.

/**
 * Opening camera pose: the platform's Digital Twin start view (position
 * [-16.6056, 2.0926, 0.445]), pulled back 2x along the same line of sight
 * so more of the machine fits in the portfolio's smaller frame.
 */
const START_VIEW: CameraView = {
  position: [-19.9815, 3.1698, 2.1297],
  target: [-13.2297, 1.0154, -1.2397],
}

const SEALER_VIEW: SealerView = {
  opacity: 1,
  rearOpacity: 1,
  motion: SEALER_MOTION,
  frontVerticalRange: FRONT_VERTICAL_RANGE,
}

/**
 * The whole twin, running. `active` pauses rendering while it is scrolled
 * off screen or paused, since the effects redraw every frame.
 */
export default function MachineTwin({
  active,
  live,
  coarse,
  apiRef,
  fallback,
}: {
  active: boolean
  live: boolean
  coarse: boolean
  apiRef?: MutableRefObject<TwinApi | null>
  fallback: ReactNode
}) {
  const sealCycle = useRef<SealCycle>({ phase: 0, count: 0 })
  const rollSpin: RollSpin = ROLL_SPIN
  const matDebug: MatDebug = MAT_DEBUG
  const pistonDebug: PistonDebug = PISTON_DEBUG

  return (
    <ModelBoundary fallback={fallback}>
      <div className="relative h-full w-full">
        <Canvas
          frameloop={active ? 'demand' : 'never'}
          dpr={[1, 1.5]}
          camera={{ position: START_VIEW.position, fov: 45, near: 0.01, far: 500 }}
          gl={{ antialias: true, powerPreference: 'high-performance' }}
          style={{ background: 'transparent' }}
        >
          <StudioEnvironment />
          {/* Key and fill on top of the environment, for shape and shadow side. */}
          <hemisphereLight intensity={0.3} groundColor="#0b0f14" />
          <directionalLight position={[8, 12, 6]} intensity={1.5} />
          <directionalLight position={[-8, 5, -6]} intensity={0.5} />

          <Suspense fallback={null}>
            <MachineModel url={machineModelUrl} />
            <HopperEffects url={machineModelUrl} opacity={0.5} />
            <RollEffects url={machineModelUrl} spin={rollSpin} />
            <SealerEffects url={machineModelUrl} view={SEALER_VIEW} cycle={sealCycle} />
            <SealingFilmEffects url={machineModelUrl} cycle={sealCycle} hold={SEALER_MOTION.hold} />
            <RollerEffects url={machineModelUrl} cycle={sealCycle} hold={SEALER_MOTION.hold} />
            <PistonEffects
              url={machineModelUrl}
              cycle={sealCycle}
              hold={SEALER_MOTION.hold}
              debug={pistonDebug}
            />
            <MatStackEffects
              url={machineModelUrl}
              cycle={sealCycle}
              hold={SEALER_MOTION.hold}
              debug={matDebug}
            />
          </Suspense>

          <TwinControls
            view={START_VIEW}
            live={live}
            coarse={coarse}
            spin={active}
            apiRef={apiRef}
            minDistance={0.6}
            maxDistance={14}
          />
        </Canvas>

        <LoadOverlay />
      </div>
    </ModelBoundary>
  )
}
