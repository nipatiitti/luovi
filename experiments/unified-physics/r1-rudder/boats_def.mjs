// boats_def.mjs: the two boats as DATA. Nothing downstream branches on which boat it is.
// Flags: [ORC] ORC 2026 club certificate / 2020 OD certificate via research notes hboat-polar-target and
// ship-definition-shape; [DSY] research note dsyhs-hboat section 5.1 (sailing condition); [GOB] goodoldboat.com
// saildata "International Folkboat" (fetched 2026-11-17); [est] my estimate; [h4] taken from the h4 stack.
export const BOATS = [
  {
    key: 'hboat', name: 'H-boat', short: 'H-boat (fin keel, separate rudder)',
    L: 6.38,                       // waterline length, sailing trim [DSY 6.381]
    loa: 8.28, beam: 2.19, bowOverhang: 0.85, // [ORC LOA, MB]; overhang split [est]
    canoe: { halfBeam: 0.92, depth: 0.324 }, // BWL 1.84 [DSY]; ellipse depth = Tc 0.457 x Cm 0.556 / 0.785 so the area is right
    blades: [
      { name: 'keel', leRoot: 2.35, leTip: 3.05, teTip: 3.95, teRoot: 4.15, depth: 1.31, halfThick: 0.075 }, // draft [DSY 1.312]; planform [est], lateral area about 1.2 m2
      { name: 'skeg', leRoot: 5.05, leTip: 5.55, teTip: 5.90, teRoot: 5.92, depth: 0.60, halfThick: 0.03 },   // [est] from wetted 0.47 m2, chord 0.9 [DSY sec 7]
      { name: 'rudder', leRoot: 5.92, leTip: 5.95, teTip: 6.27, teRoot: 6.30, depth: 0.95, halfThick: 0.011, turnsFrom: 5.92, turnsFully: 5.921 }, // chord 0.37, wetted 0.645 m2 [DSY sec 7]; depth [est]
    ],
    mass: 1869,                    // sailing displacement with crew [ORC feed]
    crewMass: 300, crewYMax: 1.09, // class crew limit [ORC/class rule 4.1]; crew on the rail = half max beam, no hiking
    GM: 0.77,                      // [est] BM from waterplane (inertia coefficient 0.045) and ORC VCG -0.12 m, crew at deck
    kYaw: 2.07, kRoll: 1.0,        // quarter of LOA; roll with rig [h4 assumptions]
    xcg: 3.26,                     // LCB 51.1% of LWL [DSY]
    hydro: { LWL: 6.381, BWL: 1.840, Tc: 0.457, volc: 1.594, Aw: 7.854, Cp: 0.534, Cm: 0.556, LCBfpp: 0.5109 * 6.381, LCFfpp: 0.5324 * 6.381 }, // [DSY]
    rig: { mastX: 1.92, freeboard: 0.7, P: 8.70, E: 3.00, BAS: 0.90, I: 7.94, J: 2.47, mainArea: 15.85, jibArea: 10.48 }, // [ORC]; mastX, freeboard [est]
    tillerMaxDeg: 60,              // owner: an H-boat tiller goes to 50 or 60 degrees
  },
  {
    key: 'ifboat', name: 'Folkboat', short: 'International Folkboat (long keel, rudder on the keel)',
    L: 6.03,                       // LWL 19.78 ft [GOB]
    loa: 7.85, beam: 2.25, bowOverhang: 0.80, // LOA 25.75 ft, beam 7.38 ft [GOB]; split [est]
    canoe: { halfBeam: 0.93, depth: 0.385 }, // BWL 1.86 [est 0.83 of beam]; depth so that canoe volume is 1.95 m3 [est]
    blades: [
      { name: 'keel', leRoot: 1.15, leTip: 4.12, teTip: 4.64, teRoot: 5.07, depth: 1.21, halfThick: 0.09, edgeRadius: 0.012, turnsFrom: 4.21, turnsFully: 4.64 }, // draft 3.97 ft [GOB]; profile = h4 long keel scaled to this length; the last 0.43 m turns
    ],
    mass: 2390,                    // 4740 lb = 2150 kg [GOB] + crew
    crewMass: 240, crewYMax: 1.12, // three at 80 kg [est]
    GM: 0.63,                      // [est] same method; VCG -0.22 m assumed (ballast 1250 kg, from memory)
    kYaw: 1.96, kRoll: 1.0,
    xcg: 3.08,
    hydro: { LWL: 6.03, BWL: 1.86, Tc: 0.55, volc: 1.95, Aw: 7.51, Cp: 0.55, Cm: 0.575, LCBfpp: 0.5109 * 6.03, LCFfpp: 0.5324 * 6.03 }, // all [est] from main dimensions
    rig: { mastX: 1.95, freeboard: 0.7, P: 8.75, E: 3.40, BAS: 0.90, I: 7.885, J: 2.50, mainArea: 15.3, jibArea: 10.5 }, // I J P E, areas 164 and 113 ft2 [GOB]
    tillerMaxDeg: 60,
  },
];
// Keuning and Katgert 2008 upright bare-hull residuary coefficients, Fn then a0..a7 (research note dsyhs-hboat 2.1)
export const DELFT_KK08 = [
  [0.15, -0.0005, 0.0023, -0.0086, -0.0015, 0.0061, 0.0010, 0.0001, 0.0052],
  [0.20, -0.0003, 0.0059, -0.0064, 0.0070, 0.0014, 0.0013, 0.0005, -0.0020],
  [0.25, -0.0002, -0.0156, 0.0031, -0.0021, -0.0070, 0.0148, 0.0010, -0.0043],
  [0.30, -0.0009, 0.0016, 0.0337, -0.0285, -0.0367, 0.0218, 0.0015, -0.0172],
  [0.35, -0.0026, -0.0567, 0.0446, -0.1091, -0.0707, 0.0914, 0.0021, -0.0078],
  [0.40, -0.0064, -0.4034, -0.1250, 0.0273, -0.1341, 0.3578, 0.0045, 0.1115],
  [0.45, -0.0218, -0.5261, -0.2945, 0.2485, -0.2428, 0.6293, 0.0081, 0.2086],
  [0.50, -0.0388, -0.5986, -0.3038, 0.6033, -0.0430, 0.8332, 0.0106, 0.1336],
  [0.55, -0.0347, -0.4764, -0.2361, 0.8726, 0.4219, 0.8990, 0.0096, -0.2272],
  [0.60, -0.0361, 0.0037, -0.2960, 0.9661, 0.6123, 0.7534, 0.0100, -0.3352],
  [0.65, 0.0008, 0.3728, -0.3667, 1.3957, 1.0343, 0.3230, 0.0072, -0.4632],
  [0.70, 0.0108, -0.1238, -0.2026, 1.1282, 1.1836, 0.4973, 0.0038, -0.4477],
  [0.75, 0.1023, 0.7726, 0.5040, 1.7867, 2.1934, -1.5479, -0.0115, -0.0977],
];
