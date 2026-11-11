import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { MATERIAL_COLOR } from './MixerFill'
import { useProductColor, useTint } from '../lib/productColor'
import { SCREW_CHANNEL_AREA, SCREW_PITCH } from './ScrewRibbon'
import { resolveDieHoles, resolveLandingBounds, resolveMeshBounds, resolveGuidePlanes } from '../lib/dieHoles'
import { hash2 } from '../lib/noise'
import { DEFAULT_NOODLE_FALL, FALL_DONE, stepFall, type FallRig } from '../lib/noodleFall'

interface NoodleExtrusionProps {
  scene: THREE.Object3D
  // The screw angle. Nothing leaves the die unless the screws are pushing, and
  // turning them faster moves proportionally more material down the belt.
  angleRef: React.MutableRefObject<number>
  // The belt's speed as a fraction of normal, live from its own drive; 0 when
  // it is stopped. The noodler and the belt are separate machines with separate
  // drives, so this is deliberately NOT derived from angleRef: the screws can
  // extrude onto a belt that is standing still (product heaps up at the die),
  // and a running belt clears the mat it is already carrying after the screws
  // stop. Tying both to one signal is what would let noodles slide along a
  // stationary belt.
  beltSpeedFactor: number
}

// NOTE ON HEIGHT. This plate sits 34 cm above the belt, far higher than the
// machine in the plant photographs, where the die clears the conveyor by a hand's
// width and the heap all but touches it. So the strands here hang a long way
// before they land. Where the strands END is not a free choice: it is the top of
// the mat, derived below rather than set as its own constant, because the two
// drifting apart is exactly what left the product hanging in mid-air over the
// conveyor instead of lying on it.

// Strand thickness as a fraction of the hole it came from.
const RADIUS_RATIO = 0.96

// Where along the strand it stops descending and starts lying down the belt.
const KNEE = 0.62
// How far a strand runs along the belt before the mat takes over.
const STRAND_TAIL = 0.035
// Sideways wander, in strand thicknesses. Strands leave the plate on a regular
// grid; without this they stay a comb all the way down instead of tangling into
// each other the way real ones do.
//
// Measured in thicknesses rather than as a fraction of the drop, because the
// drop depends on how high the mat stands: keyed to the drop, lowering the mat
// widened the wander at the same time, until strands swung far enough to reach
// back through the die face. Against the strand's own size it is about a hole
// and a half either way whatever else changes.
const WANDER_RADII = 4
// A short horizontal run as material clears the plate. Tiny, because it leaves
// at only ~2.4 cm/s and gravity takes over almost at once.
const EXIT_RUN = 0.006

const STRAND_SEGMENTS = 28
const STRAND_RADIAL = 5

// The mat riding away on the belt.
const MAX_MAT_PIECES = 900

// Noodles on the belt are LONG - roughly a quarter of a metre - and stay long
// even where they have broken. Short pieces read as debris swept off a floor
// rather than as product.
const MAT_PIECE_LENGTH = 0.14
const MAT_LENGTH_VARIATION = 0.5

// How far a noodle's heading strays from the belt's own direction. Small on
// purpose: they arrive already being drawn along by the belt, so the mat is
// combed one way, not scattered. A wide spread here is what made the belt look
// like spilled matchsticks.
const MAT_YAW_SPREAD = 0.14

// How many noodle thicknesses the mat is allowed to stack up, so overlapping
// pieces read as a layer with depth rather than as a single flat sheet.
//
// This is the mat's THICKNESS only. It used to set the height of the whole heap
// as well, which made that height untunable: a noodle is about a 180th of the
// fall from the plate, so the constant's entire useful range moved the product
// by under 1% of the drop. Height is TURN_FRACTION's job now.
const MAT_STACK = 2.5

// How high the product stands, as a fraction of the fall from the die plate to
// the belt. This is also where the strands stop descending and start running
// along with the belt - one number, because the two drifting apart is what once
// left the curtain ending in mid-air above the heap.
//
// Keyed to the drop rather than to a noodle's thickness, so it is expressed in
// the same quantity it controls and a re-export that rescales the model does
// not change what 10% means.
//
// 0.019 is where the mat's bottom layer touches the belt; anything below that is
// clamped away by the floor on pileY, so this is the useful bottom of the range.
const TURN_FRACTION = 0.02

// How many noodles the mat is drawn with, against what the flow strictly
// implies. 1 is the derived figure: 28 noodles a second, from 220 kg/h of
// material divided by one noodle's volume.
//
// Kept as its own multiplier rather than folded into the flow, because the flow
// is measured - screw pitch and rpm from the machine, hole area from the plate -
// and burying a presentation choice inside it would make those numbers lie. The
// one soft input behind them is the screw channel's fill factor, which is
// eyeballed from the mesh, so the true throughput could reasonably be higher
// than the derived figure anyway.
const MAT_DENSITY = 2.5

// How much of the belt's width the mat covers, and where it sits across it.
//
// Both measured off the belt rather than inherited from the die. The plate sits
// close to one edge of the conveyor, so noodles left where they fall pile up
// against that edge and cover about a third of it. Real product spreads as it
// lands and is drawn along, and a loaded belt carries a band down its middle.
const MAT_WIDTH_FRACTION = 0.5

const MAT_RADIAL = 5
// A noodle is drawn along its own length, so it needs segments to bend over.
const MAT_SEGMENTS = 14

// Soap noodles are neither rigid nor floppy - they hold a shape but sag into it,
// somewhere between a dry stick and a boiled noodle. These are the bends that
// give them that, as fractions of a noodle's own length: a single lazy curve
// along the whole piece, a smaller second wave over it, and a little rise and
// fall so it is not flat on the belt.
const MAT_BEND = 0.13
const MAT_WAVE = 0.05
const MAT_SAG = 0.035

// How many different noodles are modelled.
//
// Instancing needs one shared geometry, and a bent noodle has a silhouette you
// can recognise - one shape repeated across the belt reads as hundreds of copies
// of the same worm, which is worse than the straight rods it replaced. A handful
// of shapes, each turned and scaled differently, is enough to break that; the
// cost is one draw call each, which is nothing.
const MAT_VARIANTS = 6
// Uniform, so the tube stays circular. Real noodles vary in thickness too, so
// letting this scale the radius along with the length is right, not a compromise.
const MAT_SCALE_VARIATION = 0.35
// Belt speed at NORMAL running, scene units/s, and the direction it carries
// product. The die sits at the belt's far end, so the line runs toward -x.
//
// This stays a tuned-by-eye number rather than becoming a real m/s: the belt
// drive reports motor rpm, and converting that to belt speed needs a gearbox
// ratio and roller diameter that the plant data does not carry - nor does
// anything pin this model's scene units to metres. So the live reading scales
// this instead (see beltSpeedFactor), which is honest about being relative.
const BELT_SPEED = 0.05
const BELT_DIRECTION = -1

// --- the drop off the belt into the mill --------------------------------

// The two lowest rolls of the TRM. Product running off the belt falls into the
// nip between them - the pinch where two counter-rotating drums meet - and is
// drawn in there.
//
// These two and not the top roll, because of where the belt actually is: it
// discharges at z ~ -0.88, and only the bottom roll lies under that band. The
// top roll sits a further 0.12 away in -z, which is a distance no falling
// noodle would cross. Reaching it would mean drifting sideways in mid-air.
const NIP_LOWER_ROLL = 'TUT_R1_0'
const NIP_UPPER_ROLL = 'TU_R1_0'

// The deflector plate standing between the belt's head and the mill.
//
// Not scenery - it is what actually aims the product. Measured, it is a flat
// slab sloping at 44 degrees whose carrying face runs from (0.040, 1.188) down
// to (-0.041, 1.109), the full width of the falling stream. Its lower lip sits
// at x -0.041, comfortably inside the rolls' span; product left to fall freely
// from the belt instead lands at x 0.025, right on their near edge. So routing
// noodles over the plate is what puts them into the machine rather than off the
// end of it.
// The two guides standing between the belt's head and the mill. Product is
// handed from one to the next, so they are listed in the order it meets them.
//
// Not scenery - between them they are what aims the product, and they are why it
// arrives on the rolls rather than beside them. Measured:
//
//   A20_A18_0 is a flat slab sloping 44 degrees, carrying face from
//   (0.040, 1.188) down to (-0.041, 1.109), the full width of the stream.
//
//   A_A18_0 is a V-funnel, not a ramp: two opposed walls at 50.9 degrees
//   spanning x -0.149..0.026 - within a few mm of the rolls' own span - that
//   converge on a throat at z ~ -0.88, y 0.9733.
//
// Their heights meet: the slab's underside stops at y 1.0658 and the funnel's
// mouth starts at y 1.0653. Product leaving one is caught by the other, and the
// funnel's throat drops it onto roll1's crown, from where the roll's own
// rotation carries it into the nip.
const GUIDE_MESHES = ['A20_A18_0', 'A_A18_0']

// End-over-end tumble as a noodle falls, radians/s. Falling product that stays
// perfectly level reads as a sprite rather than an object.
const FALL_TUMBLE_RATE = 2.2

function smoothstep(t: number) {
  const c = Math.min(1, Math.max(0, t))
  return c * c * (3 - 2 * c)
}

/**
 * One noodle hanging off the die.
 *
 * Three phases in one curve: a short horizontal run as it clears the plate,
 * a drape down onto the heap, then a run along the belt with the rest of them.
 * The wander terms are what stop 278 identical strands reading as a comb - they
 * are deterministic in the strand's own seed, so the curtain looks the same on
 * every reload.
 */
class StrandCurve extends THREE.Curve<THREE.Vector3> {
  private x0: number
  private y0: number
  private z0: number
  private pileY: number
  private tail: number
  private seed: number
  private swing: number
  private drift: number

  constructor(
    x0: number,
    y0: number,
    z0: number,
    pileY: number,
    tail: number,
    seed: number,
    swing: number,
    drift: number,
  ) {
    super()
    this.x0 = x0
    this.y0 = y0
    this.z0 = z0
    this.pileY = pileY
    this.tail = tail
    this.seed = seed
    this.swing = swing
    this.drift = drift
  }

  getPoint(t: number, target = new THREE.Vector3()) {
    const drop = this.y0 - this.pileY
    // Descent finishes at the knee; the run along the belt starts there.
    const descend = smoothstep(t / KNEE)
    const along = smoothstep((t - KNEE) / (1 - KNEE))
    // Wander grows with distance from the plate: tight and parallel where the
    // strands are still held by the die, loose once they are hanging free.
    const wander = this.swing * descend
    return target.set(
      this.x0 - this.tail * along + Math.sin(this.seed * 6.3 + t * 9.1) * wander,
      this.pileY + drop * (1 - descend),
      this.z0 +
        EXIT_RUN * smoothstep(t / 0.12) +
        this.drift * descend +
        Math.cos(this.seed * 4.7 + t * 7.3) * wander,
    )
  }
}

/**
 * One noodle lying on the belt: a lazy curve along its length rather than a
 * straight rod.
 *
 * Built lying along x, which is the belt's own direction, so placing one is a
 * yaw and nothing more. Its shape comes from its variant number through the
 * shared hash, so the same six noodles come back on every reload.
 */
class MatNoodleCurve extends THREE.Curve<THREE.Vector3> {
  private length: number
  private phaseA: number
  private phaseB: number

  constructor(length: number, variant: number) {
    super()
    this.length = length
    this.phaseA = hash2(variant, 17) * Math.PI * 2
    this.phaseB = hash2(variant, 29) * Math.PI * 2
  }

  getPoint(t: number, target = new THREE.Vector3()) {
    const bend = Math.sin(Math.PI * t + this.phaseA)
    const wave = Math.sin(Math.PI * 2 * t + this.phaseB)
    return target.set(
      (t - 0.5) * this.length,
      (MAT_SAG * wave - MAT_SAG) * this.length,
      (MAT_BEND * bend + MAT_WAVE * wave) * this.length,
    )
  }
}

/**
 * Soap noodles leaving the noodler's die and travelling away on the conveyor.
 *
 * Two parts, because two different things are happening. The curtain of strands
 * hanging off the plate is a STEADY STATE - material flows through a shape that
 * does not itself move - so it is built once and never touched again. The mat on
 * the belt is genuinely in motion, so that is a pool of pieces sliding away and
 * being recycled at the end of the run.
 *
 * An earlier version modelled the noodles as short pieces breaking off and
 * free-falling. The arithmetic behind that was right - a 34 cm unsupported fall
 * means a hundredfold draw-down, which soap paste cannot survive - but the
 * premise was wrong: the noodles are not falling into empty space, they are
 * landing on a heap that stands most of the way back up to the plate. Supported
 * like that they never accelerate, never draw down, and stay whole.
 */
export function NoodleExtrusion({ scene, angleRef, beltSpeedFactor }: NoodleExtrusionProps) {
  // The settled route into the mill. A value rather than the loose constants it
  // is built from, so stepFall stays a pure function of its inputs.
  const config = DEFAULT_NOODLE_FALL
  const matRefs = useRef<(THREE.InstancedMesh | null)[]>([])

  const rig = useMemo(() => {
    const field = resolveDieHoles(scene)
    const belt = resolveLandingBounds(scene)
    if (!field || !belt) return null

    const radius = field.radius * RADIUS_RATIO
    // Measured from the LOWEST hole, so the fraction is taken against the fall
    // every strand actually makes rather than against the tallest one's.
    let dieY = Infinity
    for (let i = 0; i < field.count; i++) dieY = Math.min(dieY, field.positions[i * 3 + 1])
    // Top of the product, and so where the strands stop descending. Floored at
    // the mat's own thickness PLUS one radius: pieces are placed by their
    // centres, so a heap whose lowest centre sits at belt level is really half
    // sunk into it. However low TURN_FRACTION goes, the bottom layer still rests
    // ON the belt rather than through it.
    const pileY = Math.max(
      belt.max.y + radius * (1 + MAT_STACK),
      belt.max.y + (dieY - belt.max.y) * TURN_FRACTION,
    )
    // Where the band of product runs, across the belt's width.
    const matCentreZ = (belt.min.z + belt.max.z) / 2
    const matHalfWidth = ((belt.max.z - belt.min.z) * MAT_WIDTH_FRACTION) / 2

    // Material the screws deliver per revolution, against the noodle sizes it
    // is drawn as - both measured, so the mat fills at the rate the machine
    // actually produces rather than at a rate that looked about right.
    const volumePerRevolution = SCREW_CHANNEL_AREA * SCREW_PITCH

    // --- the noodles the mat is made of ------------------------------------
    const matLengths = Array.from(
      { length: MAT_VARIANTS },
      (_, v) => MAT_PIECE_LENGTH * (1 - MAT_LENGTH_VARIATION / 2 + hash2(v, 5) * MAT_LENGTH_VARIATION),
    )
    const matGeometries = matLengths.map(
      (length, v) =>
        new THREE.TubeGeometry(new MatNoodleCurve(length, v), MAT_SEGMENTS, radius, MAT_RADIAL, false),
    )
    // Averaged over the variants, so the flow still governs how much material
    // ends up on the belt however the shapes are tuned.
    const meanLength = matLengths.reduce((a, b) => a + b, 0) / matLengths.length
    const matPieceVolume = Math.PI * radius * radius * meanLength

    // --- the curtain -------------------------------------------------------
    const strands: THREE.BufferGeometry[] = []
    for (let i = 0; i < field.count; i++) {
      const x = field.positions[i * 3]
      const y = field.positions[i * 3 + 1]
      const z = field.positions[i * 3 + 2]
      if (y <= pileY) continue
      const seed = (i * 2654435761) % 1000 / 1000
      const tail = STRAND_TAIL * (0.6 + seed * 0.8)
      // The curtain leans over onto the middle of the belt as it descends, so
      // the hanging strands feed the band the mat actually forms instead of
      // ending short of it. Same lean the mop has in the plant photographs.
      const curve = new StrandCurve(x, y, z, pileY, tail, seed, radius * WANDER_RADII, matCentreZ - z)
      strands.push(new THREE.TubeGeometry(curve, STRAND_SEGMENTS, radius, STRAND_RADIAL, false))
    }
    if (strands.length === 0) return null

    const curtain = mergeGeometries(strands, false)
    for (const s of strands) s.dispose()
    if (!curtain) return null
    // Computed explicitly rather than left to three's lazy path, which caches
    // whatever it first sees. A sphere derived from a half-built buffer is
    // centred at the scene origin - inside the machine - so the curtain would
    // survive the default camera and vanish the moment you orbit in on it.
    curtain.computeBoundingSphere()

    // Where product leaving the belt is drawn into the mill. Probed from the two
    // roll meshes rather than written down, so a re-export that moves the rolls
    // moves the noodles with them instead of leaving them pouring into a gap.
    //
    // The pinch is the point midway between the two drums' axes; a noodle has
    // been taken by the rolls once it reaches it, so that is where it stops
    // being drawn. Null if either roll is missing from the model, which the
    // caller treats as "no mill to feed" and falls back to the old behaviour of
    // retiring product at the belt's end.
    const lowerRoll = resolveMeshBounds(scene, NIP_LOWER_ROLL)
    const upperRoll = resolveMeshBounds(scene, NIP_UPPER_ROLL)
    const nip =
      lowerRoll && upperRoll
        ? {
            z: ((lowerRoll.min.z + lowerRoll.max.z) / 2 + (upperRoll.min.z + upperRoll.max.z) / 2) / 2,
            // Lifted by one noodle radius: pieces are positioned by their
            // centres, so a noodle whose centre reaches the pinch is already
            // half inside it.
            y: ((lowerRoll.min.y + lowerRoll.max.y) / 2 + (upperRoll.min.y + upperRoll.max.y) / 2) / 2 + radius,
          }
        : null

    // The surfaces product slides down on its way to the rolls. Optional: with
    // none of them resolved the noodles simply fall the whole way, which is
    // where this started.
    const guides = GUIDE_MESHES.flatMap((name) => resolveGuidePlanes(scene, name))

    // Null where the mill is missing from the model, which the frame loop reads
    // as "nowhere to fall to" and retires product at the belt's end instead.
    const fall: FallRig | null = nip
      ? {
          radius,
          guides,
          nip,
          // The middle of the mat, at the belt's head: a representative piece,
          // since they leave spread across the band and at a spread of heights.
          release: new THREE.Vector3(belt.min.x, pileY - (radius * MAT_STACK) / 2, matCentreZ),
          releaseVelocityX: BELT_DIRECTION * BELT_SPEED,
        }
      : null

    return {
      field,
      belt,
      nip,
      guides,
      fall,
      radius,
      pileY,
      matCentreZ,
      matHalfWidth,
      curtain,
      matGeometries,
      matPiecesPerRevolution: (volumePerRevolution / matPieceVolume) * MAT_DENSITY,
    }
  }, [scene])

  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        // The same off-white the mixer fills its trough with - it is the same
        // product all the way down the line. Plant photographs show it dyed
        // pink for a particular batch; the colour of the base is what belongs
        // in the model.
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
      rig?.curtain.dispose()
      for (const geo of rig?.matGeometries ?? []) geo.dispose()
      material.dispose()
    }
  }, [rig, material])

  // One pool per noodle shape. Each variant is its own InstancedMesh, so its
  // pieces have to live in their own list of slots.
  const pools = useRef(
    Array.from({ length: MAT_VARIANTS }, () =>
      Array.from({ length: Math.floor(MAX_MAT_PIECES / MAT_VARIANTS) }, () => ({
        active: false,
        position: new THREE.Vector3(),
        quaternion: new THREE.Quaternion(),
        scale: 1,
        // Set once the piece runs off the end of the belt and is on its way into
        // the mill. Velocity is carried per piece rather than recomputed from
        // the belt each frame, so a noodle already in the air keeps travelling
        // if the belt stops under it - and so the guides can change its heading.
        //
        // A full 3D velocity, not a pair of scalars: the lower guide is a
        // V-funnel whose walls push product sideways in z, which is motion no
        // amount of x and y can express.
        falling: false,
        velocity: new THREE.Vector3(),
      })),
    ),
  )
  const prevAngle = useRef(0)
  const pending = useRef(0)
  const nextVariant = useRef(0)
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const up = useMemo(() => new THREE.Vector3(0, 1, 0), [])
  // Scratch values for the tumble, built once rather than per piece per frame -
  // there can be hundreds of pieces in flight and this runs every frame.
  const tumbleAxis = useMemo(() => new THREE.Vector3(0, 0, 1), [])
  const tumbleStep = useMemo(() => new THREE.Quaternion(), [])

  useEffect(() => {
    for (const mesh of matRefs.current) if (mesh) mesh.raycast = () => {}
  }, [rig])

  useFrame((_, delta) => {
    if (!rig) return

    // How far the screws turned. The angle wraps at 2*PI and runs either
    // direction, so take the absolute step - the same unwrap the mixer
    // discharge uses to time its bursts.
    const angle = angleRef.current
    let step = angle - prevAngle.current
    if (step > Math.PI) step -= Math.PI * 2
    if (step < -Math.PI) step += Math.PI * 2
    prevAngle.current = angle
    const revolutions = Math.abs(step) / (Math.PI * 2)

    // Spawning is driven by the screws turning, never by wall-clock time: stop
    // the noodler and nothing new leaves the die. How far what is already on the
    // belt travels is the BELT's business, not the screws' - see beltStep below.
    pending.current += revolutions * rig.matPiecesPerRevolution

    // Distance the belt carries the mat this frame. Zero while the belt is
    // stopped, which freezes the mat in place instead of stopping the pieces
    // dead-centre of the belt with no explanation - a stopped belt still holds
    // whatever product was on it when it stopped.
    const beltVelocity = BELT_DIRECTION * BELT_SPEED * beltSpeedFactor
    const beltStep = beltVelocity * delta

    // One tumble step for every piece in the air this frame, rather than one per
    // piece. They all turn at the same rate, so the rotation is identical.
    tumbleStep.setFromAxisAngle(tumbleAxis, FALL_TUMBLE_RATE * delta)

    // Where the mat stops being carried and starts to fall. Clamped into the
    // belt, so an offset wound too far does not release product before it has
    // been laid down - or, negative, past the head into thin air.
    const releaseX = Math.min(rig.belt.max.x, Math.max(rig.belt.min.x, rig.belt.min.x + config.releaseXOffset))

    let toSpawn = Math.floor(pending.current)
    pending.current -= toSpawn
    for (let n = 0; n < toSpawn; n++) {
      // Shapes are dealt out in turn rather than picked at random, so all six
      // stay equally represented instead of one happening to dominate the belt.
      let free: (typeof pools.current)[number][number] | undefined
      for (let attempt = 0; attempt < MAT_VARIANTS && !free; attempt++) {
        const pool = pools.current[nextVariant.current]
        nextVariant.current = (nextVariant.current + 1) % MAT_VARIANTS
        free = pool.find((c) => !c.active)
      }
      if (!free) break

      const hole = Math.floor(Math.random() * rig.field.count)
      free.active = true
      free.scale = 1 - MAT_SCALE_VARIATION / 2 + Math.random() * MAT_SCALE_VARIATION
      // Slots are reused, so a piece that last retired mid-fall would otherwise
      // respawn on the belt still falling.
      free.falling = false
      free.velocity.set(0, 0, 0)
      // Hung from the top of the heap DOWNWARDS, so the mat's surface is the
      // same y the strands come to rest at whatever TURN_FRACTION is set to.
      // Deriving both from pileY is what stops the curtain and the mat drifting
      // apart - the failure that once left product hanging over the conveyor.
      free.position.set(
        rig.field.positions[hole * 3] - STRAND_TAIL,
        rig.pileY - rig.radius * Math.random() * MAT_STACK,
        // Across the belt's own middle, not the die's - see MAT_WIDTH_FRACTION.
        rig.matCentreZ + (Math.random() * 2 - 1) * rig.matHalfWidth,
      )
      // Pointing along the belt, give or take a few degrees. The noodle geometry
      // is already built lying along x, so this is a yaw and nothing more.
      free.quaternion.setFromAxisAngle(up, (Math.random() * 2 - 1) * MAT_YAW_SPREAD)
    }

    for (let v = 0; v < MAT_VARIANTS; v++) {
      const mesh = matRefs.current[v]
      if (!mesh) continue
      const pool = pools.current[v]
      for (let i = 0; i < pool.length; i++) {
        const piece = pool[i]
        if (piece.active && piece.falling && rig.fall) {
          // Between the belt's head and the mill.
          piece.quaternion.premultiply(tumbleStep)
          // Taken by the rolls once the step says so.
          if (stepFall(piece.position, piece.velocity, rig.fall, config, delta) === FALL_DONE) {
            piece.active = false
          }
        } else if (piece.active && beltStep !== 0) {
          piece.position.x += beltStep
          if (piece.position.x < releaseX) {
            // Off the end. With a mill to fall into it drops in; without one
            // (roll meshes missing from the model) it retires here as before,
            // rather than falling forever through an empty scene.
            if (rig.fall) {
              piece.falling = true
              piece.velocity.set(beltVelocity * config.exitVelocityScale, 0, 0)
            } else {
              piece.active = false
            }
          } else if (piece.position.x > rig.belt.max.x) {
            piece.active = false
          }
        }
        dummy.position.copy(piece.position)
        dummy.quaternion.copy(piece.quaternion)
        // Inactive instances collapse to nothing - InstancedMesh has no
        // per-instance visibility flag.
        dummy.scale.setScalar(piece.active ? piece.scale : 0)
        dummy.updateMatrix()
        mesh.setMatrixAt(i, dummy.matrix)
      }
      mesh.instanceMatrix.needsUpdate = true
    }
  })

  if (!rig) return null

  return (
    <>
      <mesh geometry={rig.curtain} material={material} frustumCulled={false} />
      {rig.matGeometries.map((geometry, v) => (
        <instancedMesh
          key={v}
          ref={(mesh) => {
            matRefs.current[v] = mesh
          }}
          args={[geometry, material, Math.floor(MAX_MAT_PIECES / MAT_VARIANTS)]}
          frustumCulled={false}
        />
      ))}
    </>
  )
}
