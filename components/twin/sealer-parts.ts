/**
 * Front vertical sealer parts in Machine.glb, by raw node name without the
 * `Machine Part | Machine_` prefix.
 *
 * Sealer 1 is the one picked by hand; sealers 2–13 were found by matching each
 * of its parts to the same-sized part shifted one sealer pitch (~53 mm) along
 * the bar, numbered left to right from the front. Vertex counts differ between
 * copies (the model was simplified), so the match is by bounding box, not mesh.
 */
export const SEALER_PARTS: string[][] = [
  // Sealer 1
  ['DG24221', 'AWF220', 'BOLTX104210', 'BOLTX105208', 'SF209', 'BOLTX218', 'D20211', 'D19216', 'Socket_Screw201219', 'BOLTX109213', 'BOLTX110214', 'SF86215', 'BOLTX108217', 'AWf212'],
  // Sealer 2
  ['DG24207', 'AWF206', 'BOLTX104196', 'BOLTX105194', 'SF195', 'BOLTX204', 'D20197', 'D19202', 'Socket_Screw201205', 'BOLTX109199', 'BOLTX110200', 'SF86201', 'BOLTX108203', 'AWf198'],
  // Sealer 3
  ['DG24193', 'AWF192', 'BOLTX104182', 'BOLTX105180', 'SF181', 'BOLTX190', 'D20183', 'D19188', 'Socket_Screw201191', 'BOLTX109185', 'BOLTX110186', 'SF86187', 'BOLTX108189', 'AWf184'],
  // Sealer 4
  ['DG24179', 'AWF178', 'BOLTX104168', 'BOLTX105166', 'SF167', 'BOLTX176', 'D20169', 'D19174', 'Socket_Screw201177', 'BOLTX109171', 'BOLTX110172', 'SF86173', 'BOLTX108175', 'AWf170'],
  // Sealer 5
  ['DG24165', 'AWF164', 'BOLTX104154', 'BOLTX105152', 'SF153', 'BOLTX162', 'D20155', 'D19160', 'Socket_Screw201163', 'BOLTX109157', 'BOLTX110158', 'SF86159', 'BOLTX108161', 'AWf156'],
  // Sealer 6
  ['DG24151', 'AWF150', 'BOLTX104140', 'BOLTX105138', 'SF139', 'BOLTX148', 'D20141', 'D19146', 'Socket_Screw201149', 'BOLTX109143', 'BOLTX110144', 'SF86145', 'BOLTX108147', 'AWf142'],
  // Sealer 7
  ['DG24137', 'AWF136', 'BOLTX104126', 'BOLTX105124', 'SF125', 'BOLTX134', 'D20127', 'D19132', 'Socket_Screw201135', 'BOLTX109129', 'BOLTX110130', 'SF86131', 'BOLTX108133', 'AWf128'],
  // Sealer 8
  ['DG24123', 'AWF122', 'BOLTX104112', 'BOLTX105110', 'SF111', 'BOLTX120', 'D20113', 'D19118', 'Socket_Screw201121', 'BOLTX109115', 'BOLTX110116', 'SF86117', 'BOLTX108119', 'AWf114'],
  // Sealer 9
  ['DG24109', 'AWF108', 'BOLTX10498', 'BOLTX10596', 'SF97', 'BOLTX106', 'D2099', 'D19104', 'Socket_Screw201107', 'BOLTX109101', 'BOLTX110102', 'SF86103', 'BOLTX108105', 'AWf100'],
  // Sealer 10
  ['DG2495', 'AWF94', 'BOLTX10484', 'BOLTX10582', 'SF83', 'BOLTX92', 'D2085', 'D1990', 'Socket_Screw20193', 'BOLTX10987', 'BOLTX11088', 'SF8689', 'BOLTX10891', 'AWf86'],
  // Sealer 11
  ['DG2481', 'AWF80', 'BOLTX10470', 'BOLTX10568', 'SF69', 'BOLTX78', 'D2071', 'D1976', 'Socket_Screw20179', 'BOLTX10973', 'BOLTX11074', 'SF8675', 'BOLTX10877', 'AWf72'],
  // Sealer 12
  ['DG2467', 'AWF66', 'BOLTX10456', 'BOLTX10554', 'SF55', 'BOLTX64', 'D2057', 'D1962', 'Socket_Screw20165', 'BOLTX10959', 'BOLTX11060', 'SF8661', 'BOLTX10863', 'AWf58'],
  // Sealer 13
  ['DG24', 'AWF53', 'BOLTX104', 'BOLTX105', 'SF52', 'BOLTX', 'D20', 'D19', 'Socket_Screw201', 'BOLTX109', 'BOLTX110', 'SF86', 'BOLTX108', 'AWf'],
]

/** Bar and end brackets carrying all 13 sealers. */
export const SEALER_BAR_PARTS = ['SHL', 'D15', 'D16', 'SD2', 'DGS1', 'GD', 'DG23', 'DG16']

/**
 * Rear vertical sealers, facing the front ones across the film. Sealer 1 was
 * picked by hand; the rest matched by bounding box at the same pitch, numbered
 * as the front sealer in the same lane.
 */
export const REAR_SEALER_PARTS: string[][] = [
  // Rear sealer 1
  ['saf248', 'Socket_Screw13250', 'FS249'],
  // Rear sealer 2
  ['saf1245', 'Socket_Screw13247', 'FS246'],
  // Rear sealer 3
  ['saf2242', 'Socket_Screw13244', 'FS243'],
  // Rear sealer 4
  ['saf3', 'Socket_Screw13241', 'FS240'],
  // Rear sealer 5
  ['saf4', 'Socket_Screw13239', 'FS238'],
  // Rear sealer 6
  ['saf5', 'Socket_Screw13237', 'FS236'],
  // Rear sealer 7
  ['saf6', 'Socket_Screw13235', 'FS234'],
  // Rear sealer 8
  ['saf7', 'Socket_Screw13233', 'FS232'],
  // Rear sealer 9
  ['saf8', 'Socket_Screw13231', 'FS230'],
  // Rear sealer 10
  ['saf17', 'Socket_Screw13229', 'FS228'],
  // Rear sealer 11
  ['saf16', 'Socket_Screw13227', 'FS226'],
  // Rear sealer 12
  ['saf15', 'Socket_Screw13225', 'FS224'],
  // Rear sealer 13
  ['saf12', 'Socket_Screw13', 'FS'],
]

/** Bar and fittings carrying all 13 rear sealers. */
export const REAR_SEALER_BAR_PARTS = ['ASF2', 'R_BOX', 'Socket_Screw204', 'Socket_Screw205', 'Socket_Screw214']

/**
 * Film drive rollers, one per lane, left to right — the puller/web-feed
 * assembly the Laminate Jamming model's current sensor watches.
 */
export const ROLLER_PARTS = [
  'ASF31', 'ASF14', 'ASF28', 'ASF27', 'ASF29', 'ASF30',
  'ASF34', 'ASF32', 'ASF36', 'ASF37', 'ASF35', 'ASF33',
]

/**
 * Front horizontal sealer, picked by hand. It closes in step with the front
 * vertical sealers. `A1` and `B2` were in the pick but are left out: they are
 * the 1.5 m side frame panels of the machine, not part of the sealer.
 */
export const FRONT_HORIZONTAL_SEALER_PARTS = [
  'SG1156', 'AF10', 'AF12', 'AF13', 'Socket_Screw170', 'Socket_Screw178', 'Socket_Screw182',
  'Socket_Screw167', 'AF20', 'Socket_Screw179', 'AF11', 'Socket_Screw183', 'Socket_Screw169',
  'SG13', 'SG12', 'F45', 'Socket_Screw165', 'Socket_Screw166', 'SG15', 'BOLTX97', 'D10', 'D17',
  'SD', 'SF79', 'SG18', 'SF83_1', 'R_BOX1', 'BOLTX102', 'BOLTX100', 'BOLTX99', 'BOLTX96', 'R_BOX3',
  'Socket_Screw168', 'SG14', 'SF84', 'DG22', 'BOLTX98', 'BOLTX101', 'SF81', 'pCube661', 'SF80',
  'BOLTX138', 'R_BOX2', 'BOLTX139', 'pCube715', 'SF85', 'R_BOX1158', 'Socket_Screw180', 'AFS',
  'AF37', 'SF1160', 'Socket_Screw162', 'pCube716', 'Socket_Screw324', 'BOLTX137',
  'Socket_Screw161', 'F1157', 'Socket_Screw181', 'Socket_Screw160', 'Socket_Screw159', 'pCube662',
  'AF35', 'B1174', 'Seel31173', 'polySurface11168', 'Seel41167', 'polySurface21169',
  'Socket_Screw51166', 'Socket_Screw21164', 'Socket_Screw11163', 'SDG1159', 'Socket_Screw163',
  'Socket_Screw164', 'polySurface11175', 'pCube754', 'DSG1161', 'Seel21177', 'Socket_Screw21181',
  'Socket_Screw11180', 'Socket_Screw51178', 'Socket_Screw1179',
]

/**
 * Rear horizontal sealer, picked by hand; closes against the front one. `A1`
 * was in the pick but is left out — it is the machine's side frame panel.
 */
export const REAR_HORIZONTAL_SEALER_PARTS = [
  'R_BOX1149', 'SDG71150', 'AF43', 'Seel4', 'Socket_Screw1', 'Socket_Screw2', 'B1146',
  'Socket_Screw', 'Socket_Screw5', 'Seel3', 'Seel2', 'Socket_Screw11143', 'Socket_Screw21144',
  'Socket_Screw1142', 'R_BOX41151',
]
