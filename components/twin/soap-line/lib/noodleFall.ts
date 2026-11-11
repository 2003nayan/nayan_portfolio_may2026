import * as THREE from 'three'
import type { GuidePlane } from './dieHoles'

/**
 * The flight from the conveyor's head into the mill's nip.
 *
 * Its own module rather than part of NoodleExtrusion because the step is useful
 * apart from the component that renders it: given a starting point it says where
 * product ends up, which is what settled these numbers - a debug rig ran it
 * forward and drew the predicted route over the model until the route was right.
 * That rig has served its purpose and gone; the separation it needed is worth
 * keeping, because it is what stops the physics being entangled with the frame
 * loop that happens to drive it.
 */

// Where along the belt product stops being carried and starts to fall, as an
// offset from the belt's own end. Zero - the belt's own head is where it goes
// over, which is what the geometry says and what tuning agreed with.
const RELEASE_X_OFFSET = 0

// How much of the belt's speed a piece carries off the lip.
//
// Physically this should be 1: product leaves a belt at belt speed. It is 3
// because BELT_SPEED is not a real speed. That constant is tuned by eye so the
// mat LOOKS right riding along (see the note on it in NoodleExtrusion), and
// nothing pins this model's scene units to metres, so it was never calibrated
// against the distance a discharging noodle has to cover.
//
// The gap is not small. The belt lets go at x 0.0629; the first chute's carrying
// face starts at x 0.040, and the drop to it is about 0.022. At FALL_GRAVITY
// that flight lasts ~0.23s, in which 1x carries a piece only ~0.012 in x - it
// comes down at x 0.051, short of the plate, and falls past its high side into
// the gap beside the machine. That is the product seen spilling down the outside
// of the chute rather than into it. 3x carries it ~0.035, onto the plate.
//
// So this holds a discrepancy rather than a preference, and it lives here rather
// than in BELT_SPEED because that number also sets how fast the mat visibly
// travels, which is already right. The two uses genuinely disagree; splitting
// them is what lets each be correct.
const EXIT_VELOCITY_SCALE = 3

// Sliding friction on the chute, as a fraction of the normal force.
//
// Without it a noodle leaves the lip at 0.35 units/s and sails the length of
// the mill, landing at x -0.153 - the rolls' far edge, having crossed them
// entirely. Soap paste on steel is not frictionless, and 0.5 is the value that
// puts the landing at x -0.13, on the rolls rather than past them.
const SLIDE_FRICTION = 0.5

// How far below a guide's surface a piece can be and still count as resting on
// it, in noodle radii.
//
// A contact test that only asks "is it below the plane" would recapture product
// that has already dropped past a lip - a funnel wall's plane is infinite, and
// only its bounds and this depth stop it acting like a floor over the rolls. A
// few radii is enough to catch a piece that crossed the surface within one
// frame at the speeds here, and not enough to reach anything further down.
//
// 0.018 - about twelve radii - rather than the 0.01 first tried. With
// EXIT_VELOCITY_SCALE tripled, product arrives at the chutes travelling three
// times as fast and so crosses more of a surface between one frame and the next;
// the shallower window let pieces pass clean through a wall they should have
// slid down. Still far short of the ~0.09 from the funnel's mouth to its throat,
// so it cannot reach past the surface below it.
const CONTACT_DEPTH = 0.018

// Fall acceleration, scene units/s^2.
//
// Tuned rather than derived, and openly so: nothing pins this model's scene
// units to metres (see BELT_SPEED above), so there is no true 9.81 to convert.
//
// The value is not free, though - it decides WHERE product lands, because the
// longer a noodle is in the air the further the belt's speed carries it. The
// rolls end at x 0.0271 and the belt discharges at x 0.0629, so a fall that is
// too brisk drops product past the near end of the mill instead of onto it.
// Simulated against the measured geometry over the 0.237-unit drop: 1.4 lands a
// noodle's centre at x 0.0337, past the rolls; 0.8 lands it at x 0.0246, on
// them, and its slower flight also leaves the sideways steer only 0.005 short
// of the nip instead of 0.010. Hence 0.8, and a fall of about 0.77s.
//
// That last clause is now history: the steer is off (see NIP_STEER_RATE), and
// with EXIT_VELOCITY_SCALE fixed product no longer free-falls the whole 0.237
// anyway - it is caught by the first chute a fifth of the way down and handed
// between guides after that. 0.8 survived the retuning unchanged, but the
// argument that picked it has been overtaken by the route being right.
const FALL_GRAVITY = 0.8

// How sharply a free-falling noodle converges on the nip, as a fraction of the
// remaining offset per second.
//
// OFF, and that is the point. This was the one unphysical part of the model: it
// walked product sideways through the air the ~0.06 to the pinch, because
// nothing else was getting it there. Once the release was fixed so product
// actually meets the first chute, the two guides deliver it on their own - the
// funnel's opposed walls converge on its throat by their own slope, which is
// what a funnel is for. The steer was compensating for product that had missed
// the chutes entirely.
//
// Kept as a knob rather than deleted from the step: it costs one multiply on a
// piece already in free fall, and if the mill is ever re-exported far enough
// that the funnel stops delivering, this is the dial that papers over it while
// the real fix is found.
const NIP_STEER_RATE = 0

// Nudge to the height at which the rolls are taken to have swallowed a piece.
//
// The nip itself is probed from the two roll meshes, so it needs no constant.
// This lifts the cutoff above it, and it is not cosmetic: with NIP_STEER_RATE at
// zero nothing drags product to the pinch any more, so a piece the funnel drops
// onto roll1's crown would otherwise keep falling PAST the rolls to reach the
// nip's own height, and be seen sinking through the machine on the way. Retiring
// it as it reaches the crown is the hand-off the roll's rotation would make.
//
// Checked against the model: at 0.053 product is visibly delivered onto the
// rolls rather than winking out inside the funnel above them, which is the
// failure a larger value gives. So this is bounded from above by what can be
// seen, and from below by product sinking through the mill - a re-export that
// moves the rolls or the funnel should be looked at with that in mind.
const NIP_Y_OFFSET = 0.053

// --- tuning the route into the mill -------------------------------------

/**
 * The knobs that decide where product goes between the belt's head and the nip.
 *
 * The constants above gathered into one value. A bundle rather than stepFall
 * reading them directly, because that keeps the step a pure function of its
 * inputs: it can be run forward from any starting point, at any timestep, by
 * anything that wants to know where product ends up - which is how these numbers
 * were found in the first place, by a panel that moved them live and an overlay
 * that traced the resulting path over the model.
 *
 * Only FALL-PHASE numbers belong here. The curtain's own shape (TURN_FRACTION,
 * WANDER_RADII) is deliberately absent: those feed the useMemo that builds the
 * geometry, so they cannot be changed without rebuilding it, while everything
 * here takes effect on the next frame.
 */
export interface NoodleFallConfig {
  /**
   * Where along the belt product stops being carried and starts to fall, as an
   * offset from the belt's own end. Positive releases it EARLIER - the line runs
   * toward -x, so a piece leaves further back from the head.
   */
  releaseXOffset: number
  /** How much of the belt's speed a piece carries off the lip. */
  exitVelocityScale: number
  /** Fall acceleration, scene units/s^2. */
  gravity: number
  /** Sliding friction on the chutes, as a fraction of the normal force. */
  friction: number
  /** How far below a chute's surface still counts as resting on it. */
  contactDepth: number
  /** How sharply a free-falling piece converges on the nip, per second. */
  nipSteerRate: number
  /** Nudge to the height at which the rolls are considered to have taken it. */
  nipYOffset: number
}

export const DEFAULT_NOODLE_FALL: NoodleFallConfig = {
  releaseXOffset: RELEASE_X_OFFSET,
  exitVelocityScale: EXIT_VELOCITY_SCALE,
  gravity: FALL_GRAVITY,
  friction: SLIDE_FRICTION,
  contactDepth: CONTACT_DEPTH,
  nipSteerRate: NIP_STEER_RATE,
  nipYOffset: NIP_Y_OFFSET,
}

/**
 * Everything the flight from the belt to the nip depends on, probed from the
 * model rather than written down, so a re-export that moves the chutes or the
 * rolls moves the product with them.
 */
export interface FallRig {
  radius: number
  guides: GuidePlane[]
  nip: { z: number; y: number }
  /** Where a piece leaves the belt at releaseXOffset 0. */
  release: THREE.Vector3
  /** Belt velocity at normal running - the speed a piece is let go with. */
  releaseVelocityX: number
}

/** The piece has arrived and should stop being drawn. */
export const FALL_DONE = 0
/** In the air, touching nothing. */
export const FALL_FREE = 1
/** Resting on a chute and running down it. */
export const FALL_SLIDING = 2

/**
 * One step of a piece in flight. Returns one of the FALL_* codes above.
 *
 * A code rather than a bare "still going" boolean because callers draw the two
 * live states differently: something in free fall tumbles, and the same piece
 * lying on a chute does not - a flake spinning end-over-end while sliding down a
 * ramp reads as a bug. A plain number keeps the promise below about allocation.
 *
 * Pulled out of the frame loop so it can be run forward from any starting point
 * at any timestep, rather than only one frame at a time on whatever the renderer
 * hands it. Mutates position and velocity in place - it runs for hundreds of
 * pieces a frame, so it allocates nothing.
 */
export function stepFall(
  position: THREE.Vector3,
  velocity: THREE.Vector3,
  rig: FallRig,
  config: NoodleFallConfig,
  delta: number,
): number {
  // Gravity acts in y; the rest of the velocity is whatever the belt let go of
  // it with, and whatever the chutes have since done to it.
  velocity.y -= config.gravity * delta
  position.addScaledVector(velocity, delta)

  // Contact with the chutes. Each is a plane bounded by the faces that formed
  // it, so product is only held up where the surface really is - past a lip, or
  // out beyond the end of a funnel wall, it falls on.
  let onGuide = false
  for (const guide of rig.guides) {
    const height = guide.normal.dot(position) - guide.constant
    // Below -contactDepth it is under the surface, not resting on it - a piece
    // that has already passed the lip must not be yanked back up.
    if (height > rig.radius || height < -config.contactDepth) continue
    const bounds = guide.bounds
    if (
      position.x < bounds.min.x ||
      position.x > bounds.max.x ||
      position.z < bounds.min.z ||
      position.z > bounds.max.z
    ) {
      continue
    }
    onGuide = true
    // Sit it on the surface rather than let it sink through.
    position.addScaledVector(guide.normal, rig.radius - height)
    // The surface cancels motion INTO it. What survives is the along-slope
    // component, which is exactly g*sin(theta) - so the slide falls out of the
    // geometry rather than being scripted, and the funnel's two walls steer
    // product to its throat on their own.
    const into = velocity.dot(guide.normal)
    if (into < 0) velocity.addScaledVector(guide.normal, -into)
    // Coulomb friction, mu * g * cos(theta), opposing the motion. For a plane
    // tilted from horizontal the normal's y component IS cos(theta), so this
    // needs no trigonometry.
    const speed = velocity.length()
    if (speed > 0) {
      const drag = config.friction * config.gravity * guide.normal.y * delta
      velocity.multiplyScalar(Math.max(0, speed - drag) / speed)
    }
    break
  }

  // The last hand-off is not a fall: the funnel's throat drops product onto
  // roll1's crown, and the roll's own surface carries it round into the pinch,
  // about 0.06 away. Modelling that properly would mean contact against a
  // rotating cylinder; this covers the same journey.
  //
  // Only off the chutes - on them the surface decides where product goes, and
  // pulling it sideways there would drag noodles through a funnel wall.
  if (!onGuide) {
    // Exponential approach to the nip: a fixed fraction of whatever offset is
    // left, per second. Clamped because at a low frame rate an unclamped step
    // overshoots and the noodle oscillates across the pinch.
    const steer = Math.min(1, config.nipSteerRate * delta)
    position.z += (rig.nip.z - position.z) * steer
  }

  if (position.y <= rig.nip.y + config.nipYOffset) return FALL_DONE
  return onGuide ? FALL_SLIDING : FALL_FREE
}
