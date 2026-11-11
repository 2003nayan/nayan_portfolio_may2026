import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { MATERIAL_COLOR } from './MixerFill'
import { useProductColor, useTint } from '../lib/productColor'
import {
  EMPTY_FILL,
  createFillSurface,
  solveFillHeight,
  writeFillSurface,
  type HopperField,
} from '../lib/hopperSurface'

interface HopperFillProps {
  // The probed hopper. Null until the mesh is found - see Model.tsx.
  field: HopperField | null
  // Hopper level as the noodler PLC reports it, 0-100 percent full. This is a
  // real measurement, so it - not the mixer discharging - decides how much
  // material is in the hopper and which way the surface moves.
  level: number
  // Height of the material's top surface, for anything landing in it. Written
  // every frame; -Infinity when the hopper is empty.
  fillYRef?: React.MutableRefObject<number>
}

// The reading arrives once a second and jitters by a percent between samples
// (32, 33, 32...), so the surface is eased toward it rather than snapped to it.
// Seconds to close ~63% of the remaining gap.
const EASE_TAU = 0.8

// Below this the level counts as zero and nothing is drawn at all. The signal
// is integer-valued, so this only ever catches a true 0.
const EMPTY_LEVEL = 0.5

// Don't rewrite the surface for movement finer than this fraction of a column -
// it would not be visible and the buffer upload is not free.
const REBUILD_EPSILON = 0.01

/**
 * The material sitting in the noodler hopper.
 *
 * The PLC reports a percentage, and `solveFillHeight` turns that into the
 * height a level surface sits at for that share of the hopper's own measured
 * capacity, and the surface is drawn as a lumpy cap over every column the
 * material covers.
 *
 * Drawn as a closed body - a lumpy top surface with an underside nested in the
 * funnel beneath it - for the same reason MixerFill builds one: the hopper's
 * opacity is user-controllable, and a lone top surface shows as a lid over an
 * empty funnel the moment anyone makes the shell see-through.
 *
 * Drawn as one mesh rather than as granules on purpose: a level that falls has
 * to take material away again, and a surface does that by moving, where a heap
 * of settled granules would have to be un-piled. It also has no budget to run
 * out of - the granule pile this replaced could only reach about 15% full
 * before hitting its instance cap, against a signal that runs to 100%.
 */
export function HopperFill({ field, level, fillYRef }: HopperFillProps) {
  const meshRef = useRef<THREE.Mesh>(null)

  const surface = useMemo(() => (field ? createFillSurface(field) : null), [field])

  const geometry = useMemo(() => {
    if (!surface) return null
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(surface.positions, 3))
    geo.setAttribute('normal', new THREE.BufferAttribute(surface.normals, 3))
    geo.setDrawRange(0, 0)
    return geo
  }, [surface])

  // The same material the mixer fills its trough with - it is the same product,
  // so it gets the same flat albedo, the same complete lack of gloss, and the
  // same per-face shading. See the note on MATERIAL_COLOR in MixerFill: the
  // granular read is meant to come from the displaced surface catching real
  // light, never from a texture painted onto it.
  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color(MATERIAL_COLOR),
        // Dry loose powder has no specular highlight at all; any gloss
        // immediately reads as wet or molten.
        roughness: 1,
        metalness: 0,
        flatShading: true,
        // Visible from underneath too, since the hopper can be faded out.
        side: THREE.DoubleSide,
        // Fully opaque, but flagged transparent so three sorts it into the
        // transparent pass alongside a faded hopper shell. Opaque geometry is
        // always drawn BEFORE anything transparent, so while this was opaque
        // the shell was blended over it and fading the shell washed the
        // material out with it. In the transparent pass the render order below
        // decides instead, and the material comes out at full strength.
        transparent: true,
        opacity: 1,
      }),
    [],
  )
  // Recoloured in place on a SKU changeover; see useTint.
  useTint(material, useProductColor().mass)

  useEffect(() => {
    return () => {
      geometry?.dispose()
      material.dispose()
    }
  }, [geometry, material])

  // The eased level, as a fraction. Held in a ref and stepped per frame so the
  // surface glides between readings instead of stepping once a second.
  const fraction = useRef(0)
  const settled = useRef(false)
  const lastY = useRef(Number.NaN)

  useFrame((_, delta) => {
    const geo = geometry
    if (!field || !geo || !surface) return

    const target = Math.max(0, Math.min(1, level / 100))
    if (!settled.current) {
      // Start at whatever the plant is actually at, rather than filling up from
      // empty on load - the hopper was already full when the page opened.
      fraction.current = target
      settled.current = true
    } else {
      fraction.current += (target - fraction.current) * (1 - Math.exp(-delta / EASE_TAU))
    }

    const y = level < EMPTY_LEVEL && fraction.current < 0.001 ? EMPTY_FILL : solveFillHeight(field, fraction.current)
    if (fillYRef) fillYRef.current = y

    // Only touch the buffer when the surface has actually moved.
    const moved =
      Number.isNaN(lastY.current) ||
      !Number.isFinite(y) ||
      !Number.isFinite(lastY.current)
        ? y !== lastY.current
        : Math.abs(y - lastY.current) > field.cell * REBUILD_EPSILON
    if (!moved) return
    lastY.current = y

    const count = writeFillSurface(field, y, surface)
    // Marking the three.js buffers the frame loop owns as dirty, not reassigning
    // anything React rendered with - same situation as MeshOpacity's clones.
    ;(geo.attributes.position as THREE.BufferAttribute).needsUpdate = true
    ;(geo.attributes.normal as THREE.BufferAttribute).needsUpdate = true
    geo.setDrawRange(0, count)
  })

  if (!field || !geometry) return null

  // Drawn after the hopper shell rather than sorted against it by distance.
  // Seen from outside the material is always the FARTHER of the two, so
  // back-to-front sorting would put the shell over it every time and fading the
  // shell would keep dimming it. Opaque parts still hide it correctly: they
  // write depth in the opaque pass, which this is still tested against.
  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      material={material}
      renderOrder={2}
      receiveShadow
      frustumCulled={false}
    />
  )
}
