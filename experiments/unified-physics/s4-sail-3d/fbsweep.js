// Fallback sweep: attached lattice + one lagging separation state per strip. Same sail, same trim rule, three resolutions.
const fs = require('fs'); const L = require('./lib.js'); const S = require('./snap.js'); const FB = require('./fallback.js');
const OUT = require('path').join(__dirname, 'out', 'results'); fs.mkdirSync(OUT, { recursive: true }); // git-ignored
const betas = (process.argv[2] || '30,45,60,75,90,105,112,120,127,135,150,165,180').split(',').map(Number);
const ress = (process.argv[3] || '4x8,6x12,8x16').split(',').map(s => s.split('x').map(Number));
for (const [Nc, Ns] of ress) for (const beta of betas) {
  const boom = L.trim(beta), b = beta * Math.PI / 180;
  const W = L.makeWorld({ beta, sails: [{ P: L.fujinMain(boom, 12), Nc, Ns }], world: { luffShed: false, selfRows: 0 } });
  const st = FB.init(W), T = 8, n = Math.round(T / L.DT), q = 0.5 * L.RHO * L.VREF ** 2 * W.sails[0].area, ser = [], frames = []; const t0 = Date.now();
  for (let k = 0; k < n; k++) { W.step(); const o = FB.step(W, st, L.RHO); ser.push([o.F[0] / q, o.F[1] / q]); if (k >= n - 30 && Nc === 6) { const f = S.frame(W); f.dp = Array.from(o.dp, x => Math.round(x * 100) / 100); f.F = [o.F.map(x => Math.round(x))]; f.M = [[o.Ms[0][0], o.Ms[0][1]]]; f.f = Array.from(st.f[0], x => +x.toFixed(2)); frames.push(f); } }
  const tail = ser.slice(n - 80), CX = tail.reduce((a, c) => a + c[0], 0) / 80, CY = tail.reduce((a, c) => a + c[1], 0) / 80;
  const w = 10, box = []; for (let k = 0; k + w <= 80; k++) { let sx = 0, sy = 0; for (let j = 0; j < w; j++) { sx += tail[k + j][0]; sy += tail[k + j][1]; } box.push([sx / w, sy / w]); }
  const noise = Math.sqrt(box.reduce((a, c) => a + (c[0] - CX) ** 2 + (c[1] - CY) ** 2, 0) / box.length) / Math.hypot(CX, CY);
  const out = { Nc, Ns, beta, boom, CX, CY, CL: CX * Math.sin(b) + CY * Math.cos(b), CD: -CX * Math.cos(b) + CY * Math.sin(b), noise, f: Array.from(st.f[0]), ms: (Date.now() - t0) / n, geom: S.geom(W), frames, ser };
  fs.writeFileSync(`${OUT}/fb_${Nc}x${Ns}_${beta}.json`, JSON.stringify(out));
  console.log(`fallback ${Nc}x${Ns} beta ${beta} boom ${boom} CL ${out.CL.toFixed(3)} CD ${out.CD.toFixed(3)} CX ${CX.toFixed(3)} CY ${CY.toFixed(3)} noise ${(100 * noise).toFixed(2)}% f ${out.f.map(x => x.toFixed(1)).join(' ')} ${out.ms.toFixed(0)} ms/step`);
}
