/**
 * Measured geometry and mesh names for the four machines at the end of the line:
 * the pre-plodder, the vacuum chamber, the final plodder and the cone heater.
 *
 * Its own module rather than constants in Model.tsx, because App.tsx needs the
 * pivots too and a component file that also exports values breaks fast refresh -
 * which matters here more than usual, since this viewer memoises geometry and
 * materials that a partial reload would leave stale.
 *
 * Everything here was measured from the model, never eyeballed. See
 * scripts/extract-plodder-cavities.mjs for the cavity data that goes with it.
 */

// ── The end of the line: pre-plodder, vacuum chamber, final plodder, cone ────
//
// Everything here lives under the `FinalPloder` node. That is also the scope
// the vacuum chamber, final plodder and cone heater shell lookups need: this
// subassembly is the SAME CAD part as the noodler further up the line, so a
// bare "pCube3658_A3_0" or "pCube3698_A3_0" exists two or three times over in
// this model.
//
// The screw, die, hopper and cone meshes below carry _A10_0 / _A3_0 material
// suffixes that the noodler's copies do not, so those names ARE unique and need
// no scope. Verified against the model, not assumed.
export const PLODDER_ROOT = 'FinalPloder'

// The pre-plodder's two screw shafts. Each is two meshes end to end turning as
// one rigid group about x - the noodler's run along z, which is why ScrewRibbon
// had to learn about axes.
export const PP_SHAFT_A_MESHES = ['Screw_Conveyor_A10_0', 'Screw_Conveyor_ZZBXZ3_A10_0']
export const PP_SHAFT_B_MESHES = ['Screw_Conveyor1_A10_0', 'Screw_Conveyor_ZZBXZ2_A10_0']
// The final plodder's two screws: a different, larger part, one mesh each,
// turning about z.
export const FP_SHAFT_2_MESHES = ['Screw_Conveyor2_A10_0']
export const FP_SHAFT_3_MESHES = ['Screw_Conveyor3_A10_0']

// Measured from the meshes' own bounding boxes. Each pivot must match the
// centreline its ScrewRibbon is given, or screw and paste turn about different
// axes. The component along the spin axis is free, so it is set to the shaft's
// own midpoint rather than left at zero.
export const PP_SHAFT_A_CENTRE: [number, number] = [0.37746, -1.15860]
export const PP_SHAFT_B_CENTRE: [number, number] = [0.37746, -1.12257]
export const FP_SHAFT_2_CENTRE: [number, number] = [-0.22600, 0.22917]
export const FP_SHAFT_3_CENTRE: [number, number] = [-0.27511, 0.22917]

// The same centrelines as GateHinge pivots. The component along each spin axis
// is free - a rotation about x does not care where along x the pivot sits - so
// it is set to the shaft's own midpoint rather than left at zero, which keeps
// the debug pivot marker on the machine if anyone turns it on.
export const PP_SHAFT_A_PIVOT: [number, number, number] = [-0.07965, ...PP_SHAFT_A_CENTRE]
export const PP_SHAFT_B_PIVOT: [number, number, number] = [-0.07965, ...PP_SHAFT_B_CENTRE]
export const FP_SHAFT_2_PIVOT: [number, number, number] = [...FP_SHAFT_2_CENTRE, -1.07227]
export const FP_SHAFT_3_PIVOT: [number, number, number] = [...FP_SHAFT_3_CENTRE, -1.07227]

// Barrel extents along each machine's own axis, INLET first.
//
// The pre-plodder conveys toward -x: its die sits at x -0.2095, at the low end
// of the screws' -0.20438..+0.04509 span. The final plodder conveys toward +z,
// from under the die at z -1.19026 out to its outlet plate at -0.95427. The
// noodler, by contrast, conveys toward +z. That the two plodders disagree about
// direction is why `start` is documented as the inlet rather than the minimum.
export const PP_BARREL_START_X = 0.04509
// Stopped a hair short of the die face at -0.20438 so the rope does not poke
// through the plate it is feeding.
export const PP_BARREL_END_X = -0.20200
export const FP_BARREL_START_Z = -1.19026
export const FP_BARREL_END_Z = -0.95700

// Outer radii, measured. The pre-plodder's screws are the noodler's part
// uniformly scaled: 0.01625 / 0.01785 = 0.9103, and their lengths agree to four
// digits at 0.13708 / 0.15051 = 0.9108. The final plodder's are 1.472x the
// pre-plodder's - the machine this animation was ported from recorded 1.47 for
// the same pair, which is an independent confirmation of the mapping.
export const PP_SCREW_RADIUS = 0.01625
export const FP_SCREW_RADIUS = 0.02394

// Axial distance per turn of the flight - 2*pi / |k| of the fits below.
//
// Both are raw helicoid fits of the screws' own rim vertices. The pre-plodder's
// used to be derived from the noodler's pitch scaled by radius, which came out
// 3% long: about a quarter turn of drift over its 8.7 turns, enough that the
// rope visibly rode up onto the flights toward the die.
//
// The final plodder's gives 6.03 turns over the barrel, and the reference
// implementation independently used 6 - so two derivations agree.
export const PP_SCREW_PITCH = 0.028338
export const FP_SCREW_PITCH = 0.039162

// Helicoid fits of each screw's own rim vertices: every rim point satisfies
// theta = mean + k*s along the shaft. Sign of k is the flight's HANDEDNESS, and
// the mirrored partner of each screw fits to exactly -mean and -k, which is what
// confirms these are true mirror parts rather than two similar ones.
//
// Handedness is the one number that could not be transcribed from the machine
// this was ported from: that subassembly is mirrored relative to this one, so a
// copied sign would drive the paste backwards.
//
// The rope must wind with the SAME sign of k as its flight. The pre-plodder
// conveys toward -x, so a `clockwise` rope there (whose parameter runs toward
// -x) winds with negative k - opposite to shaft A's flight, crossing it twice a
// turn. Hence shaft A takes `clockwise={false}` and shaft B `clockwise`, and
// the spins in App.tsx follow from that pairing.
export const PP_SHAFT_A_FIT = { mean: 1.718292, k: 221.7495 }
export const PP_SHAFT_B_FIT = { mean: -1.716651, k: -221.7075 }
export const FP_SHAFT_2_FIT = { mean: -1.695932, k: 160.441051 }
export const FP_SHAFT_3_FIT = { mean: -1.445662, k: -160.441051 }

/**
 * Where to start a paste rope around its shaft, in radians at the barrel inlet.
 *
 * The flight itself is at `mean + k*s`; adding half a turn puts the rope in the
 * channel BETWEEN flights rather than straddling one. Evaluated at the inlet
 * directly rather than propagated from a fit taken elsewhere on the shaft,
 * because propagating across eight turns multiplies any pitch error by eight.
 */
function flightChannelPhase(fit: { mean: number; k: number }, atInlet: number) {
  return fit.mean + fit.k * atInlet + Math.PI
}

export const PP_SHAFT_A_PHASE = flightChannelPhase(PP_SHAFT_A_FIT, PP_BARREL_START_X)
export const PP_SHAFT_B_PHASE = flightChannelPhase(PP_SHAFT_B_FIT, PP_BARREL_START_X)
export const FP_SHAFT_2_PHASE = flightChannelPhase(FP_SHAFT_2_FIT, FP_BARREL_START_Z)
export const FP_SHAFT_3_PHASE = flightChannelPhase(FP_SHAFT_3_FIT, FP_BARREL_START_Z)

// The pre-plodder's own body shell. pCube3658_A3_0 exists two or three times
// over (see above), but this exporter-assigned "_1" name is this shell's own
// copy and already unique in the model - confirmed against the model, so it
// needs no root scope, unlike a bare "pCube3658_A3_0" lookup would.
export const PRE_PLODDER_BODY_MESHES = ['pCube3658_A3_0_1']

// The vacuum chamber between the two plodders. Not a machine that moves - it is
// the CAVITY the extruded noodles fall through and heap up in, so seeing into
// it is the only way to watch that leg of the journey. Every name here is
// unique in the model.
export const VACUUM_CHAMBER_OPACITY_MESHES = [
  'Ryor5_A3_0', 'Ryor5_A6_0', 'Ryor8_A3_0', 'Ryor12_A3_0', 'Ryor12_A6_0',
  'Ryor13_A3_0', 'Ryor13_A6_0', 'Ryor14_A10_0', 'Ryor14_A6_0', 'Ryor15_A3_0',
  'Ryor17_A3_0', 'Ryor18_A3_0', 'M_Part7_A18_0', 'polySurface12_A11_0',
  'pCylinder2764_A3_0', 'pCylinder2765_A3_0', 'pCylinder2808_A11_0',
  'pCube3735_A3_0',
]

// The final plodder's barrel housing and outlet plate. BOLTX47_A10_0 is
// deliberately left out although it belongs to this group: the name appears
// twice inside this very machine, so a lookup would fade one bolt and miss the
// other. A half-faded pair of bolts reads as a rendering fault; two solid ones
// read as bolts.
export const FINAL_PLODDER_OPACITY_MESHES = ['pCube3711_A3_0', 'ASD9_A3_0']

// The cone heater at the very end, and its own collar.
export const CONE_HEATER_OPACITY_MESHES = ['ASD10_A3_0', 'BOLTX46_A10_0']
