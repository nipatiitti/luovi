// score.mjs: scores out/tow.json the way h1b scored its hold-out (run_holdout.mjs): per hull, mean side-force error
// and mean centre error over runs with leeway >= 1.5 deg; over all runs (leeway >= 0.5), mean and scatter of side error.
// Sysser 1 (h1b's tuning hull) is left out, as in h1b. Also scores h1b's stored steady-law predictions on the same runs.
//   node score.mjs  -> out/score.txt
import { readFileSync, writeFileSync } from 'node:fs';
const { heels, out } = JSON.parse(readFileSync(new URL('./out/tow.json', import.meta.url)));
const h1b = JSON.parse(readFileSync(new URL('./out/holdout.json', import.meta.url)));
const lines = []; const log = (s) => { lines.push(s); console.log(s); };
const mean = (a) => a.reduce((s, v) => s + v, 0) / a.length, sd = (a) => { const m = mean(a); return Math.sqrt(mean(a.map((v) => (v - m) ** 2))); };
const hulls = out.filter((h) => h.sys !== 1);
// attach h1b's stored predictions row by row (same order: both skip leeway < 0.5)
for (const h of hulls) { const ref = h1b.find((x) => x.sys === h.sys); h.rows.forEach((r, i) => { const s = ref.rows[i]; if (Math.abs(s.beta - r.beta) > 1e-3) throw new Error('row mismatch ' + h.sys); r.h1b = { side: s.side, clr: s.clr }; }); }
const keys = ['h1b', 'base_0', 'R1_0', 'R2_0', 'both_0'];
log(`hulls ${hulls.length}, runs ${hulls.reduce((s, h) => s + h.rows.length, 0)}`);
log('UPRIGHT, against Delft tank | per-hull mean side error: min, max, mean | all runs side error: mean, scatter | per-hull mean centre error (L): min, max | all runs centre: mean, worst | normal speed (Fn < 0.4) leeway >= 3: side mean, scatter, centre mean');
const pick = (r, k) => r[k];
for (const k of keys) {
  const per = hulls.map((h) => { const u = h.rows.filter((r) => r.beta >= 1.5); return { side: mean(u.map((r) => pick(r, k).side / r.sideRef - 1)), clr: mean(u.map((r) => pick(r, k).clr - r.clrRef)) }; });
  const all = hulls.flatMap((h) => h.rows), es = all.map((r) => pick(r, k).side / r.sideRef - 1), ec = all.map((r) => pick(r, k).clr - r.clrRef);
  const ns = all.filter((r) => r.fn < 0.4 && r.beta >= 3), ens = ns.map((r) => pick(r, k).side / r.sideRef - 1);
  const p = (v) => (100 * v).toFixed(1) + '%', f = (v) => v.toFixed(3);
  log(`${k.padEnd(7)} | ${p(Math.min(...per.map((q) => q.side)))} ${p(Math.max(...per.map((q) => q.side)))} ${p(mean(per.map((q) => q.side)))} | ${p(mean(es))} ${p(sd(es))} | ${f(Math.min(...per.map((q) => q.clr)))} ${f(Math.max(...per.map((q) => q.clr)))} | ${f(mean(ec))} ${f(Math.max(...ec.map(Math.abs)))} | n ${ns.length} ${p(mean(ens))} ${p(sd(ens))} ${f(mean(ns.map((r) => pick(r, k).clr - r.clrRef)))}`);
}
log('\nUPRIGHT, model against h1b steady law (same runs): side ratio mean, scatter; centre shift mean, range');
for (const k of keys.slice(1)) {
  const all = hulls.flatMap((h) => h.rows), e = all.map((r) => r[k].side / r.h1b.side - 1), c = all.map((r) => r[k].clr - r.h1b.clr);
  log(`${k.padEnd(7)} | ${(100 * mean(e)).toFixed(1)}% ${(100 * sd(e)).toFixed(1)}% | ${mean(c).toFixed(3)} ${Math.min(...c).toFixed(3)} ${Math.max(...c).toFixed(3)}`);
}
log('\nFLAG EFFECTS, upright, against base: side ratio mean (min..max); centre shift mean (min..max)');
for (const k of ['R1_0', 'R2_0', 'both_0']) {
  const all = hulls.flatMap((h) => h.rows), e = all.map((r) => r[k].side / r.base_0.side - 1), c = all.map((r) => r[k].clr - r.base_0.clr);
  log(`${k.padEnd(7)} | ${(100 * mean(e)).toFixed(2)}% (${(100 * Math.min(...e)).toFixed(2)}..${(100 * Math.max(...e)).toFixed(2)}) | ${mean(c).toFixed(4)} (${Math.min(...c).toFixed(4)}..${Math.max(...c).toFixed(4)})`);
}
log('\nHEELED (no tank data): one run per hull (Fn < 0.4, leeway nearest 6 deg). Side over the same flag upright, mean (min..max); centre shift from upright mean (min..max); rudder air mean');
for (const heel of heels.filter((x) => x !== 0)) for (const f of ['base', 'R1', 'R2', 'both']) {
  const rs = hulls.map((h) => h.rows.find((r) => r.heeledSet)).filter(Boolean);
  const e = rs.map((r) => r[`${f}_${heel}`].side / r[`${f}_0`].side - 1), c = rs.map((r) => r[`${f}_${heel}`].clr - r[`${f}_0`].clr), a = rs.map((r) => r[`${f}_${heel}`].air);
  log(`heel ${heel} ${f.padEnd(5)} | n ${rs.length} | ${(100 * mean(e)).toFixed(1)}% (${(100 * Math.min(...e)).toFixed(1)}..${(100 * Math.max(...e)).toFixed(1)}) | ${mean(c).toFixed(3)} (${Math.min(...c).toFixed(3)}..${Math.max(...c).toFixed(3)}) | air ${mean(a).toFixed(3)}`);
}
log('\nHEELED, flag against base at the same heel: side ratio mean (min..max); centre shift mean');
for (const heel of heels.filter((x) => x !== 0)) for (const f of ['R1', 'R2', 'both']) {
  const rs = hulls.map((h) => h.rows.find((r) => r.heeledSet)).filter(Boolean);
  const e = rs.map((r) => r[`${f}_${heel}`].side / r[`base_${heel}`].side - 1), c = rs.map((r) => r[`${f}_${heel}`].clr - r[`base_${heel}`].clr);
  log(`heel ${heel} ${f.padEnd(5)} | ${(100 * mean(e)).toFixed(1)}% (${(100 * Math.min(...e)).toFixed(1)}..${(100 * Math.max(...e)).toFixed(1)}) | ${mean(c).toFixed(3)}`);
}
const drift = hulls.flatMap((h) => h.rows.flatMap((r) => Object.values(r).filter((v) => v && v.drift !== undefined).map((v) => v.drift)));
log(`\nsteadiness: largest change of side force between the last two transits ${(100 * Math.max(...drift)).toFixed(3)}%`);
writeFileSync(new URL('./out/score.txt', import.meta.url), lines.join('\n') + '\n');
