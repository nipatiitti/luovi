// Jib ahead of a mainsail. Boat frame: centreline along x, bow toward -x, wind blowing toward +x at angle beta to the centreline,
// leeward is +y. Sheet angle = angle of the sail's chord off the centreline.
const { makeSail, makeSim } = require('./sim.js');
const U = 8, RHO = 1.225, CM = 3, CJ = 2, D2R = Math.PI / 180;
const G = { Scrit: 0.1, decayChords: 10, coreFrac: 0.025, kj: true, refChord: CM };
function mkMain(dm, N) { return makeSail({ N: N || 12, chord: CM, camber: 0.1, luff: [0, 0], sheet: dm * D2R, Scrit: G.Scrit }); }
function mkJib(dj, N) { return makeSail({ N: N || 12, chord: CJ, camber: 0.1, luff: [-2.0, 0], sheet: dj * D2R, Scrit: G.Scrit }); }
function runPair(o) {
  const sails = [], names = [];
  if (o.jib !== false) { sails.push(mkJib(o.dj)); names.push('jib'); }
  if (o.main !== false) { sails.push(mkMain(o.dm)); names.push('main'); }
  const sim = makeSim(sails, Object.assign({}, G, o.opt || {})); const b = o.beta * D2R, W = [U * Math.cos(b), U * Math.sin(b)];
  const n = Math.round((o.transits || 40) * CM / U / sim.P.dt), n0 = Math.round(n * 0.5), acc = {};
  names.forEach(nm => acc[nm] = { fx: 0, fy: 0, S: 0, shed: 0, k: 0 });
  for (let i = 0; i < n; i++) { sim.step(W); if (i >= n0) names.forEach((nm, m) => { const a = acc[nm]; a.fx += sim.st.Fkj[m][0]; a.fy += sim.st.Fkj[m][1]; a.S += sails[m].S; a.shed += sails[m].leShed; a.k++; }); }
  const res = {}; names.forEach((nm, m) => { const a = acc[nm], c = sails[m].c, q = 0.5 * RHO * U * U * c; const fx = a.fx / a.k, fy = a.fy / a.k;
    // lift and drag relative to the true wind direction, per own chord; drive = forward (-x), side = to leeward (+y), in newtons per metre of luff
    res[nm] = { cl: (-fx * W[1] + fy * W[0]) / U / q, cd: (fx * W[0] + fy * W[1]) / U / q, drive: -fx, side: fy, S: a.S / a.k, shed: a.shed / a.k }; });
  return res;
}
module.exports = { runPair, mkMain, mkJib, G, U, RHO, CM, CJ };
if (require.main === module) {
  const f = (x, d) => x.toFixed(d === undefined ? 2 : d);
  console.log('A. wind angle sweep, main sheet 6, jib sheet 14');
  for (let beta = 8; beta <= 30; beta += 2) { const p = runPair({ beta, dm: 6, dj: 14 }), m = runPair({ beta, dm: 6, jib: false }), j = runPair({ beta, dj: 14, main: false });
    console.log(`beta ${beta}: main alone CL ${f(m.main.cl)} S ${f(m.main.S, 3)} shed ${f(m.main.shed)} | main with jib CL ${f(p.main.cl)} S ${f(p.main.S, 3)} shed ${f(p.main.shed)} | jib alone CL ${f(j.jib.cl)} S ${f(j.jib.S, 3)} | jib with main CL ${f(p.jib.cl)} S ${f(p.jib.S, 3)} shed ${f(p.jib.shed)} | drive alone sum ${f(m.main.drive + j.jib.drive, 1)} pair ${f(p.main.drive + p.jib.drive, 1)}`); }
  console.log('B. jib sheeted in at beta 16, main sheet 6');
  for (let dj = 26; dj >= -2; dj -= 2) { const p = runPair({ beta: 16, dm: 6, dj });
    console.log(`jib sheet ${dj}: jib CL ${f(p.jib.cl)} S ${f(p.jib.S, 3)} shed ${f(p.jib.shed)} | main CL ${f(p.main.cl)} S ${f(p.main.S, 3)} shed ${f(p.main.shed)} | drive jib ${f(p.jib.drive, 1)} main ${f(p.main.drive, 1)} side ${f(p.jib.side + p.main.side, 1)}`); }
}
