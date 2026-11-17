// run_holdout.mjs
// Hold-out test of the repaired rule on every Delft series model with keel, rudder and upright
// yawed tests (34 models never used before; Sysser 1 is listed but was the tuning hull).
// Every constant is frozen: CONSTANTS from slicelaw.mjs plus SHED_FRACTION = 1.
//   node run_holdout.mjs      (needs out/delft_cases.json from extract_delft.py)
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { precompute, delftModel } from './hulls.mjs';
import { marchSteady, CONSTANTS } from './slicelaw.mjs';

const REPAIRED = { ...CONSTANTS, SHED_FRACTION: 1 };
const cases = JSON.parse(readFileSync(new URL('./out/delft_cases.json', import.meta.url)));
const round = (v, p = 4) => (Number.isFinite(v) ? Number(v.toPrecision(p)) : null);
const interp = (tab, V) => {
  for (let i = 1; i < tab.length; i++) if (tab[i - 1][0] <= V && V <= tab[i][0]) return tab[i - 1][1] + ((tab[i][1] - tab[i - 1][1]) * (V - tab[i - 1][0])) / (tab[i][0] - tab[i - 1][0]);
  return null;
};
const out = [];
const t0 = Date.now();
for (const c of cases) {
  const desc = delftModel(c);
  const body = precompute(desc, 131);
  const xCg = c.L / 2 - c.lcb, xF = xCg - c.dFore, xA = xCg - c.dAft;
  const q = (V) => 500 * V * V * c.L * body.Tmax;
  const rows = [];
  for (const t of c.tests) {
    const beta = Math.abs(t.beta), side = Math.abs(t.Ff + t.Fa);
    if (beta < 0.5) continue;
    let base = interp(c.upright, t.V);
    const zero = c.tests.find((z) => Math.abs(z.beta) < 0.3 && Math.abs(z.V - t.V) < 0.02);
    if (zero) base = zero.Rt; // same run series, same day: the better baseline when it exists
    const m = marchSteady(body, { U: t.V, betaDeg: beta }, REPAIRED);
    const o = marchSteady(body, { U: t.V, betaDeg: beta }, CONSTANTS);
    rows.push({
      V: t.V, beta: round(beta), sideRef: round(side / q(t.V)), side: round(m.sideForce / q(t.V)), sideOrig: round(o.sideForce / q(t.V)),
      clrRef: round((t.Ff * xF + t.Fa * xA) / (t.Ff + t.Fa) / c.L), clr: round(m.xCLR / c.L), clrOrig: round(o.xCLR / c.L),
      dragRef: base === null ? null : round((t.Rt - base) / q(t.V)), drag: round(m.dragDueToSideForce / q(t.V)),
    });
  }
  const use = rows.filter((r) => r.beta >= 1.5);
  const mean = (f) => use.reduce((s, r) => s + f(r), 0) / use.length;
  const dr = use.filter((r) => r.dragRef !== null && r.dragRef > 0.0005);
  const sweep = [];
  for (let b = 0; b <= 14; b += 0.5) { const m = marchSteady(body, { U: c.tests[0].V, betaDeg: Math.max(b, 0.01) }, REPAIRED); sweep.push({ beta: b, side: round(m.sideForce / q(c.tests[0].V)), clr: round(m.xCLR / c.L), kept: Array.from(m.kept, (v) => round(v / (c.tests[0].V * body.Tmax ** 2), 3)) }); }
  out.push({
    sys: c.sys, series: c.series, L: c.L, bodyL: body.L, bwl: c.bwl, tc: c.tc, cp: c.cp, LEK: c.LEK, LER: c.LER, Tmax: body.Tmax, n: use.length,
    betaMax: Math.max(...rows.map((r) => r.beta)),
    sideMeanPct: round(100 * mean((r) => r.side / r.sideRef - 1), 3), sideWorstPct: round(100 * Math.max(...use.map((r) => Math.abs(r.side / r.sideRef - 1))), 3),
    sideOrigMeanPct: round(100 * mean((r) => r.sideOrig / r.sideRef - 1), 3),
    clrMeanErr: round(mean((r) => r.clr - r.clrRef), 3), clrWorstErr: round(Math.max(...use.map((r) => Math.abs(r.clr - r.clrRef))), 3),
    dragMeanPct: dr.length ? round(100 * dr.reduce((s, r) => s + r.drag / r.dragRef - 1, 0) / dr.length, 3) : null,
    rows, sweep, x: body.x.map((v) => round(v)), T: body.T.map((v) => round(v)), halfBeam: body.specs.map((s) => round(s.b)), canoeDraft: body.specs.map((s) => round(s.b > 1e-9 ? s.Tc : 0)),
  });
  const h = out[out.length - 1];
  console.log(`Sys ${String(c.sys).padStart(2)} s${c.series} B/T ${(c.bwl / c.tc).toFixed(1)} LER ${c.LER} n ${h.n} betaMax ${h.betaMax.toFixed(1)}  side mean ${h.sideMeanPct}% worst ${h.sideWorstPct}% (orig rule ${h.sideOrigMeanPct}%)  CLR mean ${h.clrMeanErr} worst ${h.clrWorstErr}  drag ${h.dragMeanPct}%   ${Date.now() - t0}ms`);
}
mkdirSync(new URL('./out/', import.meta.url), { recursive: true });
writeFileSync(new URL('./out/holdout.json', import.meta.url), JSON.stringify(out));
