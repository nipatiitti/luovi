// Frames for the three s1b GIFs.
const { makeSail, makeSim, coeffs } = require('./sim.js'); const P = require('./pair.js'); const O = require('./over.js'); const fs = require('fs');
const OUT = require('path').join(__dirname, 'out'); fs.mkdirSync(OUT, { recursive: true }); // git-ignored
const U = 8, C = 3, RHO = 1.225, D = Math.PI / 180, G = P.G;
const r2 = x => Math.round(x * 100) / 100, r3 = x => Math.round(x * 1000) / 1000;
function wakeOut(sim, cx, cy, R) { const w = sim.st.wake, o = []; for (let k = 0; k < w.x.length; k++) { if (Math.abs(w.x[k] - cx) > R || Math.abs(w.y[k] - cy) > R) continue; o.push(r2(w.x[k]), r2(w.y[k]), w.src[k] % 3); } return o; }
function sailOut(s) { const p = s.pt(Math.min(1, s.f)); return { o: s.outline.filter((q, i) => i % 2 === 0).map(q => [r2(q[0]), r2(q[1])]), S: r3(s.S), shed: s.leShed, f: r3(s.f), sp: [r2(p.x), r2(p.y)], sig: s.sig,
  ld: s.gam.map(g => r2(-2 * g / s.dl / U)), pc: s.xc.map((x, i) => [r2(x), r2(s.yc[i]), r2(s.nx[i]), r2(s.ny[i])]) }; }
class Avg { constructor(n) { this.n = n; this.q = []; } push(v) { this.q.push(v); if (this.q.length > this.n) this.q.shift(); return this.q[0].map((_, i) => this.q.reduce((s, x) => s + x[i], 0) / this.q.length); } }
const which = process.argv[2] || 'all';
// sheet schedule: hold, sheet in, hold, ease, hold (seconds)
const sched = (t, hi, lo) => t < 3 ? hi : t < 11 ? hi + (lo - hi) * (t - 3) / 8 : t < 14 ? lo : t < 22 ? lo + (hi - lo) * (t - 14) / 8 : hi;
if (which === 'all' || which === '1') { // main alone, wind 22 degrees off the centreline, sheeted in from 20 to 0 and eased again
  const beta = 22, W = [U * Math.cos(beta * D), U * Math.sin(beta * D)], main = P.mkMain(20), sim = makeSim([main], G), avg = new Avg(15), frames = [];
  for (let i = 0; i < 750; i++) { const dm = sched(i / 30, 20, 0); sim.setShape(0, P.mkMain(dm)); sim.step(W); const f = avg.push(sim.st.Fkj[0]);
    if (i % 2 === 0) frames.push({ dm: r2(dm), t: r2(i / 30), F: [[r2(f[0]), r2(f[1])]], sails: [sailOut(main)], w: wakeOut(sim, 1.5, 0.5, 7) }); }
  const steady = []; for (let dm = 20; dm >= 0; dm -= 2) { const r = O.run(beta, dm, null); steady.push([dm, r2(r[0]), r2(r[1]), r3(r[2])]); }
  fs.writeFileSync(require('path').join(OUT, 'gif1.json'), JSON.stringify({ frames, steady, beta })); console.log('gif1', frames.length); }
if (which === 'all' || which === '3') { // main sheeted in and eased behind a jib sheeted at 14
  const beta = 22, W = [U * Math.cos(beta * D), U * Math.sin(beta * D)], main = P.mkMain(20), jib = P.mkJib(14), sim = makeSim([jib, main], G), avg = new Avg(15), frames = [];
  for (let i = 0; i < 750; i++) { const dm = sched(i / 30, 16, -4); sim.setShape(1, P.mkMain(dm)); sim.step(W); const f = avg.push(sim.st.Fkj[0].concat(sim.st.Fkj[1]));
    if (i % 2 === 0) frames.push({ dm: r2(dm), t: r2(i / 30), F: [[r2(f[0]), r2(f[1])], [r2(f[2]), r2(f[3])]], sails: [sailOut(jib), sailOut(main)], w: wakeOut(sim, 0.5, 0.5, 8) }); }
  const steady = []; for (let dm = 16; dm >= -4; dm -= 2) { const r = O.run(beta, dm, 14); steady.push([dm, r2(r[0]), r2(r[1]), r3(r[2]), r2(r[5]), r2(r[6])]); }
  fs.writeFileSync(require('path').join(OUT, 'gif3.json'), JSON.stringify({ frames, steady, beta })); console.log('gif3', frames.length); }
if (which === 'all' || which === '2') { // flat, 12% and 18% camber swung round the circle, one degree per chord transit
  const per = 11, runs = [0, 0.12, 0.18].map(camber => { const sail = makeSail({ N: 12, chord: C, camber, Scrit: G.Scrit }), sim = makeSim([sail], Object.assign({}, G, { kj: false, refChord: C })), avg = new Avg(15), frames = [];
    for (let i = 0; i < 361 * per; i++) { let a = i / per; if (a > 180) a -= 360; const W = [U * Math.cos(a * D), U * Math.sin(a * D)]; sim.step(W); const f = avg.push(sim.st.F[0]), k = coeffs(f, W, RHO, C);
      if (i % per === 0) frames.push({ a: r2(a), F: [r2(f[0]), r2(f[1])], cl: r3(k.cl), cd: r3(k.cd), sails: [sailOut(sail)], w: wakeOut(sim, 1.5, 0, 7) }); } return frames; });
  fs.writeFileSync(require('path').join(OUT, 'gif2.json'), JSON.stringify({ runs })); console.log('gif2', runs[0].length); }
