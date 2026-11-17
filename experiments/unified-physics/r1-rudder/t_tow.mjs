// whole boat towed straight (held), rudder swept: rudder side force and attachment; and towed at leeway: keel wash on the rudder
import { isoData, sweep } from './t_iso.mjs'; import { SM, SAILS, HULLS } from './lib.mjs';
const RAD = Math.PI / 180, U = 2.57;
function tow(key, beta, delta, keep) {
  const { h } = isoData(key, keep || (() => true)); h.tillerMaxDeg = 60;
  const b = new SM.Boat(h, SAILS[key], { u: U * Math.cos(beta * RAD) }); b.v = -U * Math.sin(beta * RAD);
  let Y = 0, X = 0, a = 0, f = 0, k = 0; const n = 240 * 8;
  for (let i = 0; i < n; i++) { b.step(1 / 240, { tillerDeg: delta, sails: false }, { wind: 0 }); if (i > n * 0.7) { Y += b.out.rudderY; X += b.out.rudderX; a += b.out.rudderAttach; f += b.out.rudderFlowDeg; k++; } }
  return { Y: Y / k, X: X / k, att: a / k, flow: f / k };
}
for (const key of ['hboat', 'ifboat']) {
  console.log(key, 'straight, rudder swept: side force N, drag N, attachment');
  for (const d of [5, 10, 15, 20, 30, 45, 60]) { const r = tow(key, 0, d); console.log(d, Math.round(-r.Y), Math.round(-r.X), r.att.toFixed(2)); }
  // wash: rudder side force at leeway with everything, against the same stations with the keel and hull ahead removed
  for (const beta of [3, 6, 9]) {
    const full = tow(key, beta, 0), alone = tow(key, beta, 0, (x, h, i) => h.rud[i] > 0);
    console.log(key, 'leeway', beta, 'rudder force behind keel', Math.round(full.Y), 'alone', Math.round(alone.Y), 'removed', (100 * (1 - full.Y / alone.Y)).toFixed(0) + '%', 'flow', full.flow.toFixed(1));
  }
}
