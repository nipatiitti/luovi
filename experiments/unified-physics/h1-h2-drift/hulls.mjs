// hulls.mjs
// The test bodies as stacks of sections, and the precompute that turns a stack into the
// three numbers per station the slice law needs (added mass, draft, edge radius over draft).
//
// x runs from the bow end of the waterline (0) aft to the stern end (L). Dimensions in metres.
// The yacht shapes are "-like": built from main particulars, not from lines plans.

import { swayAddedMass, edgeRadiusOverDraft, draft, outline } from './section.mjs';

const cache = new Map();
function addedMassCached(spec) {
  const key = JSON.stringify(spec, (k, v) => (typeof v === 'number' ? Number(v.toPrecision(5)) : v));
  if (!cache.has(key)) cache.set(key, swayAddedMass(spec));
  return cache.get(key);
}

/** Turn a body description { L, sectionAt(x) } into station arrays for the slice law. */
export function precompute(desc, nStations = 121) {
  const x = [], A = [], T = [], rOverT = [], specs = [];
  for (let i = 0; i < nStations; i++) {
    const xi = (desc.L * i) / (nStations - 1);
    const spec = desc.sectionAt(xi);
    x.push(xi); specs.push(spec);
    A.push(addedMassCached(spec));
    T.push(draft(spec));
    rOverT.push(edgeRadiusOverDraft(spec));
  }
  return { name: desc.name, L: desc.L, x, A, T, rOverT, specs, Tmax: Math.max(...T) };
}

/** Profile of a body from the side, for drawing: [x, depth] of canoe and of blade. */
export function profile(body) {
  return body.specs.map((s, i) => ({ x: body.x[i], b: s.b, canoe: s.b > 1e-9 ? s.Tc : 0, total: body.T[i] }));
}
export { outline };

// ---- shape helpers -------------------------------------------------------------------------

/** Round-bilge canoe body: elliptical sections, breadth and depth following power laws. */
function canoe(L, bMax, Tc, pb = 0.65, pT = 1.0) {
  return (x) => {
    const xi = Math.min(1, Math.max(0, x / L));
    const f = 4 * xi * (1 - xi);
    return { kind: 'ellipse', b: bMax * Math.pow(f, pb), Tc: Tc * Math.pow(f, pT) };
  };
}

/** Foil-like half thickness along a chord fraction c in [0, 1], peak 1 at one third chord. */
const foilShape = (c) => (c <= 0 || c >= 1 ? 0 : 2.598 * Math.sqrt(c) * (1 - c));

/**
 * A blade given by its four corners in profile (trapezoid): leading and trailing edge at the
 * root (hull) and at the tip (lower edge), tip depth below the waterline, maximum half
 * thickness, and the radius of the lower edge (null = rounded like a foil tip, i.e. equal to
 * the local half thickness).
 */
function bladeAt(x, bl, canoeDepth) {
  const { leRoot, leTip, teTip, teRoot, depth, halfThick, edgeRadius = null } = bl;
  if (x <= leRoot || x >= teRoot) return null;
  let d = depth;
  if (x < leTip) d = canoeDepth + ((depth - canoeDepth) * (x - leRoot)) / (leTip - leRoot);
  else if (x > teTip) d = canoeDepth + ((depth - canoeDepth) * (teRoot - x)) / (teRoot - teTip);
  if (d <= canoeDepth + 1e-6) return null;
  const hk = Math.max(1e-4, halfThick * foilShape((x - leRoot) / (teRoot - leRoot)));
  return { Tk: d, hk, rk: edgeRadius === null ? hk : Math.min(hk, edgeRadius) };
}

function withBlades(L, name, canoeFn, blades) {
  return {
    name, L, blades,
    sectionAt(x) {
      const c = canoeFn(x);
      let best = null;
      for (const bl of blades) {
        const b = bladeAt(x, bl, c.b > 1e-9 ? c.Tc : 0);
        if (b && (!best || b.Tk > best.Tk)) best = b;
      }
      return { ...c, blade: best };
    },
  };
}

// ---- the bodies ----------------------------------------------------------------------------

const YACHT_L = 6.3; // waterline length of both keelboats [m]
const yachtCanoe = canoe(YACHT_L, 0.9, 0.42);
const RUDDER = { leRoot: 5.72, leTip: 5.76, teTip: 6.1, teRoot: 6.14, depth: 0.95, halfThick: 0.022 };

/** Keel of the morph family: m = 0 is the fin, m = 1 the long keel that reaches the rudder. */
export function morphKeel(m) {
  const mix = (a, b) => a + (b - a) * m;
  return {
    leRoot: mix(2.45, 1.3), leTip: mix(2.75, 3.3), teTip: mix(3.8, 5.6), teRoot: mix(3.9, 5.74),
    depth: 1.3, halfThick: mix(0.065, 0.09),
  };
}

/** H-boat-like: shallow round canoe body, separate fin keel and separate rudder. */
export const finKeelBoat = () =>
  withBlades(YACHT_L, 'Fin keel (H-boat-like)', yachtCanoe, [morphKeel(0), RUDDER]);

/** Folkboat-like: same canoe body, keel faired in from the forefoot, rudder on its aft edge. */
export const longKeelBoat = () =>
  withBlades(YACHT_L, 'Long keel (Folkboat-like)', yachtCanoe, [
    { leRoot: 1.2, leTip: 4.3, teTip: 4.85, teRoot: 5.3, depth: 1.2, halfThick: 0.09, edgeRadius: 0.012 },
  ]);

/** One step of the keel morph (H2b). The rudder stays where it is. */
export const morphBoat = (m) =>
  withBlades(YACHT_L, `morph ${m.toFixed(1)}`, yachtCanoe, [morphKeel(m), RUDDER]);

/**
 * Delft Systematic Yacht Hull Series, Sysser 1, at model scale (waterline 1.6 m) with the
 * series' standard keel and rudder. Canoe body from main particulars (BWL 0.507, Tc 0.127,
 * Cp 0.57) with elliptical sections; keel and rudder planforms from Keuning and Sonnenberg
 * 1998 (root 0.414, tip 0.262, span 0.219, 45 degree sweep; rudder 0.124, 0.096, 0.266),
 * positions from the dataset (keel leading edge 1.083 m, rudder 0.124 m ahead of ordinate 0).
 */
export const delftSysser1 = () => {
  const L = 1.6;
  const c = canoe(L, 0.2535, 0.127, 0.65, 1.0);
  const keel = { leRoot: 0.517, leTip: 0.774, teTip: 1.036, teRoot: 0.931, depth: 0.127 + 0.219, halfThick: 0.075 * 0.34 };
  // the swept trailing edge runs aft from root to tip; the slice law needs depth as a function
  // of x, so the tip trailing edge is taken as the end of the blade
  keel.teRoot = 1.04; keel.teTip = 1.03;
  const rudder = { leRoot: 1.476, leTip: 1.49, teTip: 1.585, teRoot: 1.6, depth: 0.266 + 0.02, halfThick: 0.06 * 0.11 };
  return withBlades(L, 'Delft Sysser 1 (tank model)', c, [keel, rudder]);
};

/**
 * KVLCC2-like tanker from main particulars only (L 320, B 58, T 20.8, bilge radius 2.37 m
 * from the midship coefficient 0.998), scaled to L = 1. Bow: full-depth U sections. Stern:
 * the hull rises and narrows above a thin centreline skeg that keeps full draft to 96% of L.
 * A caricature of the lines, not the lines.
 */
export const tankerLike = () => {
  const L = 1, bMax = 29 / 320, T = 20.8 / 320, rb = 2.37 / 320;
  return {
    name: 'Tanker (KVLCC2-like)', L,
    sectionAt(x) {
      const xi = x / L;
      let b = bMax, Th = T;
      if (xi < 0.18) b = bMax * Math.sqrt(Math.max(0, 1 - Math.pow(1 - xi / 0.18, 2)));
      if (xi > 0.68) b = bMax * (1 - 0.92 * Math.pow((xi - 0.68) / 0.32, 2));
      if (xi > 0.8) Th = T * (1 - 0.55 * Math.pow((xi - 0.8) / 0.2, 1.5));
      const skegDepth = xi > 0.8 && xi < 0.985 ? (xi < 0.955 ? T : Th + ((T - Th) * (0.985 - xi)) / 0.03) : 0;
      const hk = 0.03 * T * Math.min(1, (0.985 - xi) / 0.1 + 0.05);
      const blade = skegDepth > Th + 1e-6 ? { Tk: skegDepth, hk, rk: hk } : null;
      if (b < 1e-6) return { kind: 'box', b: 0, Tc: 0, rb: 0, blade: null };
      return { kind: 'box', b, Tc: Th, rb: Math.min(rb, b, Th), blade };
    },
  };
};

/** Flat plate under the lid: depth T, chord c. With its mirror image the aspect ratio is 2T/c. */
export const plate = (T, chord) => ({
  name: `plate AR ${(2 * T / chord).toFixed(2)}`, L: chord,
  sectionAt: (x) => (x <= 0 || x >= chord
    ? { kind: 'ellipse', b: 0, Tc: 0, blade: null }
    : { kind: 'ellipse', b: 0, Tc: 0, blade: { Tk: T, hk: 1e-4, rk: 1e-4 } }),
});
