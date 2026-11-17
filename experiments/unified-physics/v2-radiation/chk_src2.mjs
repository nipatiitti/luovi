import { SM, makeBoat, KN, RAD, hydro } from './sealib.mjs';
const b0 = makeBoat('hboat'), sd = b0.d.sea, k0 = Math.round(-sd.h0 / sd.dh); let dm = 0; for (const q of sd.stations) dm += 1000 * (q.A[k0 + 3] - q.A[k0 - 3]) / (6 * sd.dh) * sd.ds; const h = hydro(b0);
console.log('d(m33)/d(sinkage) kg/m', dm.toFixed(0), 'm33', h.m33.toFixed(0), 'M', h.M, 'critical damping heave kg/s', (2 * (h.M + h.m33) * 2 * Math.PI / h.Theave).toFixed(0));
for (const [kn, Mom, fr] of [[6.5, -2500, false], [6.5, -2500, true], [6.5, 2500, false], [6.5, -700, false], [3, -2500, false]]) { SM.C.AFREEZE = fr; const b = makeBoat('hboat', { thetaDeg: 1, u: kn * KN }), dt = 1 / 240, psi0 = b.psi, o = []; let mx = -99, mn = 99, tm = 0;
  for (let i = 0; i < 100 / dt; i++) { b.u = kn * KN; b.v = 0; b.r = 0; b.p = 0; b.phi = 0; b.psi = psi0; b.step(dt, { sails: false, tillerDeg: 0 }, { wind: 0, windDir: 0, sea: null, pitchMoment: Mom });
    const T = b.theta / RAD; tm += T; mx = Math.max(mx, T); mn = Math.min(mn, T); if ((i + 1) % 4800 === 0) { o.push((mx - mn).toFixed(2)); mx = -99; mn = 99; } }
  console.log('towed', kn, 'kn moment', Mom, 'added mass frozen at still waterline:', fr, 'pp pitch per 20 s', o.join(' '), 'mean trim', (tm / 24000).toFixed(2)); }
