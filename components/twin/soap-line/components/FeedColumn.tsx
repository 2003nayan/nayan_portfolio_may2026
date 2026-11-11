import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { MATERIAL_COLOR } from './MixerFill'
import { useProductColor, useTint } from '../lib/productColor'
import { fbm } from '../lib/noise'
import { throatOutline } from '../lib/feedColumn'
import { SKIN_INSET_CELLS, type HopperField } from '../lib/hopperSurface'

interface FeedColumnProps {
  // The probed hopper whose throat the column hangs from. Null until found.
  field: HopperField | null
  // Where the column ends, scene y: the top of the screws it feeds, where it
  // meets their paste. Any lower and it hangs down through the screws as a
  // sheet in front of them.
  bottomY: number
  // The hopper's fill height, as HopperFill writes it. The column is drawn only
  // while that is finite - an empty hopper feeds nothing.
  fillYRef: React.MutableRefObject<number>
  // A feed screw's live angle. The column's surface travels down only while it
  // turns, at the screws' own feed rate.
  angleRef: React.MutableRefObject<number>
  // The screws' pitch: material taken in per revolution, scene units.
  pitch: number
}

// Wall subdivision, scene units - fine enough to carry the crumb relief.
const SPACING = 0.0025
// Crumb relief on the walls. Pushed inward only, never out, so the column stays
// inside the throat it hangs from.
const LUMP_WAVELENGTH = 0.008
const LUMP_AMPLITUDE = 0.0012

/**
 * The material in a hopper's throat, between the funnel and the screws below.
 *
 * HopperFill gives the open throat the funnel's own floor, so the hopper's
 * material ends there, and with nothing drawn below it the opening down to the
 * screws read as a gap. This fills it: the throat's outline, extruded from the
 * fill's underside down to the tops of the screws.
 *
 * Kept apart from HopperFill on purpose. The plant's level is measured against
 * the funnel's capacity, and folding the throat into that would shift what
 * every reading draws. The column is the feed in transit, not stored material.
 *
 * Its walls carry crumb relief that travels downward while the screws turn, as
 * the screws draw the material in. Still when they stop.
 */
export function FeedColumn({ field, bottomY, fillYRef, angleRef, pitch }: FeedColumnProps) {
  const meshRef = useRef<THREE.Mesh>(null)

  const rig = useMemo(() => {
    if (!field) return null
    const outline = throatOutline(field, SPACING)
    if (!outline) return null
    // The throat's floor, which HopperFill's underside sits just above.
    let floor = Number.POSITIVE_INFINITY
    for (let k = 0; k < field.throat.length; k++) if (field.throat[k]) floor = Math.min(floor, field.height[k])
    const top = floor + field.cell * SKIN_INSET_CELLS
    if (!(top > bottomY)) return null

    // Outward normal at each outline point, from its neighbours.
    const cx = outline.reduce((s, p) => s + p[0], 0) / outline.length
    const cz = outline.reduce((s, p) => s + p[1], 0) / outline.length
    const normals = outline.map((p, n) => {
      const prev = outline[(n - 1 + outline.length) % outline.length]
      const next = outline[(n + 1) % outline.length]
      let nx = next[1] - prev[1]
      let nz = -(next[0] - prev[0])
      if (nx * (p[0] - cx) + nz * (p[1] - cz) < 0) {
        nx = -nx
        nz = -nz
      }
      const len = Math.hypot(nx, nz) || 1
      return [nx / len, nz / len] as [number, number]
    })

    const columns = outline.length
    const rows = Math.max(2, Math.ceil((top - bottomY) / SPACING))
    const positions = new Float32Array(columns * (rows + 1) * 3)
    const index: number[] = []
    for (let r = 0; r < rows; r++) {
      for (let n = 0; n < columns; n++) {
        const a = r * columns + n
        const b = r * columns + ((n + 1) % columns)
        const c = a + columns
        const d = b + columns
        index.push(a, c, b, b, c, d)
      }
    }
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setIndex(index)
    return { outline, normals, top, rows, geometry }
  }, [field, bottomY])

  // The same soap as the hopper's, drawn the same way - see HopperFill.
  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color(MATERIAL_COLOR),
        roughness: 1,
        metalness: 0,
        flatShading: true,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 1,
      }),
    [],
  )
  // Recoloured in place on a SKU changeover; see useTint.
  useTint(material, useProductColor().mass)

  useEffect(() => {
    if (meshRef.current) meshRef.current.raycast = () => {}
    return () => {
      rig?.geometry.dispose()
    }
  }, [rig])

  useEffect(() => () => material.dispose(), [material])

  // How far the surface has travelled down, scene units, and the angle it was
  // last measured from. Unwrapped per frame: the screw's angle wraps at 2*pi.
  const travel = useRef(0)
  const lastAngle = useRef<number | null>(null)
  const written = useRef({ travel: Number.NaN, top: Number.NaN })

  useFrame(() => {
    const mesh = meshRef.current
    if (!rig || !mesh) return

    const angle = angleRef.current
    if (lastAngle.current !== null) {
      let turned = angle - lastAngle.current
      turned -= Math.round(turned / (Math.PI * 2)) * Math.PI * 2
      travel.current += (Math.abs(turned) * pitch) / (Math.PI * 2)
    }
    lastAngle.current = angle

    const fillY = fillYRef.current
    mesh.visible = Number.isFinite(fillY)
    if (!mesh.visible) return

    // Never above the fill's own underside: at a very low level that is pulled
    // down to the surface, and the column must not stand proud of it.
    const top = Math.min(rig.top, fillY)
    if (written.current.travel === travel.current && written.current.top === top) return
    written.current = { travel: travel.current, top }

    const { outline, normals, rows, geometry } = rig
    const positions = geometry.attributes.position as THREE.BufferAttribute
    for (let r = 0; r <= rows; r++) {
      const y = top + ((bottomY - top) * r) / rows
      // Sampled at y + travel, so a lump rides down the wall as travel grows.
      const v = (y + travel.current) / LUMP_WAVELENGTH
      for (let n = 0; n < outline.length; n++) {
        const [x, z] = outline[n]
        const lump = 0.5 * (fbm(x / LUMP_WAVELENGTH, v) + fbm(z / LUMP_WAVELENGTH + 13.1, v + 7.3))
        const push = LUMP_AMPLITUDE * (Math.max(-1, Math.min(1, lump)) - 1)
        positions.setXYZ(r * outline.length + n, x + normals[n][0] * push, y, z + normals[n][1] * push)
      }
    }
    // Marking the frame loop's own buffer dirty - see HopperFill.
    positions.needsUpdate = true
  })

  if (!rig) return null

  // Drawn in the same pass and order as HopperFill, so a faded pre-plodder body
  // does not wash it out - see the note there.
  return (
    <mesh ref={meshRef} geometry={rig.geometry} material={material} renderOrder={2} receiveShadow frustumCulled={false} />
  )
}
