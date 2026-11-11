import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { MATERIAL_COLOR } from './MixerFill'
import { useProductColor, useTint } from '../lib/productColor'
import type { HopperField } from '../lib/hopperSurface'

interface MixerDischargeProps {
  scene: THREE.Object3D
  // Same bowl mesh MixerFill sizes itself against - the granules have to leave
  // from the same opening the material is draining through.
  bowlMeshName: string
  // The probed hopper they fall into, shared with HopperFill so both agree on
  // where the funnel and its material are. Null until the mesh is found.
  field: HopperField | null
  // Height of the material surface in the hopper, written by HopperFill.
  // Granules reaching it are absorbed into it.
  fillYRef?: React.MutableRefObject<number>
  // Gate open AND blades turning. Soap base does not pour: with the blades
  // stopped an open gate discharges nothing, so both must be true.
  discharging: boolean
  // Live blade angle, so material breaks off in time with the arms sweeping
  // past the opening rather than on a timer of its own.
  bladeAngleRef?: React.MutableRefObject<number>
  // How empty the trough is, 0-1, written by MixerFill. Once the mass is gone
  // there is nothing left to shear off.
  drainRef?: React.MutableRefObject<number>
}

// Granules are transient now - they fall, reach the material and are absorbed -
// so this is a pool for whatever is in the air at once, not a budget for a
// whole batch. A batch's worth of drops passes through it many times over.
const MAX_CHUNKS = 1500

// Scene units/s^2. The machine is 2.41 units tall for something around 4.3 m
// in reality, so one unit is roughly 1.8 m and 9.81 m/s^2 lands here.
//
// Exported so anything else that drops material uses the SAME gravity. Two
// constants that start equal and drift apart would have the discharge and the
// noodles falling at different rates - invisible when you look at either one on
// its own, and wrong.
export const GRAVITY = 5.5
/** Scene units per real metre, the conversion GRAVITY above is derived from. */
export const UNITS_PER_METRE = 1 / 1.8

// Six bursts per revolution, which at the mixer's 50 RPM (1.2 s per turn)
// works out at 5 drops a second. Tied to blade phase rather than to a clock,
// so the drops stay in step with the arms sweeping the opening.
const BURST_PHASE = Math.PI / 3

// How much material one batch is worth, as a share of the hopper's measured
// capacity. This sets how heavy the falling stream looks and nothing else - the
// level the hopper ends up at is reported by the PLC, not accumulated from
// what falls (see HopperFill). Keeping it derived from real volume still
// matters: it is what makes the stream's density independent of granule size.
const BATCH_FRACTION = 0.4

// Slug-to-slug variation, so the drops are not all identical.
const BURST_JITTER = 0.45

// Granule size as a fraction of the trough's width. Roughly a 1:30 ratio
// against the trough, which is about what soap crumb looks like against a
// real mixer - small enough to read as loose granular product rather than as
// broken lumps of clay.
export const GRAIN_RATIO = 0.022
export const GRAIN_VARIATION = 0.6

// How tightly loose material packs once it is in the hopper. Around 60% solid
// is typical of granular product, and it is what converts a granule's own
// volume into the volume it occupies in the batch.
export const PACKING_FRACTION = 0.6

interface Chunk {
  active: boolean
  position: THREE.Vector3
  velocity: THREE.Vector3
  spin: THREE.Vector3
  rotation: THREE.Euler
  scale: number
}

// An irregular granule. The displacement is a smooth function of the vertex's
// own direction rather than random per-vertex: IcosahedronGeometry is
// non-indexed, so neighbouring triangles hold their own copies of a shared
// corner, and anything random would pull those copies apart and split it open.
export function createChunkGeometry(): THREE.BufferGeometry {
  const geometry = new THREE.IcosahedronGeometry(1, 0)
  const position = geometry.attributes.position
  const vertex = new THREE.Vector3()
  for (let i = 0; i < position.count; i++) {
    vertex.fromBufferAttribute(position, i)
    const d = vertex.clone().normalize()
    const lumpiness =
      1 + 0.26 * Math.sin(d.x * 3.1 + 1.7) * Math.cos(d.y * 4.3 + 0.6) + 0.18 * Math.sin(d.z * 2.7 + 2.2)
    vertex.multiplyScalar(lumpiness)
    position.setXYZ(i, vertex.x, vertex.y, vertex.z)
  }
  geometry.computeVertexNormals()
  return geometry
}

// `object`'s transform as if `scene` were sitting at the identity transform -
// see the longer note in MixerFill; the same first-frame ordering problem
// applies here.
export function getSceneRelativeMatrix(object: THREE.Object3D, scene: THREE.Object3D, target: THREE.Matrix4) {
  scene.updateWorldMatrix(true, false)
  object.updateWorldMatrix(true, false)
  return target.copy(scene.matrixWorld).invert().multiply(object.matrixWorld)
}

/**
 * Material leaving the mixer's discharge gate and dropping into the noodler
 * hopper below.
 *
 * The granules are the transfer, not the contents. They fall, reach whatever
 * surface is under them - the material already in the hopper, or the bare
 * funnel if it is empty - and are absorbed there. How full the hopper actually
 * is comes from the plant's own level reading and is drawn by HopperFill, so
 * this no longer has to model a heap building up, or the angle of repose that
 * shaped it.
 */
export function MixerDischarge({
  scene,
  bowlMeshName,
  field,
  fillYRef,
  discharging,
  bladeAngleRef,
  drainRef,
}: MixerDischargeProps) {
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
  const prevAngle = useRef(0)
  const phaseAccum = useRef(0)
  // Granules owed to the hopper but not yet released, carried as a fraction so
  // slugs smaller than one granule still add up instead of rounding to nothing.
  const pending = useRef(0)
  const prevDrain = useRef(0)
  const dummy = useMemo(() => new THREE.Object3D(), [])

  // Where the opening is and how big a granule coming out of it should be.
  const gate = useMemo(() => {
    const bowl = scene.getObjectByName(bowlMeshName) as THREE.Mesh | undefined
    if (!bowl || !bowl.geometry) return null
    bowl.geometry.computeBoundingBox()
    const box = bowl.geometry.boundingBox!.clone().applyMatrix4(getSceneRelativeMatrix(bowl, scene, new THREE.Matrix4()))
    const size = box.getSize(new THREE.Vector3())
    return {
      centerX: (box.min.x + box.max.x) / 2,
      // The gate panel sits slightly off the trough's centre line, toward the
      // discharge side, so material leaves from there rather than the middle.
      centerZ: (box.min.z + box.max.z) / 2 + size.z * 0.15,
      halfLength: size.x * 0.25,
      halfWidth: size.z * 0.14,
      topY: box.min.y - size.y * 0.04,
      // Anything that misses the hopper entirely keeps falling and is dropped.
      despawnY: box.min.y - size.y * 3,
      grainRadius: size.z * GRAIN_RATIO,
      height: size.y,
    }
  }, [scene, bowlMeshName])

  // How many granules one batch is seen as. Derived from the hopper's measured
  // capacity and what a granule occupies once packed, so the stream stays the
  // same weight of material however big the granules are.
  const batchGranules = useMemo(() => {
    if (!gate || !field) return 0
    // Mean cube of the granule radius across its size spread - volume goes as
    // r^3, so the average granule is bigger than a granule of average radius.
    const lo = 1 - GRAIN_VARIATION / 2
    const hi = 1 + GRAIN_VARIATION / 2
    const meanCube = (hi ** 4 - lo ** 4) / (4 * (hi - lo))
    const grainVolume = (4 / 3) * Math.PI * gate.grainRadius ** 3 * meanCube
    const settledVolume = grainVolume / PACKING_FRACTION
    return Math.round((field.capacity * BATCH_FRACTION) / settledVolume)
  }, [gate, field])

  // Aim the falling material at the funnel mouth rather than across the full
  // width of the gate. The gate is wider than the hopper below it, so spraying
  // the gate's own footprint throws material onto the flange and the floor.
  // Inset by a granule so nothing clips the mouth's edge.
  const spawn = useMemo(() => {
    if (!gate) return null
    if (!field) return { centerX: gate.centerX, centerZ: gate.centerZ, halfLength: gate.halfLength, halfWidth: gate.halfWidth }
    const inset = gate.grainRadius * 2
    return {
      centerX: (field.mouthMinX + field.mouthMaxX) / 2,
      centerZ: (field.mouthMinZ + field.mouthMaxZ) / 2,
      halfLength: Math.max(gate.grainRadius, (field.mouthMaxX - field.mouthMinX) / 2 - inset),
      halfWidth: Math.max(gate.grainRadius, (field.mouthMaxZ - field.mouthMinZ) / 2 - inset),
    }
  }, [gate, field])

  useFrame((_, delta) => {
    const mesh = meshRef.current
    const list = chunks.current
    if (!mesh || !gate || !spawn) return

    const drained = (drainRef?.current ?? 0) >= 0.995
    const live = discharging && !drained
    const fillY = fillYRef?.current ?? Number.NEGATIVE_INFINITY

    // Spawn in step with the blades. The angle wraps at 2*PI and can run
    // either direction, so accumulate the absolute change rather than watching
    // for the raw value to cross a threshold - that would misfire on the wrap
    // and never fire at all for a blade turning the other way.
    const drain = drainRef?.current ?? 0
    if (live) {
      // Material released tracks material drained, so the trough emptying and
      // the stream falling out of it are two views of the same batch.
      pending.current += batchGranules * Math.max(0, drain - prevDrain.current)
      const angle = bladeAngleRef?.current ?? 0
      let step = angle - prevAngle.current
      if (step > Math.PI) step -= Math.PI * 2
      if (step < -Math.PI) step += Math.PI * 2
      prevAngle.current = angle
      phaseAccum.current += Math.abs(step)
      while (phaseAccum.current >= BURST_PHASE) {
        phaseAccum.current -= BURST_PHASE
        const jitter = 1 - BURST_JITTER / 2 + Math.random() * BURST_JITTER
        const burst = Math.min(Math.floor(pending.current * jitter), Math.floor(pending.current))
        pending.current -= burst
        for (let n = 0; n < burst; n++) {
          const free = list.find((c) => !c.active)
          if (!free) break
          free.active = true
          free.position.set(
            spawn.centerX + (Math.random() * 2 - 1) * spawn.halfLength,
            gate.topY,
            spawn.centerZ + (Math.random() * 2 - 1) * spawn.halfWidth,
          )
          // Barely any initial speed: granules are pushed over the lip and
          // fall, they are not thrown.
          free.velocity.set(
            (Math.random() * 2 - 1) * gate.height * 0.06,
            -gate.height * 0.04,
            (Math.random() * 2 - 1) * gate.height * 0.06,
          )
          free.spin.set(Math.random() * 8 - 4, Math.random() * 8 - 4, Math.random() * 8 - 4)
          free.rotation.set(Math.random() * 6.28, Math.random() * 6.28, Math.random() * 6.28)
          free.scale = gate.grainRadius * (1 - GRAIN_VARIATION / 2 + Math.random() * GRAIN_VARIATION)
        }
      }
    } else {
      prevAngle.current = bladeAngleRef?.current ?? 0
    }
    prevDrain.current = drain

    for (let i = 0; i < list.length; i++) {
      const chunk = list[i]

      // Integrate whatever is still in the air, whether or not the gate is
      // open - closing it mid-fall should not delete granules already dropping.
      if (chunk.active) {
        chunk.velocity.y -= GRAVITY * delta
        chunk.position.addScaledVector(chunk.velocity, delta)
        chunk.rotation.x += chunk.spin.x * delta
        chunk.rotation.y += chunk.spin.y * delta
        chunk.rotation.z += chunk.spin.z * delta
        absorb(chunk, field, fillY, gate.despawnY)
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

  if (!gate) return null

  return (
    <instancedMesh ref={meshRef} args={[geometry, material, MAX_CHUNKS]} castShadow receiveShadow frustumCulled={false} />
  )
}

// Takes a falling granule out of the air once it reaches whatever is under it.
//
// What is under it is either the material already in the hopper, whose surface
// HopperFill solves from the plant's level reading, or - when the hopper is
// empty - the bare funnel itself. Either way the granule has arrived, and the
// hopper's contents are accounted for by the level, so it simply goes away
// rather than adding to a heap.
function absorb(chunk: Chunk, field: HopperField | null, fillY: number, despawnY: number) {
  if (chunk.position.y < despawnY) {
    chunk.active = false
    return
  }
  if (!field) return

  const col = Math.floor((chunk.position.x - field.minX) / field.cell)
  const row = Math.floor((chunk.position.z - field.minZ) / field.cell)
  if (col < 0 || col >= field.cols || row < 0 || row >= field.rows) return

  const k = row * field.cols + col
  // Missed the hopper - keep falling until it is far enough below to drop.
  if (field.outside[k] === 1) return

  // fillY is -Infinity for an empty hopper, which leaves the funnel's own
  // surface as the thing being landed on.
  const surface = Math.max(fillY, field.height[k])
  if (chunk.position.y - chunk.scale <= surface) chunk.active = false
}
