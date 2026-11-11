import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { MATERIAL_COLOR } from './MixerFill'
import { useProductColor, useTint } from '../lib/productColor'
import { resolveMeshBounds, resolveGuidePlanes } from '../lib/dieHoles'
import { hash2 } from '../lib/noise'
import { FALL_DONE, FALL_SLIDING, stepFall, type FallRig, type NoodleFallConfig } from '../lib/noodleFall'

/**
 * What comes off the back of the triple roll mill.
 *
 * The mill refines the noodles between three rolls turning at rising speeds; the
 * soap ends up as a thin film clinging to the last one, and a scraper blade
 * peels it off. What drops away is FLAKES - flat torn sheets, nothing like the
 * round rods that went in - and they run down two chutes into the pre-plodder's
 * hopper, which is the last thing this model follows them into.
 *
 * The route is not invented. Every surface is probed from the model:
 *
 *   SDG_A18_0  is the take-off chute at the scraper: a trough whose carrying
 *              face slopes 59 degrees across the full width of the roll, with
 *              two 80-degree cheeks that keep product from spilling off the
 *              sides. Its top edge sits at y 1.033, just under roll 3's crown
 *              at 1.050 and on the far side of it - where a blade would be.
 *
 *   S3661_A4_0 is the ramp below: one clean plane at 75.5 degrees running from
 *              y 0.854 down to y 0.642.
 *
 *   Ryor19_A3_0 is the hopper. Its rim is flat at y 0.652 - just above the
 *              ramp's bottom lip, so the ramp discharges over it.
 *
 * Between the trough's lip (y 0.943) and the ramp's top there is a real gap of
 * about 0.09 that product free-falls. That was the part worth checking rather
 * than assuming: the lip is at z -1.084 and the ramp does not begin until
 * z -1.174, so a flake has to carry enough sideways speed off the chute to cross
 * 0.09 in z while it drops 0.089 in y, or it falls short into the gap and misses
 * the hopper altogether. Simulated against the probed planes across the whole
 * roll face before any of this was written, it clears it at every starting
 * point: the 59-degree trough is steep enough to do it on gravity alone.
 *
 * SDG1_A3_0 is deliberately NOT a guide, though it sits in that gap at y 0.850.
 * It is a flat horizontal deck - a walkway, not a chute - and a level plane in a
 * fall path is a shelf: product would land on it and stay there forever, since
 * nothing on a level surface slides.
 */

// The last roll and the scraper chute that strips it. The flakes are born along
// the line where the two meet.
const TAKE_OFF_ROLL = 'W_R1_0'
const SCRAPER_CHUTE = 'SDG_A18_0'
// The chutes product runs down, in the order it meets them.
const FLAKE_GUIDE_MESHES = [SCRAPER_CHUTE, 'S3661_A4_0']
// Where it ends up.
const PRE_PLODDER_HOPPER = 'Ryor19_A3_0'

// How the flight behaves. The same numbers the noodles' own fall settled on -
// it is the same soap running down the same kind of steel - and the offline
// sweep across the roll face confirmed they land product inside the hopper's
// mouth at every start position, so there was nothing to re-tune.
//
// The two that differ are deliberate. nipSteerRate is zero here because there is
// no pinch to converge on: the ramp delivers over the hopper's rim by its own
// slope. nipYOffset is zero because the retire height is the soap's own surface,
// computed below, rather than something a constant has to nudge.
const FLAKE_FALL: NoodleFallConfig = {
  releaseXOffset: 0,
  exitVelocityScale: 1,
  gravity: 0.8,
  friction: 0.5,
  contactDepth: 0.018,
  nipSteerRate: 0,
  nipYOffset: 0,
}

// A flake's size, in scene units. The roll face is 0.18 across and about 400 mm
// in the plant, so a unit is roughly 2.2 m: these are a 60 mm by 40 mm sheet,
// which is what a refiner throws off - palm-sized, not crumbs.
const FLAKE_LENGTH = 0.027
const FLAKE_WIDTH = 0.018
// Real flakes are a fraction of a millimetre thick, which at this scale is well
// under a pixel. They are drawn as unthickened sheets rather than as very thin
// boxes: a box that thin renders as z-fighting mush, and doubles the triangles
// for a thickness nobody can see. Hence the double-sided material below.
//
// Segments around the rim and rings out to it. Enough that the torn outline
// reads as torn rather than as a polygon, and that the curl bends smoothly -
// 42 triangles a flake, against hundreds of flakes, which is nothing.
const FLAKE_SEGMENTS = 14
const FLAKE_RINGS = 2

// How much a flake curls, as a fraction of its length. Soap coming off a blade
// does not leave flat - it lifts at the edges as it is peeled, and a field of
// perfectly flat plates reads as confetti.
const FLAKE_CURL = 0.22
// How much they differ from each other in size.
const FLAKE_SCALE_VARIATION = 0.45
// Distinct shapes. Same reasoning as the noodles': instancing needs one geometry
// per shape, and a handful of them is enough to stop the stream reading as one
// sheet copied over and over. One draw call each.
const FLAKE_VARIANTS = 5

const MAX_FLAKES = 500

// How many flakes come off per turn of the roll.
//
// Derived rather than dialled: the roll is 0.04 in radius, so its surface runs
// 0.251 per revolution, and the film peels off in strips a flake long across a
// face 0.173 wide. That is (0.251 / FLAKE_LENGTH) * (0.173 / FLAKE_WIDTH) ~ 89
// sheets a revolution if the film were cut up with no waste.
const ROLL_RADIUS = 0.04
const ROLL_FACE_WIDTH = 0.173
const FLAKES_PER_REVOLUTION =
  ((2 * Math.PI * ROLL_RADIUS) / FLAKE_LENGTH) * (ROLL_FACE_WIDTH / FLAKE_WIDTH)

// What fraction of that is actually drawn.
//
// Its own multiplier rather than folded into the figure above, for the same
// reason the noodles' MAT_DENSITY is: the geometry is measured and should stay
// readable as measured, while how much of it to draw is a presentation choice.
// At 45 rpm the full rate is ~67 flakes a second against a fall of about 1.2s,
// so eighty would be in the air at once - a curtain thick enough to hide the
// chutes carrying it. A fifth of that shows the flow and leaves the machine
// visible behind it.
const FLAKE_DENSITY = 0.2

// End-over-end flutter while falling, radians/s. Faster than the noodles' tumble
// because a thin sheet has almost no mass to its swing - it flutters rather than
// rolls. Applied ONLY in free fall: a flake lying on a chute slides, and one
// spinning as it slides looks like a bug.
const FLAKE_TUMBLE_RATE = 5.5

/**
 * One flake: a torn oval sheet with a curl through it.
 *
 * NOT a rectangle. Soap does not leave a scraper in cut pieces - the film tears
 * off the blade, so every edge is a rip and the outline is a rough oval. A
 * rectangle reads as cut paper, which is the one thing this must not look like.
 *
 * Built as a disc: a centre vertex, then rings of vertices out to the rim, with
 * the rim's radius varying by angle. Three overlapping harmonics do that varying
 * - one alone gives a smooth egg, three give an outline that wanders in and out
 * the way a tear does. Their amplitudes total 0.25, so the rim stays between
 * three quarters and one and a quarter of the nominal radius: ragged, but still
 * recognisably one flake rather than a star.
 *
 * Built lying flat in the XZ plane so placing one is a rotation and nothing
 * more, and shaped from its variant number through the shared hash - so the same
 * five flakes come back on every reload rather than changing per run.
 */
function makeFlakeGeometry(variant: number) {
  const halfLength = FLAKE_LENGTH / 2
  const halfWidth = FLAKE_WIDTH / 2
  const phaseA = hash2(variant, 11) * Math.PI * 2
  const phaseB = hash2(variant, 23) * Math.PI * 2
  const phaseC = hash2(variant, 31) * Math.PI * 2
  const curlPhase = hash2(variant, 43) * Math.PI * 2
  const lift = 0.6 + hash2(variant, 37) * 0.8

  // How ragged the rim is, per harmonic. Kept in this order - a big slow wobble
  // that gives the flake its lopsided shape, then two finer ones for the tear.
  const rimAt = (angle: number) =>
    1 +
    0.14 * Math.cos(angle * 2 + phaseA) +
    0.08 * Math.cos(angle * 5 + phaseB) +
    0.05 * Math.cos(angle * 9 + phaseC)

  const positions: number[] = [0, 0, 0]
  for (let ring = 1; ring <= FLAKE_RINGS; ring++) {
    const t = ring / FLAKE_RINGS
    for (let s = 0; s < FLAKE_SEGMENTS; s++) {
      const angle = (s / FLAKE_SEGMENTS) * Math.PI * 2
      const r = rimAt(angle) * t
      const x = Math.cos(angle) * r * halfLength
      const z = Math.sin(angle) * r * halfWidth
      // A curl rising toward the rim, plus a gentler wave around it, so the
      // sheet is saddle-shaped rather than a uniform dish - which is how a
      // peeled film sits once it has come off the blade.
      const curl = (t * t * Math.cos(angle + curlPhase) + 0.35 * Math.sin(angle * 2 + phaseB)) * lift
      positions.push(x, curl * FLAKE_LENGTH * FLAKE_CURL, z)
    }
  }

  const indices: number[] = []
  // Fan from the centre out to the first ring.
  for (let s = 0; s < FLAKE_SEGMENTS; s++) {
    indices.push(0, 1 + s, 1 + ((s + 1) % FLAKE_SEGMENTS))
  }
  // Quads between each pair of rings.
  for (let ring = 1; ring < FLAKE_RINGS; ring++) {
    const inner = 1 + (ring - 1) * FLAKE_SEGMENTS
    const outer = 1 + ring * FLAKE_SEGMENTS
    for (let s = 0; s < FLAKE_SEGMENTS; s++) {
      const next = (s + 1) % FLAKE_SEGMENTS
      indices.push(inner + s, outer + s, outer + next)
      indices.push(inner + s, outer + next, inner + next)
    }
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

interface TrmFlakesProps {
  scene: THREE.Object3D
  /**
   * The last roll's angle, written by its GateHinge every frame. Flakes are
   * spawned off how far it has turned, never off wall-clock time: stop the mill
   * and the scraper stops producing, exactly as the die stops extruding when the
   * noodler's screws stop.
   */
  rollAngleRef: React.MutableRefObject<number>
  /**
   * Height of the soap already in the pre-plodder hopper, written by its
   * HopperFill. Flakes land ON that surface rather than sinking to the hopper's
   * floor; -Infinity when it is empty, which the rim height below covers.
   */
  fillYRef?: React.MutableRefObject<number>
}

export function TrmFlakes({ scene, rollAngleRef, fillYRef }: TrmFlakesProps) {
  const meshRefs = useRef<(THREE.InstancedMesh | null)[]>([])

  const rig = useMemo(() => {
    const roll = resolveMeshBounds(scene, TAKE_OFF_ROLL)
    const chute = resolveMeshBounds(scene, SCRAPER_CHUTE)
    const hopper = resolveMeshBounds(scene, PRE_PLODDER_HOPPER)
    if (!roll || !chute || !hopper) return null

    const guides = FLAKE_GUIDE_MESHES.flatMap((name) => resolveGuidePlanes(scene, name))
    if (guides.length === 0) return null

    // The scraper line: the top of the take-off chute, across the roll's face.
    // Taken from the chute rather than the roll because it is the chute that
    // catches the film - starting product at the roll's own surface would drop
    // it behind the trough's back wall.
    //
    // At the chute's BACK edge (max z), not its middle. The trough's face slopes
    // 59 degrees, so its surface at the mesh's mid-z sits 0.06 below the mesh's
    // highest point - spawn on that top y at that z and every flake is born
    // 130 mm out in mid-air and visibly drops onto the chute before it starts to
    // slide. The high corner of a sloping face is at the high end of its run,
    // which is the back edge, hard against roll 3. That is where a blade is.
    const bornY = chute.max.y - FLAKE_WIDTH / 2
    const bornZ = chute.max.z - FLAKE_WIDTH / 2
    // Kept inside the trough's cheeks by half a flake, so a sheet is not born
    // already half through a side wall.
    const bornMinX = Math.max(roll.min.x, chute.min.x) + FLAKE_LENGTH / 2
    const bornMaxX = Math.min(roll.max.x, chute.max.x) - FLAKE_LENGTH / 2

    return {
      guides,
      // Half the sheet's smaller dimension: the contact test treats a piece as a
      // ball of this size, and a flake resting on a ramp is lying down.
      radius: FLAKE_WIDTH / 2,
      hopperZ: (hopper.min.z + hopper.max.z) / 2,
      // The bottom of the funnel, where product comes to rest while the hopper
      // is drawn empty. Lifted by half a flake so a sheet lies ON the floor
      // rather than half through it - pieces are placed by their centres.
      hopperFloorY: hopper.min.y + FLAKE_WIDTH / 2,
      bornY,
      bornZ,
      bornMinX,
      bornMaxX,
      geometries: Array.from({ length: FLAKE_VARIANTS }, (_, v) => makeFlakeGeometry(v)),
    }
  }, [scene])

  /**
   * The rig handed to stepFall, rebuilt from the probe but owned by the frame
   * loop rather than by the memo above.
   *
   * Separate because one field of it genuinely changes every frame: where a
   * flake comes to rest is the top of the soap already in the hopper, and that
   * surface rises and falls. Writing that into the memo would be mutating a
   * value React is holding for us, so the mutable part lives in a ref that is
   * explicitly ours to write.
   */
  const fallRig = useRef<FallRig | null>(null)
  useEffect(() => {
    fallRig.current = rig
      ? {
          radius: rig.radius,
          guides: rig.guides,
          nip: { z: rig.hopperZ, y: rig.hopperFloorY },
          release: new THREE.Vector3((rig.bornMinX + rig.bornMaxX) / 2, rig.bornY, rig.bornZ),
          releaseVelocityX: 0,
        }
      : null
  }, [rig])

  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        // The same soap as everything upstream - it has been refined, not
        // changed into something else.
        color: new THREE.Color(MATERIAL_COLOR),
        roughness: 1,
        metalness: 0,
        flatShading: true,
        // The sheets have no thickness, so they must be lit and drawn from
        // either face. Without this a flake vanishes every time it flutters
        // edge-on and comes back the other way round.
        side: THREE.DoubleSide,
      }),
    [],
  )
  // Recoloured in place on a SKU changeover; see useTint.
  useTint(material, useProductColor().mass)

  useEffect(() => {
    return () => {
      for (const geometry of rig?.geometries ?? []) geometry.dispose()
      material.dispose()
    }
  }, [rig, material])

  const pools = useRef(
    Array.from({ length: FLAKE_VARIANTS }, () =>
      Array.from({ length: Math.floor(MAX_FLAKES / FLAKE_VARIANTS) }, () => ({
        active: false,
        position: new THREE.Vector3(),
        quaternion: new THREE.Quaternion(),
        scale: 1,
        velocity: new THREE.Vector3(),
      })),
    ),
  )
  const prevAngle = useRef(0)
  const pending = useRef(0)
  const nextVariant = useRef(0)
  const dummy = useMemo(() => new THREE.Object3D(), [])
  // Scratch for the flutter, built once rather than per piece per frame.
  const tumbleAxis = useMemo(() => new THREE.Vector3(0.3, 0.2, 0.93).normalize(), [])
  const tumbleStep = useMemo(() => new THREE.Quaternion(), [])
  const spawnAxis = useMemo(() => new THREE.Vector3(0, 1, 0), [])

  useEffect(() => {
    for (const mesh of meshRefs.current) if (mesh) mesh.raycast = () => {}
  }, [rig])

  useFrame((_, delta) => {
    const fall = fallRig.current
    if (!rig || !fall) return

    // How far the roll turned. Same unwrap the noodler's screws use - the angle
    // wraps at 2*PI and runs either direction.
    const angle = rollAngleRef.current
    let step = angle - prevAngle.current
    if (step > Math.PI) step -= Math.PI * 2
    if (step < -Math.PI) step += Math.PI * 2
    prevAngle.current = angle
    pending.current += (Math.abs(step) / (Math.PI * 2)) * FLAKES_PER_REVOLUTION * FLAKE_DENSITY

    tumbleStep.setFromAxisAngle(tumbleAxis, FLAKE_TUMBLE_RATE * delta)

    // Where flakes come to rest. They cross the hopper's rim and keep falling
    // INSIDE it - the chutes end at the mouth, and nothing below is a guide - so
    // they settle on the soap already standing there. HopperFill writes
    // -Infinity while the hopper is empty, which drops them to its floor.
    const fillY = fillYRef?.current ?? Number.NEGATIVE_INFINITY
    fall.nip.y = Number.isFinite(fillY) ? Math.max(rig.hopperFloorY, fillY) : rig.hopperFloorY

    let toSpawn = Math.floor(pending.current)
    pending.current -= toSpawn
    for (let n = 0; n < toSpawn; n++) {
      let free: (typeof pools.current)[number][number] | undefined
      for (let attempt = 0; attempt < FLAKE_VARIANTS && !free; attempt++) {
        const pool = pools.current[nextVariant.current]
        nextVariant.current = (nextVariant.current + 1) % FLAKE_VARIANTS
        free = pool.find((c) => !c.active)
      }
      if (!free) break

      free.active = true
      free.scale = 1 - FLAKE_SCALE_VARIATION / 2 + Math.random() * FLAKE_SCALE_VARIATION
      free.velocity.set(0, 0, 0)
      // Anywhere along the scraper's width - the blade strips the whole face at
      // once, so there is no reason for one part of it to produce more.
      free.position.set(
        rig.bornMinX + Math.random() * (rig.bornMaxX - rig.bornMinX),
        rig.bornY,
        rig.bornZ,
      )
      // Torn sheets come off at every angle. A yaw only: they leave lying flat
      // against the chute, and the flutter turns them from there.
      free.quaternion.setFromAxisAngle(spawnAxis, Math.random() * Math.PI * 2)
    }

    for (let v = 0; v < FLAKE_VARIANTS; v++) {
      const mesh = meshRefs.current[v]
      if (!mesh) continue
      const pool = pools.current[v]
      for (let i = 0; i < pool.length; i++) {
        const piece = pool[i]
        if (piece.active) {
          const state = stepFall(piece.position, piece.velocity, fall, FLAKE_FALL, delta)
          if (state === FALL_DONE) {
            piece.active = false
          } else if (state !== FALL_SLIDING) {
            // Only in the air. On a chute it is lying on a surface and running
            // down it, which is a slide, not a tumble.
            piece.quaternion.premultiply(tumbleStep)
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
      {rig.geometries.map((geometry, v) => (
        <instancedMesh
          key={v}
          ref={(mesh) => {
            meshRefs.current[v] = mesh
          }}
          args={[geometry, material, Math.floor(MAX_FLAKES / FLAKE_VARIANTS)]}
          frustumCulled={false}
        />
      ))}
    </>
  )
}
