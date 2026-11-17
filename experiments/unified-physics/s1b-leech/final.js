// Final numbers for s1b: one constant set, lee-side separation from Stratford's criterion, second shear layer shed there.
const { fixedRun } = require('./sim.js'); const fs = require('fs');
const OUT = require('path').join(__dirname, 'out'); fs.mkdirSync(OUT, { recursive: true }); // git-ignored
const G = { Scrit: 0.1, decayChords: 10, corePanels: 0.3, sep: true, Ksep: 0.6, Tlag: 1.5, x0: 0.1, strat: 0.39 };
module.exports = { G };
if (require.main === module) {
  const out = { G, curves: {} }; const half = []; for (let a = 0; a <= 30; a += 2) half.push(a); for (let a = 35; a <= 60; a += 5) half.push(a); for (let a = 70; a <= 180; a += 10) half.push(a);
  const neg = [-30, -20, -16, -12, -8, -4];
  for (const [camber, Ns] of [[0, [8, 12, 24]], [0.1, [8, 12, 24]], [0.2, [8, 12, 24]], [0.12, [12]], [0.18, [12]]]) for (const N of Ns) {
    const rows = []; for (const a of neg.concat(half)) { if (camber > 0.1 && camber < 0.2 && a > 60) continue; const r = fixedRun({ N, camber, alpha: a, opt: G, transits: Math.abs(a) >= 30 ? 80 : 40 }); rows.push([a, +r.cl.toFixed(3), +r.cd.toFixed(3), +r.noise.toFixed(3), +r.f.toFixed(3)]); }
    out.curves[camber + '|' + N] = rows; const g = a => rows.find(r => r[0] === a), pos = rows.filter(r => r[0] >= 0 && r[0] <= 40); let im = 0; pos.forEach((r, i) => { if (r[1] > pos[im][1]) im = i; });
    const wn = rows.filter(r => r[0] >= 0 && r[0] <= 150 && Math.hypot(r[1], r[2]) > 0.3).reduce((m, r) => r[3] > m[3] ? r : m, [0, 0, 0, 0]);
    let jump = 0; for (let i = 1; i < pos.length; i++) jump = Math.max(jump, Math.abs(pos[i][1] - pos[i - 1][1]) / (pos[i][0] - pos[i - 1][0]));
    console.log((camber + '|' + N).padEnd(8), 'CL0', g(0)[1].toFixed(2), 'CLmax', pos[im][1].toFixed(2), '@', pos[im][0], 'CD@0,8,16,24:', [0, 8, 16, 24].map(a => g(a)[2].toFixed(2)).join(' '), '30:', g(30)[1].toFixed(2) + '/' + g(30)[2].toFixed(2), '60:', g(60)[1].toFixed(2) + '/' + g(60)[2].toFixed(2), g(90) ? 'CD90 ' + g(90)[2].toFixed(2) : '', 'noise', wn[3].toFixed(2), '@', wn[0], 'steepest', jump.toFixed(2), '/deg',
      '\n   CL 0..30:', pos.filter(r => r[0] <= 30).map(r => r[1].toFixed(2)).join(' '), '\n   f  0..30:', pos.filter(r => r[0] <= 30).map(r => r[4].toFixed(2)).join(' '));
  }
  fs.writeFileSync(require('path').join(OUT, 'final.json'), JSON.stringify(out));
}
