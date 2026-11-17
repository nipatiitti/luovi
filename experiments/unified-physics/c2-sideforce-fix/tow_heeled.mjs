// tow_heeled.mjs: the heeled Delft runs (10 and 20 deg; extract_heeled.py) towed captive. Up to 3 runs per hull and heel
// (Froude under 0.40, leeway 3 deg and up, spread over the leeway range). Flags: R1 off throughout; "base" = R2 off, "R2" = R2 on;
// each without and with C2. Tank side force = Ff + Fa, taken as the horizontal force square to the centreline [assumed];
// model: horizontal force square to the track (as upright). Centre from Ff, Fa as upright.  -> out/tow_heeled.json
import { readFileSync, writeFileSync } from 'node:fs';
import { loadModel, tow, r4 } from './tow.mjs';
const bodies = JSON.parse(readFileSync(new URL('./out/bodies.json', import.meta.url)));
const cases = JSON.parse(readFileSync(new URL('./out/delft_cases.json', import.meta.url))).filter((c) => c.sys !== 1);
const heeled = JSON.parse(readFileSync(new URL('./out/delft_heeled.json', import.meta.url)));
const F = { base: loadModel(false, false), R2: loadModel(false, true), c2base: loadModel(false, false, (t) => t, true), c2R2: loadModel(false, true, (t) => t, true) };
const out = [];
for (const c of cases) {
  const bd = bodies[c.sys], Lref = c.L * bd.s, xF = c.L / 2 - c.lcb - c.dFore, xA = c.L / 2 - c.lcb - c.dAft, hb = heeled[c.sys]; if (!hb) continue;
  for (const heel of [10, 20]) {
    const ok = (hb[heel] || []).filter((t) => Math.abs(t.beta) >= 3 && t.V / Math.sqrt(9.81 * c.L) < 0.4 && Math.abs(t.Ff + t.Fa) > 0).sort((a, b) => Math.abs(a.beta) - Math.abs(b.beta));
    const pick = ok.length <= 3 ? ok : [ok[0], ok[Math.floor(ok.length / 2)], ok[ok.length - 1]];
    for (const t of pick) {
      const beta = Math.abs(t.beta), U = t.V * Math.sqrt(bd.s), q = 500 * U * U * Lref * bd.Tmax;
      const row = { sys: c.sys, heel, V: t.V, beta: r4(beta), bt: r4(c.bwl / c.tc), sideRef: r4(Math.abs(t.Ff + t.Fa) / (500 * t.V * t.V * c.L * bd.Tmax / bd.s)), clrRef: r4((t.Ff * xF + t.Fa * xA) / (t.Ff + t.Fa) / c.L) };
      for (const [k, M] of Object.entries(F)) { const r = tow(M, bd, U, beta, heel); row[k] = { side: r4(r.side / q), clr: r4(r.xCLR / Lref) }; }
      out.push(row);
    }
  }
  console.log('Sys', c.sys, out.length);
}
writeFileSync(new URL('./out/tow_heeled.json', import.meta.url), JSON.stringify(out));
const mean = (a) => a.reduce((s, v) => s + v, 0) / a.length, sd = (a) => { const m = mean(a); return Math.sqrt(mean(a.map((v) => (v - m) ** 2))); };
for (const heel of [10, 20]) for (const k of Object.keys(F)) { const rs = out.filter((r) => r.heel === heel), e = rs.map((r) => r[k].side / r.sideRef - 1), cc = rs.map((r) => r[k].clr - r.clrRef);
  const per = {}; rs.forEach((r, i) => (per[r.sys] = per[r.sys] || []).push(e[i])); const pm = Object.values(per).map(mean);
  console.log(`heel ${heel} ${k.padEnd(6)} n ${rs.length} | side mean ${(100 * mean(e)).toFixed(1)}% scatter ${(100 * sd(e)).toFixed(1)}% | hull means ${(100 * Math.min(...pm)).toFixed(1)}..${(100 * Math.max(...pm)).toFixed(1)}% | centre ${mean(cc).toFixed(3)} L`); }
