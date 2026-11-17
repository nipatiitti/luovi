// budget.mjs: turning-moment budget of the H-boat held captive (towed at 6.5 kn, 4 degrees of leeway, fixed heel, sails down),
// before and after. Sail lever is the envelope value drive x height of the centre of effort x sin(heel), drive 600 N, height 5.0 m.
import { OLD, NEW, make, run, KN, RAD, DT } from './r2lib.mjs';
const key = process.env.BOAT || 'hboat', U = 6.5 * KN, beta = 4 * RAD;
function captive(SM, heelDeg, rudDeg) {
  const b = make(SM, key, { psiDeg: 0, u: U }); const acc = { n: 0, hull: 0, rud: 0, drag: 0, att: 0, air: 0, ry: 0 };
  const hold = () => { b.u = U; b.v = -U * Math.tan(beta); b.r = 0; b.p = 0; b.phi = -heelDeg * RAD; };
  hold(); const n = Math.round(8 / DT);
  for (let i = 0; i < n; i++) { const v0 = b.v, r0 = b.r, p0 = b.p; b.step(DT, { tillerDeg: rudDeg, sails: false }, { wind: 0, windDir: 0 });
    // captive: the hull is not allowed to accelerate, so take back the impulse the step gave the slices for the acceleration it computed
    const dv = b.v - v0, dr = b.r - r0, dp = b.p - p0; for (const m of b.markers) { const dP = m.G * m._c * (dv + dr * m._arm - dp * m._z); m.Plin -= dP; m.Patt -= dP * m._kf; }
    hold(); if (i > n * 0.6) { const o = b.out; acc.n++; acc.hull += o.nHull; acc.rud += o.nRud; acc.drag += o.nDrag || 0; acc.att += o.rudderAttach; acc.air += o.rudderAir || 0; acc.ry += o.rudderY; } }
  for (const k of Object.keys(acc)) if (k !== 'n') acc[k] /= acc.n; return acc;
}
console.log(`${key}: moments in N m, + = turning the bow to windward (weather helm); rudder angles are weather helm (tiller to windward)`);
console.log('heel | sail lever | hull+keel before, after (of which drag arms) | rudder at 0 before, after | extra from 10 deg of helm before, after | most the rudder can give (helm 10..40) before, after [attach, air at that helm]');
for (const heel of [0, 10, 20, 30, 40, 50]) {
  const o0 = captive(OLD, heel, 0), n0 = captive(NEW, heel, 0), o10 = captive(OLD, heel, -10), n10 = captive(NEW, heel, -10);
  let bo = [0, 0], bn = [0, 0, 0, 0];
  for (const h of [10, 15, 20, 25, 30, 35, 40]) { const o = captive(OLD, heel, -h), nn = captive(NEW, heel, -h); if (o0.rud - o.rud > bo[0]) bo = [o0.rud - o.rud, h]; if (n0.rud - nn.rud > bn[0]) bn = [n0.rud - nn.rud, h, nn.att, nn.air]; }
  const f = (v) => v.toFixed(0).padStart(6);
  console.log(`${String(heel).padStart(3)}  | ${f(600 * 5.0 * Math.sin(heel * RAD))} | ${f(o0.hull)} ${f(n0.hull)} (${f(n0.drag)}) | ${f(o0.rud)} ${f(n0.rud)} | ${f(o0.rud - o10.rud)} ${f(n0.rud - n10.rud)} | ${f(bo[0])} at ${bo[1]}  ${f(bn[0])} at ${bn[1]} [${bn[2].toFixed(2)}, ${bn[3].toFixed(2)}]`);
}
