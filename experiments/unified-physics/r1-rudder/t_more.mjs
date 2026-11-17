import { makeBoat, run, SM, KN, RAD, HULLS } from './scen_lib.mjs';
import { isoData } from './t_iso.mjs'; import { SAILS } from './lib.mjs';
const tag = process.env.R1 === '0' ? 'BEFORE' : 'AFTER', f1 = (v, d = 1) => (+v).toFixed(d);
// 1. centre of pressure of the H-boat blade, straight tow at 5 kn
if (tag === 'AFTER') for (const key of ['hboat', 'ifboat']) { const { h } = isoData(key, () => true); h.tillerMaxDeg = 60;
  for (const d of [5, 10, 15, 30, 60]) { const b = new SM.Boat(h, SAILS[key], { u: 2.57 }); let M = 0, N = 0, k = 0; for (let i = 0; i < 1920; i++) { b.step(1 / 240, { tillerDeg: d, sails: false }, { wind: 0 }); if (i > 1400) { M += b.out.hingeM; N += Math.hypot(b.out.rudderY, b.out.rudderX); k++; } }
    console.log(key, 'rudder', d, 'deg: hinge moment', f1(M / k, 0), 'N m, force', f1(N / k, 0), 'N, arm', f1(-M / N, 3), 'm; tiller pull at 1.2 m', f1(-M / k / 1.2, 0), 'N'); } }
// 2. peak load against tiller rate, H-boat 5 kn to 60 deg
for (const rate of [30, 60, 120]) { SM.C.tillerRate = rate; const b = makeBoat('hboat', { u: 5 * KN }); run(b, 1.5, () => ({ tillerDeg: 0, sails: false }), () => ({ wind: 0 })); b.u = 5 * KN; let pk = 0, pr = 0;
  run(b, 10, () => ({ tillerDeg: 60, sails: false }), () => ({ wind: 0 }), (bb) => { pk = Math.max(pk, Math.hypot(bb.out.rudderY, bb.out.rudderX)); pr = Math.max(pr, bb.r / RAD); });
  console.log(tag, 'hboat 5 kn to 60 deg at', rate, 'deg/s: peak load', Math.round(pk), 'N = coefficient', f1(pk / (0.5 * 1000 * 2.57 * 2.57 * 0.336), 2), 'peak rate', f1(pr)); }
SM.C.tillerRate = 120;
// 3. low speed: total turn before the boat has stopped (speed under 0.3 kn) or 40 s
for (const key of ['hboat']) for (const kn of [1, 2]) for (const ang of [15, 30, 45, 60]) { const b = makeBoat(key, { u: kn * KN }); run(b, 1.5, () => ({ tillerDeg: 0, sails: false }), () => ({ wind: 0 })); b.u = kn * KN; b.t = 0; b.X = 0; b.Y = 0; let ts = null, hs = null, h10 = 0, adv = 0;
  run(b, 40, () => ({ tillerDeg: ang, sails: false }), () => ({ wind: 0 }), (bb) => { if (ts === null && bb.speed() < 0.3 * kn * KN) { ts = bb.t; hs = bb.psi / RAD; } if (Math.abs(bb.t - 10) < 0.026) h10 = bb.psi / RAD; });
  console.log(tag, key, kn, 'kn rudder', ang, ': heading after 10 s', f1(h10, 0), '; down to 30% speed at', ts === null ? '>40' : f1(ts), 's with heading', hs === null ? f1(b.psi / RAD, 0) : f1(hs, 0), '; advance', f1(b.Y), 'm'); }
// 4. same yaw push (1500 N m for 1 s) coasting at 5 kn, tiller lashed and let go
for (const key of ['hboat', 'ifboat']) for (const mode of ['lashed', 'let go']) { const b = makeBoat(key, { u: 5 * KN }); run(b, 2, () => ({ tillerDeg: 0, sails: false }), () => ({ wind: 0 })); b.u = 5 * KN; b.t = 0; const hd = {}; let pk = 0;
  run(b, 12, () => ({ tillerDeg: 0, tillerFree: mode === 'let go', sails: false }), (t) => ({ wind: 0, yawMoment: t < 1 ? 1500 : 0 }), (bb) => { pk = Math.max(pk, bb.r / RAD); for (const q of [2, 5, 10]) if (Math.abs(bb.t - q) < 0.026) hd[q] = f1(bb.psi / RAD); });
  console.log(tag, key, 'pushed 1500 N m for 1 s,', mode, ': peak turn rate', f1(pk), 'heading off after 2/5/10 s', hd[2], hd[5], hd[10], 'rate at end', f1(b.r / RAD, 2)); }
