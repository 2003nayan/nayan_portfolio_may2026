import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
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

interface StamperSuctionProps {
  // The stamper model's own scene. Everything here is placed in its coordinates.
  scene: THREE.Object3D
  // Which lanes are running, as [L5, L6, L7, L8]: L5/L6 are stamper 1's two
  // conveyors and L7/L8 stamper 2's, each in STAMPERS[].conveyors order. A
  // stamper starts new cycles only while one of its lanes runs, and puts each
  // set only on a running lane's conveyor. A cycle in progress always finishes,
  // and soaps already on a conveyor ride on to its end.
  lanes: readonly boolean[]
  // Where the measured scrap route is published for BilletCutter's short bars.
  recycleRouteRef?: React.MutableRefObject<RecycleRoute | null>
  // Fringe strips and rejected soaps dropped per minute (the plant's
  // fringe_count and recycle_soap_count). Both ride the scrap route.
  fringePerMinute?: number
  recycledSoapPerMinute?: number
  // SDF_A10_0 and the pre-plodder hopper, measured by the main model. Scrap
  // carries on from the take-away conveyor up it and into the hopper.
  liftRouteRef?: React.MutableRefObject<LiftRoute | null>
}

// The finished soap the cups carry. Authored in the stamper model's own
// coordinates, in one of stamper 1's cups, so it is already the right size.
const SOAP_URL = '/models/soap-line/soap.glb'
// Which cup that is: the fifth on stamper 1, whose soap body is joined to it to
// make the whole soap.
const SOAP_CUP = { stamper: 0, cup: 4 }

// The fringe - the flash of surplus soap left around the row of bars - drops
// from under the stampers, as many a minute as the plant counts, taking turns
// between the two. Rejected soaps take the same route.
// The file is in millimetres with the strip's length along x; it is scaled to
// run the length of one stamper's row of cups.
//
// Its route:
//   1. Down onto the recycle conveyor under the soap conveyors.
//   2. Up it, back toward the plodder, to its high end.
//   3. Off that end onto the take-away conveyor crossing beneath it, 5 cm lower -
//      the stampers themselves are 30-50 cm too far along to reach it directly.
//   4. Along the take-away conveyor, uphill, to its far end.
//   5. Up onto SDF_A10_0, along it, and into the pre-plodder hopper (LiftRide).
const FRINGE_URL = '/models/soap-line/fringe.glb'
const RECYCLE_CONVEYOR = 'Object_1044'
const TAKEAWAY_CONVEYOR = 'Object_24'
// The billet lanes continuing on from the billet cutters' conveyors - one per
// lane, the first ending at stamper 1, the second past stamper 2. Not animated
// here: measured only, for BilletCutter's billets to ride.
const BILLET_LANE_CONVEYORS = ['Object_244', 'Object_2576']
// How far below the cups the fringe starts to fall.
const FRINGE_START_BELOW = 0.02
const FRINGE_FALL_TIME = 0.45
// Falling off the recycle conveyor's end onto the take-away conveyor, seconds.
const FRINGE_HANDOFF_TIME = 0.4
// On the route at once: ~90 fringes and ~500 soaps a minute over a trip of
// about a minute. Past these the oldest is taken off.
const MAX_FRINGES = 200
const MAX_RECYCLED_SOAPS = 700
// How much of a recycle conveyor's width rejected soaps spread across, so a
// stream of them reads as a pile rather than a single file.
const SOAP_SPREAD = 0.5

// The two suction heads. Each carries 7 soaps, one per suction unit, and drops
// each set on the next of its two conveyors in turn.
//
// Each soap in a cup is two parts of the model, in cup order: `soaps` and the
// larger `bodies` they sit in. Both are hidden - otherwise they stay on the cups
// after every drop - and together they give the exact grip points. `head` is the region the moving head occupies - every part
// fully inside it moves as one rigid group: the 7 suction units with their cup
// pads, the common bar, its end blocks, rail and hose fittings. Measured from
// the model; the other side of the stamper frame starts at x -0.3466. `fixed`
// parts lie inside that region but belong to the stamper, and stay put.
const STAMPERS = [
  {
    soaps: ['Object_688', 'Object_1220', 'Object_1620', 'Object_930', 'Object_2420', 'Object_2408', 'Object_1928'],
    bodies: ['Object_2568', 'Object_2238', 'Object_2422', 'Object_3260', 'Object_2418', 'Object_1716', 'Object_3082'],
    bar: 'Object_2300',
    fixed: ['Object_1080'],
    head: new THREE.Box3(new THREE.Vector3(-0.3445, 0.2125, 0.8), new THREE.Vector3(-0.298, 0.252, 0.923)),
    conveyors: ['Object_3698', 'Object_3706'],
  },
  {
    soaps: ['Object_220', 'Object_3276', 'Object_3624', 'Object_2988', 'Object_2966', 'Object_2950', 'Object_3330'],
    bodies: ['Object_144', 'Object_2304', 'Object_1936', 'Object_2312', 'Object_3452', 'Object_3476', 'Object_2390'],
    bar: 'Object_2992',
    fixed: ['Object_218'],
    head: new THREE.Box3(new THREE.Vector3(-0.3445, 0.2125, 0.923), new THREE.Vector3(-0.298, 0.252, 1.04)),
    conveyors: ['Object_3714', 'Object_3724'],
  },
]

// One cycle, seconds: carry the soaps across, swing down, let go, swing back up,
// come back, wait.
//
// The arms stick out sideways from the common bar with the cups on their outer
// ends, holding each soap upright - the pose the soaps are picked in. Swinging
// the arms 90 degrees down about the bar points the cups at the belt and lays
// each soap flat, its underside 1.4 mm above the conveyor. So the swing is the
// put-down: there is no separate lowering.
//
// The head crosses BEFORE swinging, while the soaps are still up out of the way:
// swung down, they would pass through soaps already riding the nearer conveyors.
//
// Every step runs at twice its first-tuned speed; the conveyors do not, so the
// sets land closer together on the belt but still clear of each other.
const HOLD = 0.15
const ACROSS = 0.5
const SWING_DOWN = 0.25
const PAUSE = 0.1
const SWING_UP = 0.25
const BACK = 0.5
const WAIT = 0.4
const CYCLE = HOLD + ACROSS + SWING_DOWN + PAUSE + SWING_UP + BACK + WAIT
const RELEASE_AT = HOLD + ACROSS + SWING_DOWN
// Down is a negative turn about +z: it carries the cups, on the +x side of the
// bar, straight down.
const SWING = -Math.PI / 2
// A released soap settles the last little way onto the belt, seconds.
const DROP_TIME = 0.05
// Conveyor speed, scene units/s, down the line toward the conveyors' far end.
const BELT_SPEED = 0.04
const MAX_SOAPS = 96

// A fringe strip or rejected soap on the scrap route.
interface Scrap {
  stage: 'fall' | 'recycle' | 'handoff' | 'takeaway' | 'onward'
  // Across the recycle conveyor: its offset from the belt's centreline.
  offsetX: number
  ride?: LiftRide
  // Where the current fall started.
  fromX: number
  fromY: number
  fromZ: number
  x: number
  z: number
  // Seconds into the current fall.
  time: number
}

/**
 * A sloping conveyor's top surface: its extent along `axis`, and the height of
 * its top at each end. Measured at the ends because a bounding box only knows
 * the highest point of a slope.
 */
function measureSlope(scene: THREE.Object3D, mesh: THREE.Mesh, axis: 'x' | 'z') {
  const box = sceneBounds(scene, mesh)
  const matrix = getSceneRelativeMatrix(mesh, scene, new THREE.Matrix4())
  const position = mesh.geometry.attributes.position
  const v = new THREE.Vector3()
  const reach = (box.max[axis] - box.min[axis]) * 0.05
  let startTop = -Infinity
  let endTop = -Infinity
  for (let i = 0; i < position.count; i++) {
    v.fromBufferAttribute(position, i).applyMatrix4(matrix)
    if (v[axis] < box.min[axis] + reach) startTop = Math.max(startTop, v.y)
    if (v[axis] > box.max[axis] - reach) endTop = Math.max(endTop, v.y)
  }
  const min = box.min[axis]
  const max = box.max[axis]
  const slope = (endTop - startTop) / (max - min)
  return { box, min, max, slope, topAt: (at: number) => startTop + (at - min) * slope }
}

interface Captured {
  object: THREE.Object3D
  pos: THREE.Vector3
  quat: THREE.Quaternion
  scale: THREE.Vector3
}

interface Soap {
  // Where it was let go, and the height it settles to.
  x: number
  fromY: number
  restY: number
  z: number
  // Seconds since release.
  time: number
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

/**
 * `mesh`'s geometry transformed by `matrix`, as plain float positions and normals.
 * The stamper model's geometry is quantized and the soap file's is not, and
 * mergeGeometries will only join attributes stored the same way.
 */
function bakeGeometry(mesh: THREE.Mesh, matrix: THREE.Matrix4) {
  const source = mesh.geometry
  const position = source.attributes.position
  const positions = new Float32Array(position.count * 3)
  const v = new THREE.Vector3()
  for (let i = 0; i < position.count; i++) v.fromBufferAttribute(position, i).applyMatrix4(matrix).toArray(positions, i * 3)
  const baked = new THREE.BufferGeometry()
  baked.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  if (source.index) baked.setIndex(Array.from(source.index.array))
  baked.computeVertexNormals()
  return baked
}

/** Poses `object` at a scene-relative matrix, whatever its parent chain. */
function placeAt(object: THREE.Object3D, scene: THREE.Object3D, sceneMatrix: THREE.Matrix4) {
  if (!object.parent) return
  getSceneRelativeMatrix(object.parent, scene, new THREE.Matrix4())
    .invert()
    .multiply(sceneMatrix)
    .decompose(object.position, object.quaternion, object.scale)
}

function ease(t: number) {
  const c = THREE.MathUtils.clamp(t, 0, 1)
  return c * c * (3 - 2 * c)
}

/**
 * Where a head is `t` seconds into its cycle: how far across it has moved, how
 * far its arms have swung about the bar, and whether its soaps are still held.
 */
function headAt(t: number, acrossBy: number) {
  const across = (from: number, to: number) => acrossBy * (from + (to - from))
  if (t < HOLD) return { x: 0, angle: 0, holding: true }
  let at = t - HOLD
  if (at < ACROSS) return { x: across(0, ease(at / ACROSS)), angle: 0, holding: true }
  at -= ACROSS
  if (at < SWING_DOWN) return { x: acrossBy, angle: SWING * ease(at / SWING_DOWN), holding: true }
  at -= SWING_DOWN
  if (at < PAUSE) return { x: acrossBy, angle: SWING, holding: false }
  at -= PAUSE
  if (at < SWING_UP) return { x: acrossBy, angle: SWING * (1 - ease(at / SWING_UP)), holding: false }
  at -= SWING_UP
  if (at < BACK) return { x: acrossBy * (1 - ease(at / BACK)), angle: 0, holding: false }
  return { x: 0, angle: 0, holding: false }
}

/**
 * The two stampers' suction heads, carrying finished soaps from the cups to the
 * conveyors running down the line.
 *
 * Each cycle a set of 7 soaps is in the cups; the head carries them across,
 * lowers, lets go, and returns, alternating between its two conveyors - or using
 * only one, when the other's lane is stopped. Released soaps tip over, land
 * flat, and ride to the conveyor's far end. The two stampers run half a cycle
 * apart.
 */
export function StamperSuction({
  scene,
  lanes,
  recycleRouteRef,
  fringePerMinute,
  recycledSoapPerMinute,
  liftRouteRef,
}: StamperSuctionProps) {
  const soapRef = useRef<THREE.InstancedMesh>(null)
  const soapGltf = useGLTF(SOAP_URL)
  const fringeRef = useRef<THREE.InstancedMesh>(null)
  const recycledSoapRef = useRef<THREE.InstancedMesh>(null)
  const fringeGltf = useGLTF(FRINGE_URL)

  const rig = useMemo(() => {
    const source = soapGltf.scene.getObjectByProperty('isMesh', true) as THREE.Mesh | undefined
    if (!source) return null

    // The whole soap: the soap file joined with the body it sits in, both in the
    // stamper's coordinates, then centred on the origin at their real size.
    const cupBody = scene.getObjectByName(STAMPERS[SOAP_CUP.stamper].bodies[SOAP_CUP.cup]) as THREE.Mesh | undefined
    if (!cupBody?.isMesh) return null
    soapGltf.scene.updateWorldMatrix(true, true)
    const joined = mergeGeometries([
      bakeGeometry(source, new THREE.Matrix4().copy(soapGltf.scene.matrixWorld).invert().multiply(source.matrixWorld)),
      bakeGeometry(cupBody, getSceneRelativeMatrix(cupBody, scene, new THREE.Matrix4())),
    ])
    if (!joined) return null
    const geometry = joined
    geometry.computeBoundingBox()
    const soapSize = geometry.boundingBox!.getSize(new THREE.Vector3())
    geometry.translate(...geometry.boundingBox!.getCenter(new THREE.Vector3()).negate().toArray())
    geometry.computeBoundingSphere()

    const stampers = STAMPERS.map((def) => {
      const soaps = def.soaps.map((name) => scene.getObjectByName(name))
      const bodies = def.bodies.map((name) => scene.getObjectByName(name))
      const conveyors = def.conveyors.map((name) => scene.getObjectByName(name))
      if ([...soaps, ...bodies, ...conveyors].some((o) => !o)) return null
      const soapSet = new Set([...soaps, ...bodies])
      const fixed = new Set(def.fixed)
      const head: THREE.Object3D[] = []
      scene.traverse((object) => {
        if (!(object as THREE.Mesh).isMesh || soapSet.has(object) || fixed.has(object.name)) return
        if (def.head.containsBox(sceneBounds(scene, object))) head.push(object)
      })
      // Each soap's centre: its two parts taken together, as the joined geometry is.
      const grips = soaps.map((s, i) =>
        sceneBounds(scene, s!).union(sceneBounds(scene, bodies[i]!)).getCenter(new THREE.Vector3()),
      )
      const belts = conveyors.map((c) => {
        const box = sceneBounds(scene, c!)
        return { centreX: (box.min.x + box.max.x) / 2, top: box.max.y, endZ: box.max.z }
      })
      const bar = scene.getObjectByName(def.bar)
      if (!bar) return null
      // The arms swing about the common bar's own axis, which runs along z.
      const pivot = sceneBounds(scene, bar).getCenter(new THREE.Vector3())
      // Where a held soap's centre lands once swung down, relative to its x before:
      // a quarter turn takes its height above the bar to a distance along x.
      const swungX = pivot.x + (grips[0].y - pivot.y) - grips[0].x
      return { head, soapNames: [...def.soaps, ...def.bodies], grips, belts, pivot, swungX }
    })
    if (stampers.some((s) => !s)) {
      console.warn('[stamperSuction] stamper parts not found in the model; skipping the suction heads.')
      return null
    }

    const done = stampers as NonNullable<(typeof stampers)[number]>[]
    return {
      geometry,
      // Its own, not the file's: that is a specular-glossiness one three.js no
      // longer reads, so it would not reliably take the SKU's colour.
      material: new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.6, metalness: 0 }),
      // Where soaps leave: the far end of the conveyors.
      beltEnd: Math.max(...done.flatMap((st) => st.belts.map((b) => b.endZ))),
      fringe: (() => {
        const source = fringeGltf.scene.getObjectByProperty('isMesh', true) as THREE.Mesh | undefined
        const recycle = scene.getObjectByName(RECYCLE_CONVEYOR) as THREE.Mesh | undefined
        const takeaway = scene.getObjectByName(TAKEAWAY_CONVEYOR) as THREE.Mesh | undefined
        if (!source || !recycle?.isMesh || !takeaway?.isMesh) return null
        fringeGltf.scene.updateWorldMatrix(true, true)
        const fringeGeometry = bakeGeometry(
          source,
          new THREE.Matrix4().copy(fringeGltf.scene.matrixWorld).invert().multiply(source.matrixWorld),
        )
        fringeGeometry.computeBoundingBox()
        const native = fringeGeometry.boundingBox!.getSize(new THREE.Vector3())
        fringeGeometry.translate(...fringeGeometry.boundingBox!.getCenter(new THREE.Vector3()).negate().toArray())
        // Lay the strip along the line: its length (x) along z, its width (y)
        // across x, its thickness (z) upright.
        fringeGeometry.applyMatrix4(new THREE.Matrix4().set(0, 1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 1))
        const grips = done[0].grips
        // From the first soap's outer edge to the last's.
        const rowLength = Math.abs(grips[grips.length - 1].z - grips[0].z) + soapSize.z
        const scale = rowLength / native.x
        fringeGeometry.scale(scale, scale, scale)
        fringeGeometry.computeVertexNormals()
        fringeGeometry.computeBoundingSphere()

        const recycleSlope = measureSlope(scene, recycle, 'z')
        const takeawaySlope = measureSlope(scene, takeaway, 'x')
        return {
          geometry: fringeGeometry,
          thickness: native.z * scale,
          halfLength: rowLength / 2,
          recycle: { ...recycleSlope, centreX: (recycleSlope.box.min.x + recycleSlope.box.max.x) / 2 },
          takeaway: { ...takeawaySlope, centreZ: (takeawaySlope.box.min.z + takeawaySlope.box.max.z) / 2 },
        }
      })(),
      soapSize,
      stampers: done,
    }
  }, [scene, soapGltf, fringeGltf])
  // The finished soap's colour, and the fringe's and rejects' with it: all
  // the same soap. Recoloured in place on a SKU changeover; see useTint.
  useTint(rig?.material, useProductColor().soap)

  const heads = useRef<Captured[][]>([])
  // Per stamper: seconds into the current cycle (null while idle) and which of
  // its two conveyors the next set goes to.
  // `started` marks a stamper that has run since the last stop, so it keeps its
  // own rhythm instead of waiting on the other again.
  const cycles = useRef(STAMPERS.map(() => ({ time: null as number | null, conveyor: 0, started: false, atRest: false })))
  const onBelts = useRef<Soap[]>([])
  const fringes = useRef<Scrap[]>([])
  const recycledSoaps = useRef<Scrap[]>([])
  // Fractional pieces owed by the per-minute rates, and which stamper drops next.
  const accrued = useRef({ fringe: 0, soap: 0, nextStamper: 0 })
  const scratch = useRef({
    object: new THREE.Object3D(),
    matrix: new THREE.Matrix4(),
    pos: new THREE.Vector3(),
    turn: new THREE.Quaternion(),
    flat: new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), SWING),
    zAxis: new THREE.Vector3(0, 0, 1),
    xAxis: new THREE.Vector3(1, 0, 0),
    onRecycle: new THREE.Quaternion(),
    onTakeaway: new THREE.Quaternion(),
    identity: new THREE.Quaternion(),
  })

  useEffect(() => {
    if (!rig) return
    heads.current = rig.stampers.map((s) => s.head.map((object) => capture(object, scene)))
    if (soapRef.current) soapRef.current.raycast = () => {}
    if (fringeRef.current) fringeRef.current.raycast = () => {}
    if (recycledSoapRef.current) recycledSoapRef.current.raycast = () => {}
    return () => {
      const m = new THREE.Matrix4()
      for (const parts of heads.current) {
        for (const part of parts) placeAt(part.object, scene, m.compose(part.pos, part.quat, part.scale))
      }
      for (const stamper of rig.stampers) {
        for (const name of stamper.soapNames) {
          const soap = scene.getObjectByName(name)
          if (soap) soap.visible = true
        }
      }
      heads.current = []
    }
  }, [rig, scene])

  useEffect(() => {
    if (!recycleRouteRef) return
    const route = rig?.fringe
    const lanes = BILLET_LANE_CONVEYORS.map((name) => scene.getObjectByName(name))
    recycleRouteRef.current =
      route && lanes.every(Boolean)
        ? {
            recycle: route.recycle,
            takeaway: route.takeaway,
            billetLanes: lanes.map((lane) => {
              const box = sceneBounds(scene, lane!)
              return { centreX: (box.min.x + box.max.x) / 2, endZ: box.max.z }
            }),
          }
        : null
    return () => {
      recycleRouteRef.current = null
    }
  }, [rig, scene, recycleRouteRef])

  useEffect(() => {
    return () => {
      rig?.geometry.dispose()
      rig?.material.dispose()
      rig?.fringe?.geometry.dispose()
    }
  }, [rig])

  useFrame((_, delta) => {
    const mesh = soapRef.current
    if (!rig || !mesh) return
    const { object: pose, matrix, pos, turn, flat, zAxis } = scratch.current
    let count = 0

    // Lane k of stamper i is lanes[i * 2 + k].
    const laneRunning = (stamper: number, conveyor: number) => lanes[stamper * 2 + conveyor] ?? false
    const stamperRunning = (stamper: number) =>
      rig.stampers[stamper].belts.some((_, conveyor) => laneRunning(stamper, conveyor))

    rig.stampers.forEach((stamper, index) => {
      const running = stamperRunning(index)
      // Hidden every frame: StaticModel re-applies visibility to the whole model
      // whenever parts are hidden or shown, and would bring these back.
      for (const name of stamper.soapNames) {
        const soap = scene.getObjectByName(name)
        if (soap) soap.visible = false
      }

      const cycle = cycles.current[index]
      if (cycle.time === null && !running) cycle.started = false
      if (cycle.time === null && running) {
        // Stamper 2 first starts half a cycle after stamper 1, so they alternate -
        // unless stamper 1 is not running, when there is nothing to wait for.
        const first = cycles.current[0]
        if (
          index === 0 ||
          cycle.started ||
          !stamperRunning(0) ||
          (first.time !== null && first.time >= CYCLE / 2)
        ) {
          cycle.time = 0
          cycle.started = true
          // Only onto a running lane: if the conveyor that is next in turn has
          // stopped, this set goes to the other one.
          if (!laneRunning(index, cycle.conveyor)) {
            cycle.conveyor = stamper.belts.findIndex((_, conveyor) => laneRunning(index, conveyor))
          }
        }
      }

      // Far enough across that, once swung down, the soaps lie on the belt's
      // centreline.
      const belt = stamper.belts[cycle.conveyor]
      const acrossBy = belt.centreX - (stamper.grips[0].x + stamper.swungX)
      let state = { x: 0, angle: 0, holding: false }
      if (cycle.time !== null) {
        const before = cycle.time
        cycle.time += delta
        state = headAt(cycle.time, acrossBy)
        if (before < RELEASE_AT && cycle.time >= RELEASE_AT) {
          // Let go: the set is lying flat just above this conveyor.
          const lying = headAt(RELEASE_AT, acrossBy)
          turn.setFromAxisAngle(zAxis, lying.angle)
          for (const grip of stamper.grips) {
            if (onBelts.current.length >= MAX_SOAPS) onBelts.current.shift()
            pos.copy(grip).sub(stamper.pivot).applyQuaternion(turn).add(stamper.pivot)
            onBelts.current.push({
              x: pos.x + lying.x,
              fromY: pos.y,
              // Flat on the belt: its thickness is now its height.
              restY: belt.top + rig.soapSize.x / 2,
              z: grip.z,
              time: 0,
            })
          }
        }
        if (cycle.time >= CYCLE) {
          cycle.time = null
          cycle.conveyor = (cycle.conveyor + 1) % stamper.belts.length
        }
      }
      turn.setFromAxisAngle(zAxis, state.angle)

      // The head: swung about the bar, then moved across. Skipped once parked,
      // since an idle head has nowhere to go and there are over a hundred parts.
      if (cycle.time !== null || !cycle.atRest) {
        for (const part of heads.current[index] ?? []) {
          pos.copy(part.pos).sub(stamper.pivot).applyQuaternion(turn).add(stamper.pivot)
          pos.x += state.x
          pose.quaternion.copy(turn).multiply(part.quat)
          placeAt(part.object, scene, matrix.compose(pos, pose.quaternion, part.scale))
        }
        cycle.atRest = cycle.time === null
      }

      // Soaps still in the cups turn and travel with it.
      if (state.holding || (cycle.time === null && running)) {
        for (const grip of stamper.grips) {
          if (count >= MAX_SOAPS) break
          pose.position.copy(grip).sub(stamper.pivot).applyQuaternion(turn).add(stamper.pivot)
          pose.position.x += state.x
          pose.quaternion.copy(turn)
          pose.scale.setScalar(1)
          pose.updateMatrix()
          mesh.setMatrixAt(count++, pose.matrix)
        }
      }
    })

    // Released soaps: settle onto the belt, then ride down the line.
    onBelts.current = onBelts.current.filter((soap) => {
      soap.time += delta
      const t = Math.min(1, soap.time / DROP_TIME)
      if (t >= 1) soap.z += BELT_SPEED * delta
      if (count < MAX_SOAPS) {
        pose.position.set(soap.x, soap.fromY + (soap.restY - soap.fromY) * t * t, soap.z)
        pose.quaternion.copy(flat)
        pose.scale.setScalar(1)
        pose.updateMatrix()
        mesh.setMatrixAt(count++, pose.matrix)
      }
      return soap.z < rig.beltEnd
    })

    // Scrap - fringe and rejected soaps - along its route (see FRINGE_URL).
    const route = rig.fringe
    if (route) {
      const { recycle, takeaway } = route
      const recycleWidth = recycle.box.max.x - recycle.box.min.x
      const acc = accrued.current
      acc.fringe += ((fringePerMinute ?? 0) / 60) * delta
      acc.soap += ((recycledSoapPerMinute ?? 0) / 60) * delta

      // New pieces fall from under the stampers, which take turns.
      const spawn = (list: Scrap[], max: number, spread: boolean) => {
        const grips = rig.stampers[acc.nextStamper].grips
        acc.nextStamper = (acc.nextStamper + 1) % rig.stampers.length
        const first = grips[0].z
        const last = grips[grips.length - 1].z
        const z = spread ? first + (last - first) * Math.random() : (first + last) / 2
        if (list.length >= max) list.shift()
        list.push({
          stage: 'fall',
          offsetX: spread ? (Math.random() - 0.5) * recycleWidth * SOAP_SPREAD : 0,
          fromX: grips[0].x,
          fromY: grips[0].y - FRINGE_START_BELOW,
          fromZ: z,
          x: grips[0].x,
          z,
          time: 0,
        })
      }
      for (; acc.fringe >= 1; acc.fringe -= 1) spawn(fringes.current, MAX_FRINGES, false)
      for (; acc.soap >= 1; acc.soap -= 1) spawn(recycledSoaps.current, MAX_RECYCLED_SOAPS, true)

      // Lying along each slope - see recycleRoute.
      const recyclePose = onRecycle(route, scratch.current.onRecycle)
      const takeawayPose = onTakeaway(route, scratch.current.onTakeaway)
      const lift = liftRouteRef?.current ?? null

      /**
       * Moves one piece a frame along the route and poses it, or returns false
       * once it is gone. `base` is its resting turn on a flat belt along z.
       */
      const step = (f: Scrap, halfHeight: number, halfLength: number, base: THREE.Quaternion) => {
        let y: number
        if (f.stage === 'fall') {
          // Straight down first, drifting across late, so it passes under the soap
          // conveyors rather than through them.
          f.time += delta
          const t = Math.min(1, f.time / FRINGE_FALL_TIME)
          f.x = f.fromX + (recycle.centreX + f.offsetX - f.fromX) * t * t * t
          y = f.fromY + (recycle.topAt(f.z) + halfHeight - f.fromY) * t * t
          pose.quaternion.copy(recyclePose).multiply(base)
          if (t >= 1) f.stage = 'recycle'
        } else if (f.stage === 'recycle') {
          f.z -= RECYCLE_SPEED * delta
          y = recycle.topAt(f.z) + halfHeight
          pose.quaternion.copy(recyclePose).multiply(base)
          // Mostly over the end: it tips off onto the take-away conveyor.
          if (f.z - halfLength * 0.3 <= recycle.min) {
            f.stage = 'handoff'
            f.fromX = f.x
            f.fromY = y
            f.fromZ = f.z
            f.time = 0
          }
        } else if (f.stage === 'handoff') {
          f.time += delta
          const t = Math.min(1, f.time / FRINGE_HANDOFF_TIME)
          const s = ease(t)
          f.z = f.fromZ + (takeaway.centreZ - f.fromZ) * s
          y = f.fromY + (takeaway.topAt(f.x) + halfHeight - f.fromY) * t * t
          pose.quaternion.slerpQuaternions(recyclePose, takeawayPose, s).multiply(base)
          if (t >= 1) f.stage = 'takeaway'
        } else if (f.stage === 'takeaway') {
          f.x += TAKEAWAY_SPEED * delta
          y = takeaway.topAt(f.x) + halfHeight
          pose.quaternion.copy(takeawayPose).multiply(base)
          if (!lift) {
            // Gone once it has run off the take-away conveyor's far end.
            if (f.x - halfLength > takeaway.max) return false
          } else if (f.x + halfLength * 0.3 >= takeaway.max) {
            // Mostly over the end: on up SDF_A10_0.
            f.stage = 'onward'
            f.ride = startLiftRide(lift, pos.set(f.x, y, f.z), pose.quaternion, halfHeight, halfLength)
          }
        } else {
          if (!lift || !f.ride) return false
          const alive = stepLiftRide(f.ride, lift, delta, halfHeight, halfLength, base)
          f.x = f.ride.position.x
          f.z = f.ride.position.z
          y = f.ride.position.y
          pose.quaternion.copy(f.ride.quat)
          if (!alive) return false
        }
        pose.position.set(f.x, y, f.z)
        pose.scale.setScalar(1)
        pose.updateMatrix()
        return true
      }

      const fringeMesh = fringeRef.current
      if (fringeMesh) {
        let drawn = 0
        const identity = scratch.current.identity
        fringes.current = fringes.current.filter((f) => {
          if (!step(f, route.thickness / 2, route.halfLength, identity)) return false
          if (drawn < MAX_FRINGES) fringeMesh.setMatrixAt(drawn++, pose.matrix)
          return true
        })
        fringeMesh.count = drawn
        fringeMesh.instanceMatrix.needsUpdate = true
      }

      const soapMesh = recycledSoapRef.current
      if (soapMesh) {
        let drawn = 0
        // Flat, as on the soap conveyors: its thickness is its height.
        const halfHeight = rig.soapSize.x / 2
        const halfLength = Math.max(rig.soapSize.y, rig.soapSize.z) / 2
        recycledSoaps.current = recycledSoaps.current.filter((f) => {
          if (!step(f, halfHeight, halfLength, flat)) return false
          if (drawn < MAX_RECYCLED_SOAPS) soapMesh.setMatrixAt(drawn++, pose.matrix)
          return true
        })
        soapMesh.count = drawn
        soapMesh.instanceMatrix.needsUpdate = true
      }
    }

    mesh.count = count
    mesh.instanceMatrix.needsUpdate = true
  })

  if (!rig) return null

  return (
    <>
      <instancedMesh ref={soapRef} args={[rig.geometry, rig.material, MAX_SOAPS]} frustumCulled={false} />
      {rig.fringe ? (
        // The same colour as the soaps: the fringe is the same soap, trimmed off.
        <instancedMesh
          ref={fringeRef}
          args={[rig.fringe.geometry, rig.material, MAX_FRINGES]}
          frustumCulled={false}
        />
      ) : null}
      {/* Rejected soaps on the scrap route: the same soap as the good ones. */}
      <instancedMesh ref={recycledSoapRef} args={[rig.geometry, rig.material, MAX_RECYCLED_SOAPS]} frustumCulled={false} />
    </>
  )
}

useGLTF.preload(SOAP_URL)
useGLTF.preload(FRINGE_URL)
