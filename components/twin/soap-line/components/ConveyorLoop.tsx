import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

export interface ConveyorLoopConfig {
  axis: 'x' | 'y' | 'z'
  // Travel distance (scene units) before snapping back to the start - the
  // visible "pop" each cycle, since this is one rigid mesh, not a looping
  // texture.
  distance: number
  // Units per second along `axis`. Sign gives direction.
  speed: number
  running: boolean
}

interface ConveyorLoopProps {
  scene: THREE.Object3D
  meshNames: string[]
  config: ConveyorLoopConfig
}

interface TrackedMesh {
  object: THREE.Object3D
  originalPos: THREE.Vector3
  originalQuat: THREE.Quaternion
}

// Same scene-relative-space rationale as GateHinge: stays valid even if the
// model itself is later repositioned.
function getSceneRelativeMatrix(object: THREE.Object3D, scene: THREE.Object3D, target: THREE.Matrix4) {
  scene.updateWorldMatrix(true, false)
  object.updateWorldMatrix(true, false)
  return target.copy(scene.matrixWorld).invert().multiply(object.matrixWorld)
}

// Slides a group of named meshes along one axis, wrapping (snapping back to
// 0) every `distance` units, by recomputing each mesh's local position from
// its ORIGINAL transform plus the current offset every frame - never
// compounding drift.
export function ConveyorLoop({ scene, meshNames, config }: ConveyorLoopProps) {
  const trackedRef = useRef<TrackedMesh[]>([])
  const offset = useRef(0)

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

    if (config.running && config.distance > 0) {
      offset.current += config.speed * delta
      offset.current = ((offset.current % config.distance) + config.distance) % config.distance
    }

    const axisVec = new THREE.Vector3(
      config.axis === 'x' ? 1 : 0,
      config.axis === 'y' ? 1 : 0,
      config.axis === 'z' ? 1 : 0,
    )

    for (const { object, originalPos, originalQuat } of tracked) {
      if (!object.parent) continue

      const newRelPos = originalPos.clone().addScaledVector(axisVec, offset.current)
      const desiredRelMatrix = new THREE.Matrix4().compose(newRelPos, originalQuat, new THREE.Vector3(1, 1, 1))

      const parentRelMatrix = getSceneRelativeMatrix(object.parent, scene, new THREE.Matrix4())
      const localMatrix = parentRelMatrix.invert().multiply(desiredRelMatrix)

      const scale = new THREE.Vector3()
      localMatrix.decompose(object.position, object.quaternion, scale)
    }
  })

  return null
}
