// chk_flat.mjs: close-hauled on FLAT water with the slice law as proposed: does heave and pitch die out? With and without the rig feeling its own pitching.
import { SM, makeBoat, KN, RAD } from './sealib.mjs';
import { helmTo } from './lib.mjs';
for (const rigFeels of [true]) { const b = makeBoat('hboat', { psiDeg: -45, u: 2.5 }), dt = 1 / 240, env = { wind: 7, windDir: 0, sea: null }, o = []; let mx = 0;
  const step0 = b.step.bind(b);
  for (let i = 0; i < 150 * 240; i++) { const q = b.q; if (!rigFeels) b.q = 0; // hide the pitch rate from the rig only: restore it for the hull below
    if (!rigFeels) { b._qSave = q; }
    step0(dt, { tillerDeg: helmTo(b, -45 * RAD), mainSheet: 8, jibSheet: 12, crew: 1 }, env);
    mx = Math.max(mx, Math.abs(b.theta / RAD + 1.2)); if ((i + 1) % (25 * 240) === 0) { o.push(mx.toFixed(2)); mx = 0; } }
  console.log(rigFeels ? 'rig feels pitch rate' : '(not a clean test)', 'max |pitch - mean| deg per 25 s:', o.join(' '), 'speed', (b.speed() / KN).toFixed(2)); if (!rigFeels) break; }
