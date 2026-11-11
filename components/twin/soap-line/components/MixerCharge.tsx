import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { MATERIAL_COLOR } from './MixerFill'
import {
  GRAIN_RATIO,
  GRAIN_VARIATION,
  GRAVITY,
  PACKING_FRACTION,
  createChunkGeometry,
  getSceneRelativeMatrix,
} from './MixerDischarge'
import { useProductColor, useTint } from '../lib/productColor'

interface MixerChargeProps {
  scene: THREE.Object3D
  // Same bowl mesh MixerFill sizes itself against: it sets how big a granule is
  // and how much material a full charge holds.
  bowlMeshName: string
  // The flange on the feed hopper's outlet. Only its footprint is used - where
  // the stream falls, and how wide it is.
  inletMeshName: string
  // Written by MixerFill: whether the trough is being recharged, how empty it
  // still is, and where its surface sits.
  refillingRef: React.MutableRefObject<boolean>
  drainRef: React.MutableRefObject<number>
  surfaceYRef: React.MutableRefObject<number>
}

// The outlet's bore as a share of the flange's width - the flange's footprint
// includes its bolt ring, which nothing falls through.
const BORE_FRACTION = 0.45

// Only what is in the air at once - a granule lives for about a third of a
// second between the neck and the material, so a few hundred covers a full
// stream with room to spare.
const MAX_CHUNKS = 600

// How deep a full charge sits in the trough, as a share of the bowl's height,
// averaged over its footprint: the heap tops out near 0.75 of the bowl and
// rests on a U-section floor averaging ~0.16, per MixerFill's measurements.
// Sets how heavy the stream looks, nothing more - the level itself is
// MixerFill's.
const CHARGE_DEPTH = 0.59
// MixerFill's default footprint, which the charge's volume is taken over.
const FOOTPRINT = 0.84

interface Chunk {
  active: boolean
  position: THREE.Vector3
  velocity: THREE.Vector3
  spin: THREE.Vector3
  rotation: THREE.Euler
  scale: number
}

/**
 * The fresh batch falling from under the feed hopper's outlet into the mixer
 * trough while it is being recharged.
 *
 * Like MixerDischarge, the granules are the transfer and not the contents: the
 * level in the trough is MixerFill's, and a granule reaching it is simply
 * absorbed. The stream is released at the rate the level rises, so the two are
 * the same material seen twice.
 */
export function MixerCharge({
  scene,
  bowlMeshName,
  inletMeshName,
  refillingRef,
  drainRef,
  surfaceYRef,
}: MixerChargeProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const geometry = useMemo(() => createChunkGeometry(), [])
  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
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
      geometry.dispose()
      material.dispose()
    }
  }, [geometry, material])

  const chunks = useRef<Chunk[]>(
    Array.from({ length: MAX_CHUNKS }, () => ({
      active: false,
      position: new THREE.Vector3(),
      velocity: new THREE.Vector3(),
      spin: new THREE.Vector3(),
      rotation: new THREE.Euler(),
      scale: 1,
    })),
  )
  // Granules owed but not yet released, carried as a fraction so a frame's
  // worth smaller than one granule still adds up.
  const pending = useRef(0)
  const prevDrain = useRef(0)
  const dummy = useMemo(() => new THREE.Object3D(), [])

  // Where the outlet is, how big a granule is and how many a full charge holds.
  const source = useMemo(() => {
    const bowl = scene.getObjectByName(bowlMeshName) as THREE.Mesh | undefined
    const inlet = scene.getObjectByName(inletMeshName) as THREE.Mesh | undefined
    if (!bowl?.geometry || !inlet?.geometry) return null
    const box = (mesh: THREE.Mesh) => {
      mesh.geometry.computeBoundingBox()
      return mesh.geometry.boundingBox!.clone().applyMatrix4(getSceneRelativeMatrix(mesh, scene, new THREE.Matrix4()))
    }
    const bowlBox = box(bowl)
    const inletBox = box(inlet)
    const bowlSize = bowlBox.getSize(new THREE.Vector3())
    const inletSize = inletBox.getSize(new THREE.Vector3())

    const grainRadius = bowlSize.z * GRAIN_RATIO
    // Mean cube of the radius across its size spread - see MixerDischarge.
    const lo = 1 - GRAIN_VARIATION / 2
    const hi = 1 + GRAIN_VARIATION / 2
    const meanCube = (hi ** 4 - lo ** 4) / (4 * (hi - lo))
    const settledVolume = ((4 / 3) * Math.PI * grainRadius ** 3 * meanCube) / PACKING_FRACTION
    const chargeVolume = bowlSize.x * bowlSize.z * FOOTPRINT * FOOTPRINT * bowlSize.y * CHARGE_DEPTH

    return {
      centerX: (inletBox.min.x + inletBox.max.x) / 2,
      centerZ: (inletBox.min.z + inletBox.max.z) / 2,
      radius: Math.max(grainRadius, (Math.min(inletSize.x, inletSize.z) / 2) * BORE_FRACTION),
      // Released just under the mixer's top cover, not at the outlet itself.
      // The outlet stops short of the cover with an open gap between them, so
      // granules born at the outlet are drawn in mid-air above the mixer - and
      // it is the trough filling that the stream is there to show.
      topY: bowlBox.max.y - grainRadius * 1.5,
      // Anything that somehow misses the material entirely stops at the
      // trough's floor rather than falling on forever.
      floorY: bowlBox.min.y,
      grainRadius,
      height: bowlSize.y,
      batchGranules: Math.round(chargeVolume / settledVolume),
    }
  }, [scene, bowlMeshName, inletMeshName])

  useEffect(() => {
    if (!source) console.warn(`[model] ${inletMeshName} or ${bowlMeshName} not found; the mixer recharges without a falling stream.`)
  }, [source, inletMeshName, bowlMeshName])

  useFrame((_, delta) => {
    const mesh = meshRef.current
    const list = chunks.current
    if (!mesh || !source) return

    const drain = drainRef.current
    if (refillingRef.current) {
      pending.current += source.batchGranules * Math.max(0, prevDrain.current - drain)
      const release = Math.floor(pending.current)
      pending.current -= release
      for (let n = 0; n < release; n++) {
        const free = list.find((c) => !c.active)
        if (!free) break
        // Uniform over the bore's disc, not bunched at its centre.
        const r = source.radius * Math.sqrt(Math.random())
        const a = Math.random() * Math.PI * 2
        free.active = true
        free.position.set(source.centerX + r * Math.cos(a), source.topY, source.centerZ + r * Math.sin(a))
        // Dropping out under gravity, not thrown: only a little spread.
        free.velocity.set(
          (Math.random() * 2 - 1) * source.height * 0.03,
          -source.height * 0.1,
          (Math.random() * 2 - 1) * source.height * 0.03,
        )
        free.spin.set(Math.random() * 8 - 4, Math.random() * 8 - 4, Math.random() * 8 - 4)
        free.rotation.set(Math.random() * 6.28, Math.random() * 6.28, Math.random() * 6.28)
        free.scale = source.grainRadius * (1 - GRAIN_VARIATION / 2 + Math.random() * GRAIN_VARIATION)
      }
    } else {
      pending.current = 0
    }
    prevDrain.current = drain

    const landY = Math.max(surfaceYRef.current, source.floorY)
    for (let i = 0; i < list.length; i++) {
      const chunk = list[i]
      // Granules already falling finish their fall even once the charge ends.
      if (chunk.active) {
        chunk.velocity.y -= GRAVITY * delta
        chunk.position.addScaledVector(chunk.velocity, delta)
        chunk.rotation.x += chunk.spin.x * delta
        chunk.rotation.y += chunk.spin.y * delta
        chunk.rotation.z += chunk.spin.z * delta
        if (chunk.position.y - chunk.scale <= landY) chunk.active = false
      }

      dummy.position.copy(chunk.position)
      dummy.rotation.copy(chunk.rotation)
      // Inactive instances collapse to nothing - InstancedMesh has no
      // per-instance visibility flag.
      dummy.scale.setScalar(chunk.active ? chunk.scale : 0)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
    }
    mesh.instanceMatrix.needsUpdate = true
  })

  if (!source) return null

  return (
    <instancedMesh ref={meshRef} args={[geometry, material, MAX_CHUNKS]} castShadow receiveShadow frustumCulled={false} />
  )
}
