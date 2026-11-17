// Stage 2: single Fujin mainsail, apparent wind 30..180, three resolutions, luff shedding on. One global constant set.
const fs = require('fs'); const L = require('./lib.js'); const S = require('./snap.js');
const OUT = require('path').join(__dirname, 'out', 'results'); fs.mkdirSync(OUT, { recursive: true }); // git-ignored
const tag = process.argv[2] || 'base', world = JSON.parse(process.argv[3] || '{}');
const betas = (process.argv[4] || '30,45,60,75,90,105,120,135,150,165,180').split(',').map(Number);
const ress = (process.argv[5] || '4x8,6x12,8x16').split(',').map(s => s.split('x').map(Number));
for (const [Nc, Ns] of ress) for (const beta of betas) {
  const boom = L.trim(beta);
  const W = L.makeWorld({ beta, sails: [{ P: L.fujinMain(boom, 12), Nc, Ns }], world });
  const frames = [], T = 8, n = Math.round(T / L.DT); const t0 = Date.now();
  const m = L.runStats(W, beta, W.sails[0].area, T, 4, (k, c) => { if (k >= n - 30) frames.push(S.frame(W, { c: [c.CL, c.CD, c.CX, c.CY].map(x => +x.toFixed(3)) })); });
  const ms = (Date.now() - t0) / n;
  const out = { tag, Nc, Ns, beta, boom, area: W.sails[0].area, CL: m.CL, CD: m.CD, CX: m.CX, CY: m.CY, noise: m.noise, rawNoise: m.rawNoise, zce: m.zce, ms, nshed: W.edges[0].shed.reduce((a, b) => a + b, 0), ser: m.ser.map(c => [c.CX, c.CY].map(x => +x.toFixed(4))), geom: S.geom(W), frames };
  fs.writeFileSync(`${OUT}/${tag}_${Nc}x${Ns}_${beta}.json`, JSON.stringify(out));
  console.log(`${tag} ${Nc}x${Ns} beta ${beta} boom ${boom} CL ${m.CL.toFixed(3)} CD ${m.CD.toFixed(3)} CX ${m.CX.toFixed(3)} CY ${m.CY.toFixed(3)} noise ${(100 * m.noise).toFixed(1)}% raw ${(100 * m.rawNoise).toFixed(1)}% shed ${out.nshed}/${Ns} ${ms.toFixed(0)} ms/step`);
}
