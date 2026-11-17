// score_c2.mjs: h1b's scoring (as c1's score.mjs) of the captive hold-out: h1b steady law, v3 (c1's stored rows), and C2.
//   node score_c2.mjs -> out/score_c2.txt
import { readFileSync, writeFileSync } from 'node:fs';
const c1 = JSON.parse(readFileSync(new URL('../c1-holdout-rerun/out/tow.json', import.meta.url))).out, c2 = JSON.parse(readFileSync(new URL('./out/tow_c2.json', import.meta.url)));
const h1b = JSON.parse(readFileSync(new URL('./out/holdout.json', import.meta.url)));
const lines = []; const log = (s) => { lines.push(s); console.log(s); };
const mean = (a) => a.reduce((s, v) => s + v, 0) / a.length, sd = (a) => { const m = mean(a); return Math.sqrt(mean(a.map((v) => (v - m) ** 2))); };
const hulls = c1.filter((h) => h.sys !== 1);
for (const h of hulls) { const ref = h1b.find((x) => x.sys === h.sys), n = c2.find((x) => x.sys === h.sys);
  h.rows.forEach((r, i) => { const s = ref.rows[i], q = n.rows[i]; if (Math.abs(s.beta - r.beta) > 1e-3 || Math.abs(q.beta - r.beta) > 1e-3) throw new Error('row mismatch ' + h.sys); r.h1b = { side: s.side, clr: s.clr }; r.c2base_0 = q.c2base_0; r.c2both_0 = q.c2both_0; }); }
const keys = ['h1b', 'base_0', 'both_0', 'c2base_0', 'c2both_0'], p = (v) => (100 * v).toFixed(1) + '%', f = (v) => v.toFixed(3);
log(`hulls ${hulls.length}, runs ${hulls.reduce((s, h) => s + h.rows.length, 0)}`);
log('UPRIGHT against tank | hull means side: min max mean | all runs side: mean scatter | hull means centre (L): min max | all runs centre: mean worst | Fn<0.4, leeway>=3: n, side mean, scatter, centre | wide shallow hulls 24 26 31 33: hull means');
for (const k of keys) {
  const per = hulls.map((h) => { const u = h.rows.filter((r) => r.beta >= 1.5); return { sys: h.sys, side: mean(u.map((r) => r[k].side / r.sideRef - 1)), clr: mean(u.map((r) => r[k].clr - r.clrRef)) }; });
  const all = hulls.flatMap((h) => h.rows), es = all.map((r) => r[k].side / r.sideRef - 1), ec = all.map((r) => r[k].clr - r.clrRef);
  const ns = all.filter((r) => r.fn < 0.4 && r.beta >= 3), ens = ns.map((r) => r[k].side / r.sideRef - 1);
  log(`${k.padEnd(8)} | ${p(Math.min(...per.map((q) => q.side)))} ${p(Math.max(...per.map((q) => q.side)))} ${p(mean(per.map((q) => q.side)))} | ${p(mean(es))} ${p(sd(es))} | ${f(Math.min(...per.map((q) => q.clr)))} ${f(Math.max(...per.map((q) => q.clr)))} | ${f(mean(ec))} ${f(Math.max(...ec.map(Math.abs)))} | ${ns.length} ${p(mean(ens))} ${p(sd(ens))} ${f(mean(ns.map((r) => r[k].clr - r.clrRef)))} | ${[24, 26, 31, 33].map((s) => p(per.find((q) => q.sys === s).side)).join(' ')}`);
}
log('\nAgainst h1b steady law, same runs: side ratio mean, scatter, min, max; centre shift mean, min, max');
for (const k of keys.slice(1)) { const all = hulls.flatMap((h) => h.rows), e = all.map((r) => r[k].side / r.h1b.side - 1), c = all.map((r) => r[k].clr - r.h1b.clr);
  log(`${k.padEnd(8)} | ${p(mean(e))} ${p(sd(e))} ${p(Math.min(...e))} ${p(Math.max(...e))} | ${f(mean(c))} ${f(Math.min(...c))} ${f(Math.max(...c))}`); }
const drift = hulls.flatMap((h) => h.rows.flatMap((r) => [r.c2base_0.drift, r.c2both_0.drift]));
log(`\nsteadiness (C2): largest change of side force between the last two transits ${(100 * Math.max(...drift)).toFixed(2)}%`);
writeFileSync(new URL('./out/score_c2.txt', import.meta.url), lines.join('\n') + '\n');
