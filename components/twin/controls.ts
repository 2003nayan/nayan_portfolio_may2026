export type RollAxis = 'auto' | 'x' | 'y' | 'z'

/** Laminate roll spin and film print settings. */
export interface RollSpin {
  playing: boolean
  /** Revolutions per minute. */
  rpm: number
  reverse: boolean
  axis: RollAxis
  /** Turns the rewrapped print the other way up. */
  flipPrint: boolean
  /** Turns the film's print the other way up along the web. */
  sheetFlipAlong: boolean
  /** Scrolls the film's print the other way, if it runs back into the roll. */
  sheetReverseFeed: boolean
  /** Degrees, applied while paused. */
  angle: number
  /** Bumped by Reset so the viewer puts the roll back to 0°. */
  resetKey: number
}

/** Tuned on the floor against the model with the debug controls, then fixed. */
export const ROLL_SPIN: RollSpin = {
  playing: true,
  rpm: 3,
  reverse: false,
  axis: 'auto',
  flipPrint: true,
  sheetFlipAlong: false,
  sheetReverseFeed: false,
  angle: 0,
  resetKey: 0,
}
/** Front and rear vertical sealers (all 13 a side, with their bars) as displayed. */
export interface SealerView {
  /** Front side: 0, 0.5 or 1. */
  opacity: number
  /** Rear side: 0, 0.5 or 1. */
  rearOpacity: number
  motion: SealerMotion
  /** Front vertical sealer travel, from the model's pose towards the film. */
  frontVerticalRange: SealerRange
}

/** Open (start) and closed (end) offsets in mm; positive is towards the film. */
export interface SealerRange {
  startMm: number
  endMm: number
}

/** Tuned on the floor with the debug controls, then fixed: opens 20 mm back
 * from the model's pose and closes 1.15 mm in from it. */
export const FRONT_VERTICAL_RANGE: SealerRange = { startMm: -20, endMm: 1.15 }

/** Sealing stroke of each sealer bar. The model is posed open; each cycle
 * closes both sides in by the stroke and opens back to the model's pose. */
export interface SealerMotion {
  playing: boolean
  /** Seal cycles per minute. */
  cpm: number
  /** Travel of each vertical sealer side from open to closed, in mm. */
  strokeMm: number
  /** Travel of each horizontal sealer side from open to closed, in mm. */
  horizontalStrokeMm: number
  /** Share of each cycle spent closed on the film (and again waiting open), 0–0.4. */
  hold: number
  reverse: boolean
  axis: 'x' | 'y' | 'z'
}

/** Tuned on the floor against the model with the debug controls, then fixed. */
export const SEALER_MOTION: SealerMotion = {
  playing: true,
  cpm: 80,
  // Jaw faces are 30.8 mm apart in the model (sealer 1, measured from the
  // GLB); each side closes half of that, less 0.5 mm left for the film.
  strokeMm: 15.15,
  // Horizontal jaw plates (B1174 front, B1146 rear) are 29.5 mm apart.
  horizontalStrokeMm: 14.5,
  // Jaws closed for 30% of the cycle, and open-and-still for 30%: the film
  // steps one sachet in that open window, so the stop reads clearly.
  hold: 0.3,
  reverse: false,
  axis: 'x',
}

/** Placement and fit of the folded sachet mat on the conveyor, tuned with the
 * debug controls and then fixed. */
export interface MatDebug {
  /** Shift from the default spot under the film, in mm. */
  offsetXMm: number
  offsetYMm: number
  offsetZMm: number
  /** Copies of the 4 × 4 sachet block across the belt, and along it. */
  tilesAcross: number
  tilesAlong: number
  /** Mat width across the belt, in mm. */
  widthMm: number
  /** Length of one level along the belt, in mm. */
  levelLengthMm: number
  /** Thickness of one level, in mm. */
  thicknessMm: number
  /** Turns the print in the mat's plane. */
  rotation: 0 | 90 | 180 | 270
  flipAcross: boolean
  flipAlong: boolean
  /** Lays level 1 in the other direction (and so every level after it). */
  swapStart: boolean
  /** Cycles a finished mat takes to slide off the belt. */
  slideCycles: number
}

export const MAT_DEBUG: MatDebug = {
  offsetXMm: 0,
  offsetYMm: 0,
  offsetZMm: 0,
  // 3 blocks of 4 columns across = 12 columns; 1 block along = 4 rows.
  tilesAcross: 3,
  tilesAlong: 1,
  // 12 lanes at the 53 mm sealer pitch.
  widthMm: 636,
  // 4 sachet rows at the film's 89.3 mm pitch.
  levelLengthMm: 357.2,
  thicknessMm: 8,
  rotation: 0,
  flipAcross: false,
  flipAlong: false,
  swapStart: false,
  slideCycles: 4,
}
/**
 * Filler piston drive, tuned with the debug controls and then fixed. The vertical arm tilts front/back on a hinge at
 * its bottom and slides the horizontal pipe front/back with it: back (refill)
 * while the sealers are open, forward (dose) while they are closed.
 */
export interface PistonDebug {
  /** Arm tilt when back, in degrees from the model's pose. */
  startDeg: number
  /** Arm tilt when forward, in degrees from the model's pose. */
  endDeg: number
}

// The arm's hinge sits ~14 cm below the pipe, so 8° slides the pipe ~20 mm.
export const PISTON_DEBUG: PistonDebug = { startDeg: 0, endDeg: 8 }
