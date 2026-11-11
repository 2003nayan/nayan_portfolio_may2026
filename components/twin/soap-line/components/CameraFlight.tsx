import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'

export interface CameraPreset {
  id: string
  label: string
  position: [number, number, number]
  target: [number, number, number]
}

export interface CameraViewRequest {
  position: [number, number, number]
  target: [number, number, number]
  // A new id is a new request, so the same preset can be flown to again even
  // though its position/target haven't changed.
  id: number
}

interface CameraFlightProps {
  request: CameraViewRequest | null
  controlsRef: React.RefObject<OrbitControlsImpl | null>
}

// How long a preset view takes to arrive, seconds.
const FLIGHT_SECONDS = 2.4

// The midpoint of a straight line between two presets sits inside the
// machine, since both cameras are close to it - a plain lerp cuts straight
// through the model. Pulling the path's midpoint this much farther from the
// scene's floor pulls the camera back and around instead, the same shape an
// operator's own hand would take walking from one machine to the next.
const BULGE_DISTANCE = 2.2

/** Eases in and out, the same curve BilletCutter's cutter servo uses. */
function ease(t: number) {
  return 0.5 - 0.5 * Math.cos(Math.PI * t)
}

/**
 * Builds the path a flight's camera follows: a Catmull-Rom curve through the
 * start position, a waypoint pulled back from the midpoint of the two
 * targets, and the end position - so the camera arcs out and around rather
 * than passing through whatever is between the two presets.
 */
function buildPath(fromPosition: THREE.Vector3, toPosition: THREE.Vector3, fromTarget: THREE.Vector3, toTarget: THREE.Vector3) {
  const midTarget = fromTarget.clone().lerp(toTarget, 0.5)
  const midPosition = fromPosition.clone().lerp(toPosition, 0.5)
  const outward = midPosition.clone().sub(midTarget)
  // Degenerate only if the midpoint camera position sits exactly on the
  // midpoint target, which none of the hand-picked presets do - but a
  // fallback direction keeps this from producing a NaN path if that ever
  // changes.
  if (outward.lengthSq() < 1e-6) outward.set(0, 1, 0)
  outward.setLength(Math.max(outward.length(), BULGE_DISTANCE))
  const waypoint = midTarget.add(outward)
  return new THREE.CatmullRomCurve3([fromPosition, waypoint, toPosition])
}

/**
 * Flies the camera and its OrbitControls target smoothly to a preset view
 * whenever `request` changes, rather than cutting straight there - so picking
 * a machine group from the sidebar reads as moving through the scene to it.
 *
 * OrbitControls re-derives its internal orbit state from the camera's actual
 * position relative to `controls.target` on every `update()`, so driving both
 * directly here and calling `update()` each frame keeps user dragging working
 * normally once a flight finishes - there is no separate "flight mode" to
 * fall out of.
 */
export function CameraFlight({ request, controlsRef }: CameraFlightProps) {
  const { camera } = useThree()
  const lastId = useRef<number | null>(null)
  const flight = useRef<{
    path: THREE.CatmullRomCurve3
    fromTarget: THREE.Vector3
    toTarget: THREE.Vector3
    time: number
  } | null>(null)

  useEffect(() => {
    if (!request || request.id === lastId.current) return
    const controls = controlsRef.current
    if (!controls) return
    lastId.current = request.id
    const fromPosition = camera.position.clone()
    const toPosition = new THREE.Vector3(...request.position)
    const fromTarget = controls.target.clone()
    const toTarget = new THREE.Vector3(...request.target)
    flight.current = {
      path: buildPath(fromPosition, toPosition, fromTarget, toTarget),
      fromTarget,
      toTarget,
      time: 0,
    }
  }, [request, camera, controlsRef])

  useFrame((_, delta) => {
    const state = flight.current
    const controls = controlsRef.current
    if (!state || !controls) return
    state.time = Math.min(1, state.time + delta / FLIGHT_SECONDS)
    const t = ease(state.time)
    state.path.getPointAt(t, camera.position)
    controls.target.lerpVectors(state.fromTarget, state.toTarget, t)
    controls.update()
    if (state.time >= 1) flight.current = null
  })

  return null
}
