/**
 * Piston parts in Machine.glb, by raw node name without the
 * `Machine Part | Machine_` prefix.
 *
 * Piston 1 was picked by hand; pistons 2–12 were found by matching each of its
 * parts to the same-sized part shifted along the machine (Z) at the lane pitch
 * (~52.7 mm). Numbered from piston 1 going towards −Z. No part is in two
 * pistons.
 *
 * Adjustments to the hand pick:
 * - `polySurface116/117` and `pCube489` were in piston 1's pick but are
 *   piston 2's copies of `polySurface96/97` and `pCube468`; they sit in piston 2.
 * - `polySurface335` (1.64 m × 1.05 m) spans all pistons: see PISTON_SHARED_PARTS.
 *
 * - Added by hand after the match: `pHelix36`, piston 7's arm spring, is one
 *   merged part in place of its `pCylinder364/365/366` and `pHelix13`; and
 *   pistons 2–12 (not 7) have a second, lower arm spring piston 1 lacks.
 *
 * Gaps in the model itself:
 * - `pCylinder368` and `polySurface36` exist only on piston 1.
 * - Piston 1 has no lower arm spring.
 * - `polySurface62`'s copies (`polySurface64`–`84`) are ~2 cm longer, so they
 *   were matched by position rather than size.
 */
export const PISTON_PARTS: string[][] = [
  // Piston 1 (31 parts)
  [
    'pCylinder366', 'pCylinder367', 'pCube469', 'pCylinder365', 'pCylinder368', 'pCylinder364',
    'pHelix13', 'polySurface96', 'pCube468', 'polySurface149', 'pCylinder463', 'polySurface97',
    'polySurface95', 'polySurface151', 'polySurface150', 'pCylinder462', 'pCylinder461', 'pCylinder459',
    'pCylinder460', 'pCylinder458', 'pCylinder457', 'polySurface161', 'pCube496', 'polySurface36',
    'polySurface160', 'polySurface62', 'pCylinder456', 'pCylinder455', 'pCylinder454', 'pCylinder453',
    'pCylinder452',
  ],
  // Piston 2 (30 parts)
  [
    'pCylinder401', 'pCylinder402', 'pCube490', 'pCylinder400', 'pCylinder399', 'pHelix27',
    'polySurface117', 'pCube489', 'polySurface146', 'pCylinder451', 'polySurface118', 'polySurface116',
    'polySurface148', 'polySurface147', 'pCylinder450', 'pCylinder449', 'pCylinder447', 'pCylinder448',
    'pCylinder446', 'pCylinder445', 'polySurface159', 'pCube495', 'polySurface158', 'pCylinder444',
    'pCylinder443', 'pCylinder442', 'pCylinder441', 'pCylinder440', 'polySurface64',
    'pHelix28',
  ],
  // Piston 3 (30 parts)
  [
    'pCylinder361', 'pCylinder362', 'pCube466', 'pCylinder360', 'pCylinder359', 'pHelix11',
    'polySurface93', 'pCube465', 'polySurface143', 'pCylinder439', 'polySurface94', 'polySurface92',
    'polySurface145', 'polySurface144', 'pCylinder438', 'pCylinder437', 'pCylinder435', 'pCylinder436',
    'pCylinder434', 'pCylinder433', 'polySurface157', 'pCube494', 'polySurface156', 'pCylinder432',
    'pCylinder431', 'pCylinder430', 'pCylinder429', 'pCylinder428', 'polySurface66',
    'pHelix12',
  ],
  // Piston 4 (30 parts)
  [
    'pCylinder356', 'pCylinder357', 'pCube463', 'pCylinder355', 'pCylinder354', 'pHelix9',
    'polySurface90', 'pCube462', 'polySurface140', 'pCylinder427', 'polySurface91', 'polySurface89',
    'polySurface142', 'polySurface141', 'pCylinder426', 'pCylinder425', 'pCylinder423', 'pCylinder424',
    'pCylinder422', 'pCylinder421', 'polySurface155', 'pCube493', 'polySurface154', 'pCylinder420',
    'pCylinder419', 'pCylinder418', 'pCylinder417', 'pCylinder416', 'polySurface68',
    'pHelix10',
  ],
  // Piston 5 (30 parts)
  [
    'pCylinder351', 'pCylinder352', 'pCube460', 'pCylinder350', 'pCylinder349', 'pHelix7',
    'polySurface87', 'pCube459', 'polySurface138', 'pCylinder415', 'polySurface88', 'polySurface86',
    'polySurface139', 'polySurface137', 'pCylinder414', 'pCylinder413', 'pCylinder411', 'pCylinder412',
    'pCylinder410', 'pCylinder409', 'polySurface153', 'pCube492', 'polySurface152', 'pCylinder408',
    'pCylinder407', 'pCylinder406', 'pCylinder405', 'pCylinder404', 'polySurface70',
    'pHelix8',
  ],
  // Piston 6 (30 parts)
  [
    'pCylinder176', 'pCylinder185', 'pCube390', 'pCylinder173', 'pCylinder177', 'pHelix2',
    'polySurface32', 'pCube395', 'polySurface134', 'pCylinder181', 'polySurface33', 'polySurface31',
    'polySurface136', 'polySurface135', 'pCylinder182', 'pCylinder184', 'pCylinder183', 'pCylinder189',
    'pCylinder190', 'pCylinder191', 'polySurface34', 'pCube400', 'polySurface35', 'polySurface72',
    'pCylinder204', 'pCylinder197', 'pCylinder200', 'pCylinder202', 'pCylinder203',
    'pHelix3',
  ],
  // Piston 7 (26 parts)
  [
    'pCylinder372', 'pCube472', 'polySurface99', 'pCube471', 'polySurface131', 'pCylinder475',
    'polySurface100', 'polySurface98', 'polySurface133', 'polySurface132', 'pCylinder474', 'pCylinder473',
    'pCylinder471', 'pCylinder472', 'pCylinder470', 'pCylinder469', 'polySurface163', 'pCube497',
    'polySurface162', 'pCylinder468', 'pCylinder467', 'pCylinder466', 'pCylinder465', 'pCylinder464',
    'polySurface74',
    'pHelix36',
  ],
  // Piston 8 (30 parts)
  [
    'pCylinder376', 'pCylinder377', 'pCube475', 'pCylinder375', 'pCylinder374', 'pHelix17',
    'polySurface102', 'pCube474', 'polySurface129', 'pCylinder487', 'polySurface103', 'polySurface101',
    'polySurface130', 'polySurface128', 'pCylinder486', 'pCylinder485', 'pCylinder483', 'pCylinder484',
    'pCylinder482', 'pCylinder481', 'polySurface165', 'pCube498', 'polySurface164', 'pCylinder480',
    'pCylinder479', 'pCylinder478', 'pCylinder477', 'pCylinder476', 'polySurface76',
    'pHelix18',
  ],
  // Piston 9 (30 parts)
  [
    'pCylinder381', 'pCylinder382', 'pCube478', 'pCylinder380', 'pCylinder379', 'pHelix19',
    'polySurface105', 'pCube477', 'polySurface125', 'pCylinder499', 'polySurface106', 'polySurface104',
    'polySurface127', 'polySurface126', 'pCylinder498', 'pCylinder497', 'pCylinder495', 'pCylinder496',
    'pCylinder494', 'pCylinder493', 'polySurface167', 'pCube499', 'polySurface166', 'pCylinder492',
    'pCylinder491', 'pCylinder490', 'pCylinder489', 'pCylinder488', 'polySurface78',
    'pHelix20',
  ],
  // Piston 10 (30 parts)
  [
    'pCylinder386', 'pCylinder387', 'pCube481', 'pCylinder385', 'pCylinder384', 'pHelix21',
    'polySurface108', 'pCube480', 'polySurface123', 'pCylinder511', 'polySurface109', 'polySurface107',
    'polySurface124', 'polySurface122', 'pCylinder510', 'pCylinder509', 'pCylinder507', 'pCylinder508',
    'pCylinder506', 'pCylinder505', 'polySurface169', 'pCube500', 'polySurface168', 'pCylinder504',
    'pCylinder503', 'pCylinder502', 'pCylinder501', 'pCylinder500', 'polySurface80',
    'pHelix22',
  ],
  // Piston 11 (30 parts)
  [
    'pCylinder391', 'pCylinder392', 'pCube484', 'pCylinder390', 'pCylinder389', 'pHelix23',
    'polySurface111', 'pCube483', 'polySurface119', 'pCylinder523', 'polySurface112', 'polySurface110',
    'polySurface120', 'polySurface121', 'pCylinder522', 'pCylinder521', 'pCylinder519', 'pCylinder520',
    'pCylinder518', 'pCylinder517', 'polySurface171', 'pCube501', 'polySurface170', 'pCylinder516',
    'pCylinder515', 'pCylinder514', 'pCylinder513', 'pCylinder512', 'polySurface82',
    'pHelix24',
  ],
  // Piston 12 (30 parts)
  [
    'pCylinder396', 'pCylinder397', 'pCube487', 'pCylinder395', 'pCylinder394', 'pHelix25',
    'polySurface114', 'pCube486', 'polySurface26', 'pCylinder535', 'polySurface115', 'polySurface113',
    'polySurface27', 'polySurface30', 'pCylinder534', 'pCylinder533', 'pCylinder531', 'pCylinder532',
    'pCylinder530', 'pCylinder529', 'polySurface173', 'pCube502', 'polySurface172', 'pCylinder528',
    'pCylinder527', 'pCylinder526', 'pCylinder525', 'pCylinder524', 'polySurface84',
    'pHelix26',
  ],
]

/** Picked with piston 1 but spans all of them. */
export const PISTON_SHARED_PARTS = ['polySurface335']
