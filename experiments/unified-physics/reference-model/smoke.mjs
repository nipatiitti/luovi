// smoke.mjs: the headline cases of the consolidated reference model, each printed as PASS or FAIL with its value, the
// band it must fall in and where that band comes from. Exit code 1 on any FAIL. No network. About 40 s; the first run
// also builds out/hulls.json and out/sails.json (build_data.mjs, about 25 s more).
//   node smoke.mjs            the model as it runs by default (slice wave-drag curves when data/wave-slice.json exists)
//   WAVE=delft node smoke.mjs the same with the Delft fallback curves
// Two kinds of band. Physical bands are the owner's pass marks and the experiments' results and do not depend on the
// wave-drag curve. Regression bands are today's values (17 Nov 2026) of this model with a tolerance, kept per wave-drag
// curve in REGRESSION below; when the model or data/wave-slice.json is changed on purpose, they are re-recorded.
import fs from 'fs';
import crypto from 'crypto';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';
if (!fs.existsSync(new URL('./out/hulls.json', import.meta.url)) || !fs.existsSync(new URL('./out/sails.json', import.meta.url))) {
  console.log('out/hulls.json or out/sails.json missing: building them first (build_data.mjs)');
  execFileSync(process.execPath, [fileURLToPath(new URL('./build_data.mjs', import.meta.url))], { stdio: 'ignore' });
}
const { SM, HULLS, SAILS, makeBoat, KN, RAD, helmTo } = await import('./lib.mjs');
const { DEFAULT: S, hardOver, tack, steady, record } = await import('./scenarios.mjs');
const { tow: seaTow } = await import('./sealib.mjs');
const { tow } = await import('./tow.mjs');

const t0 = Date.now(), slice = !HULLS.hboat.waveDrag.source.startsWith('Delft'), curve = slice ? 'slice' : 'delft';
// Today's values. Close-hauled rows: wind m/s, speed kn, leeway, heel, weather helm (degrees), sheets fixed, crew on the rail.
const REGRESSION = {
  delft: { closeHauled: [[4.1, 5.52, 2.7, 4.9, -0.1], [6.2, 6.42, 2.7, 23.0, 3.1], [8.2, 6.65, 3.1, 36.7, 7.2], [10.3, 6.48, 4.1, 43.3, 10.5], [12.3, 6.22, 5.7, 49.2, 14.5]], seaPitchRms: 2.56 },
  slice: { closeHauled: [[4.1, 5.15, 3.0, 4.2, -0.2], [6.2, 5.94, 3.2, 21.8, 3.0], [8.2, 6.23, 3.6, 36.5, 7.5], [10.3, 6.04, 4.8, 42.9, 11.0], [12.3, 5.79, 6.7, 48.8, 15.1]], seaPitchRms: 2.46 },
}[curve];
const DECAY = { heave: { T: 1.53, zeta: 27 }, pitch: { T: 1.57, zeta: 25 } }; // free decay at rest with the memory term: damped period [s], damping [% of critical]

let fails = 0;
const f = (v, d = 2) => (Number.isFinite(v) ? v.toFixed(d) : String(v));
function line(name, ok, value, band, from) { if (!ok) fails++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${name.padEnd(44)} ${String(value).padEnd(34)} band ${band}  [${from}]`); }
const within = (v, lo, hi) => Number.isFinite(v) && v >= lo && v <= hi;
const guard = (name, fn) => { try { fn(); } catch (e) { line(name, false, 'threw: ' + e.message, 'runs to the end', 'the model must not blow up'); } };

console.log(`reference model smoke check. Flags: R1 ${SM.C.R1}, R2 ${SM.C.R2}, C2 ${SM.C.C2}, SEA ${SM.C.SEA}, MEMORY ${SM.C.MEMORY}.`);
console.log(`Wave drag, H-boat: ${HULLS.hboat.waveDrag.source.slice(0, 110)}`);

// 1. steady captive side force against the steady slice law, three Delft hold-out hulls (stored in data/holdout.json)
guard('captive side force', () => {
  const H = JSON.parse(fs.readFileSync(new URL('./data/holdout.json', import.meta.url), 'utf8')).hulls;
  for (const h of H) {
    const rat = h.runs.map((r) => tow(SM, h, SAILS.hboat, r.U, r.betaDeg).side / (500 * r.U * r.U * h.Lref * h.Tmax) / r.steadyLaw), tank = h.runs.map((r) => r.steadyLaw / r.tank);
    line(`captive side force / steady law, Delft ${h.sys}`, rat.every((q) => within(q, 0.97, 1.03)), rat.map((q) => f(q, 3)).join(' ') + ` (leeway ${h.runs.map((r) => f(r.betaDeg, 0)).join(', ')})`, '0.97 to 1.03',
      `c2-sideforce-fix: -2.1 to +2.5% over 396 runs; the law itself is ${tank.map((q) => f(q, 2)).join(' ')} of the tank here`);
  }
});

// 2. H-boat close-hauled at five winds: regression
guard('close-hauled', () => {
  for (const [w, kn, lee, heel, helm] of REGRESSION.closeHauled) {
    const q = steady(S, 'hboat', -45, 8, 12, Math.round(w / KN)); // the experiments' winds: 8, 12, 16, 20, 24 knots
    const ok = within(q.kn, kn - 0.15, kn + 0.15) && within(q.leeway, lee - 0.5, lee + 0.5) && within(q.heel, heel - 1.5, heel + 1.5) && within(q.weatherHelm, helm - 1, helm + 1);
    line(`H-boat close-hauled, wind ${f(w, 1)} m/s`, ok, `${f(q.kn)} kn, leeway ${f(q.leeway, 1)}, heel ${f(q.heel, 1)}, helm ${f(q.weatherHelm, 1)}`, `${f(kn)} +-0.15 kn, ${f(lee, 1)} +-0.5, ${f(heel, 1)} +-1.5, ${f(helm, 1)} +-1.0`, `regression, today's values, ${curve} wave drag`);
  }
});

// 3. tacks, 6.2 m/s wind, 20 degrees of helm
guard('tack', () => {
  const h = tack(S, 'hboat', 20).newCourseS, l = tack(S, 'ifboat', 20).newCourseS;
  line('H-boat tack, 20 degrees of helm', within(h, 6, 9), `${f(h, 1)} s`, '6 to 9 s', 'owner: 7 to 8 s counted from race videos, rough band');
  line('long keel (Folkboat) tack against H-boat', within(l / h, 1.1, 1.5), `${f(l, 1)} s, ${f(l / h, 2)} times`, '1.1 to 1.5 times', 'owner: long keel turns 1.2 to 1.4 times slower, rough band');
});

// 4. hard over at 5 knots, sails down
guard('hard over', () => {
  const a = hardOver(S, 'hboat', 5, 30).peakRate, b = hardOver(S, 'hboat', 5, 45).peakRate;
  line('hard over at 5 kn: 45 against 30 degrees', b > a, `${f(b, 1)} against ${f(a, 1)} deg/s`, '45 turns faster', 'owner: more rudder turns faster up to about 45 to 50 degrees');
});

// 5. beam reach, puff from 6.2 to 14.4 m/s, course held by a helmsman with 35 degrees of rudder
guard('reach puff', () => {
  const BR = { course: -90, main: 30, jib: 28, w0: 12, w1: 28 }, held = record(S, 'hboat', BR), eased = record(S, 'hboat', { ...BR, easeAt: 4.5 });
  line('reach puff, main held: broaches', held.peakOff >= 15 && held.peakHelm >= 33, `${held.peakOff} deg off course, helm ${held.peakHelm}`, 'over 15 off course, helm at 33 or more of its 35', 'r2-broach: round-up with the rudder hard over');
  line('reach puff, main eased after 1.5 s: saved', eased.peakOff <= 10 && eased.peakHelm < 25, `${eased.peakOff} deg off course, helm ${eased.peakHelm}`, 'under 10 off course, helm under 25', 'r2-broach: easing the main saves her');
});

// 6. free decay at rest, heave (0.02 m) and pitch (0.5 degrees), with the memory term
guard('free decay', () => {
  for (const mode of ['heave', 'pitch']) {
    const b = makeBoat('hboat', mode === 'heave' ? { zeta: 0.02, u: 0 } : { thetaDeg: 0.5, u: 0 }), ts = [], xs = [];
    seaTow(b, 0, 8, 1 / 240, null, (bb) => { ts.push(bb.t); xs.push(mode === 'heave' ? bb.zeta : bb.theta); });
    let mn = 0, tmn = 0; for (let i = 0; i < xs.length; i++) if (xs[i] < mn) { mn = xs[i]; tmn = ts[i]; }
    const lr = Math.log(xs[0] / -mn), z = 100 * lr / Math.sqrt(Math.PI ** 2 + lr * lr), T = 2 * tmn, D = DECAY[mode]; // from the first undershoot
    line(`free ${mode} decay at rest`, within(T, 0.9 * D.T, 1.1 * D.T) && within(z, D.zeta - 3, D.zeta + 3) && Math.abs(xs[xs.length - 1]) < 0.02 * Math.abs(xs[0]), `period ${f(T)} s, damping ${f(z, 0)}%`, `${f(D.T)} s +-10%, ${D.zeta} +-3%, dead after 8 s`, 'regression on v2-radiation (27% heave, 25% pitch; classical 36 to 39%)');
  }
});

// 7. close-hauled on flat water with heave and pitch switched on: the pitching from the start dies out
let seaHash = null;
guard('flat water pitching', () => {
  const b = makeBoat('hboat', { psiDeg: -45, u: 2.5, heavePitch: true }), dt = 1 / 240; let lo = 99, hi = -99, live = 0;
  for (let i = 0; i < 50 / dt; i++) { b.step(dt, { tillerDeg: helmTo(b, -45 * RAD), mainSheet: 8, jibSheet: 12, crew: 1 }, { wind: 7, windDir: 0, sea: null }); live = Math.max(live, Math.abs(b.q)); if (b.t > 40) { lo = Math.min(lo, b.theta / RAD); hi = Math.max(hi, b.theta / RAD); } }
  line('pitching under sail on flat water dies out', live > 0 && within(hi - lo, 0, 0.05), `${f(hi - lo, 3)} deg peak to peak at 40 to 50 s, trim ${f(hi, 2)}`, 'under 0.05 deg (after pitching at the start)', 'v2-radiation: dies in under 20 s with the memory term');
});

// 8. reference sea (wind 7 m/s, fetch 15 km: Hs 0.42 m, Tp 2.9 s), close-hauled, 40 s to settle then 60 s; and determinism
guard('reference sea', () => {
  const sea = SM.makeSea({ wind: 7, fetch: 15000, gamma: 1, dir: 0, seed: 2026 }), dt = 1 / 240;
  const go = (seconds) => { const b = makeBoat('hboat', { psiDeg: -45, u: 2.5 }); let n = 0, s1 = 0, s2 = 0;
    for (let i = 0; i < seconds / dt; i++) { b.step(dt, { tillerDeg: helmTo(b, -45 * RAD), mainSheet: 8, jibSheet: 12, crew: 1 }, { wind: 7, windDir: 0, sea }); if (b.t >= 40) { const T = b.theta / RAD; n++; s1 += T; s2 += T * T; } }
    const st = new Float64Array([b.X, b.Y, b.psi, b.u, b.v, b.r, b.p, b.phi, b.delta, b.zeta, b.theta, b.wz, b.q, ...b.markers.map((m) => m.Plin), ...b.r_x1]);
    return { rms: n ? Math.sqrt(Math.max(0, s2 / n - (s1 / n) ** 2)) : NaN, hash: crypto.createHash('sha256').update(Buffer.from(st.buffer)).digest('hex'), ok: Number.isFinite(b.u + b.theta + b.zeta) }; };
  const a = go(100), R = REGRESSION.seaPitchRms;
  line('reference sea, close-hauled: pitch rms', a.ok && within(a.rms, R - 0.3, R + 0.3), `${f(a.rms)} deg`, `${f(R)} +-0.3 deg`, `regression, today's value, ${curve} wave drag (v2-radiation without C2: 2.40)`);
  const b1 = go(12), b2 = go(12);
  line('determinism: two identical 12 s sea runs', b1.hash === b2.hash, `state hash ${b1.hash.slice(0, 12)} and ${b2.hash.slice(0, 12)}`, 'identical', 'replays need it');
});

console.log(`${fails ? fails + ' FAILED' : 'all passed'} in ${((Date.now() - t0) / 1000).toFixed(0)} s`);
process.exit(fails ? 1 : 0);
