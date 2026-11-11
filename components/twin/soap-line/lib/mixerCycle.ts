// The sigma mixer's batch cycle: discharge through the gate, then a fresh
// charge from the feed hopper above, then mixing until the gate opens again.
//
// Kept apart from MixerFill as plain arithmetic so the timing can be tested
// without WebGL. MixerFill steps it once a frame and draws whatever it says.

// Fraction of the batch discharged per second while the gate is open and the
// blades are turning. 1/30 empties a full batch in 30 s - material has to be
// worked out of a sigma mixer by the blades, so it leaves at a steady rate
// rather than draining the moment the gate lifts.
export const DRAIN_RATE = 1 / 30

// How long a full recharge takes, seconds. The plant's own trend has the
// blades stopped for roughly a minute after the gate shuts while the next
// batch is loaded, then the current climbs as mixing starts; 45 s sits inside
// that pause.
export const REFILL_SECONDS = 45

export interface MixerCycleState {
  /** How empty the trough is: 0 full, 1 bare. */
  drain: number
  /** True while the feed hopper is charging the trough. */
  refilling: boolean
}

export const FULL_MIXER: MixerCycleState = { drain: 0, refilling: false }

/**
 * Advances the cycle by `dt` seconds.
 *
 * - Gate open and blades turning: the batch discharges.
 * - Gate open, blades stopped: nothing moves. Stiff soap base bridges over the
 *   opening rather than falling through it, and nothing is charged into a
 *   trough with its gate open.
 * - Gate shut with anything missing: the feed hopper tops it back up. This is
 *   a level rule rather than a "gate just shut" edge on purpose - a page loaded
 *   or reconnected mid-recharge then still finishes it, and a gate shut halfway
 *   through a discharge simply recharges from wherever the level stopped.
 */
export function stepMixerCycle(
  state: MixerCycleState,
  gateOpen: boolean,
  mixing: boolean,
  dt: number,
): MixerCycleState {
  if (gateOpen) {
    const drain = mixing ? Math.min(1, state.drain + DRAIN_RATE * dt) : state.drain
    return { drain, refilling: false }
  }
  if (state.drain <= 0) return FULL_MIXER
  const drain = Math.max(0, state.drain - dt / REFILL_SECONDS)
  return { drain, refilling: drain > 0 }
}

// Dummy mode's stand-in for the gate limit switch. The plant runs a batch
// roughly every hour; this compresses that to a loop short enough to watch -
// long enough open to empty the trough (DRAIN_RATE), long enough shut to
// recharge it (REFILL_SECONDS) and then be seen mixing a while.
export const DUMMY_GATE_OPEN_SECONDS = 40
export const DUMMY_GATE_SHUT_SECONDS = 120

/**
 * Whether dummy mode's gate is shut `elapsedSeconds` into its loop. Starts
 * shut, so a freshly opened scene shows a full mixer churning before the first
 * discharge.
 */
export function dummyGateClosed(elapsedSeconds: number): boolean {
  const period = DUMMY_GATE_OPEN_SECONDS + DUMMY_GATE_SHUT_SECONDS
  const t = ((elapsedSeconds % period) + period) % period
  return t < DUMMY_GATE_SHUT_SECONDS
}
