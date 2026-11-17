// Oversheeting the main: steady values at each sheet angle, alone and behind a jib. Wind 22 degrees off the centreline.
const P = require('./pair.js'); const { makeSim } = require('./sim.js'); const D = Math.PI / 180, U = 8;
function run(beta, dm, dj) { const sails = dj === null ? [P.mkMain(dm)] : [P.mkJib(dj), P.mkMain(dm)], main = sails[sails.length - 1], mi = sails.length - 1, sim = makeSim(sails, P.G), W = [U * Math.cos(beta * D), U * Math.sin(beta * D)];
  let a = [0, 0, 0, 0, 0, 0, 0], k = 0; for (let i = 0; i < 500; i++) { sim.step(W); if (i >= 250) { a[0] -= sim.st.Fkj[mi][0]; a[1] += sim.st.Fkj[mi][1]; a[2] += main.f; a[3] += main.S; a[4] += main.leShed; if (mi) { a[5] -= sim.st.Fkj[0][0]; a[6] += sim.st.Fkj[0][1]; } k++; } }
  return a.map(x => x / k); }
module.exports = { run };
if (require.main === module) for (const dj of [null, 14]) { console.log(dj === null ? 'main alone' : 'with jib sheeted 14'); for (let dm = 22; dm >= -6; dm -= 2) { const r = run(22, dm, dj); console.log(` main sheet ${String(dm).padStart(3)}: drive ${r[0].toFixed(1)} heel ${r[1].toFixed(1)} sep at ${r[2].toFixed(2)} S ${r[3].toFixed(3)} luff shed ${r[4].toFixed(2)}` + (dj !== null ? ` | jib drive ${r[5].toFixed(1)} heel ${r[6].toFixed(1)} | total drive ${(r[0] + r[5]).toFixed(1)} heel ${(r[1] + r[6]).toFixed(1)}` : '')); } }
