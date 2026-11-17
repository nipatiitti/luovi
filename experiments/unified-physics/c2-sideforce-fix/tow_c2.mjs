// tow_c2.mjs: the c1 captive hold-out again with C.C2 on (R1 = R2 = false, and both on), upright, from the cached hulls
// (cache.mjs). c1's own rows for the model without C2 are in ../c1-holdout-rerun/out/tow.json and are not recomputed.  -> out/tow_c2.json
import { readFileSync, writeFileSync } from 'node:fs';
import { loadModel, tow, r4 } from './tow.mjs';
const bodies = JSON.parse(readFileSync(new URL('./out/bodies.json', import.meta.url)));
const cases = JSON.parse(readFileSync(new URL('./out/delft_cases.json', import.meta.url)));
const F = { c2base: loadModel(false, false, (t) => t, true), c2both: loadModel(true, true, (t) => t, true) };
const out = [];
for (const c of cases) {
  const bd = bodies[c.sys], Lref = c.L * bd.s, q = (V) => 500 * V * V * Lref * bd.Tmax, rows = [];
  for (const t of c.tests) {
    const beta = Math.abs(t.beta); if (beta < 0.5) continue;
    const U = t.V * Math.sqrt(bd.s), row = { V: t.V, beta: r4(beta) };
    for (const [k, M] of Object.entries(F)) { const r = tow(M, bd, U, beta, 0); row[k + '_0'] = { side: r4(r.side / q(U)), clr: r4(r.xCLR / Lref), drift: r4(r.drift) }; }
    rows.push(row);
  }
  out.push({ sys: c.sys, rows }); console.log('Sys', c.sys, rows.length);
}
writeFileSync(new URL('./out/tow_c2.json', import.meta.url), JSON.stringify(out));
