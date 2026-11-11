import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const DAMPING = 8 // higher = snappier ease toward the target angle

export interface GateHingeConfig {
  axis: 'x' | 'y' | 'z'
  // Scene-local coordinates - the same space the model's own glTF data is
  // authored in, independent of whatever position offset the whole model
  // has been given (e.g. via the Position Controls panel).
  pivot: [number, number, number]
  // Target angle to damp toward. Ignored while `spinning` is true.
  angleDeg: number
  // When true, ignores angleDeg and instead continuously accumulates
  // rotation at spinSpeedDegPerSec (sign gives direction) - for parts that
  // spin rather than swing to a fixed pose, e.g. mixer blades.
  spinning?: boolean
  spinSpeedDegPerSec?: number
}

interface GateHingeProps {
  scene: THREE.Object3D
  // Leaf mesh names to rotate together as one rigid group around the same
  // pivot/axis. Each is tracked independently (own parent, own original
  // transform) - they don't need to share a parent node in the glTF.
  meshNames: string[]
  config: GateHingeConfig
  showPivotMarker?: boolean
  // Optional read-out of this hinge's live angle in radians, written every
  // frame. Lets other parts of the scene stay locked to the real rotation
  // rather than integrating their own copy of it - two separate integrations
  // of the same spin speed drift apart, and material that lags its own blades
  // is exactly the sort of thing that reads as wrong without being obviously
  // broken. A ref rather than a callback: this changes every frame and must
  // not trigger React renders.
  angleRef?: React.MutableRefObject<number>
}

interface TrackedMesh {
  object: THREE.Object3D
  originalPos: THREE.Vector3
  originalQuat: THREE.Quaternion
}

// `object`'s transform as if `scene` were sitting at the identity transform.
// Unlike object.matrixWorld, this stays valid even when the model itself is
// later repositioned (Position Controls changes scene.position).
function getSceneRelativeMatrix(object: THREE.Object3D, scene: THREE.Object3D, target: THREE.Matrix4) {
  scene.updateWorldMatrix(true, false)
  object.updateWorldMatrix(true, false)
  return target.copy(scene.matrixWorld).invert().multiply(object.matrixWorld)
}

// Rotates a group of named meshes around an arbitrary pivot point/axis by
// directly recomputing each mesh's own local position+quaternion every
// frame from its ORIGINAL (captured once) transform, instead of
// re-parenting into a pivot Group. Re-deriving from the original transform
// every time (rather than compounding onto whatever the previous frame left
// behind) means a change to axis/pivot/angle can never drift or compound
// errors.
export function GateHinge({ scene, meshNames, config, showPivotMarker, angleRef }: GateHingeProps) {
  const trackedRef = useRef<TrackedMesh[]>([])
  const currentAngle = useRef(0)

  useEffect(() => {
    trackedRef.current = meshNames.flatMap((name) => {
      const object = scene.getObjectByName(name)
      if (!object) return []
      const relMatrix = getSceneRelativeMatrix(object, scene, new THREE.Matrix4())
      const originalPos = new THREE.Vector3()
      const originalQuat = new THREE.Quaternion()
      relMatrix.decompose(originalPos, originalQuat, new THREE.Vector3())
      return [{ object, originalPos, originalQuat }]
    })
  }, [scene, meshNames])

  useFrame((_, delta) => {
    const tracked = trackedRef.current
    if (tracked.length === 0) return

    if (config.spinning) {
      currentAngle.current += THREE.MathUtils.degToRad(config.spinSpeedDegPerSec ?? 0) * delta
      currentAngle.current %= Math.PI * 2
    } else {
      const target = THREE.MathUtils.degToRad(config.angleDeg)
      currentAngle.current = THREE.MathUtils.damp(currentAngle.current, target, DAMPING, delta)
    }

    if (angleRef) angleRef.current = currentAngle.current

    const axisVec = new THREE.Vector3(
      config.axis === 'x' ? 1 : 0,
      config.axis === 'y' ? 1 : 0,
      config.axis === 'z' ? 1 : 0,
    )
    const pivotPoint = new THREE.Vector3(...config.pivot)
    const deltaQuat = new THREE.Quaternion().setFromAxisAngle(axisVec, currentAngle.current)

    for (const { object, originalPos, originalQuat } of tracked) {
      if (!object.parent) continue

      const newRelPos = originalPos.clone().sub(pivotPoint).applyQuaternion(deltaQuat).add(pivotPoint)
      const newRelQuat = deltaQuat.clone().multiply(originalQuat)
      const desiredRelMatrix = new THREE.Matrix4().compose(newRelPos, newRelQuat, new THREE.Vector3(1, 1, 1))

      const parentRelMatrix = getSceneRelativeMatrix(object.parent, scene, new THREE.Matrix4())
      const localMatrix = parentRelMatrix.invert().multiply(desiredRelMatrix)

      const scale = new THREE.Vector3()
      localMatrix.decompose(object.position, object.quaternion, scale)
    }
  })

  if (!showPivotMarker) return null

  return (
    <mesh position={config.pivot}>
      <sphereGeometry args={[0.015, 16, 16]} />
      <meshBasicMaterial color="#ff0000" depthTest={false} />
    </mesh>
  )
}
