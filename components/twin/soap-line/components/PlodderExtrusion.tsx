import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { MATERIAL_COLOR } from './MixerFill'
import { useProductColor, useTint } from '../lib/productColor'
import {
  CHAMBER_FLOOR_Y,
  CHAMBER_TOP_Y,
  DIE_FACE_AXES,
  DIE_FACE_LOCAL,
  DIE_FLOW_AXIS,
  DIE_FLOW_SIGN,
  DIE_HOLE_RADIUS,
  DIE_MESH,
  DIE_VERTEX_COUNT,
  chamberSectionAt,
  resolveAnchor,
  usableHoles,
} from '../lib/plodderCavities'

interface PlodderExtrusionProps {
  scene: THREE.Object3D
  // One pre-plodder screw's live angle. Both turn at the same speed, so either
  // serves. Nothing leaves the die unless the screws are pushing.
  feedAngleRef: React.MutableRefObject<number>
  // One final-plodder screw's live angle. The heap is drawn down only while
  // these turn - the final plodder is what takes material out of the chamber.
  drainAngleRef: React.MutableRefObject<number>
  // How full the cone heater is, 0-1. Written here and read by ConeFill:
  // material only reaches the cone by being drained off this heap, so the two
  // must not keep separate accounts of it.
  coneFillRef: React.MutableRefObject<number>
}

// ── the strands leaving the die ──────────────────────────────────────────────

// Strand thickness as a fraction of the hole it came from.
const RADIUS_RATIO = 0.96
const STRAND_SEGMENTS = 40
const STRAND_RADIAL = 5
// How far a strand carries away from the plate over its whole fall, as a
// fraction of that fall. The chamber's centre sits downstream of the die face,
// so the curtain has to lean out over the heap rather than slide down the plate.
const EXIT_RUN_FRACTION = 0.2
// Per-strand variation, so 208 copies of one tube do not read as a comb.
const STRAND_YAW_SPREAD = 0.2
const STRAND_SCALE_SPREAD = 0.08
// Screw revolutions for a strand to grow from the plate down to the heap, if
// the curtain starts short. It starts fully grown, so this only matters if that
// default changes.
const EMERGE_REVOLUTIONS = 4

// ── the heap on the final plodder screws ─────────────────────────────────────

const HEAP_STRANDS = 900
// Distinct strand shapes. Instancing shares one geometry per shape, and one
// folded noodle repeated 900 times is recognisable; a handful turned and scaled
// differently is not.
const HEAP_VARIANTS = 8
// A heap strand's length and how far it may wander from its own centre, in
// noodle radii - so the heap keeps its proportions if the model is rescaled.
const HEAP_LENGTH_RADII = 96
const HEAP_REACH_RADII = 14
const WALK_POINTS = 16
const HEAP_SEGMENTS = 36
const HEAP_RADIAL = 5
const HEAP_SCALE_SPREAD = 0.3
const HEAP_TILT = 0.25
// How high a full heap stands, as a fraction of the way from its floor up to the
// lowest die hole. Below 1 so there is always a visible fall between the two.
const HEAP_FULL_FRACTION = 0.65
// Levels the chamber is sampled at when placing strands.
const PLACEMENT_BANDS = 80

// Heap gained per pre-plodder revolution, and lost per final-plodder revolution.
// Feed outpaces drain, so the heap builds with the pre-plodder alone, draws down
// with the final plodder alone, and slowly builds with both - a vacuum chamber
// runs with material in it, not drained dry. At 50 rpm: full in 30 s, empty in 40.
const FEED_PER_REVOLUTION = 0.04
const DRAIN_PER_REVOLUTION = 0.03
// Cone gained per unit of heap drained. Half a full heap fills the bore.
const CONE_PER_HEAP = 2

// A newly landed strand drops the last stretch into place rather than appearing
// at rest, in noodle radii and seconds.
const SETTLE_DROP_RADII = 20
const SETTLE_TIME = 0.4

/** Small seeded generator, so the heap looks the same on every reload. */
function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** A strand's path off the die: a projectile, leaving along `flow` and falling `drop`. */
class FallCurve extends THREE.Curve<THREE.Vector3> {
  private flow: THREE.Vector3
  private exitRun: number
  private drop: number

  constructor(flow: THREE.Vector3, exitRun: number, drop: number) {
    super()
    this.flow = flow
    this.exitRun = exitRun
    this.drop = drop
  }

  getPoint(t: number, target = new THREE.Vector3()) {
    return target.copy(this.flow).multiplyScalar(this.exitRun * t).setY(-this.drop * t * t)
  }
}

/**
 * One folded strand lying in the heap: a confined random walk, so its length and
 * its footprint are set independently. Centred on its own bounding box.
 */
function buildHeapStrand(variant: number, radius: number) {
  const rand = mulberry32(variant * 7919 + 13)
  const step = (HEAP_LENGTH_RADII * radius) / (WALK_POINTS - 1)
  const reach = HEAP_REACH_RADII * radius
  const points: THREE.Vector3[] = []
  let x = 0
  let y = 0
  let z = 0
  let heading = rand() * Math.PI * 2
  for (let i = 0; i < WALK_POINTS; i++) {
    points.push(new THREE.Vector3(x, y, z))
    heading += (rand() * 2 - 1) * 0.9
    // Steer back toward the middle once it strays, so the strand folds over on
    // itself the way extruded noodles pile rather than wandering off in a line.
    if (Math.hypot(x, z) > reach * 0.7) {
      const back = Math.atan2(-z, -x)
      heading += Math.atan2(Math.sin(back - heading), Math.cos(back - heading)) * 0.85
    }
    x += Math.cos(heading) * step
    z += Math.sin(heading) * step
    y += (rand() * 2 - 1) * step * 0.35
  }
  const box = new THREE.Box3().setFromPoints(points)
  const centre = box.getCenter(new THREE.Vector3())
  let footprint = 0
  for (const p of points) {
    p.sub(centre)
    footprint = Math.max(footprint, Math.hypot(p.x, p.z))
  }
  const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal')
  return {
    geometry: new THREE.TubeGeometry(curve, HEAP_SEGMENTS, radius, HEAP_RADIAL, false),
    reach: footprint + radius,
    halfHeight: (box.max.y - box.min.y) / 2 + radius,
  }
}

/**
 * Noodles leaving the pre-plodder's die, falling through the vacuum chamber and
 * heaping up on the final plodder's screws.
 *
 * The curtain of strands is one tube instanced across every open hole and grown
 * with a draw range, so it reaches down to wherever the heap currently stands.
 * The heap is placed once - strands sampled through the measured chamber by
 * cross-sectional area and sorted by height - and filled bottom-up by instance
 * count, so the level is a prefix and a change costs a few count writes.
 */
export function PlodderExtrusion({ scene, feedAngleRef, drainAngleRef, coneFillRef }: PlodderExtrusionProps) {
  const heapRefs = useRef<(THREE.InstancedMesh | null)[]>([])
  const curtainRef = useRef<THREE.InstancedMesh>(null)

  const rig = useMemo(() => {
    const anchor = resolveAnchor(scene, DIE_MESH, DIE_VERTEX_COUNT)
    if (!anchor) return null
    const { matrix, scale } = anchor

    // The chamber data is swept along local y and sampled as if that were up.
    // If a re-export ever turns the die, the heap would be laid sideways - draw
    // nothing instead.
    const up = new THREE.Vector3(0, 1, 0).transformDirection(matrix)
    if (up.y < 0.999) {
      console.warn('[plodder] die is no longer upright; skipping the vacuum chamber.')
      return null
    }

    const radius = DIE_HOLE_RADIUS * scale * RADIUS_RATIO

    // --- holes, in scene space ---------------------------------------------
    const flow = new THREE.Vector3()
    flow[DIE_FLOW_AXIS] = DIE_FLOW_SIGN
    flow.transformDirection(matrix)
    const holes = usableHoles().map(([u, v]) => {
      const p = new THREE.Vector3()
      p[DIE_FLOW_AXIS] = DIE_FACE_LOCAL
      p[DIE_FACE_AXES[0]] = u
      p[DIE_FACE_AXES[1]] = v
      // Nudged one radius clear of the plate so strands do not start inside it.
      return p.applyMatrix4(matrix).addScaledVector(flow, radius)
    })
    if (holes.length === 0) return null
    const meanHoleY = holes.reduce((sum, p) => sum + p.y, 0) / holes.length
    const lowestHoleY = Math.min(...holes.map((p) => p.y))

    // --- chamber, in scene space -------------------------------------------
    const section = (localY: number) => {
      const s = chamberSectionAt(localY)
      if (!s) return null
      const centre = new THREE.Vector3(s.cx, localY, s.cz).applyMatrix4(matrix)
      return { y: centre.y, cx: centre.x, cz: centre.z, rx: s.rx * scale, rz: s.rz * scale }
    }
    const inverse = matrix.clone().invert()
    const toLocalY = (y: number) => new THREE.Vector3(0, y, 0).applyMatrix4(inverse).y

    const heapShapes = Array.from({ length: HEAP_VARIANTS }, (_, v) => buildHeapStrand(v, radius))
    const maxReach = Math.max(...heapShapes.map((s) => s.reach)) * (1 + HEAP_SCALE_SPREAD / 2)
    const maxHalfHeight = Math.max(...heapShapes.map((s) => s.halfHeight)) * (1 + HEAP_SCALE_SPREAD / 2)

    const bands: NonNullable<ReturnType<typeof section>>[] = []
    for (let i = 0; i <= PLACEMENT_BANDS; i++) {
      const s = section(CHAMBER_FLOOR_Y + ((CHAMBER_TOP_Y - CHAMBER_FLOOR_Y) * i) / PLACEMENT_BANDS)
      if (s) bands.push(s)
    }
    // The heap's floor is the first level wide enough for a strand - the narrow
    // throat below that is the gap between the two screws, which a folded noodle
    // cannot sit in without passing through the flights.
    const floor = bands.find((b) => Math.min(b.rx, b.rz) >= maxReach)
    if (!floor) return null
    const bottomY = floor.y + maxHalfHeight
    const topY = floor.y + (lowestHoleY - floor.y) * HEAP_FULL_FRACTION
    if (topY <= bottomY) return null

    // Heights weighted by cross-sectional area, so a wide level holds more
    // strands than a narrow one and the heap fills the vessel's shape.
    const usable = bands.filter((b) => b.y >= bottomY && b.y <= topY)
    const cumulative: number[] = []
    let total = 0
    for (const b of usable) {
      total += b.rx * b.rz
      cumulative.push(total)
    }
    if (usable.length === 0 || total <= 0) return null

    const rand = mulberry32(4242)
    const placements = Array.from({ length: HEAP_STRANDS }, () => {
      const pick = rand() * total
      const index = cumulative.findIndex((c) => c >= pick)
      const y = THREE.MathUtils.clamp(usable[index].y + (rand() - 0.5) * ((topY - bottomY) / usable.length), bottomY, topY)
      const s = section(toLocalY(y)) ?? usable[index]
      const strandScale = 1 - HEAP_SCALE_SPREAD / 2 + rand() * HEAP_SCALE_SPREAD
      // Inset from the wall by the strand's own reach, so none pokes through it.
      const rx = Math.max(0, s.rx - maxReach)
      const rz = Math.max(0, s.rz - maxReach)
      const angle = rand() * Math.PI * 2
      const r = Math.sqrt(rand())
      const quaternion = new THREE.Quaternion().setFromEuler(
        new THREE.Euler((rand() * 2 - 1) * HEAP_TILT, rand() * Math.PI * 2, (rand() * 2 - 1) * HEAP_TILT),
      )
      return {
        position: new THREE.Vector3(s.cx + Math.cos(angle) * rx * r, y, s.cz + Math.sin(angle) * rz * r),
        quaternion,
        scale: strandScale,
      }
    })
    placements.sort((a, b) => a.position.y - b.position.y)

    // --- the curtain -------------------------------------------------------
    const drop = meanHoleY - floor.y
    const curtain = new THREE.TubeGeometry(
      new FallCurve(new THREE.Vector3(flow.x, 0, flow.z).normalize(), drop * EXIT_RUN_FRACTION, drop),
      STRAND_SEGMENTS,
      radius,
      STRAND_RADIAL,
      false,
    )
    curtain.setDrawRange(0, 0)
    const strandMatrices = holes.map((p, i) => {
      const r = mulberry32(i * 131 + 7)
      return new THREE.Matrix4().compose(
        p,
        new THREE.Quaternion().setFromAxisAngle(up, (r() * 2 - 1) * STRAND_YAW_SPREAD),
        new THREE.Vector3().setScalar(1 - STRAND_SCALE_SPREAD / 2 + r() * STRAND_SCALE_SPREAD),
      )
    })

    return {
      radius,
      holes,
      meanHoleY,
      drop,
      bottomY,
      curtain,
      strandMatrices,
      heapShapes,
      placements,
      perVariant: Math.ceil(HEAP_STRANDS / HEAP_VARIANTS),
    }
  }, [scene])

  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        // The same off-white as the rest of the line's product.
        color: new THREE.Color(MATERIAL_COLOR),
        roughness: 1,
        metalness: 0,
        flatShading: true,
      }),
    [],
  )
  // Recoloured in place on a SKU changeover; see useTint.
  useTint(material, useProductColor().mass)

  useEffect(() => {
    return () => {
      rig?.curtain.dispose()
      for (const shape of rig?.heapShapes ?? []) shape.geometry.dispose()
      material.dispose()
    }
  }, [rig, material])

  // Starts as a running line is found: strands hanging to a full heap. A plant
  // viewer opening on an empty chamber shows a machine that has never run.
  //
  // Extrusion progress and heap level. Monotonic, so accumulated - unlike the
  // screw angles, which are assigned - and written by this component alone.
  const flow = useRef({ grow: 1, pile: 1, shown: 0, surfaceY: 0, drawn: -1 })
  const prevFeed = useRef<number | null>(null)
  const prevDrain = useRef<number | null>(null)
  const settling = useRef<{ rank: number; start: number }[]>([])
  const initialised = useRef(false)
  const dummy = useRef(new THREE.Object3D())

  useEffect(() => {
    // Keep click-to-select hitting the machine rather than the product inside it.
    if (curtainRef.current) curtainRef.current.raycast = () => {}
    for (const mesh of heapRefs.current) if (mesh) mesh.raycast = () => {}
    initialised.current = false
  }, [rig])

  useFrame((state, delta) => {
    if (!rig) return
    const curtainMesh = curtainRef.current
    if (!curtainMesh) return

    // Round-robin variant assignment in height order: rank k is instance
    // floor(k / V) of variant k % V, so each variant's instances stay sorted and a
    // global prefix of the heap is a prefix of every variant.
    const writeHeapMatrix = (rank: number, lift: number) => {
      const o = dummy.current
      const mesh = heapRefs.current[rank % HEAP_VARIANTS]
      if (!mesh) return
      const p = rig.placements[rank]
      o.position.copy(p.position)
      o.position.y += lift
      o.quaternion.copy(p.quaternion)
      o.scale.setScalar(p.scale)
      o.updateMatrix()
      mesh.setMatrixAt(Math.floor(rank / HEAP_VARIANTS), o.matrix)
      mesh.instanceMatrix.needsUpdate = true
    }

    const revolutionsSince = (ref: React.MutableRefObject<number>, prev: React.MutableRefObject<number | null>) => {
      const angle = ref.current
      if (prev.current === null) {
        prev.current = angle
        return 0
      }
      let step = angle - prev.current
      if (step > Math.PI) step -= Math.PI * 2
      if (step < -Math.PI) step += Math.PI * 2
      prev.current = angle
      return Math.abs(step) / (Math.PI * 2)
    }

    const f = flow.current
    // Runs before the first render of a new rig, so no instance is ever drawn at
    // its default identity matrix. Counts are set here too, not left to the level
    // check below: a remount keeps `flow` but starts the meshes at full capacity.
    if (!initialised.current) {
      rig.strandMatrices.forEach((m, i) => curtainMesh.setMatrixAt(i, m))
      curtainMesh.instanceMatrix.needsUpdate = true
      for (let rank = 0; rank < rig.placements.length; rank++) writeHeapMatrix(rank, 0)
      f.shown = Math.round(f.pile * rig.placements.length)
      for (let v = 0; v < HEAP_VARIANTS; v++) {
        const mesh = heapRefs.current[v]
        if (mesh) mesh.count = Math.max(0, Math.ceil((f.shown - v) / HEAP_VARIANTS))
      }
      settling.current = []
      // At the heap's current top, so a full chamber does not open with the
      // strands easing up from the floor.
      f.surfaceY = f.shown > 0 ? rig.placements[f.shown - 1].position.y : rig.bottomY
      f.drawn = -1
      initialised.current = true
    }

    const feed = revolutionsSince(feedAngleRef, prevFeed)
    const drain = revolutionsSince(drainAngleRef, prevDrain)

    // Strands have to reach the heap before they add to it.
    if (f.grow < 1) f.grow = Math.min(1, f.grow + feed / EMERGE_REVOLUTIONS)
    else f.pile = Math.min(1, f.pile + feed * FEED_PER_REVOLUTION)
    const drained = Math.min(f.pile, drain * DRAIN_PER_REVOLUTION)
    f.pile -= drained
    coneFillRef.current = Math.min(1, coneFillRef.current + drained * CONE_PER_HEAP)

    // --- heap level --------------------------------------------------------
    const now = state.clock.elapsedTime
    const filled = Math.round(f.pile * rig.placements.length)
    if (filled !== f.shown) {
      if (filled > f.shown) {
        for (let rank = f.shown; rank < filled; rank++) settling.current.push({ rank, start: now })
      } else {
        settling.current = settling.current.filter((s) => s.rank < filled)
      }
      for (let v = 0; v < HEAP_VARIANTS; v++) {
        const mesh = heapRefs.current[v]
        if (mesh) mesh.count = Math.max(0, Math.ceil((filled - v) / HEAP_VARIANTS))
      }
      f.shown = filled
    }

    // Newly landed strands fall the last stretch, accelerating, then rest.
    if (settling.current.length > 0) {
      const drop = SETTLE_DROP_RADII * rig.radius
      settling.current = settling.current.filter(({ rank, start }) => {
        const e = Math.min(1, (now - start) / SETTLE_TIME)
        writeHeapMatrix(rank, drop * (1 - e * e))
        return e < 1
      })
    }

    // --- curtain length ----------------------------------------------------
    // Strands end on the heap's surface rather than passing through it, so they
    // shorten as it rises. Eased, so a level change does not snap the curtain.
    const surfaceTarget = filled > 0 ? rig.placements[filled - 1].position.y : rig.bottomY
    f.surfaceY += (surfaceTarget - f.surfaceY) * Math.min(1, delta * 3)
    const land = Math.sqrt(THREE.MathUtils.clamp((rig.meanHoleY - f.surfaceY) / rig.drop, 0, 1))
    const segments = Math.round(Math.min(f.grow, land) * STRAND_SEGMENTS)
    if (segments !== f.drawn) {
      curtainMesh.geometry.setDrawRange(0, segments * STRAND_RADIAL * 6)
      f.drawn = segments
    }
  })

  if (!rig) return null

  return (
    <>
      <instancedMesh
        ref={curtainRef}
        args={[rig.curtain, material, rig.holes.length]}
        frustumCulled={false}
      />
      {rig.heapShapes.map((shape, v) => (
        <instancedMesh
          key={v}
          ref={(mesh) => {
            heapRefs.current[v] = mesh
          }}
          args={[shape.geometry, material, rig.perVariant]}
          frustumCulled={false}
        />
      ))}
    </>
  )
}
