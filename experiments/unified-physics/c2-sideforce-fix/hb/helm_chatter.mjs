import { SM, KN, RAD, DT, helmTo } from './lib.mjs'; import { SETS } from './diag.mjs';
// helm_chatter.mjs [old|real] [wind kn] [raw]: the stand-in helmsman at sub-step level. raw = model.js helmTo fed the rate of every sub-step.
const which = process.argv[2] || 'real', w = +process.argv[3] || 12, raw = process.argv[4] === 'raw', course = -45;
const b = new SM.Boat(SETS[which][0], SETS[which][1], { psiDeg: course, u: 2.5 });
let s = { d: 0, d2: 0, n: 0, x: 0, rx: 0, jit: 0 }, last = 0;
for (let i = 0; i < 40 * 240; i++) { b.step(DT, { tillerDeg: (raw ? SM.helmTo : helmTo)(b, course * RAD, 60), mainSheet: 8, jibSheet: 12, crew: 1 }, { wind: w * KN, windDir: 0 });
  if (b.t > 30) { s.n++; s.jit += Math.abs(b.delta - last) / RAD; s.rx += b.out.rudderX; } last = b.delta;
  if (i >= 40 * 240 - 8) console.log(b.t.toFixed(4), 'delta', (b.delta / RAD).toFixed(4), 'r', (b.r / RAD).toFixed(4), 'rudX', b.out.rudderX.toFixed(0), 'rudY', b.out.rudderY.toFixed(0)); }
console.log(which, w, 'mean |rudder step| deg per sub-step', (s.jit / s.n).toFixed(4), 'mean rudder X', (s.rx / s.n).toFixed(0), 'kn', (b.speed() / KN).toFixed(2));
