import { SM, makeBoat, KN, RAD } from './sealib.mjs';
import { helmTo } from './lib.mjs';
// 1: sailing, the pitch moment from a frozen drive after 5 s
for (const cs of [{ XSFREEZE: 5, RIGQ: 0 }, { XSFREEZE: 5, RIGQ: 0, XDYN: 0 }]) { Object.assign(SM.C, { RIGQ: -1, XDYN: 1, PITCHDRIVE: 1, XSFREEZE: 0 }, cs);
  const b = makeBoat('hboat', { psiDeg: -45, u: 2.5 }), dt = 1 / 240, o = []; let mx = -99, mn = 99;
  for (let i = 0; i < 120 / dt; i++) { b.step(dt, { tillerDeg: helmTo(b, -45 * RAD), mainSheet: 8, jibSheet: 12, crew: 1 }, { wind: 7, windDir: 0, sea: null });
    const T = b.theta / RAD; mx = Math.max(mx, T); mn = Math.min(mn, T); if ((i + 1) % 4800 === 0) { o.push((mx - mn).toFixed(2)); mx = -99; mn = 99; } }
  console.log('sailing', JSON.stringify(cs), 'pp pitch per 20 s', o.join(' '), 'Xs', b.XsLast.toFixed(0), 'frozen', b.XsFrozen.toFixed(0), 'hCEp', b.hCEp.toFixed(2), 'kn', (b.speed() / KN).toFixed(2)); }
Object.assign(SM.C, { RIGQ: -1, XDYN: 1, PITCHDRIVE: 1, XSFREEZE: 0 });
// 2: towed upright at 6.5 kn with the same constant bow-down moment; and towed heeled
for (const [kn, Mom, heel, vlee] of [[6.5, 0, 0, 0], [6.5, -2500, 0, 0], [6.5, -5000, 0, 0], [6.5, -2500, -30, 0], [6.5, -2500, -30, 0.25],[6.5, 0, -30, 0.25]]) { const b = makeBoat('hboat', { thetaDeg: 1, u: kn * KN }), dt = 1 / 240, psi0 = b.psi, o = []; let mx = -99, mn = 99;
  for (let i = 0; i < 100 / dt; i++) { b.u = kn * KN; b.v = vlee; b.r = 0; b.p = 0; b.phi = heel * RAD; b.psi = psi0; b.step(dt, { sails: false, tillerDeg: 0 }, { wind: 0, windDir: 0, sea: null, pitchMoment: Mom });
    const T = b.theta / RAD; mx = Math.max(mx, T); mn = Math.min(mn, T); if ((i + 1) % 4800 === 0) { o.push((mx - mn).toFixed(2)); mx = -99; mn = 99; } }
  console.log('towed', kn, 'kn moment', Mom, 'heel', heel, 'v', vlee, 'pp pitch per 20 s', o.join(' '), 'trim', (b.theta / RAD).toFixed(2), 'heave', b.zeta.toFixed(3)); }
