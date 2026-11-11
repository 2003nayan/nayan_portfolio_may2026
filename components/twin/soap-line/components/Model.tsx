import { useEffect, useMemo, useRef } from 'react'
import type { ThreeEvent } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { GateHinge, type GateHingeConfig } from './GateHinge'
import { ConveyorBelt, type ConveyorBeltConfig } from './ConveyorBelt'
import { MeshOpacity } from './MeshOpacity'
import { MixerFill } from './MixerFill'
import { MixerDischarge } from './MixerDischarge'
import { MixerCharge } from './MixerCharge'
import { HopperFill } from './HopperFill'
import { FeedColumn } from './FeedColumn'
import { ScrewRibbon, SCREW_PITCH, SCREW_RADIUS } from './ScrewRibbon'
import { NoodleExtrusion } from './NoodleExtrusion'
import { TrmFlakes } from './TrmFlakes'
import { PlodderExtrusion } from './PlodderExtrusion'
import { ConeFill } from './ConeFill'
import { BilletCutter, type ShortBarRequest } from './BilletCutter'
import { LIFT_MESH, measureLiftRoute, type LiftRoute, type RecycleRoute } from '../lib/recycleRoute'
import { EMPTY_FILL, probeHopperSurface } from '../lib/hopperSurface'
import { useProductColor } from '../lib/productColor'
import {
  PLODDER_ROOT,
  PP_SHAFT_A_MESHES,
  PP_SHAFT_B_MESHES,
  FP_SHAFT_2_MESHES,
  FP_SHAFT_3_MESHES,
  PP_SHAFT_A_CENTRE,
  PP_SHAFT_B_CENTRE,
  FP_SHAFT_2_CENTRE,
  FP_SHAFT_3_CENTRE,
  PP_BARREL_START_X,
  PP_BARREL_END_X,
  FP_BARREL_START_Z,
  FP_BARREL_END_Z,
  PP_SCREW_RADIUS,
  FP_SCREW_RADIUS,
  PP_SCREW_PITCH,
  FP_SCREW_PITCH,
  PP_SHAFT_A_PHASE,
  PP_SHAFT_B_PHASE,
  FP_SHAFT_2_PHASE,
  FP_SHAFT_3_PHASE,
  PRE_PLODDER_BODY_MESHES,
  VACUUM_CHAMBER_OPACITY_MESHES,
  FINAL_PLODDER_OPACITY_MESHES,
  CONE_HEATER_OPACITY_MESHES,
} from '../lib/plodderGeometry'

export interface ModelBounds {
  size: THREE.Vector3
  min: THREE.Vector3
}

// The scene's bounds in its OWN coordinates - as if it sat at the origin -
// whatever it has been moved to. useGLTF caches the loaded scene and hands the
// SAME object to every mount (a revisit to the dashboard, a hot reload, the
// preload), so it can arrive already moved into place by an earlier mount.
// Measured in world space, that offset leaked into the layout and shifted the
// whole line out from under the fixed opening camera.
function localBounds(scene: THREE.Object3D): THREE.Box3 {
  scene.updateWorldMatrix(true, true)
  const toLocal = scene.matrixWorld.clone().invert()
  const box = new THREE.Box3()
  const part = new THREE.Box3()
  const matrix = new THREE.Matrix4()
  scene.traverse((object) => {
    const geometry = (object as THREE.Mesh).geometry as THREE.BufferGeometry | undefined
    if (!geometry) return
    if (!geometry.boundingBox) geometry.computeBoundingBox()
    matrix.multiplyMatrices(toLocal, object.matrixWorld)
    box.union(part.copy(geometry.boundingBox!).applyMatrix4(matrix))
  })
  return box
}

// The gate panel and its own hardware - rotates around the panel's hinge.
// ('SF' > Body135 > pCylinder2807 in the glTF's node tree.)
const GATE_PANEL_MESHES = ['SF_A3_0', 'Body135_A3_0', 'pCylinder2807_A7_0']

// The actuator that drives the panel, plus its mounting bracket. These are
// NOT part of the panel's node subtree (the panel actually nests underneath
// the actuator in the glTF), so they're tracked as their own independent
// rigid group with their own pivot, separate from GATE_PANEL_MESHES.
const GATE_ACTUATOR_MESHES = ['olid1_A18_0', 'Y_Joint_Cylinder_Clevis_A5_0']

// The two sigma mixer blades - each its own rigid mesh, spinning around its
// own shaft axis (independent of the gate/actuator groups above).
const ROTOR_1_MESHES = ['R_A5_0']
const ROTOR_2_MESHES = ['R2_A5_0']

// The two screw conveyors (augers) - each made of two mesh parts that
// rotate together as one rigid shaft, running along the Z axis (unlike the
// gate/mixer parts above, which run along X).
const LEFT_SCREW_MESHES = ['Screw_Conveyor_ZZBXZ3_A4_0', 'Screw_Conveyor_A4_0']
const RIGHT_SCREW_MESHES = ['Screw_Conveyor_ZZBXZ2_A4_0', 'Screw_Conveyor1_A4_0']

// The conveyor belt surface - the mesh itself never moves (it stays exactly
// where it is between the real rollers); only its texture scrolls, to fake
// flowing material. See ConveyorBelt.tsx for why - no separate roller mesh
// and no usable source texture to work with.
const CONVEYOR_MESH_NAME = 'GS7_AW6_0'

// A second conveyor belt - same setup, same reasoning (flat-color material,
// no separate roller mesh, so only the texture scrolls).
const CONVEYOR_2_MESH_NAME = 'GSDG_AW6_0'

// The three stacked crimping/corrugating rolls - each roll mesh plus its own
// stuck-on material sheet, rotating together as one rigid group around the
// roll's shaft axis (axis 'x', like the mixer blades). Physically stacked
// and touching, so they alternate direction by default (like meshing gears)
// rather than all spinning the same way.
const ROLL_1_MESHES = ['UYTU_A4_0', 'TUT_R1_0']
const ROLL_2_MESHES = ['TYU_A4_0', 'TU_R1_0']
const ROLL_3_MESHES = ['YTUJ_A4_0', 'W_R1_0']

// Opacity-controllable groups. Body94_A3_0 is the mixer bowl/housing shell
// itself (confirmed), so it stays in this group unchanged - fading it lets
// you see the mechanism inside. The actual "material inside the mixer" is
// separate new geometry (MixerFill below), not a re-skin of the bowl.
const MIXER_OPACITY_MESHES = ['Body94_A3_0', 'BOLTX106_A7_0', 'BOLTX120_A3_0', 'BOLTX105_A7_0']
// Scoped to the noodler's own subtree. These names are NOT unique: the
// pre-plodder at the end of the line is the same CAD part, so it carries meshes
// of the same names, and an unscoped lookup faded whichever the traversal
// reached first - which is why this slider used to change the pre-plodder.
const NOODLER_SCOPE = 'Unit2'
const NOODLER_OPACITY_MESHES = ['pCube3658_A3_0', 'pCube3698_A3_0']
// The hopper feeding the noodler, sitting directly under the mixer's discharge
// gate (y 1.38..1.73, against the mixer trough at 1.86..2.10).
const HOPPER_OPACITY_MESHES = ['Unit2_Ryor19_A4_0']
const HOPPER_COLOR = '#a38251'

// The pre-plodder's hopper, at the end of the line - what the mill's flakes fall
// into. A different funnel from HOPPER_OPACITY_MESHES above despite the similar
// name: that one is Unit2_Ryor19_A4_0, up at y 1.38..1.73 under the mixer's
// discharge gate, while this sits at y 0.42..0.65 under the roll mill.
const PRE_PLODDER_HOPPER_MESH = 'Ryor19_A3_0'

// The chute carrying the mill's flakes down to that hopper - the 75.5-degree
// ramp in TrmFlakes' route. Its own see-through group, along with the hopper
// below it, because between them they are what the last leg of the journey
// happens inside: solid, the flakes vanish behind them.
const TRM_CHUTE_OPACITY_MESHES = ['S3661_A4_0']
// The covered recycle conveyor up to that hopper. Scrap rides inside it, so it
// has its own see-through toggle.
const RECYCLE_CONVEYOR_OPACITY_MESHES = [LIFT_MESH]
const PRE_PLODDER_OPACITY_MESHES = [PRE_PLODDER_HOPPER_MESH]

// How full the pre-plodder hopper is drawn, 0-100.
//
// Its level comes from the plant (pre_plodder.hopper_level) via the
// prePlodderLevel prop, as the noodler hopper's does.

// The three rolls' product-facing drums - the surfaces soap is actually pressed
// between, one per roll (they are the second mesh of each ROLL_n_MESHES pair
// above, so they turn with their shafts).
//
// Given the soap's own colour rather than the bright red they carry in the CAD
// export, which is a modelling placeholder rather than anything the machine
// looks like. Recoloured through MeshOpacity at full opacity, NOT by setting
// the colour on the material they arrive with: all three share one material
// instance with 19 unrelated meshes - bolts, an electric box, the flow-wrap
// cubes - and writing to it would quietly repaint every one of them.
const ROLL_SURFACE_MESHES = ['TUT_R1_0', 'TU_R1_0', 'W_R1_0']
const MIXER_BOWL_MESH_NAME = 'Body94_A3_0'
// The blue flange on the feed hopper's (HH_A4_0) outlet, where each fresh
// batch drops into the mixer through its top cover. The flange rather than the
// neck mesh below it: the flange is centred on the outlet's axis, while that
// neck mesh sits ~0.02 off it.
const MIXER_INLET_MESH_NAME = 'Solid9_B_0'

// Grid resolution across the hopper's width for the surface probe. The funnel
// is only ~320 triangles, so 50 columns costs about 100 ms once at mount. It is
// worth paying for: at a coarser grid the flood fill loses the rim to bounding-
// box slack and the brim - and with it the measured capacity - comes out low.
const HOPPER_PROBE_COLUMNS = 50

// The noodler's two screw barrels, measured from the screw meshes' own bounds.
// The centres match the GateHinge pivots the screws themselves turn about - the
// paste rope has to share an axis with the screw carrying it, not merely sit
// near it. `endZ` stops just short of the die face at z -0.90286 so the rope
// does not poke through the plate it is feeding.
const SCREW_BARREL_START_Z = -1.1824
const SCREW_BARREL_END_Z = -0.91
const LEFT_SCREW_CENTRE: [number, number] = [0.292, 1.338]
const RIGHT_SCREW_CENTRE: [number, number] = [0.331, 1.338]

// Where each rope starts around its own shaft, in radians at SCREW_BARREL_START_Z.
//
// Measured from the screws themselves: each flight's angular position was fitted
// off its rim vertices, giving 3.770 on the left shaft and 5.655 on the right.
// The ropes are set half a turn away from those, so the paste rides in the
// channel between flights rather than straddling them.
//
// The two differ because the screws are mirrored parts fitted at different
// angles. Starting both at zero - which is what a single shared constant means -
// leaves one shaft looking right and the other visibly wrong.
const LEFT_SCREW_PHASE = 3.7696 + Math.PI
const RIGHT_SCREW_PHASE = 5.6552 + Math.PI

// Meshes hidden permanently, never shown by anything.
//
// Separate from the sidebar's hide list on purpose: that one is per-session and
// keyed by mesh uuid (regenerated on every load, so it cannot outlive a reload),
// and everything in it is restorable through Show All. These are keyed by name,
// applied at mount, and have no way back - so they stay gone across reloads and
// do not clutter the restore list with parts nobody wants back.
//
// GSDG_AW6_0 is conveyor 2's belt surface (CONVEYOR_2_MESH_NAME above). Its
// sidebar control and its scrolling texture still run, now against a mesh
// nothing renders.
//
// SG_AW6_0 is the two soap bars leaving the cone heater. BilletCutter draws
// them from its geometry, lane by lane at their extruded length, so the
// model's own full-length copy never shows.
const ALWAYS_HIDDEN_MESHES = new Set(['GSDG_AW6_0', 'pCube10448_A6_0', 'DSG1_B_0', 'DSG1_A4_0', 'SG_AW6_0'])

interface ModelProps {
  url: string
  position: [number, number, number]
  onMeasured: (bounds: ModelBounds) => void
  selectionMode: boolean
  hiddenUuids: Set<string>
  onMeshSelect: (mesh: THREE.Mesh) => void
  gateConfig: GateHingeConfig
  gateActuatorConfig: GateHingeConfig
  rotor1Config: GateHingeConfig
  rotor2Config: GateHingeConfig
  leftScrewConfig: GateHingeConfig
  rightScrewConfig: GateHingeConfig
  conveyorConfig: ConveyorBeltConfig
  conveyor2Config: ConveyorBeltConfig
  roll1Config: GateHingeConfig
  roll2Config: GateHingeConfig
  roll3Config: GateHingeConfig
  /** The pre-plodder's two counter-rotating screw shafts, about x. */
  ppShaftAConfig: GateHingeConfig
  ppShaftBConfig: GateHingeConfig
  /** The final plodder's two counter-rotating screws, about z. */
  fpShaft2Config: GateHingeConfig
  fpShaft3Config: GateHingeConfig
  mixerOpacity: number
  noodlerOpacity: number
  hopperOpacity: number
  trmChuteOpacity: number
  recycleConveyorOpacity: number
  prePlodderOpacity: number
  prePlodderBodyOpacity: number
  vacuumChamberOpacity: number
  finalPlodderOpacity: number
  coneHeaterOpacity: number
  gateOpen: boolean
  /** Noodler hopper level from the plant PLC, 0-100 percent full. */
  hopperLevel: number
  /** Pre-plodder hopper level from the plant PLC, 0-100 percent full. */
  prePlodderLevel: number
  /** Belt speed as a fraction of normal, from the belt's own drive; 0 when stopped. */
  beltSpeedFactor: number
  /** The latest request for a billet cutter to cut short bars. */
  shortBarRequest: ShortBarRequest | null
  /** Short bars still waiting to be cut, per cutter: [left, right]. */
  onShortBarsPending: (pending: number[]) => void
  /** The stamper model's scrap route, published once it loads. */
  recycleRouteRef: React.MutableRefObject<RecycleRoute | null>
  /** Short bars to cut, per minute, shared between the two cutters. */
  shortBarsPerMinute?: number
  /**
   * Published here: SDF_A10_0 and the pre-plodder hopper it feeds, the last
   * leg of the scrap route for everything that rides it.
   */
  liftRouteRef?: React.MutableRefObject<LiftRoute | null>
}

export function Model({
  url,
  position,
  onMeasured,
  selectionMode,
  hiddenUuids,
  onMeshSelect,
  gateConfig,
  gateActuatorConfig,
  rotor1Config,
  rotor2Config,
  leftScrewConfig,
  rightScrewConfig,
  conveyorConfig,
  conveyor2Config,
  roll1Config,
  roll2Config,
  roll3Config,
  ppShaftAConfig,
  ppShaftBConfig,
  fpShaft2Config,
  fpShaft3Config,
  mixerOpacity,
  noodlerOpacity,
  hopperOpacity,
  trmChuteOpacity,
  recycleConveyorOpacity,
  prePlodderOpacity,
  prePlodderBodyOpacity,
  vacuumChamberOpacity,
  finalPlodderOpacity,
  coneHeaterOpacity,
  gateOpen,
  hopperLevel,
  prePlodderLevel,
  beltSpeedFactor,
  shortBarRequest,
  onShortBarsPending,
  recycleRouteRef,
  shortBarsPerMinute,
  liftRouteRef,
}: ModelProps) {
  const { scene } = useGLTF(url)
  const productColor = useProductColor()
  const measured = useRef(false)
  // The blades' live angles, written by their GateHinge every frame and read
  // by MixerFill. Shared refs rather than state: they change per frame, and
  // the material has to be driven by the SAME number that positions the arms
  // - integrating the spin speed twice lets the two drift apart.
  const rotor1AngleRef = useRef(0)
  const rotor2AngleRef = useRef(0)
  // How empty the trough is, written by MixerFill and read by MixerDischarge
  // so the falling lumps stop once there is nothing left to shear off.
  const drainRef = useRef(0)
  // Whether the trough is being recharged and where its surface sits, written
  // by MixerFill and read by MixerCharge so the falling batch lands on it.
  const refillingRef = useRef(false)
  const mixerSurfaceYRef = useRef(0)
  // Height of the material surface in the noodler hopper, written by HopperFill
  // from the plant's level reading and read by MixerDischarge so falling
  // granules are absorbed by the material rather than passing through it.
  const hopperFillYRef = useRef(EMPTY_FILL)
  // The screws' live angles, written by their GateHinge and read by the paste
  // ropes riding on them - the same arrangement the blades and MixerFill use.
  const leftScrewAngleRef = useRef(0)
  const rightScrewAngleRef = useRef(0)
  // The last roll's live angle. The mill's flakes are spawned off how far it has
  // turned, so the scraper stops producing when the mill stops.
  const roll3AngleRef = useRef(0)
  // Top of the soap standing in the pre-plodder hopper, so flakes land on it
  // rather than sinking through to the floor.
  const prePlodderFillYRef = useRef(EMPTY_FILL)

  useEffect(() => {
    if (!liftRouteRef) return
    liftRouteRef.current = measureLiftRoute(scene, PRE_PLODDER_HOPPER_MESH, prePlodderFillYRef)
    if (!liftRouteRef.current) console.warn('[model] SDF_A10_0 or the pre-plodder hopper not found; scrap stops at the take-away conveyor.')
    return () => {
      liftRouteRef.current = null
    }
  }, [scene, liftRouteRef])
  // The four plodder screws' live angles, written by their GateHinge and read
  // by the paste ropes riding on them - the same arrangement the noodler uses.
  const ppShaftAAngleRef = useRef(0)
  const ppShaftBAngleRef = useRef(0)
  const fpShaft2AngleRef = useRef(0)
  const fpShaft3AngleRef = useRef(0)
  // How full the cone heater's bore is, 0-1. Written by PlodderExtrusion as the
  // final plodder draws material off the heap, and read by ConeFill. Starts
  // packed, like the vacuum chamber above it, so the bars leave the nozzle as
  // soon as the final plodder starts.
  const coneFillRef = useRef(1)

  // The hopper is probed once per loaded scene and shared, rather than probed
  // separately by each component that needs it - they have to agree on where
  // the funnel and its capacity are, and the raycasting is not free.
  const hopperField = useMemo(
    () => probeHopperSurface(scene, HOPPER_OPACITY_MESHES[0], HOPPER_PROBE_COLUMNS),
    [scene],
  )

  // The same probe against the pre-plodder's funnel at the end of the line.
  const prePlodderField = useMemo(
    () => probeHopperSurface(scene, PRE_PLODDER_HOPPER_MESH, HOPPER_PROBE_COLUMNS),
    [scene],
  )

  useEffect(() => {
    if (measured.current) return
    measured.current = true
    const box = localBounds(scene)
    const size = new THREE.Vector3()
    box.getSize(size)
    onMeasured({ size, min: box.min.clone() })
    // Measured once per loaded scene; onMeasured identity is not relevant here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene])

  // Applies the current hide list to this model's own mesh instances.
  // `visible = false` alone only stops rendering - three.js still raycasts
  // invisible meshes, so a hidden part would keep swallowing clicks meant
  // for whatever is now exposed behind it. Clearing `raycast` makes it a
  // true no-op for hit-testing too; deleting the override restores the
  // default (Mesh.prototype.raycast) when the mesh is shown again.
  //
  // ALWAYS_HIDDEN_MESHES is folded in here rather than handled in its own
  // effect so the two can never fight over `visible`: whichever ran last would
  // win, and a permanently hidden mesh would flicker back on any Show All.
  useEffect(() => {
    scene.traverse((object) => {
      if ((object as THREE.Mesh).isMesh) {
        const mesh = object as THREE.Mesh
        const hidden = ALWAYS_HIDDEN_MESHES.has(mesh.name) || hiddenUuids.has(mesh.uuid)
        mesh.visible = !hidden
        if (hidden) {
          mesh.raycast = () => {}
        } else {
          delete (mesh as { raycast?: THREE.Mesh['raycast'] }).raycast
        }
      }
    })
  }, [scene, hiddenUuids])

  const handleClick = (event: ThreeEvent<MouseEvent>) => {
    if (!selectionMode) return
    event.stopPropagation()
    const mesh = event.object as THREE.Mesh
    if (!mesh.isMesh) return
    onMeshSelect(mesh)
  }

  const handlePointerOver = (event: ThreeEvent<PointerEvent>) => {
    if (!selectionMode) return
    event.stopPropagation()
    document.body.style.cursor = 'pointer'
  }

  const handlePointerOut = () => {
    if (!selectionMode) return
    document.body.style.cursor = 'auto'
  }

  return (
    <primitive
      object={scene}
      position={position}
      onClick={handleClick}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
    >
      <GateHinge scene={scene} meshNames={GATE_PANEL_MESHES} config={gateConfig} />
      <GateHinge scene={scene} meshNames={GATE_ACTUATOR_MESHES} config={gateActuatorConfig} />
      <GateHinge scene={scene} meshNames={ROTOR_1_MESHES} config={rotor1Config} angleRef={rotor1AngleRef} />
      <GateHinge scene={scene} meshNames={ROTOR_2_MESHES} config={rotor2Config} angleRef={rotor2AngleRef} />
      <GateHinge scene={scene} meshNames={LEFT_SCREW_MESHES} config={leftScrewConfig} angleRef={leftScrewAngleRef} />
      <GateHinge scene={scene} meshNames={RIGHT_SCREW_MESHES} config={rightScrewConfig} angleRef={rightScrewAngleRef} />
      <ConveyorBelt scene={scene} meshName={CONVEYOR_MESH_NAME} config={conveyorConfig} />
      <ConveyorBelt scene={scene} meshName={CONVEYOR_2_MESH_NAME} config={conveyor2Config} />
      <GateHinge scene={scene} meshNames={ROLL_1_MESHES} config={roll1Config} />
      <GateHinge scene={scene} meshNames={ROLL_2_MESHES} config={roll2Config} />
      <GateHinge scene={scene} meshNames={ROLL_3_MESHES} config={roll3Config} angleRef={roll3AngleRef} />
      {/* The end of the line. Each shaft's two meshes turn as one rigid group;
          the pair counter-rotates like the noodler's and the mixer's, so only
          the magnitude comes from the speed and the signs are fixed in App. */}
      <GateHinge scene={scene} meshNames={PP_SHAFT_A_MESHES} config={ppShaftAConfig} angleRef={ppShaftAAngleRef} />
      <GateHinge scene={scene} meshNames={PP_SHAFT_B_MESHES} config={ppShaftBConfig} angleRef={ppShaftBAngleRef} />
      <GateHinge scene={scene} meshNames={FP_SHAFT_2_MESHES} config={fpShaft2Config} angleRef={fpShaft2AngleRef} />
      <GateHinge scene={scene} meshNames={FP_SHAFT_3_MESHES} config={fpShaft3Config} angleRef={fpShaft3AngleRef} />
      <MeshOpacity scene={scene} meshNames={MIXER_OPACITY_MESHES} opacity={mixerOpacity} />
      <MeshOpacity scene={scene} meshNames={NOODLER_OPACITY_MESHES} opacity={noodlerOpacity} root={NOODLER_SCOPE} />
      <MeshOpacity scene={scene} meshNames={HOPPER_OPACITY_MESHES} opacity={hopperOpacity} color={HOPPER_COLOR} />
      <MeshOpacity scene={scene} meshNames={TRM_CHUTE_OPACITY_MESHES} opacity={trmChuteOpacity} />
      <MeshOpacity scene={scene} meshNames={RECYCLE_CONVEYOR_OPACITY_MESHES} opacity={recycleConveyorOpacity} />
      <MeshOpacity scene={scene} meshNames={PRE_PLODDER_OPACITY_MESHES} opacity={prePlodderOpacity} />
      <MeshOpacity scene={scene} meshNames={PRE_PLODDER_BODY_MESHES} opacity={prePlodderBodyOpacity} />
      <MeshOpacity scene={scene} meshNames={VACUUM_CHAMBER_OPACITY_MESHES} opacity={vacuumChamberOpacity} root={PLODDER_ROOT} />
      <MeshOpacity scene={scene} meshNames={FINAL_PLODDER_OPACITY_MESHES} opacity={finalPlodderOpacity} root={PLODDER_ROOT} />
      <MeshOpacity scene={scene} meshNames={CONE_HEATER_OPACITY_MESHES} opacity={coneHeaterOpacity} root={PLODDER_ROOT} />
      <MeshOpacity scene={scene} meshNames={ROLL_SURFACE_MESHES} opacity={1} color={productColor.mass} />
      <MixerFill
        scene={scene}
        bowlMeshName={MIXER_BOWL_MESH_NAME}
        blade1AngleRef={rotor1AngleRef}
        blade2AngleRef={rotor2AngleRef}
        mixing={rotor1Config.spinning ?? false}
        gateOpen={gateOpen}
        drainRef={drainRef}
        refillingRef={refillingRef}
        surfaceYRef={mixerSurfaceYRef}
      />
      <MixerCharge
        scene={scene}
        bowlMeshName={MIXER_BOWL_MESH_NAME}
        inletMeshName={MIXER_INLET_MESH_NAME}
        refillingRef={refillingRef}
        drainRef={drainRef}
        surfaceYRef={mixerSurfaceYRef}
      />
      <HopperFill field={hopperField} level={hopperLevel} fillYRef={hopperFillYRef} />
      {/* The feed in the noodler hopper's throat, down to the noodler's screws. */}
      <FeedColumn
        field={hopperField}
        // Down to the screws' flight tips: below that it hangs in front of them.
        bottomY={LEFT_SCREW_CENTRE[1] + SCREW_RADIUS}
        fillYRef={hopperFillYRef}
        angleRef={leftScrewAngleRef}
        pitch={SCREW_PITCH}
      />
      {/* The pre-plodder's hopper at the end of the line, and the mill's flakes
          dropping into it, at the plant's own level reading. */}
      <HopperFill field={prePlodderField} level={prePlodderLevel} fillYRef={prePlodderFillYRef} />
      {/* The feed in the hopper's throat, down to the pre-plodder's screws. */}
      <FeedColumn
        field={prePlodderField}
        // Down to the screws' flight tips: below that it hangs in front of them.
        bottomY={PP_SHAFT_A_CENTRE[0] + PP_SCREW_RADIUS}
        fillYRef={prePlodderFillYRef}
        angleRef={ppShaftAAngleRef}
        pitch={PP_SCREW_PITCH}
      />
      <TrmFlakes scene={scene} rollAngleRef={roll3AngleRef} fillYRef={prePlodderFillYRef} />
      {/* Paste riding the screws. The left screw spins negative and the right
          positive (see App.tsx), and the handedness is paired against that so
          both ropes convey toward the die - see the note in ScrewRibbon. */}
      <ScrewRibbon
        angleRef={leftScrewAngleRef}
        centre={LEFT_SCREW_CENTRE}
        start={SCREW_BARREL_START_Z}
        end={SCREW_BARREL_END_Z}
        clockwise
        phase={LEFT_SCREW_PHASE}
      />
      <ScrewRibbon
        angleRef={rightScrewAngleRef}
        centre={RIGHT_SCREW_CENTRE}
        start={SCREW_BARREL_START_Z}
        end={SCREW_BARREL_END_Z}
        clockwise={false}
        phase={RIGHT_SCREW_PHASE}
      />
      {/* Paste riding the plodder screws. Each rope winds the same way as its
          own screw's flight (see the fits in plodderGeometry), spin is paired
          against that per HANDEDNESS in ScrewRibbon, and the phases put each
          rope in the channel between flights rather than straddling them. The
          final plodder's ropes are smooth: the pre-plodder has already worked
          the crumb into paste by then. */}
      <ScrewRibbon
        angleRef={ppShaftAAngleRef}
        axis="x"
        centre={PP_SHAFT_A_CENTRE}
        start={PP_BARREL_START_X}
        end={PP_BARREL_END_X}
        clockwise={false}
        phase={PP_SHAFT_A_PHASE}
        screwRadius={PP_SCREW_RADIUS}
        pitch={PP_SCREW_PITCH}
      />
      <ScrewRibbon
        angleRef={ppShaftBAngleRef}
        axis="x"
        centre={PP_SHAFT_B_CENTRE}
        start={PP_BARREL_START_X}
        end={PP_BARREL_END_X}
        clockwise
        phase={PP_SHAFT_B_PHASE}
        screwRadius={PP_SCREW_RADIUS}
        pitch={PP_SCREW_PITCH}
      />
      <ScrewRibbon
        angleRef={fpShaft2AngleRef}
        axis="z"
        centre={FP_SHAFT_2_CENTRE}
        start={FP_BARREL_START_Z}
        end={FP_BARREL_END_Z}
        clockwise
        phase={FP_SHAFT_2_PHASE}
        screwRadius={FP_SCREW_RADIUS}
        pitch={FP_SCREW_PITCH}
        rough={false}
      />
      <ScrewRibbon
        angleRef={fpShaft3AngleRef}
        axis="z"
        centre={FP_SHAFT_3_CENTRE}
        start={FP_BARREL_START_Z}
        end={FP_BARREL_END_Z}
        clockwise={false}
        phase={FP_SHAFT_3_PHASE}
        screwRadius={FP_SCREW_RADIUS}
        pitch={FP_SCREW_PITCH}
        rough={false}
      />
      {/* What the screws push out: noodles from the die's 278 measured holes,
          falling to the conveyor. Spawning is driven by one screw's angle -
          both turn at the same speed, so either serves - while how fast the
          landed mat rides away comes from the belt's own drive, since the
          noodler and the conveyor start and stop independently. */}
      {/* Noodles leaving the pre-plodder die and heaping in the vacuum chamber,
          fed by the pre-plodder's screws and drawn down by the final plodder's,
          then packed into the cone heater. Mounted after the GateHinges that
          write the screw angles, so they read this frame's values. */}
      <PlodderExtrusion
        scene={scene}
        feedAngleRef={ppShaftAAngleRef}
        drainAngleRef={fpShaft2AngleRef}
        coneFillRef={coneFillRef}
      />
      <ConeFill scene={scene} fillRef={coneFillRef} />
      {/* The bar leaving the cone and the two billet cutters taking turns on it.
          Driven by the final plodder: no push, no bar, no cuts. */}
      <BilletCutter
        scene={scene}
        pushAngleRef={fpShaft2AngleRef}
        coneFillRef={coneFillRef}
        shortBarRequest={shortBarRequest}
        onShortBarsPending={onShortBarsPending}
        recycleRouteRef={recycleRouteRef}
        shortBarsPerMinute={shortBarsPerMinute}
        liftRouteRef={liftRouteRef}
      />
      <NoodleExtrusion
        scene={scene}
        angleRef={leftScrewAngleRef}
        beltSpeedFactor={beltSpeedFactor}
      />
      <MixerDischarge
        scene={scene}
        bowlMeshName={MIXER_BOWL_MESH_NAME}
        field={hopperField}
        fillYRef={hopperFillYRef}
        discharging={gateOpen && (rotor1Config.spinning ?? false)}
        bladeAngleRef={rotor1AngleRef}
        drainRef={drainRef}
      />
    </primitive>
  )
}
