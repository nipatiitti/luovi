// chk_tow.mjs: towed on flat water (no sails, upright), a 2 degree pitch kick: does the slice law as proposed settle at each speed?
import { SM, makeBoat, tow, KN, RAD } from './sealib.mjs';
for (const kn of [3, 5, 6, 6.5, 7, 8]) { const b = makeBoat('hboat', { thetaDeg: 2, u: kn * KN }); let mx = 0; const env = [];
  try { tow(b, kn * KN, 100, 1 / 240, null, (bb, i) => { mx = Math.max(mx, Math.abs(bb.theta / RAD)); if ((i + 1) % (20 * 240) === 0) { env.push(mx.toFixed(2)); mx = 0; } }); } catch (e) { env.push(e.message); }
  console.log(kn, 'kn: max |pitch| deg per 20 s:', env.join(' ')); }
