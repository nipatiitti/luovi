import { SM, makeBoat, KN, RAD } from './sealib.mjs';
import { helmTo } from './lib.mjs';
const cases = JSON.parse(process.argv[2]);
for (const cs of cases) { Object.assign(SM.C, { RIGQ: -1, XDYN: 1, PITCHDRIVE: 1 }, cs);
  const b = makeBoat('hboat', { psiDeg: -45, u: 2.5 }), dt = 1 / (cs.div || 240), env = { wind: 7, windDir: 0, sea: null }, o = []; let mx = 0, mean = 0, n = 0;
  const T = cs.T || 120;
  for (let i = 0; i < T / dt; i++) { b.step(dt, { tillerDeg: helmTo(b, -45 * RAD), mainSheet: 8, jibSheet: 12, crew: 1 }, env);
    mean += b.theta / RAD; n++; if ((i + 1) % Math.round(20 / dt) === 0) { const m = mean / n; o.push(m.toFixed(2)); mean = 0; n = 0; }
    mx = Math.max(mx, b.theta / RAD); if (!b._mn || b.theta / RAD < b._mn) b._mn = b.theta / RAD; if ((i + 1) % Math.round(20 / dt) === 0) { o.push('pp' + (mx - b._mn).toFixed(2)); mx = -99; b._mn = 99; } }
  console.log(JSON.stringify(cs), 'mean/peak-to-peak pitch per 20 s:', o.join(' '), 'speed', (b.speed() / KN).toFixed(2), 'heel', (b.phi / RAD).toFixed(1)); }
