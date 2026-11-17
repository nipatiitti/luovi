import { SM, makeBoat, tow, KN } from './sealib.mjs';
for (const dt of [1 / 240, 1 / 120, 1 / 60]) { const b = makeBoat('hboat', { zeta: 0.1, thetaDeg: 2, u: 5 * KN }); let mx = 0; const env = [];
  try { tow(b, 5 * KN, 90, dt, null, (bb, i) => { mx = Math.max(mx, Math.abs(bb.zeta)); if ((i + 1) % Math.round(15 / dt) === 0) { env.push(mx.toFixed(4)); mx = 0; } }); } catch (e) { env.push(e.message); }
  console.log('flat water, 5 kn, free decay, dt 1/' + Math.round(1 / dt), 'max |heave| per 15 s:', env.join(' ')); }
