// t_exact.mjs: the merged model with a switch off against the three originals, bit for bit, over a mixed minute.
import fs from 'fs'; import { createRequire } from 'module'; import { loadModel, HULLS, SAILS } from './lib.mjs';
const require = createRequire(import.meta.url), dir = process.env.ORIG || '..';
const refs = { base: [require(dir + '/base/model.js'), { R1: false, R2: false }, JSON.parse(fs.readFileSync(dir + '/base/data/hulls.json'))],
  r1: [require(dir + '/r1/model.js'), { R1: true, R2: false }, JSON.parse(fs.readFileSync(dir + '/r1/data/hulls.json'))],
  r2: [require(dir + '/r2/model.js'), { R1: false, R2: true }, JSON.parse(fs.readFileSync(dir + '/r2/data/hulls.json'))] };
for (const [name, [REF, flags, hullsRef]] of Object.entries(refs)) for (const key of ['hboat', 'ifboat']) {
  const M = loadModel(flags), a = new REF.Boat(hullsRef[key], SAILS[key], { psiDeg: -45, u: 2.5 }), b = new M.Boat(HULLS[key], SAILS[key], { psiDeg: -45, u: 2.5 });
  const dt = M.C.dt, RAD = M.RAD, KN = M.KN; let worst = 0, n = 0;
  for (let i = 0; i < 70 / dt; i++) {
    const t = i * dt, ctlOf = (bb, MM) => t < 20 ? { tillerDeg: MM.helmTo(bb, -45 * RAD), mainSheet: 8, jibSheet: 12, crew: 1 }
      : t < 28 ? { tillerDeg: 35, mainSheet: 8, jibSheet: 12, crew: -1, jibSide: bb.psi > 0 ? 1 : undefined }
      : t < 45 ? { tillerDeg: MM.helmTo(bb, 90 * RAD, 35), mainSheet: 30, jibSheet: 25, crew: -1 }
      : t < 55 ? { tillerDeg: 0, tillerFree: true, mainSheet: 30, jibSheet: 25, crew: -1 } : { tillerDeg: -60, sails: false };
    const env = { wind: (t > 32 && t < 50 ? 30 : 12) * KN, windDir: 0 };
    a.step(dt, ctlOf(a, REF), env); b.step(dt, ctlOf(b, M), env);
    for (const k of ['u', 'v', 'r', 'p', 'psi', 'phi', 'delta', 'X', 'Y']) { const e = Math.abs(a[k] - b[k]); if (e > worst) worst = e; } n++;
  }
  console.log(name, key, 'steps', n, 'largest difference in any state', worst, worst === 0 ? 'EXACT' : '', `(end: ${(b.speed() / KN).toFixed(2)} kn, heel ${(b.phi / RAD).toFixed(1)}, hdg ${(M.wrap(b.psi) / RAD).toFixed(0)})`);
}
