// steady-law variants scored on the hold-out: frozen, + attachment number, + near wash
import { readFileSync } from 'node:fs';
import { precompute, delftModel } from './hulls.mjs';
import { marchSteady, CONSTANTS } from './slicelaw.mjs';
const cases = JSON.parse(readFileSync(new URL('./out/delft_cases.json', import.meta.url))).filter(c=>c.sys!==1);
const V = { frozen: { ...CONSTANTS, SHED_FRACTION: 1 }, attach: { ...CONSTANTS, SHED_FRACTION: 1, STALL_DROP: 0.1 }, nolimit: { ...CONSTANTS, SHED_FRACTION: 1, CL_MAX: Infinity } };
const mean = (a) => a.reduce((s, v) => s + v, 0) / a.length;
for (const [k, K] of Object.entries(V)) {
  const per = [], all = [], allc = [];
  for (const c of cases) {
    const body = precompute(delftModel(c), 131), xCg = c.L / 2 - c.lcb, xF = xCg - c.dFore, xA = xCg - c.dAft; const e = [], ec = [];
    for (const t of c.tests) { const beta = Math.abs(t.beta); if (beta < 0.5) continue; const q = 500 * t.V * t.V * c.L * body.Tmax; const m = marchSteady(body, { U: t.V, betaDeg: beta }, K);
      const er = m.sideForce / Math.abs(t.Ff + t.Fa) - 1, cl = m.xCLR / c.L - (t.Ff * xF + t.Fa * xA) / (t.Ff + t.Fa) / c.L; all.push(er); allc.push(cl); if (beta >= 1.5) { e.push(er); ec.push(cl); } }
    per.push(mean(e));
  }
  console.log(k, 'hull means', (100 * Math.min(...per)).toFixed(1), (100 * Math.max(...per)).toFixed(1), 'all mean', (100 * mean(all)).toFixed(1), 'centre', mean(allc).toFixed(3));
}
