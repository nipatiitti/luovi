// Stage 1 (attached flow, no luff shedding): Fujin main + 130% jib. Twist sweep, angle sweep, slot.
const fs = require('fs'); const L = require('./lib.js'); const S = require('./snap.js'); const FB = require('./fallback.js');
const OUT = require('path').join(__dirname, 'out', 'results'); fs.mkdirSync(OUT, { recursive: true }); // git-ignored
const Sref = L.FUJIN.mainArea + L.FUJIN.jibArea, Nc = 6, Ns = 12, T = 4;
const which = process.argv[2];
function run(beta, main, jib, opt) { // main/jib: [sheetDeg, twistDeg] or null
  const sails = []; if (main) sails.push({ P: L.fujinMain(main[0], main[1]), Nc, Ns }); if (jib) sails.push({ P: L.fujinJib(jib[0], jib[1]), Nc, Ns });
  const W = L.makeWorld({ beta, sails, world: Object.assign({ luffShed: false, selfRows: 0 }, (opt || {}).world) }); const t0 = Date.now(); const frames = [];
  const st = FB.init(W); let fb;
  const m = L.runStats(W, beta, Sref, T, 1, (k) => { fb = FB.step(W, st, L.RHO); if (opt && opt.frames && k % 2 === 1) frames.push(S.frame(W)); });
  const q = 0.5 * L.RHO * L.VREF ** 2 * Sref;
  return Object.assign(m, { ms: (Date.now() - t0) / m.ser.length, W, frames, Fs: W.Fs.map(f => f.map(x => x / q)), zces: W.Ms.map((M, k) => M[0] / W.Fs[k][1]), Sval: W.Sval.map(a => Array.from(a)), dp: Array.from(W.dp), fb: { F: fb.F.map(x => x / q), Fs: fb.Fs.map(f => f.map(x => x / q)), f: st.f.map(a => Array.from(a)) }, ser: undefined });
}
const out = {};
if (which === 'twist') {
  out.rows = [];
  for (const tw of [5, 10, 15, 20, 25]) { const r = run(30, [3, tw], [12, 12], { frames: true }); out.rows.push({ tw, CX: r.CX, CY: r.CY, CL: r.CL, CD: r.CD, zce: r.zce, xce: r.xce, zceMain: r.zces[0], Fs: r.Fs, ms: r.ms, geom: S.geom(r.W), frame: r.frames[r.frames.length - 1], Sval: r.Sval });
    console.log(`twist ${tw}: CX ${r.CX.toFixed(3)} CY ${r.CY.toFixed(3)} CL ${r.CL.toFixed(3)} CD ${r.CD.toFixed(3)} zCE ${r.zce.toFixed(2)} m (above water) main zCE ${r.zces[0].toFixed(2)} ${r.ms.toFixed(0)} ms/step`); }
}
if (which === 'angle') {
  out.rows = [];
  for (const rule of ['fixed', 'eased']) for (const b of [20, 25, 30, 35, 38]) { const e = rule === 'eased' ? 0.5 * (b - 20) : 0; const r = run(b, [3 + e, 12], [12 + e, 12]);
    out.rows.push({ rule, beta: b, CL: r.CL, CD: r.CD, CX: r.CX, CY: r.CY, fbCL: (r.fb.F[0] * Math.sin(b * Math.PI / 180) + r.fb.F[1] * Math.cos(b * Math.PI / 180)) });
    console.log(`${rule} beta ${b}: lattice CL ${r.CL.toFixed(3)} CD ${r.CD.toFixed(3)} | with strip separation state CL ${out.rows[out.rows.length - 1].fbCL.toFixed(3)}`); }
}
if (which === 'slot') {
  out.rows = [];
  const cases = [['main alone', [8, 12], null], ['jib alone', null, [14, 12]], ['jib eased 18', [8, 12], [18, 12]], ['jib 14', [8, 12], [14, 12]], ['jib 10', [8, 12], [10, 12]], ['jib 6', [8, 12], [6, 12]], ['jib 2 (oversheeted)', [8, 12], [2, 12]]];
  for (const [name, mn, jb] of cases) { const r = run(30, mn, jb, { frames: true }); const im = mn ? 0 : -1, ij = jb ? (mn ? 1 : 0) : -1;
    const row = { name, jib: jb && jb[0], main: im >= 0 ? r.Fs[im] : null, jibF: ij >= 0 ? r.Fs[ij] : null, Smain: im >= 0 ? r.Sval[im] : null, Sjib: ij >= 0 ? r.Sval[ij] : null, fb: r.fb, ms: r.ms, geom: S.geom(r.W), frame: r.frames[r.frames.length - 1], Np: r.W.Np };
    // front-of-main loading: mean pressure on the first two chordwise panel rows of the main
    if (im >= 0) { let a = 0, f = 0; for (let i = 0; i < 2; i++) for (let j = 0; j < Ns; j++) { const p = i * Ns + j; a += r.W.area[p]; f += r.dp[p] * r.W.area[p]; } row.frontMain = f / a / (0.5 * L.RHO * 36); }
    out.rows.push(row);
    console.log(`${name}: main [drive ${im >= 0 ? r.Fs[im][0].toFixed(3) : '-'} side ${im >= 0 ? r.Fs[im][1].toFixed(3) : '-'}] jib [drive ${ij >= 0 ? r.Fs[ij][0].toFixed(3) : '-'} side ${ij >= 0 ? r.Fs[ij][1].toFixed(3) : '-'}] main luff S ${im >= 0 ? r.Sval[im].map(x => x.toFixed(2)).join(' ') : ''} front-main dp/q ${row.frontMain !== undefined ? row.frontMain.toFixed(2) : ''} | sep state main ${im >= 0 ? r.fb.f[im].map(x => x.toFixed(1)).join(' ') : ''} ${r.ms.toFixed(0)} ms/step`); }
}
fs.writeFileSync(`${OUT}/fujin_${which}.json`, JSON.stringify(out));
