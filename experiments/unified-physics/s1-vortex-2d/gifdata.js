// Runs the simulations behind the four GIFs and writes their frames as JSON.
const { makeSail, makeSim, coeffs } = require('./sim.js');
const P = require('./pair.js');
const fs = require('fs');
const OUT = require('path').join(__dirname, 'out'); fs.mkdirSync(OUT, { recursive: true }); // git-ignored
const U = 8, C = 3, RHO = 1.225, D = Math.PI / 180;
const G = { Scrit: 0.1, decayChords: 10, coreFrac: 0.025, kj: true };
const r2 = x => Math.round(x * 100) / 100, r3 = x => Math.round(x * 1000) / 1000;
function wakeOut(sim, cx, cy, R) { const w = sim.st.wake, o = []; for (let k = 0; k < w.x.length; k++) { if (Math.abs(w.x[k] - cx) > R || Math.abs(w.y[k] - cy) > R) continue; o.push(r2(w.x[k]), r2(w.y[k]), w.src[k]); } return o; }
function sailOut(s) { return { o: s.outline.filter((p, i) => i % 2 === 0).map(p => [r2(p[0]), r2(p[1])]), S: r3(s.S), shed: s.leShed, ld: s.gam.map((g, i) => r2(-2 * g / s.dl / U)), pc: s.xc.map((x, i) => [r2(x), r2(s.yc[i]), r2(s.nx[i]), r2(s.ny[i])]) }; }
class Avg { constructor(n) { this.n = n; this.q = []; } push(v) { this.q.push(v); if (this.q.length > this.n) this.q.shift(); return this.q[0].map((_, i) => this.q.reduce((s, x) => s + x[i], 0) / this.q.length); } }

function sweepRun(o) { // one sail, wind angle following o.angle(step); returns frames
  const sail = makeSail({ N: o.N, chord: C, camber: o.camber, Scrit: G.Scrit }), sim = makeSim([sail], G), avg = new Avg(15), frames = [];
  for (let i = 0; i < o.steps; i++) { const a = o.angle(i) * D, W = [U * Math.cos(a), U * Math.sin(a)];
    if (o.shape) { const e = o.shape(o.angle(i)); if (Math.abs(e - sail.eps) > 1e-6) sim.setShape(0, makeSail({ N: o.N, chord: C, camber: e, Scrit: G.Scrit })); }
    sim.step(W); const f = avg.push(sim.st.F[0].concat(sim.st.Fkj[0])), k = coeffs([f[0], f[1]], W, RHO, C);
    if (i % o.every === 0) frames.push({ a: r2(o.angle(i)), F: [r2(f[0]), r2(f[1])], cl: r3(k.cl), cd: r3(k.cd), sails: [sailOut(sail)], w: wakeOut(sim, 1.5, 0, 9) }); }
  return frames;
}
const which = process.argv[2] || 'all';
if (which === 'all' || which === '1') { // full circle, 10% camber, 12 panels; one degree per chord transit
  const per = 11, frames = sweepRun({ N: 12, camber: 0.1, steps: 361 * per, every: per, angle: i => { const a = i / per; return a <= 180 ? a : a - 360; } });
  fs.writeFileSync(require('path').join(OUT, 'gif1.json'), JSON.stringify({ frames })); console.log('gif1', frames.length); }
if (which === 'all' || which === '2') { // three panel counts, deep sail, 0 to 60 degrees
  const per = 6, runs = [6, 12, 24].map(N => sweepRun({ N, camber: 0.2, steps: 301 * per, every: per, angle: i => i / per * 0.2 }));
  const runs10 = [6, 12, 24].map(N => sweepRun({ N, camber: 0.1, steps: 301 * per, every: per, angle: i => i / per * 0.2 }).map(f => [f.a, f.cl, f.cd]));
  fs.writeFileSync(require('path').join(OUT, 'gif2.json'), JSON.stringify({ runs, runs10 })); console.log('gif2', runs[0].length); }
if (which === 'all' || which === '4') { // through head to wind and back; the cloth takes its camber from the side the wind is on
  const seq = i => { const t = i / 30; if (t < 4) return 8; if (t < 8) return 8 - 4 * (t - 4); if (t < 12) return -8; if (t < 16) return -8 + 4 * (t - 12); return 8; };
  const frames = sweepRun({ N: 12, camber: 0.1, steps: 510, every: 2, angle: seq, shape: a => 0.1 * Math.max(-1, Math.min(1, a / 4)) });
  fs.writeFileSync(require('path').join(OUT, 'gif4.json'), JSON.stringify({ frames })); console.log('gif4', frames.length); }
if (which === 'all' || which === '3') { // jib sheeted in ahead of the main: wind 12 degrees off the centreline, main sheet 8
  const beta = 12, dm = 8, W = [U * Math.cos(beta * D), U * Math.sin(beta * D)], per = 4, nF = 300;
  const main = P.mkMain(dm), jib = P.mkJib(24), sim = makeSim([jib, main], P.G), avg = new Avg(15), frames = [];
  const djOf = i => { const f = i / per; return f < 20 ? 24 : Math.max(2, 24 - 22 * (f - 20) / 250); };
  for (let i = 0; i < nF * per; i++) { const dj = djOf(i); if (i % per === 0) sim.setShape(0, P.mkJib(dj));
    sim.step(W); const f = avg.push(sim.st.Fkj[0].concat(sim.st.Fkj[1]));
    if (i % per === 0) frames.push({ dj: r2(dj), F: [[r2(f[0]), r2(f[1])], [r2(f[2]), r2(f[3])]], sails: [sailOut(jib), sailOut(main)], w: wakeOut(sim, 0.5, 0.5, 8) }); }
  // reference lines: each sail alone at the same wind
  const mAlone = P.runPair({ beta, dm, jib: false }), jAlone = []; for (let dj = 24; dj >= 2; dj -= 2) { const r = P.runPair({ beta, dj, main: false }); jAlone.push([dj, r2(r.jib.drive), r2(r.jib.side), r3(r.jib.S)]); }
  fs.writeFileSync(require('path').join(OUT, 'gif3.json'), JSON.stringify({ frames, beta, dm, mainAlone: { drive: r2(mAlone.main.drive), side: r2(mAlone.main.side), S: r3(mAlone.main.S) }, jAlone })); console.log('gif3', frames.length); }
