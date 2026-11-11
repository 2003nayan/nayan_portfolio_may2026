import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { MATERIAL_COLOR } from './MixerFill'
import { useProductColor, useTint } from '../lib/productColor'
import { fbm } from '../lib/noise'

/** Which axis a barrel runs along, and the axis its rope spins about. */
export type ScrewAxis = 'x' | 'y' | 'z'

// For a spin about `axis`, the two perpendicular axes the helix winds in,
// ordered so that (cos -> first, sin -> second) matches the handedness of a
// positive rotation about `axis`. Getting this order wrong makes the rope
// counter-rotate against its own screw.
//
// The 'z' case is ['x', 'y'], exactly what this component did when it was
// z-only, so generalising it leaves the noodler's two call sites unchanged.
const PERP_AXES: Record<ScrewAxis, [ScrewAxis, ScrewAxis]> = {
  x: ['y', 'z'],
  y: ['z', 'x'],
  z: ['x', 'y'],
}

interface ScrewRibbonProps {
  // The live angle of the screw this ribbon rides on, written every frame by
  // that screw's GateHinge. Read rather than integrated: two integrations of
  // the same speed drift apart, and paste that lags its own screw is exactly
  // the sort of thing that reads as wrong without being obviously broken.
  angleRef: React.MutableRefObject<number>
  // The axis the barrel runs along. Defaults to 'z' - the noodler's barrels.
  // The pre-plodder's run along x and the final plodder's along z.
  axis?: ScrewAxis
  // The shaft's centreline in the two axes perpendicular to `axis`, in the
  // cyclic order PERP_AXES gives (for 'z' that is x then y, as before). Must be
  // the same point the screw's own GateHinge uses as its pivot, or the two turn
  // about different axes.
  centre: [number, number]
  // Ends of the barrel along `axis`. Material travels start -> end, so `start`
  // is the INLET, not necessarily the numerically smaller value: the noodler
  // and final plodder convey toward +axis, the pre-plodder toward -x.
  start: number
  end: number
  // Handedness of the winding. Pair it with the screw's spin direction - see
  // the note on HANDEDNESS below.
  clockwise: boolean
  // Where the rope starts around the shaft, in radians at `start`.
  //
  // This is not cosmetic. The screws come in mirrored pairs fitted at different
  // angles, so a rope that starts at 0 on both sits in the channel on one shaft
  // and straddles the flights on the other. Measured off each screw's own
  // flights - see SCREW_PITCH.
  phase: number
  // Outer radius of the screw this rope rides inside. The rope's helix radius,
  // thickness and lump size are all fractions of it, so a bigger screw gets a
  // proportionally bigger rope rather than a thin thread rattling around in an
  // oversized bore. Defaults to the noodler's.
  screwRadius?: number
  // Axial distance per turn of the flight. The turn count is DERIVED from this,
  // never typed in. Defaults to the noodler's.
  pitch?: number
  // Whether the rope starts as rough crumb at the inlet. Off for a screw fed
  // material that is already paste. Defaults to on.
  rough?: boolean
}

// Measured off the screw meshes, not estimated. A flight is a helicoid, so
// every point on its rim satisfies theta - k*z = constant for one k: the pitch
// is the k that makes those values cluster tightest, and the flight's angular
// position is their mean. Both noodler screws come out at 0.03216.
//
// The turn count is DERIVED from this rather than typed in. An eyeballed pitch
// beats against the real flights: the rope lines up wherever it was tuned and
// walks further off with every turn, which reads as one screw looking right and
// the other visibly wrong. At 0.0318 the error was a tenth of a turn - about 35
// degrees of drift by the far end of the barrel.
export const SCREW_PITCH = 0.03216
export const SCREW_RADIUS = 0.01785

/**
 * Free cross-section the paste is carried in, both screws together.
 *
 * Measured off the screw mesh's radius distribution: the hub surface sits at
 * 0.0080 and the flight tips at 0.0182, so the channel is that annulus, less
 * about an eighth for the metal of the flight itself. This is what converts the
 * screws' turning into a volume flow, and from there into how fast material
 * leaves the die.
 */
export const SCREW_CHANNEL_AREA = 2 * Math.PI * (0.0182 ** 2 - 0.008 ** 2) * 0.88

// Distance from the shaft centreline to the rope's own centre, the rope's
// thickness, and the size of the lumps in it - all as FRACTIONS of the screw's
// outer radius, so the same rope shape fits any size of screw.
//
// Expressed against the noodler's 0.01785.
//
// The rope is a little thinner than it once was so the lumps can be deeper
// without breaking the invariant: at 2.5 mm lumps on a 20 mm wavelength, scaled
// by averaged fbm, the inlet crumb displaced about half a millimetre and read
// as smooth from any normal viewing distance.
//
// INVARIANT: HELIX_FRACTION + TUBE_FRACTION + JAGGED_FRACTION <= 1.
// Currently 0.986. Break it and the paste grows out through the flights it is
// supposed to be riding between - which shows up as a rope visibly wider than
// its own screw only from certain angles.
const HELIX_FRACTION = 0.0076 / SCREW_RADIUS
const TUBE_FRACTION = 0.0063 / SCREW_RADIUS
const JAGGED_FRACTION = 0.0037 / SCREW_RADIUS
// Crumb-sized: shorter than the rope is thick, so it reads as broken surface
// rather than as the rope gently waving.
const LUMP_FRACTION = 0.005 / SCREW_RADIUS
// Where along the barrel the crumb is fully worked into paste, as fractions of
// inlet -> outlet. Rough through the first stretch, smooth by the die - the
// profile the reference implementation stepped through in eight segments.
const ROUGH_UNTIL = 0.2
const SMOOTH_FROM = 0.9
// Raw crumb is a shade darker and patchier than worked paste. Vertex colours
// rather than a texture: generated textures were tried on this material and
// read as speckle (see MixerFill).
const CRUMB_SHADE = 0.8

if (HELIX_FRACTION + TUBE_FRACTION + JAGGED_FRACTION > 1) {
  throw new Error(
    `ScrewRibbon: paste reaches ${HELIX_FRACTION + TUBE_FRACTION + JAGGED_FRACTION} of its own screw radius`,
  )
}

// Enough segments that a rope winding ~8.5 times still reads as round, and that
// crumb-sized lumps land on several vertices each rather than aliasing away.
const HELIX_SEGMENTS = 640
const TUBE_SEGMENTS = 16

/**
 * The centreline of the paste rope: a straight run along `axis` with a constant
 * circular offset, which is a helix.
 *
 * For a spin about `axis` the two perpendicular axes are PERP_AXES[axis], in
 * that order - (cos -> first, sin -> second) matches the handedness of a
 * positive rotation about it, so advancing the group's rotation by some angle
 * advances the helix's phase by exactly the same angle. Swap the pair and the
 * rope appears to convey against its own screw.
 */
class PasteHelixCurve extends THREE.Curve<THREE.Vector3> {
  // Declared and assigned rather than taken as constructor parameter
  // properties: this project builds with `erasableSyntaxOnly`, which rejects
  // the shorthand because it emits real code rather than erasing to nothing.
  private axis: ScrewAxis
  private u: ScrewAxis
  private v: ScrewAxis
  private cu: number
  private cv: number
  private start: number
  private end: number
  private radius: number
  private turns: number
  private clockwise: boolean
  private phase: number

  // THREE.Curve's constructor is protected, so a subclass that declares none
  // inherits that and cannot be instantiated.
  constructor(
    axis: ScrewAxis,
    cu: number,
    cv: number,
    start: number,
    end: number,
    radius: number,
    turns: number,
    clockwise: boolean,
    phase: number,
  ) {
    super()
    this.axis = axis
    ;[this.u, this.v] = PERP_AXES[axis]
    this.cu = cu
    this.cv = cv
    this.start = start
    this.end = end
    this.radius = radius
    this.turns = turns
    this.clockwise = clockwise
    this.phase = phase
  }

  getPoint(t: number, target = new THREE.Vector3()) {
    const angle = this.phase + t * this.turns * Math.PI * 2 * (this.clockwise ? 1 : -1)
    target.set(0, 0, 0)
    target[this.u] = this.cu + Math.cos(angle) * this.radius
    target[this.v] = this.cv + Math.sin(angle) * this.radius
    target[this.axis] = this.start + (this.end - this.start) * t
    return target
  }
}

/**
 * Material being conveyed along one of the machine's screws.
 *
 * Drawn as a rope of paste wound between the flights, turning with the screw.
 * A rotating helix reads as travel along its own axis - the same illusion a
 * barber's pole runs on - so the conveying comes free from the rotation and
 * needs no scrolling texture. That matters here: MixerFill records that
 * generated textures were tried for this material and removed because they read
 * as speckle rather than as surface, so all the interest comes from displaced
 * geometry and flat shading catching real light.
 */
export function ScrewRibbon({
  angleRef,
  axis = 'z',
  centre,
  start,
  end,
  clockwise,
  phase,
  screwRadius = SCREW_RADIUS,
  pitch = SCREW_PITCH,
  rough = true,
}: ScrewRibbonProps) {
  const groupRef = useRef<THREE.Group>(null)
  const meshRef = useRef<THREE.Mesh>(null)

  const geometry = useMemo(() => {
    const helixRadius = screwRadius * HELIX_FRACTION
    const tubeRadius = screwRadius * TUBE_FRACTION
    const jaggedMax = screwRadius * JAGGED_FRACTION
    const lumpWavelength = screwRadius * LUMP_FRACTION
    const [u, v] = PERP_AXES[axis]

    const turns = Math.abs(end - start) / pitch
    const curve = new PasteHelixCurve(
      axis, centre[0], centre[1], start, end, helixRadius, turns, clockwise, phase,
    )
    const geo = new THREE.TubeGeometry(curve, HELIX_SEGMENTS, tubeRadius, TUBE_SEGMENTS, false)

    // Roughen the rope, heavily at the inlet and not at all by the time it
    // reaches the outlet - raw crumb entering the barrel is worked smooth as the
    // screws compress it, which is the whole job of a plodder.
    //
    // Displacement comes from fbm sampled on the vertex's own position rather
    // than from a per-vertex random. TubeGeometry shares the seam vertices, and
    // anything random would pull the shared copies apart and split the rope
    // open along its length; a smooth function of position cannot.
    const position = geo.attributes.position as THREE.BufferAttribute
    const normal = geo.attributes.normal as THREE.BufferAttribute
    const colors = new Float32Array(position.count * 3)
    // Shading only, as a grey multiplier: the paste's own colour is the
    // material's, so a SKU changeover recolours the rope without rebuilding it.
    const span = end - start
    for (let i = 0; i < position.count; i++) {
      const x = position.getX(i)
      const y = position.getY(i)
      const z = position.getZ(i)
      const along = axis === 'x' ? x : axis === 'y' ? y : z
      const first = u === 'x' ? x : u === 'y' ? y : z
      const second = v === 'x' ? x : v === 'y' ? y : z
      // Fraction of the way from inlet to outlet. Uses the signed span, so a
      // barrel conveying toward -x is worked smooth in the same direction its
      // material actually travels rather than backwards.
      const worked = THREE.MathUtils.clamp((along - start) / span, 0, 1)
      const raw = rough ? 1 - THREE.MathUtils.smoothstep(worked, ROUGH_UNTIL, SMOOTH_FROM) : 0
      colors[i * 3] = 1
      colors[i * 3 + 1] = 1
      colors[i * 3 + 2] = 1
      if (raw <= 0) continue
      // Outward only, and contrast-stretched so the surface breaks into distinct
      // clumps with flat gaps between rather than a uniform ripple. Inward
      // lumps would also be wasted: the invariant only budgets outward reach.
      const n =
        fbm(first / lumpWavelength, along / lumpWavelength) +
        fbm(second / lumpWavelength + 17.3, along / lumpWavelength + 5.1)
      const clump = THREE.MathUtils.clamp(n * 1.2 + 0.3, 0, 1)
      const disp = clump * jaggedMax * raw
      position.setXYZ(i, x + normal.getX(i) * disp, y + normal.getY(i) * disp, z + normal.getZ(i) * disp)
      // Patches of darker crumb, on their own coarser noise so colour and relief
      // do not simply trace each other.
      const patch = THREE.MathUtils.clamp(fbm(second / lumpWavelength * 0.5 + 41.7, along / lumpWavelength * 0.5) * 2 + 0.5, 0, 1)
      const shade = 1 - (1 - CRUMB_SHADE) * patch * raw
      colors[i * 3] = shade
      colors[i * 3 + 1] = shade
      colors[i * 3 + 2] = shade
    }
    position.needsUpdate = true
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    geo.computeVertexNormals()
    return geo
  }, [axis, centre, start, end, clockwise, phase, screwRadius, pitch, rough])

  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        // The paste's colour, darkened per vertex by the crumb shading.
        color: new THREE.Color(MATERIAL_COLOR),
        vertexColors: true,
        roughness: 1,
        metalness: 0,
        flatShading: true,
      }),
    [],
  )
  // Recoloured in place on a SKU changeover; see useTint.
  useTint(material, useProductColor().mass)

  useEffect(() => {
    // Keep the click-to-select picker hitting machine parts rather than the
    // paste sitting in front of them.
    if (meshRef.current) meshRef.current.raycast = () => {}
  }, [])

  useEffect(() => {
    return () => {
      geometry.dispose()
      material.dispose()
    }
  }, [geometry, material])

  useFrame(() => {
    // Assigned, never accumulated, and never gated on the screw running: when
    // the plant stops, angleRef stops and this write becomes an idempotent
    // no-op. Doing it every frame is what lets the rope snap onto the correct
    // phase immediately rather than sitting wherever it was left.
    if (groupRef.current) groupRef.current.rotation[axis] = angleRef.current
  })

  // The geometry is built in absolute scene-relative coordinates, so the group
  // is placed on the shaft centreline and the mesh shifted straight back off
  // it. The net translation is zero, but the group now turns about the barrel's
  // own axis instead of orbiting the scene origin. Only the two PERPENDICULAR
  // components matter - zeroing the axis component is what stops the spin
  // sliding the rope along the barrel.
  const pivot = useMemo(() => {
    const [u, v] = PERP_AXES[axis]
    const p = new THREE.Vector3()
    p[u] = centre[0]
    p[v] = centre[1]
    return p
  }, [axis, centre])

  return (
    <group ref={groupRef} position={pivot}>
      <mesh
        ref={meshRef}
        geometry={geometry}
        material={material}
        position={[-pivot.x, -pivot.y, -pivot.z]}
        castShadow
        receiveShadow
      />
    </group>
  )
}

// HANDEDNESS
//
// A counter-rotating pair still has to convey the same way. The rule, and why
// it holds:
//
// A point at curve parameter t sits at angle phase + t*T (T = turns*2*pi, signed
// by `clockwise`) and at axis coordinate start + (end-start)*t. Rotating the
// group by alpha makes the shape that WAS at angle theta appear at t' =
// t - alpha/(+/-T), whose axis coordinate moves by -(end-start)/(+/-T) per
// radian. Requiring apparent travel to run start -> end therefore needs
//
//   clockwise: true   <->  the screw spins NEGATIVE
//   clockwise: false  <->  the screw spins POSITIVE
//
// independently of which way along the axis `end` lies.
//
// That rule only makes the ROPE appear to travel the right way. The rope must
// also wind the same way as the flight it rides in, and `clockwise` alone does
// not say which way that is in the world: the parameter runs toward `end`, so
// the same flag winds oppositely on a barrel conveying toward -x. Choose
// `clockwise` to match the screw's fitted helix first, then set the spin by the
// rule above. The pre-plodder once did it the other way round - spin first,
// flag to suit - and its ropes crossed their own flights twice every turn.
//
// If the paste then appears to travel the wrong way, the SPIN is backwards:
// flip the rotation on both screws of the pair. Flipping `clockwise` instead
// puts the rope back across the flights.
