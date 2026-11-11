import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { WHITE_PALETTE, useProductColor, useTint } from '../lib/productColor'
import { FULL_MIXER, stepMixerCycle, type MixerCycleState } from '../lib/mixerCycle'

interface MixerFillProps {
  scene: THREE.Object3D
  // Name of the bowl/housing mesh whose bounding box the fill is
  // approximated inside - not a precise cavity fit, just a reasonable
  // visual approximation (confirmed acceptable).
  bowlMeshName: string
  // Fraction of the bowl's internal height the material's HIGHEST point
  // rises to. Default 0.65 buries the two sigma blades (which top out at
  // ~65% of Body94_A3_0's height) with a little to spare, matching the
  // reference photo where the blades are covered but the trough is not full.
  fillHeightFraction?: number
  // Fraction of the bowl's width/depth the material's footprint occupies.
  // Default 0.84 keeps it inside the two end walls
  // (BOLTX105_A7_0 / BOLTX106_A7_0 sit at 0.18 and 0.44 across a 0.28 span).
  footprintFraction?: number
  // Live angles of the two sigma blades, in radians, published by their
  // GateHinge. The material's motion is a function of these rather than of
  // elapsed time, so the crests stay welded to the arms that raise them and
  // everything freezes in place the moment the blades stop.
  blade1AngleRef?: React.MutableRefObject<number>
  blade2AngleRef?: React.MutableRefObject<number>
  // Whether the mixer is running. Only gates how far the standing
  // redistribution has established itself - the blade-driven crests always
  // track the angles above.
  mixing?: boolean
  // Whether the discharge gate is open. Draining needs BOTH this and `mixing`:
  // an open gate on a stopped mixer discharges nothing, because stiff soap
  // base will not flow under gravity - the blades have to push it out. Once it
  // shuts, the trough is recharged from the feed hopper (see mixerCycle).
  gateOpen?: boolean
  // How empty the trough is, 0-1, published every frame so the discharge
  // chunks know when there is no material left to shear off, and the charge
  // stream how much has arrived.
  drainRef?: React.MutableRefObject<number>
  // Whether the trough is being recharged, published for MixerCharge.
  refillingRef?: React.MutableRefObject<boolean>
  // Height of the material's surface down the trough's centre, scene y,
  // published so the charge stream lands on it rather than falling through.
  surfaceYRef?: React.MutableRefObject<number>
}

// Resolution of the top-surface grid. 96 gives ~19k triangles per face, fine
// for a single static mesh, and with flatShading the facets land small enough
// to read as granularity rather than as visible polygons.
const GRID = 96

// How high the mass sits against the walls, as a fraction of its peak height.
// Deliberately NOT zero: real product in a trough is packed right up to the
// walls and merely lower there, whereas a falloff-to-zero dome would look like
// a scoop of ice cream sitting in an empty tub.
const EDGE_LEVEL = 0.8

// The trough's floor, measured off the model rather than assumed. Casting
// vertical rays through the mixer assembly puts the floor at y=1.865 in the
// middle, curving up to ~1.945 at both z walls, against a bowl bounding box of
// y=1.859..2.100. As fractions of that box's height:
//   (1.865 - 1.859) / 0.241 = 0.025   -> CAVITY_FLOOR
//   (1.945 - 1.865) / 0.241 = 0.332   -> TROUGH_CURVE
//
// This curve is the whole reason the fill has to be a shaped solid rather than
// a box: the bounding box is 0.24 tall everywhere, but the actual void inside
// is only that deep down the centre line and shallows to almost nothing at the
// walls. A flat-bottomed fill drops straight through the curving shell and
// pokes out underneath, which is exactly what a box-shaped fill did here.
//
// TROUGH_CURVE is biased slightly above the measured 0.332 so the material
// rests just inside the shell instead of coplanar with it - coincident
// surfaces z-fight and flicker as the camera moves.
const CAVITY_FLOOR = 0.03
const TROUGH_CURVE = 0.4

// Never let the top surface meet or cross the floor, however the noise lands:
// the two would interpenetrate near the walls and show as specks of inside-out
// surface. Keeps a thin but always-positive layer of material at the edges.
const MIN_THICKNESS = 0.012

// The material's colour, applied flat across the whole mass.
//
// Deliberately a single uniform albedo with no color map, no bump map and no
// vertex colours. Earlier revisions painted crumb mottling and crevice shading
// into a generated texture, which read as black speckle rather than as
// texture - so all surface interest now comes from the displaced geometry and
// flat shading, where it is driven by real lighting instead of baked-in dirt.
// The white SKU's; useTint swaps in the active SKU's colour.
export const MATERIAL_COLOR = WHITE_PALETTE.mass

// --- deterministic noise -----------------------------------------------
// Seeded rather than Math.random so the heap looks identical on every mount
// and every reload - a mixer whose contents reshuffle each time the component
// remounts would be distracting.

function hash2(ix: number, iy: number): number {
  let h = Math.imul(ix, 374761393) + Math.imul(iy, 668265263)
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

function valueNoise(x: number, y: number): number {
  const xi = Math.floor(x)
  const yi = Math.floor(y)
  const xf = x - xi
  const yf = y - yi
  // Smoothstep the interpolants so the lumps have rounded shoulders instead
  // of the diamond-shaped creases plain linear interpolation produces.
  const u = xf * xf * (3 - 2 * xf)
  const v = yf * yf * (3 - 2 * yf)
  const a = hash2(xi, yi)
  const b = hash2(xi + 1, yi)
  const c = hash2(xi, yi + 1)
  const d = hash2(xi + 1, yi + 1)
  return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v
}

// Fractal sum, returned in roughly [-1, 1]. Octave frequencies step by 2.1
// rather than exactly 2 so the layers never line up into a visible grid.
function fbm(x: number, y: number, octaves = 4): number {
  let sum = 0
  let amplitude = 0.5
  let frequency = 1
  for (let i = 0; i < octaves; i++) {
    sum += amplitude * (valueNoise(x * frequency, y * frequency) * 2 - 1)
    frequency *= 2.1
    amplitude *= 0.5
  }
  return sum
}

// --- surface profile ----------------------------------------------------

// Height of the material's top surface at (u, v), both in [-1, 1], returned
// as a 0-1 fraction of the fill height.
//
// Three superimposed scales, which is what makes it read as a heap of loose
// product rather than as a moulded shape:
//   1. `dome`  - the overall mound, higher down the middle, sloping to the walls
//   2. `lumps` - clumps a few centimetres across, where the blades have folded it
//   3. `grain` - fine irregularity so no facet matches its neighbour
//
// The dome uses |u|^4 (a broad plateau that only drops near the end walls)
// against v^2 (a gentler arch across the narrow axis), because the trough is
// longer than it is wide and the blades run along u.
function surfaceProfile(u: number, v: number): number {
  const dome = (1 - Math.pow(Math.abs(u), 4)) * (1 - v * v)
  const lumps = fbm(u * 3.2 + 11.3, v * 3.2 + 4.7) * 0.055
  const grain = fbm(u * 9.5 + 31.7, v * 9.5 + 19.1) * 0.018
  return THREE.MathUtils.clamp(EDGE_LEVEL + (1 - EDGE_LEVEL) * dome + lumps + grain, 0.15, 1)
}

// Height of the trough's floor at cross-section position v, as a fraction of
// the bowl's bounding-box height. Depends only on v: the floor is a constant
// U-section extruded along the trough's long axis, which the ray probe
// confirms - every x column reports the same profile.
function troughFloor(v: number): number {
  return CAVITY_FLOOR + TROUGH_CURVE * v * v
}

// Height of the material's top surface, in the same bounding-box fraction
// units, clamped to stay above the floor it rests on.
function surfaceTop(u: number, v: number, fillHeightFraction: number): number {
  const top = CAVITY_FLOOR + fillHeightFraction * surfaceProfile(u, v)
  return Math.max(top, troughFloor(v) + MIN_THICKNESS)
}

// --- geometry -----------------------------------------------------------

// A closed solid spanning x, z in [-1, 1], with y expressed as a fraction of
// the bowl's bounding-box height (0 = box floor, 1 = box rim). The caller
// scales y by the full box height and sits the mesh on the box's underside,
// so these fractions land exactly where the measurements above say they should.
//
// Both faces are shaped: the top is the heap, and the bottom follows the
// trough's U-section so the solid nests inside the shell instead of punching
// through it. Built by hand rather than from PlaneGeometry because top, sides
// and underside have to be one closed mesh - the bowl's opacity is
// user-controllable, so an open-bottomed surface would show as a hollow shell
// the moment anyone fades the housing to look inside.
function createHeapGeometry(fillHeightFraction: number): THREE.BufferGeometry {
  const positions: number[] = []
  const indices: number[] = []
  // 1 for vertices that ride the top surface, 0 for those pinned to the trough
  // shell. The blade animation displaces only the former, so the underside
  // stays welded to the trough while the heap above it churns.
  const surface: number[] = []

  const rowSize = GRID + 1
  const gridUV = (i: number) => (i / GRID) * 2 - 1

  // Top surface: the heap.
  for (let iz = 0; iz <= GRID; iz++) {
    const v = gridUV(iz)
    for (let ix = 0; ix <= GRID; ix++) {
      const u = gridUV(ix)
      positions.push(u, surfaceTop(u, v, fillHeightFraction), v)
      surface.push(1)
    }
  }
  for (let iz = 0; iz < GRID; iz++) {
    for (let ix = 0; ix < GRID; ix++) {
      const a = iz * rowSize + ix
      const b = a + 1
      const c = a + rowSize
      const d = c + 1
      // (a, c, b) rather than (a, b, c): the latter winds clockwise seen from
      // above and would face the surface downward, into the bowl.
      indices.push(a, c, b, b, c, d)
    }
  }

  // Underside: the trough's U-section, wound the opposite way so it faces down.
  const underStart = positions.length / 3
  for (let iz = 0; iz <= GRID; iz++) {
    const v = gridUV(iz)
    for (let ix = 0; ix <= GRID; ix++) {
      positions.push(gridUV(ix), troughFloor(v), v)
      surface.push(0)
    }
  }
  for (let iz = 0; iz < GRID; iz++) {
    for (let ix = 0; ix < GRID; ix++) {
      const a = underStart + iz * rowSize + ix
      const b = a + 1
      const c = a + rowSize
      const d = c + 1
      indices.push(a, b, c, b, d, c)
    }
  }

  // Sides. Walk the boundary as one closed loop so the winding stays
  // consistent all the way around and every quad faces outward.
  const perimeter: Array<[number, number]> = []
  for (let ix = 0; ix < GRID; ix++) perimeter.push([gridUV(ix), -1])
  for (let iz = 0; iz < GRID; iz++) perimeter.push([1, gridUV(iz)])
  for (let ix = GRID; ix > 0; ix--) perimeter.push([gridUV(ix), 1])
  for (let iz = GRID; iz > 0; iz--) perimeter.push([-1, gridUV(iz)])

  const skirtStart = positions.length / 3
  perimeter.forEach(([u, v]) => {
    positions.push(u, surfaceTop(u, v, fillHeightFraction), v)
    surface.push(1)
    positions.push(u, troughFloor(v), v)
    surface.push(0)
  })
  for (let i = 0; i < perimeter.length; i++) {
    const next = (i + 1) % perimeter.length
    const top = skirtStart + i * 2
    const bottom = top + 1
    const nextTop = skirtStart + next * 2
    const nextBottom = nextTop + 1
    indices.push(top, nextTop, bottom, nextTop, nextBottom, bottom)
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('aSurface', new THREE.Float32BufferAttribute(surface, 1))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

// --- blade-driven motion ------------------------------------------------

// Where each blade's shaft sits across the trough, in the fill's own v
// coordinate. The shafts are at z = -1.119 and -1.042 against a fill centred
// on z = -1.0815 with a half-depth of ~0.087, so they land symmetrically
// either side of the middle.
const BLADE_1_V = -0.44
const BLADE_2_V = 0.48

// How far each blade's influence reaches across the trough. Wide enough that
// the two lobes overlap in the middle - that overlap is where the two blades
// hand material to each other.
const LOBE_WIDTH = 0.5

// Phase twist along the trough's length. A sigma blade is a helix, so its
// arms reach top-dead-centre at different points along the shaft: the crest
// travels lengthwise instead of the whole length heaving at once.
//
// PI over u in [-1, 1] is a full 2*PI of phase across the trough, which also
// makes each blade's contribution integrate to zero along its length - the
// material is displaced, never created or destroyed.
const BLADE_TWIST = Math.PI

// Amplitudes, as fractions of the bowl's height.
//   REDISTRIBUTION - the standing "pulled down the middle, heaped at the
//     walls" shape that counter-rotating-inward blades hold the mass in.
//   CREST - the travelling bulge riding each blade arm.
const REDISTRIBUTION = 0.045
const CREST = 0.035

// How quickly the standing redistribution establishes itself once the blades
// start, in units per second. Material does not snap into its mixing shape
// the instant the motor engages, and it stays where the blades left it when
// they stop rather than relaxing back.
const CHURN_RATE = 0.35

// Where the discharge gate sits across the trough, in the fill's own v
// coordinate - the gate panel is offset toward one side rather than centred,
// so the mass drains down over there first.
const GATE_V = 0.35

// How much faster the material right over the gate drops than material at the
// far end. Above 0 the surface funnels down over the opening instead of
// sinking as one flat slab, which is what actually happens - the mass nearest
// the gate leaves first and the rest slumps in after it.
//
// Discharge only. A recharge pours in from the feed hopper above and spreads
// as it lands, so it rises level instead - played backwards, the funnel would
// fill the far end of the trough first.
const DRAIN_FUNNEL = 0.55

// How fast the funnel bias eases between draining and recharging, per second.
// At either extreme of the level the bias makes no difference, but a gate shut
// halfway through a discharge leaves a sloped surface, and switching the bias
// in one frame would snap it flat.
const FUNNEL_EASE = 1.5

// Largest distance any point on the surface can be from the gate, used to
// normalise that distance to 0-1. The corner at u = -1, v = -1 is the furthest
// from a gate sitting at v = GATE_V, with u weighted by 0.6 because the trough
// is longer than it is wide.
const MAX_GATE_DIST = Math.sqrt(0.6 * 0.6 + (1 + GATE_V) * (1 + GATE_V))

// The displacement field, shared between the vertex shader and nothing else -
// it exists only as GLSL because with flatShading three.js derives normals
// from screen-space derivatives of the view position, which means displacing
// vertices on the GPU re-lights the surface correctly for free. Doing the
// same work on the CPU would mean recomputing normals for ~37k triangles
// every frame.
const DISPLACEMENT_GLSL = /* glsl */ `
  float mixerLift(float u, float v, float a1, float a2, float churn) {
    // Standing redistribution. (3v^2 - 1) integrates to zero across the
    // trough, so pulling the middle down heaps the walls up by exactly the
    // volume removed - the mass never inflates or deflates as it churns.
    float redistribute = ${REDISTRIBUTION.toFixed(4)} * (3.0 * v * v - 1.0);

    // A crest riding each blade, its phase set by the blade's real angle.
    // The two angles carry opposite signs because the blades counter-rotate,
    // so the two crests travel along the trough in opposite directions and
    // meet in the middle - the fold.
    float lobe1 = exp(-pow((v - ${BLADE_1_V.toFixed(3)}) / ${LOBE_WIDTH.toFixed(3)}, 2.0));
    float lobe2 = exp(-pow((v - ${BLADE_2_V.toFixed(3)}) / ${LOBE_WIDTH.toFixed(3)}, 2.0));
    float crest = ${CREST.toFixed(4)} * (
        lobe1 * sin(${BLADE_TWIST.toFixed(6)} * u + a1)
      + lobe2 * sin(${BLADE_TWIST.toFixed(6)} * u + a2)
    );

    return churn * (redistribute + crest);
  }

  // Height of the trough's floor - the level the surface collapses onto as the
  // batch discharges.
  float mixerFloor(float v) {
    return ${CAVITY_FLOOR.toFixed(4)} + ${TROUGH_CURVE.toFixed(4)} * v * v;
  }

  // How far this point has drained, 0-1. Biased by distance from the gate so
  // the near end empties first and the far end catches up.
  //
  // The distance is NORMALISED to 0-1 before the bias is applied, which is
  // what guarantees the far corner also reaches 1 exactly at drain = 1. Using
  // the raw distance leaves the far end only ~74% drained when the batch is
  // nominally finished, so the mass vanishes with its corners still full.
  float mixerDrained(float u, float v, float drain, float funnel) {
    float gateDist = length(vec2(u * 0.6, v - ${GATE_V.toFixed(3)})) / ${MAX_GATE_DIST.toFixed(6)};
    return clamp(drain * (1.0 + funnel) - funnel * gateDist, 0.0, 1.0);
  }
`

// Injects the surface displacement into whichever shader is compiling. Shared
// between the visible material and the shadow-pass depth material so both move
// the geometry identically - see the note at the depthMaterial below.
type FillUniforms = Record<'uBlade1' | 'uBlade2' | 'uChurn' | 'uDrain' | 'uFunnel', { value: number }>

function applyDisplacement(uniforms: FillUniforms) {
  return (shader: THREE.WebGLProgramParametersWithUniforms) => {
    shader.uniforms.uBlade1 = uniforms.uBlade1
    shader.uniforms.uBlade2 = uniforms.uBlade2
    shader.uniforms.uChurn = uniforms.uChurn
    shader.uniforms.uDrain = uniforms.uDrain
    shader.uniforms.uFunnel = uniforms.uFunnel
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
         attribute float aSurface;
         uniform float uBlade1;
         uniform float uBlade2;
         uniform float uChurn;
         uniform float uDrain;
         uniform float uFunnel;
         ${DISPLACEMENT_GLSL}`,
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
         if (aSurface > 0.5) {
           float u = position.x;
           float v = position.z;
           float churned = position.y + mixerLift(u, v, uBlade1, uBlade2, uChurn);
           // Collapse the top surface onto the trough floor as it empties.
           // The underside is pinned to that floor already, so at drain = 1
           // the solid has no thickness left and the trough reads as bare.
           transformed.y = mix(churned, mixerFloor(v), mixerDrained(u, v, uDrain, uFunnel));
         }`,
      )
  }
}

// --- placement ----------------------------------------------------------

// `object`'s transform as if `scene` were sitting at the identity transform.
// Unlike object.matrixWorld, this is independent of scene.position (which
// Position Controls may set, and which may not even be applied yet at the
// moment this runs - see the note on `transform` below).
function getSceneRelativeMatrix(object: THREE.Object3D, scene: THREE.Object3D, target: THREE.Matrix4) {
  scene.updateWorldMatrix(true, false)
  object.updateWorldMatrix(true, false)
  return target.copy(scene.matrixWorld).invert().multiply(object.matrixWorld)
}

// Renders the mixed soap base sitting in the sigma mixer's trough: a matte,
// uniformly off-white heap mounded up the middle, shaped to the bowl mesh's
// bounding box (there's no separate cavity mesh in the source file), nesting
// on the trough's curved floor and peaking at `fillHeightFraction` of the
// bowl's height.
export function MixerFill({
  scene,
  bowlMeshName,
  fillHeightFraction = 0.85,
  footprintFraction = 0.84,
  blade1AngleRef,
  blade2AngleRef,
  mixing = false,
  gateOpen = false,
  drainRef,
  refillingRef,
  surfaceYRef,
}: MixerFillProps) {
  const geometry = useMemo(() => createHeapGeometry(fillHeightFraction), [fillHeightFraction])
  const meshRef = useRef<THREE.Mesh>(null)
  const cycle = useRef<MixerCycleState>(FULL_MIXER)

  // Held in a ref and handed straight to the shader: these change every frame
  // and must never trigger a React render.
  const uniforms = useRef({
    uBlade1: { value: 0 },
    uBlade2: { value: 0 },
    uChurn: { value: 0 },
    uDrain: { value: 0 },
    uFunnel: { value: DRAIN_FUNNEL },
  })

  const material = useMemo(() => {
    const created = new THREE.MeshStandardMaterial({
      color: new THREE.Color(MATERIAL_COLOR),
      // Fully rough and non-metallic: dry loose powder has no specular
      // highlight at all, and any gloss immediately reads as wet or molten.
      roughness: 1,
      metalness: 0,
      // Per-face normals, so adjacent facets of the displaced surface catch
      // the light at visibly different angles. With a flat albedo this is the
      // only thing giving the mass its granular read - and because three.js
      // derives flat normals from screen-space derivatives, it also means the
      // shader displacement below re-lights itself with no extra work.
      flatShading: true,
    })
    created.onBeforeCompile = applyDisplacement(uniforms.current)
    return created
  }, [])
  // Recoloured in place on a SKU changeover; see useTint.
  useTint(material, useProductColor().mass)

  // The shadow pass renders through its own depth material, which knows
  // nothing about onBeforeCompile on the visible one. Without this the mesh
  // would keep casting a full-height shadow of the resting heap while the real
  // surface churns and then drains away - an empty trough throwing the shadow
  // of a full one.
  const depthMaterial = useMemo(() => {
    const created = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking })
    created.onBeforeCompile = applyDisplacement(uniforms.current)
    return created
  }, [])

  useEffect(() => {
    return () => {
      material.dispose()
      depthMaterial.dispose()
    }
  }, [material, depthMaterial])

  const transform = useMemo(() => {
    const bowl = scene.getObjectByName(bowlMeshName) as THREE.Mesh | undefined
    if (!bowl || !bowl.geometry) return null

    // Work entirely in scene-relative space, computed from the bowl's OWN
    // local geometry bounds rather than Box3.setFromObject + worldToLocal.
    // The latter depends on scene.position's CURRENT value, but this runs
    // during the very first render - before the ground-alignment layout
    // effect has computed and applied the model's real position offset -
    // so it would silently assume a zero offset and end up displaced by
    // however much the model shifts afterward. Scene-relative math sidesteps
    // this entirely by never depending on scene.position in the first place.
    bowl.geometry.computeBoundingBox()
    const localBox = bowl.geometry.boundingBox!.clone()
    const relMatrix = getSceneRelativeMatrix(bowl, scene, new THREE.Matrix4())
    const sceneRelativeBox = localBox.applyMatrix4(relMatrix)
    const sceneRelativeSize = sceneRelativeBox.getSize(new THREE.Vector3())

    const halfWidth = (sceneRelativeSize.x * footprintFraction) / 2
    const halfDepth = (sceneRelativeSize.z * footprintFraction) / 2

    // The geometry's y is already a fraction of the box height (0 at the box
    // floor, 1 at the rim), so scaling y by the FULL height and sitting the
    // mesh on the box's underside places every measured level - trough floor,
    // heap peak - exactly where it was measured. Scaling by the fill height
    // instead would rescale the trough curve along with the heap and pull the
    // underside back off the shell.
    const position: [number, number, number] = [
      (sceneRelativeBox.min.x + sceneRelativeBox.max.x) / 2,
      sceneRelativeBox.min.y,
      (sceneRelativeBox.min.z + sceneRelativeBox.max.z) / 2,
    ]

    return {
      position,
      scale: [halfWidth, sceneRelativeSize.y, halfDepth] as [number, number, number],
    }
  }, [scene, bowlMeshName, footprintFraction])

  useFrame((_, delta) => {
    const u = uniforms.current
    // Read the blades' real angles rather than integrating a second copy of
    // the spin speed - the crests have to sit on the arms that raise them.
    u.uBlade1.value = blade1AngleRef?.current ?? 0
    u.uBlade2.value = blade2AngleRef?.current ?? 0

    // Discharge needs the gate open AND the blades turning. This is the one
    // behaviour a site engineer would notice immediately if it were wrong:
    // open the gate on a stopped mixer and the batch just sits there, because
    // stiff soap base bridges over the opening instead of falling through it.
    // Once the gate shuts, the feed hopper recharges whatever left.
    const wasRefilling = cycle.current.refilling
    cycle.current = stepMixerCycle(cycle.current, gateOpen, mixing, delta)
    const { drain, refilling } = cycle.current
    u.uDrain.value = drain

    // A fresh charge arrives as loose, level material, not in the folded shape
    // the last batch was left in - so the churn starts over, and the blades
    // work the new batch back up into it.
    if (refilling && !wasRefilling) u.uChurn.value = 0
    // Ramps in while mixing and holds where it is when the blades stop: the
    // mass keeps whatever shape it was left in instead of relaxing flat.
    if (mixing) u.uChurn.value = Math.min(1, u.uChurn.value + CHURN_RATE * delta)

    const funnelTarget = refilling ? 0 : DRAIN_FUNNEL
    const funnelStep = FUNNEL_EASE * delta
    u.uFunnel.value += THREE.MathUtils.clamp(funnelTarget - u.uFunnel.value, -funnelStep, funnelStep)

    if (drainRef) drainRef.current = drain
    if (refillingRef) refillingRef.current = refilling
    // Taken down the centre line without the churn, which only ever moves the
    // surface a few percent of the bowl's height - near enough for granules
    // landing on it.
    if (surfaceYRef && transform) {
      const level = THREE.MathUtils.lerp(surfaceTop(0, 0, fillHeightFraction), troughFloor(0), drain)
      surfaceYRef.current = transform.position[1] + level * transform.scale[1]
    }

    // Once empty, take the mesh out of the scene entirely. Draining works by
    // collapsing the top surface down onto the trough floor, and the underside
    // is already pinned there - so at the end the two coincide and what is
    // left is a zero-thickness sheet lining the trough. It has no volume but
    // it still renders, and it reads as a white film of material that never
    // discharged. Hiding it is what actually makes the trough look empty.
    if (meshRef.current) meshRef.current.visible = drain < 0.999
  })

  if (!transform) return null

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      material={material}
      position={transform.position}
      scale={transform.scale}
      castShadow
      receiveShadow
      customDepthMaterial={depthMaterial}
    />
  )
}
