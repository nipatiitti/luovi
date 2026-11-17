// run_all.mjs
// Runs experiments H1 (drift sweeps on four bodies against references) and H2 (plate sweep,
// keel morph) and writes out/results.json for render.py and the tables in result.md.
//   node run_all.mjs
import { mkdirSync, writeFileSync } from 'node:fs';
import { precompute, finKeelBoat, longKeelBoat, delftSysser1, tankerLike, plate, morphBoat, morphKeel } from './hulls.mjs';
import { marchSteady, CONSTANTS } from './slicelaw.mjs';
import { liftingLineSlope, helmbold, jones } from './liftingline.mjs';

const rad = Math.PI / 180;
const out = { constants: CONSTANTS };
const round = (v, p = 5) => (Number.isFinite(v) ? Number(v.toPrecision(p)) : null);
const arr = (a, p = 4) => Array.from(a, (v) => round(v, p));

// ---------------------------------------------------------------- references
// Delft Systematic Yacht Hull Series, Sysser 1 with keel and rudder, upright, model scale.
// 4TU.ResearchData DOI 10.4121/21501402, sheet "Sys 1", block "Yawed & heeled 0 deg heel".
// Ff and Fa are the side forces on the fore and aft posts, 0.5366 m ahead of and 0.4634 m
// behind the centre of gravity, taken at the centre of buoyancy (2.29% L aft of midships).
const delftRows = [
  // V, Rt, Ff, Fa, beta
  [0.793, 1.7953, 0.0883, 0.0491, 0], [0.794, 1.9811, 3.2569, 2.1974, 3.3994],
  [0.793, 2.5703, 6.1901, 4.6107, 6.2603], [0.793, 3.4042, 8.9369, 7.6126, 9.2466],
  [1.387, 6.9514, 0.3041, -0.0883, 0.0516], [1.387, 7.0299, 3.3648, 1.8737, 1.014],
  [1.387, 7.2261, 6.7885, 3.7474, 1.9645], [1.386, 7.6195, 10.5654, 5.7977, 3.051],
];
const xCg = 0.8 + 0.0229 * 1.6, xFore = xCg - 0.5366, xAft = xCg + 0.4634;
const delftRef = delftRows.filter((r) => r[4] > 0.5).map(([V, Rt, Ff, Fa, beta]) => {
  const Rt0 = V < 1 ? 1.7953 : 6.9514;
  return { V, beta, side: Ff + Fa, drag: Rt - Rt0, clr: (Ff * xFore + Fa * xAft) / (Ff + Fa) };
});
// KVLCC2 bare hull, captive model tests fitted by the MMG standard method (Yasukawa and
// Yoshimura 2015, J. Mar. Sci. Technol. 20): Y' = 0.315 s + 1.607 s^3, N' = 0.137 s + 0.030 s^3
// with s = sin(leeway), forces on 0.5 rho L d U^2, moment on 0.5 rho L^2 d U^2 about midships,
// fitted to about 20 degrees. Yaw damping N'_r = -0.049. Quoted from memory of the paper.
const tankerRef = (betaDeg) => {
  const s = Math.sin(betaDeg * rad);
  const Y = 0.315 * s + 1.607 * s ** 3, N = 0.137 * s + 0.03 * s ** 3;
  return { Y, clr: 0.5 - N / Y };
};

// ---------------------------------------------------------------- H1
const t0 = Date.now();
const bodies = {
  fin: { body: precompute(finKeelBoat()), U: 2.5 },
  long: { body: precompute(longKeelBoat()), U: 2.5 },
  delft: { body: precompute(delftSysser1()), U: 0.793 },
  tanker: { body: precompute(tankerLike()), U: 1 },
};
console.log('precompute', Date.now() - t0, 'ms');
const coef = (b, U, F) => F / (500 * U * U * b.L * b.Tmax);
const betas = []; for (let b = 0; b <= 30.001; b += 0.5) betas.push(b);
out.h1 = {};
for (const [key, { body, U }] of Object.entries(bodies)) {
  const sweep = betas.map((betaDeg) => {
    const r = marchSteady(body, { U, betaDeg: Math.max(betaDeg, 0.01) });
    return {
      beta: betaDeg, side: round(coef(body, U, r.sideForce)), normal: round(coef(body, U, r.normalForce)),
      drag: round(coef(body, U, r.dragDueToSideForce)), clr: round(r.xCLR / body.L),
      pot: round(coef(body, U, r.potentialPart)), cf: round(coef(body, U, r.crossFlowPart)),
      kept: arr(Array.from(r.kept, (v) => v / (U * body.Tmax * body.Tmax)), 3),
    };
  });
  const yaw = marchSteady(body, { U, betaDeg: 0, r: 0.02 * U / body.L, xRef: body.L / 2 });
  // The repair found in this experiment: every section keeps what it let go (shed fraction 1),
  // sharpness sets cross-flow drag only.
  const KEEP = { ...CONSTANTS, SHED_FRACTION: 1 };
  const keepAll = betas.map((betaDeg) => {
    const r = marchSteady(body, { U, betaDeg: Math.max(betaDeg, 0.01) }, KEEP);
    return { beta: betaDeg, side: round(coef(body, U, r.sideForce)), normal: round(coef(body, U, r.normalForce)), drag: round(coef(body, U, r.dragDueToSideForce)), clr: round(r.xCLR / body.L) };
  });
  const yawKeep = marchSteady(body, { U, betaDeg: 0, r: 0.02 * U / body.L, xRef: body.L / 2 }, KEEP);
  out.h1[key] = { keepAll, yawDampingKeepAll: round(yawKeep.yawMoment / (500 * U * U * body.L ** 2 * body.Tmax) / 0.02),
    name: body.name, L: body.L, Tmax: body.Tmax, U, x: arr(body.x), T: arr(body.T),
    halfBeam: body.specs.map((s) => round(s.b)), canoeDraft: body.specs.map((s) => round(s.b > 1e-9 ? s.Tc : 0)),
    rOverT: body.rOverT.map((v) => round(Math.min(v, 99))), A: arr(body.A),
    sweep, yawDamping: round(yaw.yawMoment / (500 * U * U * body.L ** 2 * body.Tmax) / 0.02),
  };
}
out.h1.delft.ref = delftRef.map((d) => ({
  V: d.V, beta: d.beta, side: round(d.side / (500 * d.V ** 2 * 1.6 * bodies.delft.body.Tmax)),
  drag: round(d.drag / (500 * d.V ** 2 * 1.6 * bodies.delft.body.Tmax)), clr: round(d.clr / 1.6),
}));
out.h1.tanker.ref = [2, 4, 6, 8, 10, 12, 15, 18, 20].map((b) => ({ beta: b, normal: round(tankerRef(b).Y), clr: round(tankerRef(b).clr) }));

// Model against reference at the reference points, and what each hull "would have wanted".
function delftErrors(K) {
  return delftRef.map((d) => {
    const r = marchSteady(bodies.delft.body, { U: d.V, betaDeg: d.beta }, K);
    return { V: d.V, beta: d.beta, side: r.sideForce, sideRef: d.side, drag: r.dragDueToSideForce, dragRef: d.drag, clr: r.xCLR / 1.6, clrRef: d.clr / 1.6 };
  });
}
function tankerErrors(K) {
  return [2, 6, 10, 15, 20].map((beta) => {
    const b = bodies.tanker.body;
    const r = marchSteady(b, { U: 1, betaDeg: beta }, K);
    const ref = tankerRef(beta);
    return { beta, side: coef(b, 1, r.normalForce), sideRef: ref.Y, clr: r.xCLR, clrRef: ref.clr };
  });
}
const rms = (rows, f) => Math.sqrt(rows.reduce((s, r) => s + f(r) ** 2, 0) / rows.length);
const summary = (rows) => ({
  sideRmsPct: round(100 * rms(rows, (r) => r.side / r.sideRef - 1), 3),
  sideMeanPct: round(100 * rows.reduce((s, r) => s + r.side / r.sideRef - 1, 0) / rows.length, 3),
  clrMaxErrL: round(Math.max(...rows.map((r) => Math.abs(r.clr - r.clrRef))), 3),
});
out.h1.table = { delft: delftErrors(CONSTANTS), tanker: tankerErrors(CONSTANTS) };
out.h1.tableKeepAll = { delft: delftErrors({ ...CONSTANTS, SHED_FRACTION: 1 }), tanker: tankerErrors({ ...CONSTANTS, SHED_FRACTION: 1 }) };
out.h1.scanSharp = [0.03, 0.1, 0.3, 1, 3, 1e9].map((k) => {
  const K = { ...CONSTANTS, K_SHARP: k };
  return { K_SHARP: k, delft: summary(delftErrors(K)), tanker: summary(tankerErrors(K)) };
});
out.h1.scanShed = [0, 0.25, 0.5, 0.75, 1].map((f) => {
  const K = { ...CONSTANTS, SHED_FRACTION: f };
  return { shedFraction: f, delft: summary(delftErrors(K)), tanker: summary(tankerErrors(K)) };
});
out.h1.scanCdRound = [0.3, 0.6, 1.2].map((c) => {
  const K = { ...CONSTANTS, CD_ROUND: c };
  return { CD_ROUND: c, delft: summary(delftErrors(K)), tanker: summary(tankerErrors(K)) };
});
out.h1.tankerYawDampingRef = 0.049;

// ---------------------------------------------------------------- H2a plates
const ARs = []; for (let k = 0; k <= 26; k++) ARs.push(0.2 * Math.pow(20, k / 26));
out.h2a = ARs.map((AR) => {
  const T = 1, c = (2 * T) / AR, be = 0.05;
  const b = precompute(plate(T, c), 201);
  const slope = (K) => marchSteady(b, { U: 1, betaDeg: be, rho: 1 }, K).sideForce / (0.5 * T * c * be * rad);
  const model = slope(CONSTANTS), slender = slope({ ...CONSTANTS, LAMBDA: 0 }), ll = liftingLineSlope(AR);
  return {
    AR: round(AR), model: round(model), sliceNoLag: round(slender), liftingLine: round(ll),
    hardSwitch: round(AR < 1 ? slender : ll), helmbold: round(helmbold(AR)), jones: round(jones(AR)),
  };
});

// ---------------------------------------------------------------- H2b keel morph
out.h2b = [];
for (let k = 0; k <= 10; k++) {
  const m = k / 10, U = 2.5;
  const body = precompute(morphBoat(m), 316);
  const f = (betaDeg) => marchSteady(body, { U, betaDeg });
  const curve = betas.filter((b) => b % 1 === 0).map((b) => round(coef(body, U, f(Math.max(b, 0.01)).sideForce)));
  const slope = coef(body, U, f(0.5).sideForce) / (0.5 * rad);
  const yaw = marchSteady(body, { U, betaDeg: 0, r: 0.02 * U / body.L, xRef: body.L / 2 });
  const peak = curve.indexOf(Math.max(...curve));
  out.h2b.push({
    m, keel: morphKeel(m), x: arr(body.x), T: arr(body.T), canoeDraft: body.specs.map((s) => round(s.b > 1e-9 ? s.Tc : 0)),
    curve, slope: round(slope), clr5: round(f(5).xCLR / body.L), clr15: round(f(15).xCLR / body.L),
    side30overLinear: round(curve[30] / (slope * 30 * rad)), peakBeta: peak,
    yawDamping: round(yaw.yawMoment / (500 * U * U * body.L ** 2 * body.Tmax) / 0.02),
    keelAR: round(2 * (1.3 - 0.42) / (0.5 * (morphKeel(m).teRoot - morphKeel(m).leRoot + morphKeel(m).teTip - morphKeel(m).leTip))),
  });
}
mkdirSync(new URL('./out/', import.meta.url), { recursive: true });
writeFileSync(new URL('./out/results.json', import.meta.url), JSON.stringify(out));
console.log('done', Date.now() - t0, 'ms');

// ---------------------------------------------------------------- console report
const pct = (a, b) => (100 * (a / b - 1)).toFixed(0).padStart(4) + '%';
console.log('\nH1 Delft Sysser 1 (model N; reference N)');
for (const r of out.h1.table.delft) console.log(`  V ${r.V} beta ${r.beta.toFixed(2)}  side ${r.side.toFixed(2)} / ${r.sideRef.toFixed(2)} ${pct(r.side, r.sideRef)}   drag ${r.drag.toFixed(3)} / ${r.dragRef.toFixed(3)} ${pct(r.drag, r.dragRef)}   CLR/L ${r.clr.toFixed(3)} / ${r.clrRef.toFixed(3)}`);
console.log('H1 tanker (coefficients)');
for (const r of out.h1.table.tanker) console.log(`  beta ${r.beta}  side ${r.side.toFixed(4)} / ${r.sideRef.toFixed(4)} ${pct(r.side, r.sideRef)}   CLR/L ${r.clr.toFixed(3)} / ${r.clrRef.toFixed(3)}`);
console.log('--- keep-everything variant');
for (const r of out.h1.tableKeepAll.delft) console.log(`  V ${r.V} beta ${r.beta.toFixed(2)}  side ${pct(r.side, r.sideRef)}  drag ${pct(r.drag, r.dragRef)}  CLR/L ${r.clr.toFixed(3)} / ${r.clrRef.toFixed(3)}`);
for (const r of out.h1.tableKeepAll.tanker) console.log(`  beta ${r.beta}  side ${pct(r.side, r.sideRef)}   CLR/L ${r.clr.toFixed(3)} / ${r.clrRef.toFixed(3)}`);
console.log('yaw damping keep-all: tanker', out.h1.tanker.yawDampingKeepAll, 'fin', out.h1.fin.yawDampingKeepAll, 'long', out.h1.long.yawDampingKeepAll);
console.log('yaw damping: tanker model', out.h1.tanker.yawDamping, 'ref 0.049; fin', out.h1.fin.yawDamping, 'long', out.h1.long.yawDamping);
console.log('scan K_SHARP', JSON.stringify(out.h1.scanSharp, null, 0));
console.log('scan shed fraction', JSON.stringify(out.h1.scanShed, null, 0));
console.log('scan CD_ROUND', JSON.stringify(out.h1.scanCdRound, null, 0));
for (const k of ['fin', 'long']) { const s = out.h1[k].sweep; console.log(k, [2, 5, 10, 20, 30].map((b) => `b${b}: Cs ${s[b * 2].side} Cd ${s[b * 2].drag} clr ${s[b * 2].clr}`).join(' | ')); }
console.log('\nH2a plates: AR model helmbold err% | hardSwitch');
for (const p of out.h2a) console.log(`  ${p.AR.toFixed(2)} ${p.model.toFixed(3)} ${p.helmbold.toFixed(3)} ${pct(p.model, p.helmbold)} | ${p.hardSwitch.toFixed(3)} ${pct(p.hardSwitch, p.helmbold)}`);
console.log('\nH2b morph: m keelAR slope clr5 clr15 Y30/lin peakBeta yawDamping Cs(10) Cs(20) Cs(30)');
for (const r of out.h2b) console.log(`  ${r.m.toFixed(1)} ${r.keelAR} ${r.slope} ${r.clr5} ${r.clr15} ${r.side30overLinear} ${r.peakBeta} ${r.yawDamping} ${r.curve[10]} ${r.curve[20]} ${r.curve[30]}`);
