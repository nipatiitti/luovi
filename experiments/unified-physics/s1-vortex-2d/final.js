// Final numbers: one global constant set, three cambers, three panel counts.
const { fixedRun, makeSail, makeSim, coeffs } = require('./sim.js');
const fs = require('fs');
const OUT = require('path').join(__dirname, 'out'); fs.mkdirSync(OUT, { recursive: true }); // git-ignored
const G = { Scrit: 0.1, decayChords: 10, coreFrac: 0.025 };           // luff shedding only
const GT = Object.assign({ teSep: true, Csep: 0.5, Tsep: 1.5 }, G);    // plus the lagging leech state
const out = { constants: { G, GT }, curves: {} };
const half = []; for (let a = 0; a <= 30; a += 2) half.push(a); for (let a = 35; a <= 60; a += 5) half.push(a); for (let a = 70; a <= 180; a += 10) half.push(a);
const angles = half.slice(1).reverse().map(a => -a).concat(half);
for (const [name, opt] of [['luff', G], ['luff+leech', GT]]) for (const camber of [0, 0.1, 0.2]) for (const N of [6, 12, 24]) { if (name === 'luff+leech' && camber === 0) continue;
  const key = `${name}|${camber}|${N}`; const rows = [];
  for (const a of angles) { if (name === 'luff+leech' && Math.abs(a) > 60) continue; const r = fixedRun({ N, camber, alpha: a, opt, transits: Math.abs(a) >= 30 ? 80 : 40 }); rows.push([a, +r.cl.toFixed(4), +r.cd.toFixed(4), +r.noise.toFixed(4), +r.f.toFixed(3)]); }
  out.curves[key] = rows;
  // summary: slope, first maximum of lift for a>=0, drag at 90, worst noise
  const pos = rows.filter(r => r[0] >= 0 && r[0] <= 40); let imax = 0; for (let i = 1; i < pos.length; i++) if (pos[i][1] > pos[imax][1]) imax = i;
  const r2 = rows.find(r => r[0] === 2), r0 = rows.find(r => r[0] === 0), r90 = rows.find(r => r[0] === 90);
  const noisy = rows.filter(r => Math.hypot(r[1], r[2]) > 0.3).reduce((m, r) => r[3] > m[3] ? r : m, [0, 0, 0, 0]);
  console.log(key.padEnd(22), 'slope/2pi', (((r2[1] - r0[1]) / (2 * Math.PI / 180)) / (2 * Math.PI)).toFixed(3), 'CL0', r0[1].toFixed(2), 'CLmax', pos[imax][1].toFixed(2), '@', pos[imax][0],
    r90 ? 'CD90 ' + r90[2].toFixed(2) : '', 'worst noise', noisy[3].toFixed(2), '@', noisy[0]);
}
// mirror symmetry: sail aback = mirrored sail at mirrored wind angle
for (const [camber, a] of [[0, 20], [0.1, 6], [0.1, 20], [0.2, 45], [0.1, 150]]) { const p = fixedRun({ N: 12, camber, alpha: a, opt: G }), q = fixedRun({ N: 12, camber: -camber, alpha: -a, opt: G });
  console.log('mirror camber', camber, 'angle', a, 'CL', p.cl.toFixed(4), q.cl.toFixed(4), 'CD', p.cd.toFixed(4), q.cd.toFixed(4)); }
fs.writeFileSync(require('path').join(OUT, 'final.json'), JSON.stringify(out));
