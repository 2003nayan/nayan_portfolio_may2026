import * as THREE from 'three'

/**
 * Conveyors in the stamper model that the main model's product rides on, shared
 * between the two models.
 *
 * The billet lanes and the scrap route - recycle and take-away conveyors - are
 * in the stamper model, but billets and short bars from the billet cutters, in
 * the main model, ride them. The two models share coordinates, so StamperSuction
 * measures them once and publishes them here; BilletCutter reads them. Null
 * until the stamper model has loaded.
 */

/** A sloping conveyor's top: its extent along its own axis and height along it. */
export interface SlopedConveyor {
  min: number
  max: number
  slope: number
  topAt: (at: number) => number
}

export interface RecycleRoute {
  // Runs along z, carried toward its high end at `min`.
  recycle: SlopedConveyor & { centreX: number }
  // Runs along x under the recycle conveyor's high end, carried toward `max`.
  takeaway: SlopedConveyor & { centreZ: number }
  // The two lane conveyors carrying billets on toward the stampers, continuing
  // the billet conveyors in +z: where each lane sits across the line, and where
  // it ends.
  billetLanes: { centreX: number; endZ: number }[]
}

// Both conveyors' speeds, scene units/s - one pair of numbers, so the fringe and
// the short bars riding the same belts can never move at different rates.
export const RECYCLE_SPEED = 0.05
export const TAKEAWAY_SPEED = 0.05

const X_AXIS = new THREE.Vector3(1, 0, 0)
const Y_AXIS = new THREE.Vector3(0, 1, 0)
const Z_AXIS = new THREE.Vector3(0, 0, 1)
const quarter = new THREE.Quaternion().setFromAxisAngle(Y_AXIS, Math.PI / 2)

/** A piece lying along the recycle conveyor: length along z, tilted with the slope. */
export function onRecycle(route: Pick<RecycleRoute, 'recycle'>, target: THREE.Quaternion) {
  return target.setFromAxisAngle(X_AXIS, -Math.atan(route.recycle.slope))
}

/** A piece lying along the take-away conveyor: turned a quarter to run along x. */
export function onTakeaway(route: Pick<RecycleRoute, 'takeaway'>, target: THREE.Quaternion) {
  return target.setFromAxisAngle(Z_AXIS, Math.atan(route.takeaway.slope)).multiply(quarter)
}

// ── onward to the pre-plodder hopper ─────────────────────────────────────────
//
// Everything on the scrap route - fringe, rejected soaps, short bars - leaves the
// take-away conveyor's far end onto SDF_A10_0, the long recycle conveyor in the
// main model, climbs it, and tips off its high end into the pre-plodder hopper.
// SDF_A10_0 is a closed housing about 4.6 cm tall; pieces ride INSIDE it, on its
// floor. The take-away conveyor ends ~3 cm below that floor, so pieces hop up
// into it.

/** The long recycle conveyor and the hopper it feeds, in the main model. */
export interface LiftRoute {
  // SDF_A10_0: runs along z, carried toward its high end at `min`.
  lift: SlopedConveyor & { centreX: number }
  // Where product drops into the pre-plodder hopper, and its funnel floor.
  hopper: { x: number; z: number; floorY: number }
  // Height of the soap already in that hopper (HopperFill); pieces land on it.
  fillYRef: React.MutableRefObject<number>
}

export const LIFT_MESH = 'SDF_A10_0'
export const LIFT_SPEED = 0.05
// Pieces ride this far above the housing's floor, so they never z-fight it.
const FLOOR_CLEARANCE = 0.002
// The hop from the take-away conveyor up onto SDF_A10_0, seconds and extra arc.
const LIFT_HOP_TIME = 0.6
const LIFT_HOP_ARC = 0.04
const GRAVITY = 9.81

function sceneMatrix(object: THREE.Object3D, scene: THREE.Object3D) {
  scene.updateWorldMatrix(true, false)
  object.updateWorldMatrix(true, false)
  return new THREE.Matrix4().copy(scene.matrixWorld).invert().multiply(object.matrixWorld)
}

/**
 * Measures SDF_A10_0 and the hopper in `scene`'s coordinates. The belt is the
 * housing's floor: the lowest point at each end of its length, and the line
 * between them.
 */
export function measureLiftRoute(
  scene: THREE.Object3D,
  hopperName: string,
  fillYRef: React.MutableRefObject<number>,
): LiftRoute | null {
  const lift = scene.getObjectByName(LIFT_MESH) as THREE.Mesh | undefined
  const hopper = scene.getObjectByName(hopperName) as THREE.Mesh | undefined
  if (!lift?.isMesh || !hopper?.isMesh) return null

  const matrix = sceneMatrix(lift, scene)
  lift.geometry.computeBoundingBox()
  const box = lift.geometry.boundingBox!.clone().applyMatrix4(matrix)
  const position = lift.geometry.attributes.position
  const v = new THREE.Vector3()
  const reach = (box.max.z - box.min.z) * 0.03
  // The floor's two ends: the lowest vertex near each end, with where it sits.
  const high = new THREE.Vector3(0, Infinity, 0)
  const low = new THREE.Vector3(0, Infinity, 0)
  for (let i = 0; i < position.count; i++) {
    v.fromBufferAttribute(position, i).applyMatrix4(matrix)
    if (v.z < box.min.z + reach && v.y < high.y) high.copy(v)
    if (v.z > box.max.z - reach && v.y < low.y) low.copy(v)
  }
  const slope = (low.y - high.y) / (low.z - high.z)
  const floorAt = (at: number) => high.y + FLOOR_CLEARANCE + (at - high.z) * slope

  hopper.geometry.computeBoundingBox()
  const hopperBox = hopper.geometry.boundingBox!.clone().applyMatrix4(sceneMatrix(hopper, scene))

  return {
    lift: {
      min: box.min.z,
      max: box.max.z,
      slope,
      topAt: floorAt,
      centreX: (box.min.x + box.max.x) / 2,
    },
    hopper: {
      x: (hopperBox.min.x + hopperBox.max.x) / 2,
      z: (hopperBox.min.z + hopperBox.max.z) / 2,
      floorY: hopperBox.min.y,
    },
    fillYRef,
  }
}

/** A piece lying along SDF_A10_0: length along z, tilted with its climb. */
export function onLift(route: Pick<LiftRoute, 'lift'>, target: THREE.Quaternion) {
  return target.setFromAxisAngle(X_AXIS, -Math.atan(route.lift.slope))
}

/** A piece's progress from the take-away conveyor's end into the hopper. */
export interface LiftRide {
  stage: 'toLift' | 'lift' | 'toHopper'
  time: number
  from: THREE.Vector3
  to: THREE.Vector3
  fromQuat: THREE.Quaternion
  // Current pose, written by stepLiftRide.
  position: THREE.Vector3
  quat: THREE.Quaternion
}

/** Starts a piece hopping from its current pose onto SDF_A10_0's foot. */
export function startLiftRide(
  route: LiftRoute,
  position: THREE.Vector3,
  quat: THREE.Quaternion,
  halfHeight: number,
  halfLength: number,
): LiftRide {
  const z = route.lift.max - halfLength
  return {
    stage: 'toLift',
    time: 0,
    from: position.clone(),
    to: new THREE.Vector3(route.lift.centreX, route.lift.topAt(z) + halfHeight, z),
    fromQuat: quat.clone(),
    position: position.clone(),
    quat: quat.clone(),
  }
}

const liftPose = new THREE.Quaternion()

/**
 * Moves a piece one frame along the lift route. `baseQuat` is the piece's own
 * resting orientation on a flat belt running along z (identity for fringe and
 * bars, which are modelled lying along z; the laid-flat turn for a soap).
 * Returns false once the piece has dropped into the hopper.
 */
export function stepLiftRide(
  ride: LiftRide,
  route: LiftRoute,
  delta: number,
  halfHeight: number,
  halfLength: number,
  baseQuat: THREE.Quaternion,
): boolean {
  onLift(route, liftPose).multiply(baseQuat)
  ride.time += delta

  if (ride.stage === 'toLift') {
    const t = Math.min(1, ride.time / LIFT_HOP_TIME)
    const s = t * t * (3 - 2 * t)
    ride.position.lerpVectors(ride.from, ride.to, s)
    ride.position.y += Math.sin(Math.PI * t) * LIFT_HOP_ARC
    ride.quat.slerpQuaternions(ride.fromQuat, liftPose, s)
    if (t >= 1) {
      ride.stage = 'lift'
      ride.time = 0
    }
    return true
  }

  if (ride.stage === 'lift') {
    ride.position.z -= LIFT_SPEED * delta
    ride.position.y = route.lift.topAt(ride.position.z) + halfHeight
    ride.quat.copy(liftPose)
    // Mostly over the high end: it tips off into the hopper.
    if (ride.position.z - halfLength * 0.3 <= route.lift.min) {
      const fill = route.fillYRef.current
      const landY = Math.max(route.hopper.floorY, Number.isFinite(fill) ? fill : route.hopper.floorY) + halfHeight
      ride.stage = 'toHopper'
      ride.time = 0
      ride.from.copy(ride.position)
      ride.to.set(route.hopper.x, landY, route.hopper.z)
      ride.fromQuat.copy(liftPose)
    }
    return true
  }

  // Falling into the hopper; gone once it reaches the soap already there.
  const drop = Math.max(0, ride.from.y - ride.to.y)
  const fallTime = Math.max(0.08, Math.sqrt((2 * drop) / GRAVITY))
  const t = Math.min(1, ride.time / fallTime)
  const s = t * t * (3 - 2 * t)
  ride.position.x = ride.from.x + (ride.to.x - ride.from.x) * s
  ride.position.z = ride.from.z + (ride.to.z - ride.from.z) * s
  ride.position.y = Math.max(ride.to.y, ride.from.y - 0.5 * GRAVITY * ride.time * ride.time)
  ride.quat.copy(ride.fromQuat)
  return t < 1
}
