// r1-rudder GIF data: the H-boat held on a straight course at 5 knots (cannot turn), rudder held at each angle:
// force on the rudder stations, old and new model. Numbers are force / (water pressure x 0.336 m2) = force / 1109 N.
import fs from 'fs'; import { isoData } from './t_iso.mjs'; import { SM, SAILS } from './lib.mjs';
const angs = []; for (let a = 0; a <= 60; a += 1.5) angs.push(a);
const res = {}, U = 2.57, q = 0.5 * 1000 * U * U * 0.336;
for (const after of [false, true]) { SM.C.R1 = after; res[after ? 'new' : 'old'] = angs.map((a) => {
  const { h } = isoData('hboat', () => true); h.tillerMaxDeg = 60; const b = new SM.Boat(h, SAILS.hboat, { u: U }); let Y = 0, X = 0, at = 0, k = 0; const n = 240 * 6;
  for (let i = 0; i < n; i++) { b.step(1 / 240, { tillerDeg: a, sails: false }, { wind: 0 }); if (i > n * 0.7) { Y += b.out.rudderY; X += b.out.rudderX; at += b.out.rudderAttach; k++; } }
  return { a, CL: +(-Y / k / q).toFixed(3), CD: +(-X / k / q).toFixed(3), att: +(at / k).toFixed(2) }; }); }
SM.C.R1 = true;
fs.writeFileSync(new URL('./out/r1-force-curve.json', import.meta.url), JSON.stringify({ angs, old: res.old, new: res.new }));
for (const a of [15, 30, 45, 60]) { const i = angs.indexOf(a); console.log(a, 'old', res.old[i].CL, res.old[i].CD, 'new', res.new[i].CL, res.new[i].CD, res.new[i].att); }
