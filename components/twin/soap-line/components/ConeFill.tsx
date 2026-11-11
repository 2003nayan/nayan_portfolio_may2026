import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { MATERIAL_COLOR } from './MixerFill'
import { useProductColor, useTint } from '../lib/productColor'
import {
  CONE_INLET_Z,
  CONE_MESH,
  CONE_OUTLET_Z,
  CONE_VERTEX_COUNT,
  coneSectionAt,
  resolveAnchor,
} from '../lib/plodderCavities'

interface ConeFillProps {
  scene: THREE.Object3D
  // How far the bore is filled, inlet to nozzle, 0-1. Written by
  // PlodderExtrusion, which is where the material comes from.
  fillRef: React.MutableRefObject<number>
}

// Rings the bore is resampled into, inlet to nozzle. The measured profile's
// own spacing is uneven; resampling makes the fill front advance evenly.
const RINGS = 120
const RADIAL = 40
// Drawn a little inside the bore so the fill never z-fights the cone's wall.
const INSET = 0.94

/**
 * Material packed into the cone heater's bore.
 *
 * The bore is measured, not assumed round: a flat ellipse matching the twin-screw
 * discharge closing to a circle at the nozzle. Its rings are lofted into one
 * surface, advanced from the inlet by draw range as the final plodder pushes
 * material in, with a cap riding the front. Once full it stays full - material
 * in a plodder cone is under pressure and has no level to fall back to.
 */
export function ConeFill({ scene, fillRef }: ConeFillProps) {
  const bodyRef = useRef<THREE.Mesh>(null)
  const inletRef = useRef<THREE.Mesh>(null)
  const frontRef = useRef<THREE.Mesh>(null)

  const rig = useMemo(() => {
    const anchor = resolveAnchor(scene, CONE_MESH, CONE_VERTEX_COUNT)
    if (!anchor) return null

    // Every ring's points in scene space, RADIAL + 1 per ring (the seam repeats).
    const rings: THREE.Vector3[][] = []
    const centres: THREE.Vector3[] = []
    for (let r = 0; r < RINGS; r++) {
      const z = CONE_INLET_Z + ((CONE_OUTLET_Z - CONE_INLET_Z) * r) / (RINGS - 1)
      const s = coneSectionAt(z)
      centres.push(new THREE.Vector3(s.cx, s.cy, z).applyMatrix4(anchor.matrix))
      const ring: THREE.Vector3[] = []
      for (let a = 0; a <= RADIAL; a++) {
        const angle = (a / RADIAL) * Math.PI * 2
        ring.push(
          new THREE.Vector3(
            s.cx + Math.cos(angle) * s.rx * INSET,
            s.cy + Math.sin(angle) * s.ry * INSET,
            z,
          ).applyMatrix4(anchor.matrix),
        )
      }
      rings.push(ring)
    }

    const body = new THREE.BufferGeometry()
    const positions = new Float32Array(RINGS * (RADIAL + 1) * 3)
    rings.forEach((ring, r) => ring.forEach((p, a) => p.toArray(positions, (r * (RADIAL + 1) + a) * 3)))
    body.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    // Ring by ring, so a draw range is a fill front: the first n bands are the
    // first n stretches of bore from the inlet.
    const index: number[] = []
    for (let r = 0; r < RINGS - 1; r++) {
      for (let a = 0; a < RADIAL; a++) {
        const i0 = r * (RADIAL + 1) + a
        const i1 = i0 + 1
        const j0 = i0 + RADIAL + 1
        const j1 = j0 + 1
        index.push(i0, j0, i1, i1, j0, j1)
      }
    }
    body.setIndex(index)
    body.computeVertexNormals()
    body.setDrawRange(0, 0)
    body.computeBoundingSphere()

    // A flat disc over one ring: centre, then the ring itself.
    const cap = (ring: THREE.Vector3[], centre: THREE.Vector3) => {
      const geo = new THREE.BufferGeometry()
      const p = new Float32Array((RADIAL + 2) * 3)
      centre.toArray(p, 0)
      ring.forEach((v, a) => v.toArray(p, (a + 1) * 3))
      geo.setAttribute('position', new THREE.BufferAttribute(p, 3))
      const idx: number[] = []
      for (let a = 0; a < RADIAL; a++) idx.push(0, a + 1, a + 2)
      geo.setIndex(idx)
      geo.computeVertexNormals()
      geo.computeBoundingSphere()
      return geo
    }

    return {
      rings,
      centres,
      body,
      inlet: cap(rings[0], centres[0]),
      // Rewritten in place as the front advances.
      front: cap(rings[0], centres[0]),
    }
  }, [scene])

  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color(MATERIAL_COLOR),
        roughness: 1,
        metalness: 0,
        flatShading: true,
        // The caps face either way depending on the cone's handedness in the
        // model; both sides saves deriving it.
        side: THREE.DoubleSide,
      }),
    [],
  )
  // Recoloured in place on a SKU changeover; see useTint.
  useTint(material, useProductColor().mass)

  useEffect(() => {
    for (const mesh of [bodyRef.current, inletRef.current, frontRef.current]) if (mesh) mesh.raycast = () => {}
    return () => {
      rig?.body.dispose()
      rig?.inlet.dispose()
      rig?.front.dispose()
      material.dispose()
    }
  }, [rig, material])

  const shownRing = useRef(-1)

  useFrame(() => {
    if (!rig || !bodyRef.current || !inletRef.current || !frontRef.current) return
    const fill = THREE.MathUtils.clamp(fillRef.current, 0, 1)
    const visible = fill > 0
    bodyRef.current.visible = visible
    inletRef.current.visible = visible
    frontRef.current.visible = visible
    if (!visible) return

    const ring = Math.round(fill * (RINGS - 1))
    if (ring === shownRing.current) return
    shownRing.current = ring
    // Through the meshes rather than `rig`: the geometry is the same object,
    // but the memoised value itself stays untouched after render.
    bodyRef.current.geometry.setDrawRange(0, ring * RADIAL * 6)

    const front = frontRef.current.geometry
    const position = front.attributes.position as THREE.BufferAttribute
    const centre = rig.centres[ring]
    position.setXYZ(0, centre.x, centre.y, centre.z)
    rig.rings[ring].forEach((p, a) => position.setXYZ(a + 1, p.x, p.y, p.z))
    position.needsUpdate = true
    front.computeBoundingSphere()
  })

  if (!rig) return null

  return (
    <>
      <mesh ref={bodyRef} geometry={rig.body} material={material} visible={false} />
      <mesh ref={inletRef} geometry={rig.inlet} material={material} visible={false} />
      <mesh ref={frontRef} geometry={rig.front} material={material} visible={false} />
    </>
  )
}
