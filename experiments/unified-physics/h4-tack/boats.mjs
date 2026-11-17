// boats.mjs
// The boats of experiment H4: a hull stack from hulls.mjs (untouched), which stations turn
// with the rudder, and the mass, stability and rig numbers. The two test boats share every
// number here except the underwater shape.
import { precompute, finKeelBoat, longKeelBoat, morphBoat } from './hulls.mjs';
import { makeHullTable } from './sim.mjs';

/** Same for both boats of the test pair. */
export const COMMON = {
  mass: 1450,     // [kg] H-boat displacement (ORC one-design certificate, via note F)
  kYaw: 1.9,      // [m] yaw radius of gyration, about a quarter of the length overall (assumed)
  kRoll: 1.0,     // [m] roll radius of gyration including the rig (assumed)
  GM: 1.0,        // [m] metacentric height (assumed; gives about 15 degrees of heel in 12 knots)
  xcg: 3.28,      // [m] centre of gravity aft of the bow end of the waterline (52% of length)
  rig: { area: 24, ceHeight: 4.0, ceX: 2.85 }, // [m^2], [m above waterline], [m aft of bow]
};

const ramp = (x, a, b) => Math.min(1, Math.max(0, (x - a) / (b - a)));
/** Separate rudder: the whole blade turns. */
const spadeRudder = (x) => (x > 5.72 && x < 6.14 ? 1 : 0);
/** Rudder on the keel's raked trailing edge: the last 0.45 m of every waterline of the blade. */
const keelHungRudder = (x) => (x >= 5.3 ? 0 : ramp(x, 4.4, 4.85));

const cache = new Map();
function table(key, desc, rud) {
  if (!cache.has(key)) cache.set(key, makeHullTable(precompute(desc), rud));
  return cache.get(key);
}

export const finBoat = (over = {}) => ({
  ...COMMON, key: 'fin', name: 'Fin keel, separate rudder (H-boat-like)',
  table: table('fin', finKeelBoat(), spadeRudder), rudderX: [5.72, 6.14], keelX: [2.45, 3.9], ...over,
});
export const longBoat = (over = {}) => ({
  ...COMMON, key: 'long', name: 'Long keel, rudder on its aft edge (Folkboat-like)',
  table: table('long', longKeelBoat(), keelHungRudder), rudderX: [4.4, 5.3], keelX: [1.2, 5.3], ...over,
});
/** Keel morph of the steady experiment: 0 = fin, 1 = keel reaching the (still separate) rudder. */
export const morph = (m, over = {}) => ({
  ...COMMON, key: `morph${m}`, name: `morph ${m.toFixed(2)}`,
  table: table(`morph${m}`, morphBoat(m), spadeRudder), rudderX: [5.72, 6.14],
  keelX: [2.45 + (1.3 - 2.45) * m, 3.9 + (5.74 - 3.9) * m], ...over,
});

/**
 * Second pair, labelled: the same two underwater shapes with each class's own weight, sail
 * area and stiffness. Figures from memory of the class rules, not looked up in this run:
 * H-boat 1450 kg, 24.5 m^2; International Folkboat about 2150 kg, 26 m^2, ballast 1250 kg.
 */
export const hBoatReal = () => finBoat({ key: 'finReal', name: 'H-boat-like, class weight', mass: 1450, rig: { ...COMMON.rig, area: 24.5 } });
export const ifBoatReal = () => longBoat({ key: 'longReal', name: 'IF-like, class weight', mass: 2150, GM: 0.95, rig: { ...COMMON.rig, area: 26, ceHeight: 3.8 } });
