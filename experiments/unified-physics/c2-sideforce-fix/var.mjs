// var.mjs: time-domain variants against the steady law on c1's 8 diagnostic hulls (Fn < 0.4, leeway >= 3)
import { readFileSync } from 'node:fs';
import { loadModel, tow } from './tow.mjs';
import { marchSteady, CONSTANTS } from './slicelaw.mjs';
const bodies = JSON.parse(readFileSync(new URL('./out/bodies.json', import.meta.url)));
const h1b = JSON.parse(readFileSync(new URL('./out/holdout.json', import.meta.url)));
const cases = JSON.parse(readFileSync(new URL('./out/delft_cases.json', import.meta.url)));
const must = (s, a) => { if (!s.includes(a)) throw new Error('patch target missing: ' + a); return s; };
const rep = (a, b) => (s) => must(s, a).replace(a, b);
const NEAR = 'const near = m.Aw > 0 ? 0.5 * (1 + m.xw / Math.sqrt(m.xw * m.xw + sw * sw + 1e-12)) : 0;';
const LAG = 'Xatt[ci] += (Xt - Xatt[ci]) * (1 - Math.exp(-Math.abs(ut) * dt / (C.ATTACH_LAG * Math.max(m.ell, d))));\n        }';
const V = { // (the one-at-a-time diagnostic patches of the first pass were run on v3's model.js; their numbers are in result.md)
  base: loadModel(false, false),
  c2: loadModel(false, false, (t) => t, true),
  c2NoLag: loadModel(false, false, rep(LAG, 'Xatt[ci] = Xt;\n        }'), true),
  c2both: loadModel(true, true, (t) => t, true),
};
const want = (process.argv[2] || Object.keys(V).join(',')).split(',');
const SYS = (process.env.SYS || '2,6,11,20,27,33,45,61').split(',').map(Number);
const res = {}; for (const k of want) res[k] = { h: [], c: [] };
for (const sys of SYS) {
  const bd = bodies[sys], c = cases.find((q) => q.sys === sys), ref = h1b.find((x) => x.sys === sys);
  for (const r of ref.rows.filter((r) => r.beta >= 3 && r.V / Math.sqrt(9.81 * c.L) < 0.4)) {
    const U = r.V * Math.sqrt(bd.s), Lref = c.L * bd.s, q = 500 * U * U * Lref * bd.Tmax;
    for (const k of want) { const t = tow(V[k], bd, U, r.beta, 0); res[k].h.push(t.side / q / r.side - 1); res[k].c.push(t.xCLR / Lref - r.clr); }
  }
}
const mean = (a) => a.reduce((s, v) => s + v, 0) / a.length;
for (const k of want) console.log(k.padEnd(9), 'side vs h1b', (100 * mean(res[k].h)).toFixed(1) + '%', 'min', (100 * Math.min(...res[k].h)).toFixed(1), 'max', (100 * Math.max(...res[k].h)).toFixed(1), 'centre', mean(res[k].c).toFixed(3));
