// gen_hulls.mjs: builds each boat's section stack from its data (boats_def.mjs) with the h4 section code
// (section.mjs, unchanged) and writes the per-station tables the run-time model needs. Offline only.
import fs from 'fs';
import { swayAddedMass, edgeRadiusOverDraft, draft } from './section.mjs';
import { BOATS, DELFT_KK08 } from './boats_def.mjs';

const K_SHARP = 0.1; // h1/h2 sharpness constant (Delany and Sorensen; Hoerner)
const foilShape = (c) => (c <= 0 || c >= 1 ? 0 : 2.598 * Math.sqrt(c) * (1 - c));
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
function sectionAt(def, x) {
  const xi = Math.min(1, Math.max(0, x / def.L)), f = 4 * xi * (1 - xi);
  const c = { kind: 'ellipse', b: def.canoe.halfBeam * Math.pow(f, 0.65), Tc: def.canoe.depth * f };
  let best = null, turning = 0;
  for (const bl of def.blades) {
    const b = bladeAt(x, bl, c.b > 1e-9 ? c.Tc : 0);
    if (b && (!best || b.Tk > best.Tk)) { best = b; turning = bl.turnsFrom === undefined ? 0 : Math.min(1, Math.max(0, (x - bl.turnsFrom) / Math.max(1e-9, bl.turnsFully - bl.turnsFrom)));
      // r1-rudder: only the blade turns, not the canoe body above it: the turning share of the section is the blade's share of its depth
      const Tc = c.b > 1e-9 ? c.Tc : 0; turning *= Math.max(0, b.Tk - Tc) / b.Tk; }
  }
  return { spec: { ...c, blade: best }, turning };
}
function delftCurve(h) {
  // Keuning and Katgert 2008, a0 outside the bracket (research note dsyhs-hboat section 2.1)
  const v13 = Math.cbrt(h.volc);
  return DELFT_KK08.map(([Fn, a0, a1, a2, a3, a4, a5, a6, a7]) => [Fn, a0 + (a1 * h.LCBfpp / h.LWL + a2 * h.Cp + a3 * v13 * v13 / h.Aw + a4 * h.BWL / h.LWL + a5 * h.LCBfpp / h.LCFfpp + a6 * h.BWL / h.Tc + a7 * h.Cm) * v13 / h.LWL]);
}
const out = {};
for (const def of BOATS) {
  const n = 129, dx = def.L / (n - 1), A = [], T = [], sharp = [], rud = [], hb = [], cd = [], girth = [];
  const cache = new Map();
  for (let i = 0; i < n; i++) {
    const { spec, turning } = sectionAt(def, i * dx);
    const key = JSON.stringify(spec, (k, v) => (typeof v === 'number' ? Number(v.toPrecision(5)) : v));
    if (!cache.has(key)) cache.set(key, swayAddedMass(spec));
    A.push(cache.get(key)); T.push(draft(spec)); const q = edgeRadiusOverDraft(spec); sharp.push(Number.isFinite(q) ? Math.exp(-q / K_SHARP) : 0);
    rud.push(turning); hb.push(spec.b); cd.push(spec.b > 1e-9 ? spec.Tc : 0);
    const hasCanoe = spec.b > 1e-9 && spec.Tc > 1e-9; let g = 0;
    if (hasCanoe) { const a = spec.b, b = spec.Tc; g += 0.5 * Math.PI * (3 * (a + b) - Math.sqrt((3 * a + b) * (a + 3 * b))); }
    if (spec.blade && spec.blade.Tk > (hasCanoe ? spec.Tc : 0)) g += 2 * (spec.blade.Tk - (hasCanoe ? spec.Tc : 0)) + 2 * spec.blade.hk;
    girth.push(g);
  }
  let wetted = 0; for (let i = 1; i < n; i++) wetted += 0.5 * (girth[i] + girth[i - 1]) * dx;
  const r5 = (a) => a.map((v) => +v.toFixed(5));
  const { blades, canoe, ...rest } = def;
  out[def.key] = { ...rest, n, dx, A: r5(A), T: r5(T), sharp: r5(sharp), rud: r5(rud), halfBeam: r5(hb), canoeDepth: r5(cd), wetted: +wetted.toFixed(3), delftRr: delftCurve(def.hydro).map(([f, v]) => [f, +v.toFixed(6)]), blades };
  console.log(def.key, 'wetted', wetted.toFixed(2), 'Rr/weight', out[def.key].delftRr.map((q) => q[1].toFixed(4)).join(' '));
}
fs.writeFileSync(new URL('./out/hulls.json', import.meta.url), JSON.stringify(out));
