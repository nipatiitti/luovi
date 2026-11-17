// Does the fallback keep the slot? Wind 38 deg, main sheeted hard (boom 8 deg): main alone against main + jib, strip separation states.
const L = require('./lib.js'), FB = require('./fallback.js'); const Sref = L.FUJIN.mainArea + L.FUJIN.jibArea;
for (const [name, jib] of [['main alone', null], ['main + jib at 16', [16, 12]], ['main + jib at 6 (oversheeted)', [6, 12]]]) {
  const sails = [{ P: L.fujinMain(8, 12), Nc: 6, Ns: 12 }]; if (jib) sails.push({ P: L.fujinJib(jib[0], jib[1]), Nc: 6, Ns: 12 });
  const W = L.makeWorld({ beta: 38, sails, world: { luffShed: false, selfRows: 0 } }), st = FB.init(W); let o; const hist = [];
  for (let k = 0; k < 100; k++) { W.step(); o = FB.step(W, st, L.RHO); hist.push(Math.hypot(o.Fs[0][0], o.Fs[0][1])); }
  const q = 0.5 * L.RHO * 36 * Sref, tail = hist.slice(60), mean = tail.reduce((a, b) => a + b) / 40, rms = Math.sqrt(tail.reduce((a, b) => a + (b - mean) ** 2, 0) / 40) / mean;
  console.log(`${name}: main separation state foot->head ${Array.from(st.f[0]).map(x => x.toFixed(1)).join(' ')} | main luff S ${Array.from(W.Sval[0]).map(x => x.toFixed(2)).join(' ')} | main drive ${(o.Fs[0][0] / q).toFixed(3)} side ${(o.Fs[0][1] / q).toFixed(3)} (lattice alone: ${(W.Fs[0][0] / q).toFixed(3)}, ${(W.Fs[0][1] / q).toFixed(3)}) raw force swing ${(100 * rms).toFixed(2)}%`);
}
