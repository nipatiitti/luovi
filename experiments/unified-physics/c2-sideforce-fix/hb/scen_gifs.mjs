// scen_gifs.mjs: GIF (a): H-boat on a beam reach, puff from 12 to 32 knots, course held, nothing eased:
// the sailing-test model against the merged model. Same case, helmsman and drawing as r2's g1-puff-broach (draw_r2.js).
import fs from 'fs'; import { SM, BASE, HULLS, makeBoat, KN, RAD } from './lib.mjs'; import { record } from './scen_m1.mjs';
const key = 'hboat', B = HULLS[key], r = (v, d = 2) => +(+v).toFixed(d), spec = { course: -90, main: 30, jib: 28, w0: 12, w1: 32 };
const rx = makeBoat(key).rudderX, ri = Math.round(rx / B.dx);
const out = { title: 'Beam reach, puff from 12 to 32 knots, helmsman holds course, nothing eased', caption: 'Watch the rudder angle climb as she heels. Before: the rudder always wins. Merged: it stalls, sucks air, and she rounds up.', maxHelm: 35,
  boat: { loa: B.loa, beam: B.beam, bowOverhang: B.bowOverhang, xcg: B.xcg, mastX: B.rig.mastX, E: B.rig.E, J: B.rig.J, rudderX: r(rx), freeboard: B.rig.freeboard, halfBeamMax: Math.max(...B.halfBeam), canoeDepthMax: Math.max(...B.canoeDepth), keelDepth: Math.max(...B.T),
    rudderDepthUpright: B.T[ri], rudHalfBeam: B.halfBeam[ri], rudCanoe: B.canoeDepth[ri] }, cells: [] };
for (const [label, M] of [['BEFORE (sailing-test model)', BASE], ['MERGED (rudder + heel + air)', SM]]) {
  const frames = []; let k = 0;
  const st = record(M, key, spec, (bb, wind, off) => { if (k++ % 2) return; const o = bb.out, side = o.awaDeg >= 0 ? 1 : -1, ch = Math.cos(bb.phi);
    const tip = o.rudderDepth !== undefined && M.C.R2 ? o.rudderDepth : B.T[ri] * ch, cover = M.C.R2 ? o.rudderCover : B.canoeDepth[ri] * ch;
    frames.push({ t: r(bb.t, 1), X: r(bb.X), Y: r(bb.Y), psi: r(bb.psi, 3), phi: r(bb.phi, 3), delta: r(bb.delta, 3), boom: r(o.boomDeg, 1), jib: r(o.jibDeg, 1), kn: r(bb.speed() / KN, 1), wind: r(wind, 0),
      grip: r(o.rudderAttach), air: r(o.rudderAir || 0), load: Math.round(Math.abs(o.rudderY)), helm: r(-bb.delta * side / RAD, 1), heel: r(Math.abs(bb.phi) / RAD, 1), off: r(off, 1),
      nLever: Math.round(o.nLever * side), nSide: Math.round(o.nSailSide * side), nHull: Math.round(o.nHull * side), nRud: Math.round(o.nRud * side), rise: r(o.rise || 0, 3), tip: r(tip, 3), cover: r(cover, 3),
      note: bb.t < 3 ? '12 knots' : 'puff 32 knots, main held' }); });
  out.cells.push({ label, frames }); console.log(label, JSON.stringify(st));
}
fs.writeFileSync(new URL('../out/m1-puff-broach.json', import.meta.url), JSON.stringify(out));
