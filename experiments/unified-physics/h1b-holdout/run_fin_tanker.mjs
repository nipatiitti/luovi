// run_fin_tanker.mjs
// (a) An isolated fin through stall, frozen model and the "attachment drop" addition, against
//     Whicker and Fehlner's low-aspect-ratio rudder series (DTMB report 933, 1958).
// (b) The keel morph and the plate sweep repeated with the addition, to see whether it brings
//     back a seam.
// (c) The tanker: original and repaired rule against the verified reference, over variations
//     of everything that was guessed in the caricature hull.
//   node run_fin_tanker.mjs
import { mkdirSync, writeFileSync } from 'node:fs';
import { precompute, fin, plate, morphBoat, tankerLike } from './hulls.mjs';
import { marchSteady, CONSTANTS } from './slicelaw.mjs';
import { helmbold } from './liftingline.mjs';

const rad = Math.PI / 180;
const REPAIRED = { ...CONSTANTS, SHED_FRACTION: 1 };
const DROP = { ...REPAIRED, STALL_DROP: 0.1 };
const round = (v, p = 4) => (Number.isFinite(v) ? Number(v.toPrecision(p)) : null);
const out = {};

// Whicker and Fehlner, NACA 0015, square tip, taper 0.45, Reynolds number about 2.7 million.
// Lift before stall from their own semi-empirical fit (section slope 0.9 * 2 pi, cross-flow
// coefficient 0.8, both confirmed in the report text); stall angle and maximum lift for
// effective aspect ratio 1, 2, 3 as commonly quoted from the report (38.5 deg 1.24, 28.7 deg
// 1.33, 23.0 deg 1.25), recalled, not re-read: the scanned plots could not be read here.
const wf = { 1: { stall: 38.5, clmax: 1.24 }, 2: { stall: 28.7, clmax: 1.33 }, 3: { stall: 23.0, clmax: 1.25 } };
const wfLift = (AR, deg) => { const a = deg * rad; return ((0.9 * 2 * Math.PI * AR) / (Math.sqrt(AR * AR + 4) + 1.8)) * a + (0.8 / AR) * a * a; };

out.fin = [1, 2, 3].map((AR) => {
  const T = 1, c = (2 * T) / AR;
  const body = precompute(fin(T, c), 161);
  const curve = [];
  for (let b = 0; b <= 40; b += 1) {
    const cl = (K) => { const r = marchSteady(body, { U: 1, betaDeg: Math.max(b, 0.01), rho: 1 }, K); return { cl: r.sideForce / (0.5 * T * c), pot: r.potentialPart / (0.5 * T * c), cf: r.crossFlowPart / (0.5 * T * c) }; };
    const f = cl(REPAIRED), d = cl(DROP);
    curve.push({ beta: b, frozen: round(f.cl), frozenHeld: round(f.pot), frozenCross: round(f.cf), drop: round(d.cl), ref: b <= wf[AR].stall ? round(wfLift(AR, b)) : null });
  }
  const peak = (k) => curve.reduce((m, p) => (p[k] > m[k] ? p : m), curve[0]);
  return { AR, stallRef: wf[AR].stall, clmaxRef: wf[AR].clmax, curve, slopeModel: round(curve[2].frozen / (2 * rad)), slopeRef: round(wfLift(AR, 2) / (2 * rad)),
    peakFrozen: { beta: peak('frozen').beta, cl: peak('frozen').frozen }, peakDrop: { beta: peak('drop').beta, cl: peak('drop').drop } };
});
for (const f of out.fin) {
  console.log(`fin AR ${f.AR}: slope model ${f.slopeModel} ref ${f.slopeRef}; ref stall ${f.stallRef} deg CLmax ${f.clmaxRef}; frozen peak ${JSON.stringify(f.peakFrozen)}; with drop ${JSON.stringify(f.peakDrop)}`);
  console.log('   beta: frozen (held+cross) | drop | ref   ' + [5, 10, 15, 20, 25, 30, 35, 40].map((b) => { const p = f.curve[b]; return `${b}: ${p.frozen} (${p.frozenHeld}+${p.frozenCross}) | ${p.drop} | ${p.ref}`; }).join('   '));
}

// (b) seam check for the addition
out.plateDrop = [0.2, 0.35, 0.6, 0.8, 1, 1.25, 1.6, 2, 2.5, 3.2, 4].map((AR) => {
  const T = 1, c = (2 * T) / AR, body = precompute(plate(T, c), 161);
  const peakOf = (K) => { let best = { beta: 0, cl: 0 }; for (let b = 2; b <= 60; b += 1) { const cl = marchSteady(body, { U: 1, betaDeg: b, rho: 1 }, K).sideForce / (0.5 * T * c); if (cl > best.cl) best = { beta: b, cl: round(cl) }; } return best; };
  const slope = marchSteady(body, { U: 1, betaDeg: 0.05, rho: 1 }, DROP).sideForce / (0.5 * T * c * 0.05 * rad);
  return { AR, slope: round(slope), helmbold: round(helmbold(AR)), peakDrop: peakOf(DROP) };
});
console.log('plates with drop: AR slope/helmbold peak', out.plateDrop.map((p) => `${p.AR}: ${(p.slope / p.helmbold).toFixed(3)} peak ${p.peakDrop.cl}@${p.peakDrop.beta}`).join(' | '));
out.morphDrop = [];
for (let k = 0; k <= 10; k++) {
  const body = precompute(morphBoat(k / 10), 316), U = 2.5;
  const cs = (b, K) => marchSteady(body, { U, betaDeg: Math.max(b, 0.01) }, K).sideForce / (500 * U * U * body.L * body.Tmax);
  const curve = [], frozen = [];
  for (let b = 0; b <= 40; b++) { curve.push(round(cs(b, DROP))); frozen.push(round(cs(b, REPAIRED))); }
  const x = body.x.map((v) => round(v)), T = body.T.map((v) => round(v)), canoeDraft = body.specs.map((s) => round(s.b > 1e-9 ? s.Tc : 0));
  let firstPeak = null; for (let b = 1; b < 40; b++) if (curve[b] > curve[b + 1] && curve[b] >= curve[b - 1]) { firstPeak = b; break; }
  out.morphDrop.push({ m: k / 10, curve, frozen, firstPeak, at15: curve[15], at25: curve[25], at40: curve[40], x, T, canoeDraft });
}
console.log('morph with drop: step firstPeak Cs15 Cs25 Cs40');
for (const r of out.morphDrop) console.log(`  ${r.m} ${r.firstPeak} ${r.at15} ${r.at25} ${r.at40}`);

// (c) tanker
const ref = (b) => { const s = Math.sin(b * rad); const Y = 0.315 * s + 1.607 * s ** 3, N = 0.137 * s + 0.03 * s ** 3; return { Y, clr: 0.5 - N / Y }; };
const variants = [
  { name: 'as in the first experiment' }, { name: 'bilge radius halved', bilge: 0.5 }, { name: 'bilge radius doubled', bilge: 2 },
  { name: 'skeg ends at 93% of length', skegEnd: 0.93 }, { name: 'no skeg at all', skeg: false },
  { name: 'stern rises less (30% of draft)', rise: 0.3 }, { name: 'stern rises more (80% of draft)', rise: 0.8 },
];
out.tanker = variants.map((v) => {
  const body = precompute(tankerLike(v));
  const run = (K) => [2, 6, 10, 15, 20].map((b) => { const r = marchSteady(body, { U: 1, betaDeg: b }, K); const f = ref(b); return { beta: b, side: round(r.normalForce / (500 * body.Tmax)), sideRef: round(f.Y), clr: round(r.xCLR), clrRef: round(f.clr) }; });
  const sum = (rows) => ({ sideWorstPct: round(100 * Math.max(...rows.map((r) => Math.abs(r.side / r.sideRef - 1))), 3), sideMeanPct: round(100 * rows.reduce((s, r) => s + r.side / r.sideRef - 1, 0) / rows.length, 3), clrWorst: round(Math.max(...rows.map((r) => Math.abs(r.clr - r.clrRef))), 3) });
  const yaw = (K) => round(marchSteady(body, { U: 1, betaDeg: 0, r: 0.02, xRef: 0.5 }, K).yawMoment / (500 * body.Tmax) / 0.02);
  const o = run(CONSTANTS), p = run(REPAIRED);
  return { name: v.name, original: sum(o), repaired: sum(p), rowsOriginal: o, rowsRepaired: p, yawOriginal: yaw(CONSTANTS), yawRepaired: yaw(REPAIRED) };
});
for (const t of out.tanker) console.log(`tanker ${t.name}: original side worst ${t.original.sideWorstPct}% CLR worst ${t.original.clrWorst} L | repaired side mean ${t.repaired.sideMeanPct}% worst ${t.repaired.sideWorstPct}% CLR worst ${t.repaired.clrWorst} L | yaw damping ${t.yawOriginal} / ${t.yawRepaired} (ref 0.049)`);
mkdirSync(new URL('./out/', import.meta.url), { recursive: true });
writeFileSync(new URL('./out/fin_tanker.json', import.meta.url), JSON.stringify(out));
