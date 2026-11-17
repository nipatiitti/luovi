import { SM, makeBoat, KN, RAD } from './sealib.mjs';
import { helmTo } from './lib.mjs';
const sea = SM.makeSea({ wind: 7, fetch: 15000, gamma: 1, dir: 0, seed: 2026 });
for (const [nm, on, s] of [['v3 (four motions)', false, null], ['+ heave and pitch, flat water', true, null], ['+ heave and pitch, sea of ' + sea.nc + ' components', true, sea]]) {
  SM.C.SEA = on; const b = makeBoat('hboat', { psiDeg: -45, u: 2.5 }), n = 9600; const t0 = performance.now();
  for (let i = 0; i < n; i++) b.step(1 / 240, { tillerDeg: helmTo(b, -45 * RAD), mainSheet: 8, jibSheet: 12, crew: 1 }, { wind: 7, windDir: 0, sea: s });
  console.log(nm, ((performance.now() - t0) / n * 1000).toFixed(0), 'microseconds per step'); }
SM.C.SEA = true;
