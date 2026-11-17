const L = require('./lib.js');
const [beta, Nc, Ns] = [+process.argv[2], +(process.argv[3] || 6), +(process.argv[4] || 12)];
const world = JSON.parse(process.argv[5] || '{}');
const d0 = process.env.D0 ? +process.env.D0 : L.trim(beta);
const W = L.makeWorld({ beta, sails: [{ P: L.fujinMain(d0, 12), Nc, Ns }], world });
const t0 = Date.now();
const m = L.runStats(W, beta, W.sails[0].area, +(process.env.T || 8), 4, (k, c) => { if (process.env.V && k % 10 === 9) console.log(k, c.CL.toFixed(3), c.CD.toFixed(3), 'shed', Array.from(W.edges[0].shed).join(''), 'S', Array.from(W.Sval[0]).map(x => x.toFixed(2)).join(' ')); });
console.log(`beta ${beta} boom ${d0} ${Nc}x${Ns} CL ${m.CL.toFixed(3)} CD ${m.CD.toFixed(3)} CX ${m.CX.toFixed(3)} CY ${m.CY.toFixed(3)} noise(0.5s) ${(100 * m.noise).toFixed(1)}% raw ${(100 * m.rawNoise).toFixed(1)}% zce ${m.zce.toFixed(2)} fixes ${W.nfix || 0} ${((Date.now() - t0) / m.ser.length).toFixed(1)} ms/step area ${W.sails[0].area.toFixed(1)}`);
