// isolated rudder: the H-boat's rudder stations alone, held at angle; CN, CL, CD against angle
import fs from 'fs'; import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const which = './model.js';
const SM = require(which); if (process.env.R1 === '0') SM.C.R1 = false; const HULLS = JSON.parse(fs.readFileSync(new URL('./out/hulls.json', import.meta.url))), HULLS0 = JSON.parse(fs.readFileSync(new URL('./data/hulls_orig.json', import.meta.url))), SAILS = JSON.parse(fs.readFileSync(new URL('./out/sails.json', import.meta.url)));
const RAD = Math.PI / 180;
export function isoData(key, keep) {
  const h = JSON.parse(JSON.stringify((SM.C.R1 ? HULLS : HULLS0)[key])); let S = 0, span = 0;
  for (let i = 0; i < h.n; i++) { if (!keep(i * h.dx, h, i)) { h.A[i] = 0; h.T[i] = 0; h.sharp[i] = 0; h.rud[i] = 0; } else { S += h.T[i] * h.dx; span = Math.max(span, h.T[i]); } }
  h.mass = 1e12; h.tillerMaxDeg = 90; return { h, S, span };
}
export function sweep(SM, h, S, U, mode, angles, secs = 6) {
  const out = [];
  for (const a of angles) {
    const b = new SM.Boat(h, SAILS.hboat, { u: mode === 'drift' ? U * Math.cos(a * RAD) : U });
    if (mode === 'drift') b.v = -U * Math.sin(a * RAD);
    let Y = 0, X = 0, k = 0, att = 0; const n = Math.round(secs / SM.C.dt);
    for (let i = 0; i < n; i++) { b.step(SM.C.dt, { tillerDeg: mode === 'drift' ? 0 : a, sails: false }, { wind: 0 }); if (i > n * 0.7) { Y += b.out.keelY + b.out.rudderY; X += b.out.hullX; att += b.out.rudderAttach; k++; } }
    Y /= k; X /= k; const q = 0.5 * 1000 * U * U * S;
    let CL, CD; if (mode === 'drift') { const ca = Math.cos(a * RAD), sa = Math.sin(a * RAD); CL = (Y * ca + X * sa) / q; CD = (-X * ca + Y * sa) / q; } else { CL = -Y / q; CD = -X / q; }
    out.push({ a, CL: +CL.toFixed(3), CD: +CD.toFixed(3), CN: +(CL * Math.cos(a * RAD) + CD * Math.sin(a * RAD)).toFixed(3), att: +(att / k).toFixed(2) });
  }
  return out;
}
if (process.argv[1].endsWith('t_iso.mjs')) {
  const { h, S, span } = isoData('hboat', (x, h, i) => h.rud[i] > 0);
  console.log('area', S.toFixed(3), 'span', span, 'ARgeo', (span * span / S).toFixed(2));
  for (const U of [2.57, 0.514]) for (const mode of ['delta', 'drift']) { console.log(U, mode); for (const r of sweep(SM, h, S, U, mode, [5, 10, 15, 20, 25, 30, 40, 50, 60, 75, 90].filter(a => mode === 'delta' || a < 90))) console.log(JSON.stringify(r)); }
}
