import { makeBoat, SM, KN, RAD } from './scen_lib.mjs';
const b = makeBoat('hboat', { u: 5 * KN }); for (let i = 0; i < 360; i++) b.step(1 / 240, { tillerDeg: 0, sails: false }, { wind: 0 }); b.u = 5 * KN;
let prev = 0; const rows = [];
for (let i = 0; i < 240 * 4; i++) { b.step(1 / 240, { tillerDeg: 60, sails: false }, { wind: 0 }); const L = Math.hypot(b.out.rudderY, b.out.rudderX);
  rows.push([i, (i / 240).toFixed(3), Math.round(L), b.out.rudderAttach.toFixed(2), b.markers.filter((m) => m.x > 5.9).map((m) => `${m.x.toFixed(2)}:${(b.Xatt[m._cell]).toFixed(2)}:${m.Plin.toFixed(3)}:${m.Patt.toFixed(3)}:${m.cap.toFixed(3)}`).join(' ')]); }
let at = rows.findIndex((r, i) => i > 300 && r[2] > 1.8 * rows[i - 3][2]);
for (let i = at - 4; i < at + 6; i++) console.log(rows[i].join(' | '));
