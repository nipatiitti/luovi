// wash.mjs: how much of the rudder's steady side force the keel and hull ahead of it take away (r1's t_tow.mjs measure):
// the boat held at 5 knots and a leeway angle, rudder at 0; the rudder's force against the same stations with everything
// ahead of them removed. Without and with C2 (R1 and R2 on).
import { loadModel, HULLS, SAILS } from './lib.mjs';
const RAD = Math.PI / 180, U = 2.57;
function tow(M, key, beta, alone) {
  const h = JSON.parse(JSON.stringify(HULLS[key])); h.mass = 1e12;
  if (alone) for (let i = 0; i < h.n; i++) if (!(h.rud[i] > 0)) { h.A[i] = 0; h.T[i] = 0; h.sharp[i] = 0; }
  const b = new M.Boat(h, SAILS[key], { u: U * Math.cos(beta * RAD) }); b.v = -U * Math.sin(beta * RAD);
  let Y = 0, T = 0, k = 0; const n = 240 * 8;
  for (let i = 0; i < n; i++) { b.step(1 / 240, { tillerDeg: 0, sails: false }, { wind: 0 }); if (i > n * 0.7) { Y += b.out.rudderY; T += b.out.rudderY + b.out.keelY; k++; } }
  return { Y: Y / k, T: T / k };
}
for (const [tag, M] of [['v3', loadModel({ R1: true, R2: true, C2: false })], ['c2', loadModel({ R1: true, R2: true, C2: true })]])
  for (const key of ['hboat', 'ifboat']) for (const beta of [3, 6, 9]) {
    const full = tow(M, key, beta, false), alone = tow(M, key, beta, true);
    console.log(tag, key, 'leeway', beta, 'rudder behind keel', Math.round(full.Y), 'N, alone', Math.round(alone.Y), 'N, removed', (100 * (1 - full.Y / alone.Y)).toFixed(0) + '%', '| whole boat side force', Math.round(full.T), 'N');
  }
