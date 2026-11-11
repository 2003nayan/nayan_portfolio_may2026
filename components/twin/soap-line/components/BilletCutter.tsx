import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import {
  RECYCLE_SPEED,
  TAKEAWAY_SPEED,
  onRecycle,
  onTakeaway,
  startLiftRide,
  stepLiftRide,
  type LiftRide,
  type LiftRoute,
  type RecycleRoute,
} from '../lib/recycleRoute'
import { useProductColor, useTint } from '../lib/productColor'

interface BilletCutterProps {
  scene: THREE.Object3D
  // A final plodder screw's live angle. The bars leave the cone only while
  // these turn, and every cut is triggered by how much bar has come out.
  pushAngleRef: React.MutableRefObject<number>
  // How full the cone heater is, 0-1. Nothing leaves the nozzle until the bore
  // is packed.
  coneFillRef: React.MutableRefObject<number>
  // The latest request for short bars. A new object is a new request; its `id`
  // stops the same one being counted twice.
  shortBarRequest?: ShortBarRequest | null
  // Told how many short bars each cutter still has to cut, whenever that changes.
  onShortBarsPending?: (pending: number[]) => void
  // The scrap route through the stamper model, once it has loaded. Short bars
  // reaching the top of the long conveyor carry on along it; until then they
  // queue there.
  recycleRouteRef?: React.MutableRefObject<RecycleRoute | null>
  // Short bars to cut per minute (the plant's recycle_bar_count), handed to the
  // two cutters in turn.
  shortBarsPerMinute?: number
  // SDF_A10_0 and the pre-plodder hopper, once the main model has measured them.
  // Short bars carry on from the take-away conveyor up it and into the hopper.
  liftRouteRef?: React.MutableRefObject<LiftRoute | null>
}

export interface ShortBarRequest {
  // 0 is the left cutter (klhjl, nearer the cone heater), 1 the right (ghjl).
  cutter: number
  count: number
  id: number
}

// The two cutters. Each is a disc on its own servo shaft beside ONE lane, with
// two blades at opposite points of its rim, turning as one rigid group. The
// disc is listed first: its centre is the shaft.
const CUTTERS = [
  ['klhjl_C_0', 'pCube12551_lambert1_0', 'pCube12550_lambert1_0'],
  ['ghjl_C_0', 'pCube12547_lambert1_0', 'pCube12549_lambert1_0'],
]

// The soap bars already in the model: TWO round bars side by side, one per lane,
// exported as a single mesh. Split here into its two lanes, so each lane's bar
// can be drawn at its own extruded length and cut by its own cutter.
const BAR_MESH = 'SG_AW6_0'

// The conveyors the cut billets ride away on, in the order they meet them. They
// continue the bars' own line in +z, their tops level with the bars' undersides,
// so the billets carry straight on until they leave the far end of the last.
const CONVEYOR_MESHES = ['pCube12498_A3_0_1', 'polySurface30602_A3_0']

// Short bars are cut on request and taken out of the line, over two conveyors
// the model already has in place:
//
//   1. Over the end of the cutter table, through the gap before the first billet
//      conveyor, onto the CROSS conveyor running crosswise under that gap.
//   2. Along it back toward the machine, off its end onto the LONG conveyor
//      beside the line, which sits 4 cm lower at that point.
//   3. Up the long conveyor - it climbs 8 cm over its length - to its far end,
//      where they wait in a row.
const SHORT_BAR_LENGTH_WIDTHS = 5
const CUTTER_TABLE_MESH = 'pCube12498_A3_0'
const CROSS_CONVEYOR_MESH = 'GS6_AW6_0'
const LONG_CONVEYOR_MESH = 'GS5_AW6_0'
// Scene units are close to metres - the bars are about a centimetre across - so
// real gravity gives a believable fall.
const GRAVITY = 9.81
// How far a short bar pitches nose-down as it tips off the cutter table, radians.
const TIP_ANGLE = 0.9
// Conveyor speeds, scene units/s.
const CROSS_SPEED = 0.05
const LONG_SPEED = 0.1
// Space left between short bars queued at the end of the long conveyor.
const QUEUE_GAP = 0.003
// Short bars on the conveyors at once. Past this the oldest, at the head of the
// queue, is taken off. ~22 a minute over a ~70 s trip to the hopper is ~26.
const MAX_DROPS = 48
// Short bars a cutter may owe at once. The rate keeps arriving while the final
// plodder is stopped and nothing is being cut; this stops a backlog building up.
const MAX_SHORT_PENDING = 3
const IDENTITY = new THREE.Quaternion()

// One finished billet, with the rounded edges a cut bar has. Fitted to a lane's
// bar width and height and stretched to the cut length.
const BILLET_URL = '/models/soap-line/bar.glb'
const BILLET_MESH = 'Bar1_AW6_0'
// Billet length, in bar widths.
const BILLET_LENGTH_WIDTHS = 15

// Bar leaving the nozzle per final plodder revolution, scene units. Tuned so a
// billet comes off each lane about every 1.4 s at 50 rpm.
const BAR_PER_REVOLUTION = 0.05
// Gap opened between a freshly cut billet and the bar behind it, as a fraction
// of the bar's width. Without it the cut is invisible: the pieces stay butted.
const GAP_FRACTION = 0.8
// One cut is a half turn of the disc, seconds. A servo snaps; it does not glide.
const TURN_TIME = 0.35
// The model poses each disc mid-cut, with a blade inside the bar. At rest the
// blades are level with the shaft instead, clear above the bar - an eighth of a
// turn from the model's pose.
const REST_ANGLE = Math.PI / 4
// How far through the half turn from rest the cut happens: back at the model's
// own pose, an eighth of a turn in. Measured, the lower blade there sits
// squarely inside the bar and upright, which is the cut. At the bottom of the
// swing a blade only reaches a quarter of the way into the bar.
const CROSSING = 0.25
// Enough for a lane's billets from its cutter to the end of its conveyor on
// toward the stampers - about a dozen at the current billet length.
const MAX_PIECES_PER_LANE = 32

/**
 * Lays billets on a lane as a line that has been running would have them: each
 * BILLET_LENGTH_WIDTHS long, GAP_FRACTION of a width apart - the spacing the cuts
 * themselves produce - from just past `fromZ` until one's centre would pass
 * `toZ`. Appended to `pieces`, leaving room under MAX_PIECES_PER_LANE for the
 * next cut.
 */
function layBillets(pieces: Piece[], fromZ: number, toZ: number, width: number) {
  const length = BILLET_LENGTH_WIDTHS * width
  const gap = GAP_FRACTION * width
  let back = fromZ + gap
  while (back + length / 2 < toZ && pieces.length < MAX_PIECES_PER_LANE - 1) {
    pieces.push({ back, front: back + length, attached: false, extra: 0 })
    back += length + gap
  }
}

interface Piece {
  back: number
  front: number
  // Still joined to the nozzle: its back stays put while its front grows.
  attached: boolean
  // Extra travel still owed from the last cut's gap.
  extra: number
  // Cut as a short bar, to be dropped onto the reject conveyor.
  short?: boolean
}

// After the long conveyor, the same route the stamper's fringe takes: onto the
// recycle conveyor, up it, and off its end onto the take-away conveyor.
type DropStage =
  | 'toCross'
  | 'cross'
  | 'toLong'
  | 'long'
  | 'toRecycle'
  | 'recycle'
  | 'toTakeaway'
  | 'takeaway'
  // Up SDF_A10_0 and into the pre-plodder hopper; see LiftRide.
  | 'onward'

// Moving between conveyors on the scrap route, seconds.
const ROUTE_HOP_TIME = 0.5
// How high a short bar lifts as it hops the gap onto the recycle conveyor.
const ROUTE_HOP_HEIGHT = 0.01

interface Drop {
  width: number
  height: number
  length: number
  stage: DropStage
  // Current pose: centre, and pitch about x.
  x: number
  y: number
  z: number
  pitch: number
  // The fall in progress, while stage is 'toCross' or 'toLong'.
  time: number
  fallTime: number
  from: THREE.Vector3
  to: THREE.Vector3
  tip: number
  fromPitch: number
  toPitch: number
  // Full orientation, used once on the scrap route, where it also turns.
  quat: THREE.Quaternion
  fromQuat: THREE.Quaternion
  ride?: LiftRide
}

interface Captured {
  object: THREE.Object3D
  pos: THREE.Vector3
  quat: THREE.Quaternion
  scale: THREE.Vector3
}

interface CutterMotion {
  // Whole half turns completed, and progress through the current one.
  turns: number
  progress: number
  turning: boolean
  // Whether this turn's blade has already gone through the bar.
  cut: boolean
  // Whether this turn cuts a short bar rather than a billet.
  short: boolean
}

// `object`'s transform as if `scene` were at the identity, as everywhere else.
function getSceneRelativeMatrix(object: THREE.Object3D, scene: THREE.Object3D, target: THREE.Matrix4) {
  scene.updateWorldMatrix(true, false)
  object.updateWorldMatrix(true, false)
  return target.copy(scene.matrixWorld).invert().multiply(object.matrixWorld)
}

function sceneBounds(scene: THREE.Object3D, object: THREE.Object3D) {
  const mesh = object as THREE.Mesh
  mesh.geometry.computeBoundingBox()
  return mesh.geometry.boundingBox!.clone().applyMatrix4(getSceneRelativeMatrix(mesh, scene, new THREE.Matrix4()))
}

function capture(object: THREE.Object3D, scene: THREE.Object3D): Captured {
  const pos = new THREE.Vector3()
  const quat = new THREE.Quaternion()
  const scale = new THREE.Vector3()
  getSceneRelativeMatrix(object, scene, new THREE.Matrix4()).decompose(pos, quat, scale)
  return { object, pos, quat, scale }
}

/** Poses `object` at a scene-relative matrix, whatever its parent chain. */
function placeAt(object: THREE.Object3D, scene: THREE.Object3D, sceneMatrix: THREE.Matrix4) {
  if (!object.parent) return
  getSceneRelativeMatrix(object.parent, scene, new THREE.Matrix4())
    .invert()
    .multiply(sceneMatrix)
    .decompose(object.position, object.quaternion, object.scale)
}

/**
 * Starts `drop` falling from where it is now to a resting point, easing its
 * pitch to `toPitch` on the way and tipping by up to `tip` mid-fall.
 */
function startFall(drop: Drop, x: number, y: number, z: number, tip: number, toPitch: number) {
  drop.from.set(drop.x, drop.y, drop.z)
  drop.to.set(x, y, z)
  drop.time = 0
  // Never instant, so a bar that barely drops still visibly settles.
  drop.fallTime = Math.max(0.08, Math.sqrt((2 * Math.max(0, drop.y - y)) / GRAVITY))
  drop.tip = tip
  drop.fromPitch = drop.pitch
  drop.toPitch = toPitch
}

/** Eases a half turn in and out, the way a servo move profile does. */
function ease(t: number) {
  return 0.5 - 0.5 * Math.cos(Math.PI * THREE.MathUtils.clamp(t, 0, 1))
}

/**
 * Splits the two-bar mesh into its lanes, in scene space: every triangle goes to
 * the side of the mesh's centre its own centre lies on.
 */
function splitLanes(scene: THREE.Object3D, bar: THREE.Mesh, splitX: number) {
  const geometry = bar.geometry.clone().applyMatrix4(getSceneRelativeMatrix(bar, scene, new THREE.Matrix4()))
  const position = geometry.attributes.position
  const index = geometry.index ? Array.from(geometry.index.array) : Array.from({ length: position.count }, (_, i) => i)
  const sides: number[][] = [[], []]
  for (let t = 0; t < index.length; t += 3) {
    const x = (position.getX(index[t]) + position.getX(index[t + 1]) + position.getX(index[t + 2])) / 3
    sides[x < splitX ? 0 : 1].push(index[t], index[t + 1], index[t + 2])
  }
  return sides.map((side) => {
    const lane = geometry.clone()
    lane.setIndex(side)
    // Measured from this lane's own triangles. computeBoundingBox would not do:
    // it walks the whole shared vertex buffer, so both lanes came out as the
    // full two-bar width centred between the cutters - and both were paired
    // with the same one.
    const box = new THREE.Box3()
    const v = new THREE.Vector3()
    for (const i of side) box.expandByPoint(v.fromBufferAttribute(position, i))
    lane.boundingBox = box
    lane.boundingSphere = box.getBoundingSphere(new THREE.Sphere())
    return { geometry: lane, box }
  })
}

/**
 * The two soap bars leaving the cone heater, and the two billet cutters that
 * chop them - one cutter per lane.
 *
 * Each lane is independent: its bar grows out of the nozzle, and when a billet's
 * length has passed its cutter, that cutter alone snaps half a turn and its blade
 * drops through that lane's bar. The cutters are triggered by the bar and never
 * by a clock, so a stopped plodder stops them too.
 */
export function BilletCutter({
  scene,
  pushAngleRef,
  coneFillRef,
  shortBarRequest,
  onShortBarsPending,
  recycleRouteRef,
  shortBarsPerMinute,
  liftRouteRef,
}: BilletCutterProps) {
  const billetRef = useRef<THREE.InstancedMesh>(null)
  const laneRefs = useRef<(THREE.Mesh | null)[]>([])
  const billetGltf = useGLTF(BILLET_URL)

  const rig = useMemo(() => {
    const bar = scene.getObjectByName(BAR_MESH) as THREE.Mesh | undefined
    const billetSource = billetGltf.scene.getObjectByName(BILLET_MESH) as THREE.Mesh | undefined
    if (!bar?.isMesh || !billetSource?.isMesh) return null
    const barBox = sceneBounds(scene, bar)

    const split = splitLanes(scene, bar, barBox.getCenter(new THREE.Vector3()).x)
    const laneGeometries = split.map((s) => s.geometry)
    const laneBoxes = split.map((s) => s.box)
    if (laneBoxes.some((b) => b.isEmpty())) {
      console.warn(`[billetCutter] "${BAR_MESH}" did not split into two lanes; skipping the cutters.`)
      return null
    }

    const cutters = CUTTERS.map((names) => {
      const objects = names.map((name) => scene.getObjectByName(name))
      if (objects.some((o) => !o || !(o as THREE.Mesh).isMesh)) return null
      const pivot = sceneBounds(scene, objects[0]!).getCenter(new THREE.Vector3())
      // Where the cut falls: the blade the model poses lowest, inside the bar.
      const lowest = objects
        .slice(1)
        .map((blade) => sceneBounds(scene, blade!).getCenter(new THREE.Vector3()))
        .reduce((a, b) => (b.y < a.y ? b : a))
      return { names, pivot, cutZ: lowest.z }
    })
    if (cutters.some((c) => !c)) return null
    const defs = cutters as NonNullable<(typeof cutters)[number]>[]

    // Each lane is cut by the cutter whose shaft sits nearest it.
    const lanes = laneBoxes.map((box, i) => {
      const centre = box.getCenter(new THREE.Vector3())
      const cutter = defs.reduce((best, c, k) =>
        Math.abs(c.pivot.x - centre.x) < Math.abs(defs[best].pivot.x - centre.x) ? k : best, 0)
      return { geometry: laneGeometries[i], centre, size: box.getSize(new THREE.Vector3()), cutter }
    })
    if (lanes[0].cutter === lanes[1].cutter) {
      console.warn('[billetCutter] both lanes resolved to the same cutter; skipping the cutters.')
      return null
    }

    // The billet shape with its file's own node transforms baked in, then
    // centred and normalised to a unit box, so an instance's scale is simply
    // (width, height, length).
    billetGltf.scene.updateWorldMatrix(true, true)
    const billet = billetSource.geometry.clone()
    billet.applyMatrix4(
      new THREE.Matrix4().copy(billetGltf.scene.matrixWorld).invert().multiply(billetSource.matrixWorld),
    )
    billet.computeBoundingBox()
    const box = billet.boundingBox!
    const size = box.getSize(new THREE.Vector3())
    billet.translate(...box.getCenter(new THREE.Vector3()).negate().toArray())
    billet.scale(1 / size.x, 1 / size.y, 1 / size.z)
    billet.computeVertexNormals()

    return {
      // The bar's own material, copied: the model shares it with other parts
      // (GS5-7_AW6_0), and this copy is recoloured to the SKU on the line.
      material: (bar.material as THREE.MeshStandardMaterial).clone(),
      lanes,
      nozzleZ: barBox.min.z,
      barEnd: barBox.max.z,
      // Where billets leave the line: the far end of the conveyors, or of the
      // bars themselves if none of the conveyors is in the model.
      lineEnd: CONVEYOR_MESHES.reduce((end, name) => {
        const conveyor = scene.getObjectByName(name)
        return conveyor ? Math.max(end, sceneBounds(scene, conveyor).max.z) : end
      }, barBox.max.z),
      fullLength: barBox.max.z - barBox.min.z,
      reject: (() => {
        const table = scene.getObjectByName(CUTTER_TABLE_MESH)
        const cross = scene.getObjectByName(CROSS_CONVEYOR_MESH) as THREE.Mesh | undefined
        const long = scene.getObjectByName(LONG_CONVEYOR_MESH) as THREE.Mesh | undefined
        if (!table || !cross?.isMesh || !long?.isMesh) return null
        const crossBox = sceneBounds(scene, cross)
        const longBox = sceneBounds(scene, long)
        // The long conveyor slopes, so its top is measured at each end rather
        // than taken from its bounding box, which only knows the highest point.
        const matrix = getSceneRelativeMatrix(long, scene, new THREE.Matrix4())
        const position = long.geometry.attributes.position
        const v = new THREE.Vector3()
        const reach = (longBox.max.z - longBox.min.z) * 0.02
        let lowTop = -Infinity
        let highTop = -Infinity
        for (let i = 0; i < position.count; i++) {
          v.fromBufferAttribute(position, i).applyMatrix4(matrix)
          if (v.z < longBox.min.z + reach) lowTop = Math.max(lowTop, v.y)
          if (v.z > longBox.max.z - reach) highTop = Math.max(highTop, v.y)
        }
        return {
          // Where a short bar goes over: the end of the cutter table.
          edgeZ: sceneBounds(scene, table).max.z,
          crossTop: crossBox.max.y,
          crossCentreZ: (crossBox.min.z + crossBox.max.z) / 2,
          // The end nearer the long conveyor.
          crossEndX: crossBox.min.x,
          longCentreX: (longBox.min.x + longBox.max.x) / 2,
          longStartZ: longBox.min.z,
          longEndZ: longBox.max.z,
          lowTop,
          highTop,
        }
      })(),
      cutterDefs: defs,
      billet,
    }
  }, [scene, billetGltf])
  // Recoloured in place on a SKU changeover; see useTint.
  useTint(rig?.material, useProductColor().mass)

  const lanePieces = useRef<Piece[][]>([[], []])
  const primed = useRef(false)
  // Whether the billets have been laid out to the stamper's lane conveyors yet;
  // until the stamper model loads, only this model's own conveyors are known.
  const reachedStamper = useRef(false)
  const prevAngle = useRef<number | null>(null)
  const cutterParts = useRef<{ objects: Captured[]; pivot: THREE.Vector3 }[]>([])
  // Kept apart from the captured parts, which are re-taken when the model
  // changes: a cutter's place in its cycle is not something a new rig resets.
  const motion = useRef<CutterMotion[]>(
    CUTTERS.map(() => ({ turns: 0, progress: 0, turning: false, cut: false, short: false })),
  )
  const shortPending = useRef<number[]>(CUTTERS.map(() => 0))
  // Whether the piece a cutter is currently growing could still become a short
  // bar. True at the start of each growth cycle (reset on every cut); once a
  // piece has grown past the short-bar length without being cut, it is
  // disqualified until the next cut - a request arriving after that point is
  // already too late to shorten what has already come out of the nozzle, so it
  // stays queued and is picked up cleanly on the next cycle instead of lopping
  // an oversized "short" bar off mid-billet.
  const shortEligible = useRef<boolean[]>(CUTTERS.map(() => true))
  const reportedPending = useRef('')
  const lastRequestId = useRef<number | null>(null)
  // Fractional short bars owed by the per-minute rate, and whose turn is next.
  const shortAccrued = useRef(0)
  const nextShortCutter = useRef(0)
  const drops = useRef<Drop[]>([])
  const scratch = useRef({
    object: new THREE.Object3D(),
    quat: new THREE.Quaternion(),
    pos: new THREE.Vector3(),
    axis: new THREE.Vector3(1, 0, 0),
    matrix: new THREE.Matrix4(),
    recyclePose: new THREE.Quaternion(),
    takeawayPose: new THREE.Quaternion(),
  })

  useEffect(() => {
    if (!rig) return
    // Captured once; every frame derives each part's pose from this rather than
    // compounding onto the last - the same approach GateHinge takes.
    cutterParts.current = rig.cutterDefs.map(({ names, pivot }) => ({
      objects: names.map((name) => capture(scene.getObjectByName(name)!, scene)),
      pivot,
    }))
    if (billetRef.current) billetRef.current.raycast = () => {}
    for (const lane of laneRefs.current) if (lane) lane.raycast = () => {}
    return () => {
      // Put the discs back the way the model had them.
      const m = new THREE.Matrix4()
      for (const cutter of cutterParts.current) {
        for (const part of cutter.objects) placeAt(part.object, scene, m.compose(part.pos, part.quat, part.scale))
      }
      cutterParts.current = []
    }
  }, [rig, scene])

  useEffect(() => {
    if (!shortBarRequest || shortBarRequest.id === lastRequestId.current) return
    lastRequestId.current = shortBarRequest.id
    shortPending.current[shortBarRequest.cutter] += shortBarRequest.count
  }, [shortBarRequest])

  useEffect(() => {
    return () => {
      rig?.billet.dispose()
      rig?.material.dispose()
      for (const lane of rig?.lanes ?? []) lane.geometry.dispose()
    }
  }, [rig])

  useFrame((_, delta) => {
    const billets = billetRef.current
    if (!rig || !billets) return

    // --- short bars owed by the plant's per-minute count --------------------
    shortAccrued.current += ((shortBarsPerMinute ?? 0) / 60) * delta
    while (shortAccrued.current >= 1) {
      shortAccrued.current -= 1
      const cutter = nextShortCutter.current
      nextShortCutter.current = (cutter + 1) % CUTTERS.length
      shortPending.current[cutter] = Math.min(MAX_SHORT_PENDING, shortPending.current[cutter] + 1)
    }

    // --- how much bar left the nozzle this frame ----------------------------
    const angle = pushAngleRef.current
    let step = prevAngle.current === null ? 0 : angle - prevAngle.current
    if (step > Math.PI) step -= Math.PI * 2
    if (step < -Math.PI) step += Math.PI * 2
    prevAngle.current = angle
    const advance = coneFillRef.current >= 1 ? (Math.abs(step) / (Math.PI * 2)) * BAR_PER_REVOLUTION : 0

    // Starts as a running line is found, as the vacuum chamber and cone heater
    // do: each lane's bar out of the nozzle and half a billet past its cutter,
    // and cut billets already lined up all the way to the stamper. From here it
    // runs exactly as before - everything moves and is cut only while the final
    // plodder turns.
    const lanesOn = recycleRouteRef?.current?.billetLanes
    const laneEndOf = (centreX: number) =>
      lanesOn?.length
        ? lanesOn.reduce((a, b) => (Math.abs(b.centreX - centreX) < Math.abs(a.centreX - centreX) ? b : a)).endZ
        : rig.lineEnd
    if (!primed.current) {
      primed.current = true
      rig.lanes.forEach((lane, laneIndex) => {
        const length = BILLET_LENGTH_WIDTHS * lane.size.x
        const front = Math.min(rig.barEnd, rig.cutterDefs[lane.cutter].cutZ + length / 2)
        const pieces: Piece[] = [{ back: rig.nozzleZ, front, attached: true, extra: 0 }]
        layBillets(pieces, front, laneEndOf(lane.centre.x), lane.size.x)
        lanePieces.current[laneIndex] = pieces
      })
      reachedStamper.current = Boolean(lanesOn?.length)
    } else if (!reachedStamper.current && lanesOn?.length) {
      // The stamper has just loaded: carry each line of billets on from where it
      // stops to the end of that lane's conveyor.
      reachedStamper.current = true
      rig.lanes.forEach((lane, laneIndex) => {
        const pieces = lanePieces.current[laneIndex]
        const last = Math.max(...pieces.map((p) => p.front))
        layBillets(pieces, last, laneEndOf(lane.centre.x), lane.size.x)
      })
    }

    rig.lanes.forEach((lane, laneIndex) => {
      const pieces = lanePieces.current[laneIndex]
      for (const piece of pieces) {
        piece.front = Math.min(piece.front + advance, piece.attached ? rig.barEnd : Infinity)
        if (!piece.attached) piece.back += advance
        // The gap opens only while the line moves, so a stopped line freezes.
        const extra = Math.min(piece.extra, advance)
        piece.extra -= extra
        piece.front += extra
        piece.back += extra
      }
      // Short bars go over the end of the cutter table onto the reject conveyor.
      const reject = rig.reject
      lanePieces.current[laneIndex] = pieces.filter((p) => {
        if (!reject || !p.short || (p.back + p.front) / 2 < reject.edgeZ) return true
        // Full: the bar at the head of the queue makes room.
        if (drops.current.length >= MAX_DROPS) drops.current.shift()
        const drop: Drop = {
          width: lane.size.x,
          height: lane.size.y,
          length: p.front - p.back,
          stage: 'toCross',
          x: lane.centre.x,
          y: lane.centre.y,
          z: (p.back + p.front) / 2,
          pitch: 0,
          time: 0,
          fallTime: 0,
          from: new THREE.Vector3(),
          to: new THREE.Vector3(),
          tip: 0,
          fromPitch: 0,
          toPitch: 0,
          quat: new THREE.Quaternion(),
          fromQuat: new THREE.Quaternion(),
        }
        startFall(drop, lane.centre.x, reject.crossTop + lane.size.y / 2, reject.crossCentreZ, TIP_ANGLE, 0)
        drops.current.push(drop)
        return false
      })
      // Off the end of the last conveyor, into whatever this viewer does not model:
      // this lane's own conveyor on toward the stampers once the stamper model is
      // loaded, the end of this model's conveyors until then.
      const laneEnd = laneEndOf(lane.centre.x)
      lanePieces.current[laneIndex] = lanePieces.current[laneIndex].filter(
        (p) => p.attached || (p.back + p.front) / 2 < laneEnd,
      )

      // This lane's cutter starts a cut once a billet's length is past it.
      const cutter = motion.current[lane.cutter]
      const attached = lanePieces.current[laneIndex].find((p) => p.attached)
      if (!cutter.turning && attached) {
        // The length is decided before the cut starts, from whether a short bar
        // is waiting - never changed halfway through one.
        const short = shortPending.current[lane.cutter] > 0 && shortEligible.current[lane.cutter]
        const length = (short ? SHORT_BAR_LENGTH_WIDTHS : BILLET_LENGTH_WIDTHS) * lane.size.x
        if (attached.front >= rig.cutterDefs[lane.cutter].cutZ + length) {
          cutter.turning = true
          cutter.short = short
        } else if (attached.front - rig.cutterDefs[lane.cutter].cutZ >= SHORT_BAR_LENGTH_WIDTHS * lane.size.x) {
          // Passed the short-bar point without being cut (not short right now,
          // or not yet at full length either) - too late for a short bar this
          // cycle, so it disqualifies from here even if pending flips on
          // before the eventual full-length cut.
          shortEligible.current[lane.cutter] = false
        }
      }
    })

    const { object: pose, quat, pos, axis, matrix } = scratch.current
    cutterParts.current.forEach((parts, index) => {
      const cutter = motion.current[index]
      if (cutter.turning) {
        // Once started a servo move completes, even if the line stops mid-cut.
        cutter.progress += delta / TURN_TIME
        if (!cutter.cut && ease(cutter.progress) >= CROSSING) {
          // Through its own lane's bar only.
          const laneIndex = rig.lanes.findIndex((lane) => lane.cutter === index)
          const pieces = lanePieces.current[laneIndex]
          const z = rig.cutterDefs[index].cutZ
          const piece = pieces.find((p) => p.back < z && z < p.front)
          if (piece && pieces.length < MAX_PIECES_PER_LANE) {
            const gap = GAP_FRACTION * rig.lanes[laneIndex].size.x
            for (const p of pieces) if (p.back >= piece.front) p.extra += gap
            pieces.push({ back: z, front: piece.front, attached: false, extra: gap + piece.extra, short: cutter.short })
            piece.front = z
            shortEligible.current[index] = true
            if (cutter.short) shortPending.current[index] = Math.max(0, shortPending.current[index] - 1)
          }
          cutter.cut = true
        }
        if (cutter.progress >= 1) {
          cutter.turns += 1
          cutter.progress = 0
          cutter.turning = false
          cutter.cut = false
        }
      }
      // Negative about +x sends the rear blade down and forward, so as it cuts it
      // is travelling WITH the bar, as a real cutter's blade does.
      const turn = REST_ANGLE - ((cutter.turns % 2) + (cutter.turning ? ease(cutter.progress) : 0)) * Math.PI
      quat.setFromAxisAngle(axis, turn)
      for (const part of parts.objects) {
        pos.copy(part.pos).sub(parts.pivot).applyQuaternion(quat).add(parts.pivot)
        placeAt(part.object, scene, matrix.compose(pos, pose.quaternion.copy(quat).multiply(part.quat), part.scale))
      }
    })

    const pendingKey = shortPending.current.join(',')
    if (pendingKey !== reportedPending.current) {
      reportedPending.current = pendingKey
      onShortBarsPending?.([...shortPending.current])
    }

    // --- short bars on their way out ----------------------------------------
    const reject = rig.reject
    if (reject) {
      const slope = (reject.highTop - reject.lowTop) / (reject.longEndZ - reject.longStartZ)
      const longTopAt = (z: number) => reject.lowTop + (z - reject.longStartZ) * slope
      // Nose up the incline: a rotation about x by -angle lifts the +z end.
      const longPitch = -Math.atan(slope)

      for (const d of drops.current) {
        if (d.stage === 'toCross' || d.stage === 'toLong') {
          d.time += delta
          const t = Math.min(1, d.time / d.fallTime)
          const s = t * t * (3 - 2 * t)
          d.x = d.from.x + (d.to.x - d.from.x) * s
          d.y = Math.max(d.to.y, d.from.y - 0.5 * GRAVITY * d.time * d.time)
          d.z = d.from.z + (d.to.z - d.from.z) * s
          d.pitch = d.fromPitch + (d.toPitch - d.fromPitch) * s + Math.sin(Math.PI * t) * d.tip
          if (t >= 1) d.stage = d.stage === 'toCross' ? 'cross' : 'long'
        } else if (d.stage === 'cross') {
          // Back toward the machine, and off the end onto the long conveyor.
          d.x -= CROSS_SPEED * delta
          if (d.x <= reject.crossEndX) {
            d.stage = 'toLong'
            const z = Math.max(d.z, reject.longStartZ + d.length / 2)
            startFall(d, reject.longCentreX, longTopAt(z) + d.height / 2, z, 0, longPitch)
          }
        }
      }

      // Up the long conveyor to its far end, where they queue nose to tail. The
      // lead bar goes first, so each one behind stops at the one in front.
      const route = recycleRouteRef?.current ?? null
      let limit = reject.longEndZ
      for (const d of drops.current.filter((b) => b.stage === 'long').sort((a, b) => b.z - a.z)) {
        d.z = Math.min(d.z + LONG_SPEED * delta, limit - d.length / 2)
        d.y = longTopAt(d.z) + d.height / 2
        d.pitch = longPitch
        limit = d.z - d.length / 2 - QUEUE_GAP
        // At the top: over onto the recycle conveyor, if the stamper is loaded.
        if (route && d.z + d.length / 2 >= reject.longEndZ - 1e-4) {
          d.stage = 'toRecycle'
          d.from.set(d.x, d.y, d.z)
          d.to.set(route.recycle.centreX, 0, route.recycle.min + d.length / 2 + 0.005)
          d.to.y = route.recycle.topAt(d.to.z) + d.height / 2
          d.time = 0
          d.fromQuat.setFromAxisAngle(axis, longPitch)
          limit = reject.longEndZ
        }
      }

      if (route) {
        const recyclePose = onRecycle(route, scratch.current.recyclePose)
        const takeawayPose = onTakeaway(route, scratch.current.takeawayPose)
        drops.current = drops.current.filter((d) => {
          if (d.stage === 'toRecycle' || d.stage === 'toTakeaway') {
            d.time += delta
            const t = Math.min(1, d.time / ROUTE_HOP_TIME)
            const s = ease(t)
            d.x = d.from.x + (d.to.x - d.from.x) * s
            d.y = d.from.y + (d.to.y - d.from.y) * s + (d.stage === 'toRecycle' ? Math.sin(Math.PI * t) * ROUTE_HOP_HEIGHT : 0)
            d.z = d.from.z + (d.to.z - d.from.z) * s
            d.quat.slerpQuaternions(d.fromQuat, d.stage === 'toRecycle' ? recyclePose : takeawayPose, s)
            if (t >= 1) d.stage = d.stage === 'toRecycle' ? 'recycle' : 'takeaway'
          } else if (d.stage === 'recycle') {
            d.z -= RECYCLE_SPEED * delta
            d.y = route.recycle.topAt(d.z) + d.height / 2
            d.quat.copy(recyclePose)
            // Mostly over the end: it tips off onto the take-away conveyor.
            if (d.z - d.length * 0.3 <= route.recycle.min) {
              d.stage = 'toTakeaway'
              d.from.set(d.x, d.y, d.z)
              d.to.set(d.x, route.takeaway.topAt(d.x) + d.height / 2, route.takeaway.centreZ)
              d.time = 0
              d.fromQuat.copy(recyclePose)
            }
          } else if (d.stage === 'takeaway') {
            d.x += TAKEAWAY_SPEED * delta
            d.y = route.takeaway.topAt(d.x) + d.height / 2
            d.quat.copy(takeawayPose)
            const lift = liftRouteRef?.current
            if (!lift) {
              // Gone once it has run off the take-away conveyor's far end.
              return d.x - d.length / 2 <= route.takeaway.max
            }
            // Mostly over the end: on up SDF_A10_0.
            if (d.x + d.length * 0.3 >= route.takeaway.max) {
              d.stage = 'onward'
              d.ride = startLiftRide(lift, new THREE.Vector3(d.x, d.y, d.z), d.quat, d.height / 2, d.length / 2)
            }
          } else if (d.stage === 'onward' && d.ride) {
            const lift = liftRouteRef?.current
            if (!lift) return false
            const alive = stepLiftRide(d.ride, lift, delta, d.height / 2, d.length / 2, IDENTITY)
            d.x = d.ride.position.x
            d.y = d.ride.position.y
            d.z = d.ride.position.z
            d.quat.copy(d.ride.quat)
            return alive
          }
          return true
        })
      }
    }

    // --- draw --------------------------------------------------------------
    let count = 0
    rig.lanes.forEach((lane, laneIndex) => {
      const mesh = laneRefs.current[laneIndex]
      // Set every frame, not just once a bar exists: Model re-applies
      // visibility to everything in the scene when parts are hidden or shown,
      // and would otherwise switch on a full-length bar nothing has extruded.
      if (mesh) mesh.visible = false
      for (const p of lanePieces.current[laneIndex]) {
        const length = p.front - p.back
        if (p.attached) {
          // The lane's own bar, shortened from its nozzle end to however much
          // is still joined to the nozzle. Its geometry is already in scene
          // space, so this is a scale about the nozzle along the line.
          if (!mesh) continue
          const factor = length / rig.fullLength
          mesh.visible = length > 0
          mesh.scale.set(1, 1, Math.max(factor, 1e-4))
          mesh.position.set(0, 0, rig.nozzleZ * (1 - factor))
          continue
        }
        if (length <= 0 || count >= billets.instanceMatrix.count) continue
        pose.position.set(lane.centre.x, lane.centre.y, (p.back + p.front) / 2)
        pose.quaternion.identity()
        pose.scale.set(lane.size.x, lane.size.y, length)
        pose.updateMatrix()
        billets.setMatrixAt(count++, pose.matrix)
      }
    })
    for (const d of drops.current) {
      if (count >= billets.instanceMatrix.count) break
      pose.position.set(d.x, d.y, d.z)
      const onRoute =
        d.stage === 'toRecycle' ||
        d.stage === 'recycle' ||
        d.stage === 'toTakeaway' ||
        d.stage === 'takeaway' ||
        d.stage === 'onward'
      if (onRoute) pose.quaternion.copy(d.quat)
      else pose.quaternion.setFromAxisAngle(axis, d.pitch)
      pose.scale.set(d.width, d.height, d.length)
      pose.updateMatrix()
      billets.setMatrixAt(count++, pose.matrix)
    }
    billets.count = count
    billets.instanceMatrix.needsUpdate = true
  })

  if (!rig) return null

  return (
    <>
      {rig.lanes.map((lane, i) => (
        <mesh
          key={i}
          ref={(mesh) => {
            laneRefs.current[i] = mesh
          }}
          geometry={lane.geometry}
          material={rig.material}
          // Hidden until bar actually comes out of the nozzle.
          visible={false}
        />
      ))}
      <instancedMesh
        ref={billetRef}
        // The bar's own material, so the billets are unmistakably the same soap.
        args={[rig.billet, rig.material, MAX_PIECES_PER_LANE * 2 + MAX_DROPS]}
        frustumCulled={false}
      />
    </>
  )
}

useGLTF.preload(BILLET_URL)
