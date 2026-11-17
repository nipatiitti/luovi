import { makeBoat, run, KN, RAD, helmTo } from './lib.mjs';
const res = [];
for (const [course, main, jib, w] of [[-45, 8, 12, 8], [-45, 8, 12, 12], [-45, 8, 12, 16], [-45, 8, 12, 20], [-90, 30, 28, 24]]) { const b = makeBoat('hboat', { psiDeg: course, u: 2.5 }), a = { n: 0, d: 0, h: 0, s: 0, l: 0, air: 0 };
  run(b, 60, (bb) => ({ tillerDeg: helmTo(bb, course * RAD, 60), mainSheet: main, jibSheet: jib, crew: 1 }), () => ({ wind: w * KN, windDir: 0 }), (bb) => { if (bb.t > 50) { a.n++; a.d -= bb.delta / RAD; a.h -= bb.phi / RAD; a.s += bb.speed() / KN; a.l += bb.leewayDeg(); a.air += bb.out.rudderAir; } });
  res.push(`${course === -45 ? 'CH' : 'BR'}${w}: helm ${(a.d / a.n).toFixed(1)} heel ${(a.h / a.n).toFixed(0)} ${(a.s / a.n).toFixed(2)} kn leeway ${(a.l / a.n).toFixed(1)} air ${(a.air / a.n).toFixed(2)}`); }
console.log(res.join(' | '));
