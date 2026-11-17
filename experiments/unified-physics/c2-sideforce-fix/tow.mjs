// tow.mjs: c1 regression check. The h1b hold-out hulls (same Delft cases, same canoe body, keel and rudder,
// same station tables from h1b's hulls.mjs/section.mjs) towed captive through the CURRENT time-domain model
// (copy of sailing-test-v3/code/model.js) at fixed speed, leeway and heel, sails down, rudder at 0, until steady.
// Four flag settings: base (R1 = R2 = false), R1 only, R2 only, both. Nothing in the model is changed.
//   node tow.mjs [heel ...]      (default: 0 10 20)   -> out/tow.json
// Scale: the hull is built at model scale exactly as in h1b, then Froude-scaled to the case's full scale (lengths x s,
// speed x sqrt s), because the model's slice spacing is a fixed 0.05 m (32 slices on a 1.6 m model, 2 on the rudder).
// The slice law has no Reynolds number, so the coefficients are comparable; run with SCALE=1 to check that choice.
// Captive: each sub-step the impulse the step gave the slices for the acceleration it computed is taken back and
// u, v, r, p, phi are reset (r2-broach budget.mjs method).
import { readFileSync, writeFileSync } from 'node:fs';
import { precompute, delftModel } from './hulls.mjs';

const src = readFileSync(new URL('./model.js', import.meta.url), 'utf8');
export function loadModel(R1, R2, patch = (t) => t, C2 = false) { const mod = { exports: {} }; new Function('module', 'exports', patch(src))(mod, mod.exports); mod.exports.C.R1 = R1; mod.exports.C.R2 = R2; mod.exports.C.C2 = C2; return mod.exports; }
const FLAGS = { base: loadModel(false, false), R1: loadModel(true, false), R2: loadModel(false, true), both: loadModel(true, true) };
const SAILS = JSON.parse(readFileSync(new URL('./out/sails.json', import.meta.url), 'utf8')).hboat; // carried, never used (sails down)
const cases = JSON.parse(readFileSync(new URL('./out/delft_cases.json', import.meta.url))).filter((c) => !process.env.SYS || process.env.SYS.split(',').includes(String(c.sys)));
const heels = process.argv.slice(2).length ? process.argv.slice(2).map(Number) : [0, 10, 20];
const RAD = Math.PI / 180, DT = 1 / 240;

export function boatData(c) {
  const desc = delftModel(c), body = precompute(desc, 131), s = process.env.SCALE ? Number(process.env.SCALE) : c.scale, n = body.x.length;
  const rl = c.L - c.LER; // rudder leading edge (h1b's delftModel); keel and rudder never overlap
  const rud = [], rud0 = [], sharp = [], cd = [];
  for (let i = 0; i < n; i++) {
    const sp = body.specs[i], Tc = sp.b > 1e-9 ? sp.Tc : 0, isR = sp.blade && body.x[i] > rl && sp.blade.Tk > Tc;
    rud0.push(isR ? 1 : 0); rud.push(isR ? (sp.blade.Tk - Tc) / sp.blade.Tk : 0); // gen_hulls rule (spade: the whole blade turns)
    const q = body.rOverT[i]; sharp.push(Number.isFinite(q) ? Math.exp(-q / 0.1) : 0); cd.push(Tc * s);
  }
  const halfBeam = body.specs.map((sp) => sp.b * s), L = body.L * s, dx = L / (n - 1);
  let wetted = 0; for (let i = 1; i < n; i++) wetted += 0.5 * (Math.PI * (halfBeam[i] + cd[i]) + Math.PI * (halfBeam[i - 1] + cd[i - 1])) * dx * 0.5;
  return {
    s, Tmax: body.Tmax * s, xcg: (c.L / 2 - c.lcb) * s,
    data: {
      L, n, dx, A: body.A.map((a) => a * s * s), T: body.T.map((t) => t * s), sharp, rud, rud0, halfBeam, canoeDepth: cd, wetted,
      beam: 1.15 * c.bwl * s, // deck beam [assumed]: only the heeled tables read it
      rig: { freeboard: 0.09 * c.L * s, BAS: 1, P: 10, mastX: 0.35 * L }, // freeboard [assumed]; rig only feeds the (switched-off) sails
      mass: 1e12, kYaw: 1, kRoll: 1, GM: 0, crewMass: 0, crewYMax: 0, xcg: (c.L / 2 - c.lcb) * s, tillerMaxDeg: 30,
      hydro: { LWL: c.L * s, volc: 1 }, delftRr: [[0.1, 0], [0.7, 0]], // wave drag off: side force and its centre only
    },
  };
}

export function tow(SM, bd, U, betaDeg, heelDeg) {
  const b = new SM.Boat(bd.data, SAILS, { u: U }), beta = betaDeg * RAD, u = U * Math.cos(beta), v = -U * Math.sin(beta), phi = -heelDeg * RAD;
  const hold = () => { b.u = u; b.v = v; b.r = 0; b.p = 0; b.phi = phi; };
  const tL = bd.data.L / U, nTot = Math.round((4 * tL) / DT), nAvg = Math.round(tL / DT);
  const acc = [[0, 0, 0], [0, 0, 0]]; // last transit and the one before: Y, X, N
  hold();
  for (let i = 0; i < nTot; i++) {
    const v0 = b.v, r0 = b.r, p0 = b.p;
    b.step(DT, { tillerDeg: 0, sails: false }, { wind: 0, windDir: 0 });
    const dv = b.v - v0, dr = b.r - r0, dp = b.p - p0;
    for (const m of b.markers) { const dP = m.G * m._c * (dv + dr * m._arm - dp * m._z); m.Plin -= dP; m.Patt -= dP * m._kf; }
    hold();
    const k = i >= nTot - nAvg ? 1 : i >= nTot - 2 * nAvg ? 0 : -1;
    if (k >= 0) { const o = b.out; acc[k][0] += o.keelY + o.rudderY; acc[k][1] += o.hullX; acc[k][2] += o.nRud + o.nHull; }
  }
  const [Y, X, N] = acc[1].map((a) => a / nAvg), Yp = acc[0][0] / nAvg;
  // what resists leeway, perpendicular to the track (as h1b's sideForce), and the centre about the bow (N about xcg, + bow to starboard)
  return { side: Y * Math.cos(beta) + X * Math.sin(beta), normal: Y, xCLR: bd.xcg - N / Y, drift: Math.abs(Y / Yp - 1), rudAttach: b.out.rudderAttach, rudAir: b.out.rudderAir || 0 };
}

export { cases };
export const MAIN = import.meta.url === `file://${process.argv[1]}`;
export const r4 = (v) => (Number.isFinite(v) ? Number(v.toPrecision(4)) : null);
const out = []; const t0 = Date.now();
for (const c of MAIN ? cases : []) {
  const bd = boatData(c), Lref = c.L * bd.s, q = (V) => 500 * V * V * Lref * bd.Tmax, xF = c.L / 2 - c.lcb - c.dFore, xA = c.L / 2 - c.lcb - c.dAft;
  const rows = [];
  for (const t of c.tests) {
    const beta = Math.abs(t.beta); if (beta < 0.5) continue;
    const U = t.V * Math.sqrt(bd.s), row = { V: t.V, fn: r4(t.V / Math.sqrt(9.81 * c.L)), beta: r4(beta), sideRef: r4(Math.abs(t.Ff + t.Fa) / (500 * t.V * t.V * c.L * bd.Tmax / bd.s)), clrRef: r4((t.Ff * xF + t.Fa * xA) / (t.Ff + t.Fa) / c.L) };
    // heeled: no tank data was extracted (h1b took only the 0-degree-heel yawed blocks), so heeled runs are flag-against-flag
    // only, on one run per hull: Froude under 0.40, the leeway nearest 6 degrees
    const fn = t.V / Math.sqrt(9.81 * c.L), pick = c.tests.filter((z) => Math.abs(z.beta) >= 0.5 && z.V / Math.sqrt(9.81 * c.L) < 0.4).sort((a, b) => Math.abs(Math.abs(a.beta) - 6) - Math.abs(Math.abs(b.beta) - 6))[0];
    row.heeledSet = pick === t;
    for (const heel of heels) for (const [fk, SM] of Object.entries(FLAGS)) {
      if (heel !== 0 && !row.heeledSet) continue;
      const r = tow(SM, bd, U, beta, heel);
      row[`${fk}_${heel}`] = { side: r4(r.side / q(U)), normal: r4(r.normal / q(U)), clr: r4(r.xCLR / Lref), drift: r4(r.drift), att: r4(r.rudAttach), air: r4(r.rudAir) };
    }
    rows.push(row);
  }
  out.push({ sys: c.sys, series: c.series, scale: bd.s, rows });
  const r0 = rows.find((r) => r.beta >= 3) || rows[0];
  const rh = rows.find((r) => r.heeledSet); if (rh && rh.both_20) console.log(`   heeled run beta ${rh.beta}: side base 0/10/20 ${rh.base_0.side} ${rh.base_10.side} ${rh.base_20.side}  both ${rh.both_0.side} ${rh.both_10.side} ${rh.both_20.side}`);
  console.log(`Sys ${c.sys}: ${rows.length} runs; e.g. beta ${r0.beta} ref ${r0.sideRef} base ${r0.base_0.side} R1 ${r0.R1_0.side} R2 ${r0.R2_0.side} both ${r0.both_0.side}  ${((Date.now() - t0) / 1000).toFixed(0)} s`);
}
if (MAIN) writeFileSync(new URL(`./out/tow${process.env.SCALE ? '_scale' + process.env.SCALE : ''}.json`, import.meta.url), JSON.stringify({ heels, out }));
