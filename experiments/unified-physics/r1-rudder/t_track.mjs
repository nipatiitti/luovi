// tracking and turning: yaw shove with tiller lashed / let go; sailing close-hauled and letting go; time through 90 degrees
import { makeBoat, run, settle, SM, KN, RAD } from './scen_lib.mjs';
const tag = process.env.R1 === '0' ? 'BEFORE' : 'AFTER', f1 = (v) => (+v).toFixed(1);
for (const key of ['hboat', 'ifboat']) {
  // (a) coasting at 5 kn, shoved: 3 deg/s of yaw put in at t = 0
  for (const mode of ['lashed', 'let go']) {
    const b = makeBoat(key, { u: 5 * KN }); run(b, 2, () => ({ tillerDeg: 0, sails: false }), () => ({ wind: 0 })); b.u = 5 * KN; b.r = 3 * RAD; const p0 = b.psi; let pk = 0, dmax = 0; const hd = {};
    run(b, 12, () => ({ tillerDeg: 0, tillerFree: mode === 'let go', sails: false }), () => ({ wind: 0 }), (bb) => { pk = Math.max(pk, Math.abs(bb.r) / RAD); dmax = Math.max(dmax, Math.abs(bb.delta) / RAD); for (const q of [2, 5, 10]) if (Math.abs(bb.t - 2 - q) < 0.026) hd[q] = f1((bb.psi - p0) / RAD); });
    console.log(tag, key, 'shoved 3 deg/s,', mode, ': heading off after 2/5/10 s', hd[2], hd[5], hd[10], 'turn rate at 10 s', f1(b.r / RAD), 'max rudder swing', f1(dmax));
  }
  // (b) close-hauled in 12 kn, then hands off for 15 s
  for (const mode of ['centred', 'let go']) {
    const b = settle(key, {}); const d0 = b.delta / RAD, p0 = b.psi, sp = b.speed() / KN; const hd = {}; let dl = 0;
    run(b, 15, () => ({ tillerDeg: 0, tillerFree: mode === 'let go', mainSheet: 8, jibSheet: 12, crew: 1 }), () => ({ wind: 12 * KN, windDir: 0 }), (bb) => { for (const q of [5, 10, 15]) if (Math.abs(bb.t - q) < 0.026) hd[q] = f1((bb.psi - p0) / RAD); dl = bb.delta / RAD; });
    console.log(tag, key, 'close-hauled', f1(sp), 'kn, steady rudder', d0.toFixed(2), 'leeway', f1(b.leewayDeg()), '; tiller', mode, ': heading change after 5/10/15 s (+ = bears away)', hd[5], hd[10], hd[15], 'rudder ends at', f1(dl));
  }
  // (c) time through 90 degrees: coasting from 5 kn at 30 degrees of rudder; and a tack under sail with up to 30 degrees
  { const b = makeBoat(key, { u: 5 * KN }); run(b, 2, () => ({ tillerDeg: 0, sails: false }), () => ({ wind: 0 })); b.u = 5 * KN; b.t = 0; let t90 = null;
    run(b, 14, () => ({ tillerDeg: 30, sails: false }), () => ({ wind: 0 }), (bb) => { if (t90 === null && bb.psi / RAD >= 90) t90 = bb.t; });
    const c = settle(key, {}); let tt = null; const s0 = c.speed(); let smin = 9;
    run(c, 25, (bb) => ({ tillerDeg: SM.helmTo(bb, 45 * RAD, 30), mainSheet: 8, jibSheet: 12, jibSide: bb.psi > 0 ? 1 : -1, crew: bb.psi > 0 ? -1 : 1 }), () => ({ wind: 12 * KN, windDir: 0 }), (bb) => { if (tt === null && bb.psi / RAD >= 40) tt = bb.t; smin = Math.min(smin, bb.speed()); });
    console.log(tag, key, 'coasting through 90 deg at 30 deg rudder:', f1(t90), 's; tack to within 5 deg of new course:', f1(tt), 's, speed lost', Math.round(100 * (1 - smin / s0)) + '%'); }
}
