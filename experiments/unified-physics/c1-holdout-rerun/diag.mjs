// diag.mjs: where does the base time-domain model (R1 = R2 = false) part from h1b's steady law? Base model against
// variants that each undo one unflagged time-domain change (diagnostic copies only; model.js is not changed):
//   model scale (SCALE=1: 0.05 m slices on the 1.6 m model), no attachment number (STALL_OFFSET huge),
//   far-wake wash (near = 1, the wash rule removed), linear suction fade.  -> out/diag.txt
import { writeFileSync } from 'node:fs';
import { loadModel, boatData, tow, cases } from './tow.mjs';
import { readFileSync } from 'node:fs';
const h1b = JSON.parse(readFileSync(new URL('./out/holdout.json', import.meta.url)));
const NEAR = 'const near = m.Aw > 0 ? 0.5 * (1 + m.xw / Math.sqrt(m.xw * m.xw + sw * sw + 1e-12)) : 0;';
const SUC = 'sq(Math.min(1, Math.abs(m.Patt / m.Plin)))';
const must = (s, a) => { if (!s.includes(a)) throw new Error('patch target missing'); return s; };
const V = {
  base: [loadModel(false, false), null],
  modelScale: [loadModel(false, false), 1],
  noAttach: [(() => { const M = loadModel(false, false); M.C.STALL_OFFSET = 1e9; return M; })(), null],
  farWash: [loadModel(false, false, (s) => must(s, NEAR).replace(NEAR, 'const near = m.Aw > 0 ? 1 : 0;')), null],
  linSuction: [loadModel(false, false, (s) => must(s, SUC).replace(SUC, 'Math.min(1, Math.abs(m.Patt / m.Plin))')), null],
  bothFarWash: [loadModel(true, true, (s) => must(s, NEAR).replace(NEAR, 'const near = m.Aw > 0 ? 1 : 0;')), null],
};
const SYS = [2, 6, 11, 20, 27, 33, 45, 61];
const res = {}; for (const k in V) res[k] = { side: [], clr: [], sideH: [], clrH: [] };
for (const c of cases.filter((c) => SYS.includes(c.sys))) {
  const ref = h1b.find((x) => x.sys === c.sys);
  for (const r of ref.rows.filter((r) => r.beta >= 3 && r.V / Math.sqrt(9.81 * c.L) < 0.4)) {
    for (const [k, [SM, sc]] of Object.entries(V)) {
      if (sc) process.env.SCALE = String(sc); else delete process.env.SCALE;
      const bd = boatData(c), U = r.V * Math.sqrt(bd.s), Lref = c.L * bd.s, q = 500 * U * U * Lref * bd.Tmax;
      const t = tow(SM, bd, U, r.beta, 0), side = t.side / q, clr = t.xCLR / Lref;
      res[k].side.push(side / r.sideRef - 1); res[k].clr.push(clr - r.clrRef); res[k].sideH.push(side / r.side - 1); res[k].clrH.push(clr - r.clr);
    }
  }
  console.log('done', c.sys);
}
const mean = (a) => a.reduce((s, v) => s + v, 0) / a.length;
const lines = [`hulls ${SYS.join(' ')}; runs Fn < 0.4, leeway >= 3; n = ${res.base.side.length}`, 'variant | side vs tank mean | centre vs tank mean (L) | side vs h1b mean | centre vs h1b mean (L)'];
for (const k in res) lines.push(`${k.padEnd(11)} | ${(100 * mean(res[k].side)).toFixed(1)}% | ${mean(res[k].clr).toFixed(3)} | ${(100 * mean(res[k].sideH)).toFixed(1)}% | ${mean(res[k].clrH).toFixed(3)}`);
console.log(lines.join('\n')); writeFileSync(new URL('./out/diag.txt', import.meta.url), lines.join('\n') + '\n');
