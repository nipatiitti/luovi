// r1-rudder GIFs: the same manoeuvre with the sailing-test rudder (top row) and the r1 rudder (bottom row).
import fs from 'fs';
import { recorder, writeScenario, makeBoat, run, HULLS, KN, RAD, r2, SM, settle } from './scen_lib.mjs';
function hardOver(key, kn, ang, after, secs, keep) {
  SM.C.R1 = after; const B = HULLS[key], b = makeBoat(key, { psiDeg: 0, u: kn * KN }), rec = recorder(B);
  run(b, 1.5, () => ({ tillerDeg: 0, sails: false }), () => ({ wind: 0 })); b.t = 0; b.X = 0; b.Y = 0; b.u = kn * KN;
  run(b, secs, (bb, t) => ({ tillerDeg: t < 1 ? 0 : ang, sails: false }), () => ({ wind: 0 }), (bb) => rec.take(bb, { note: '' }));
  return { boat: key, title: `${after ? 'NEW' : 'OLD'} rudder: ${ang}°`, frames: rec.frames.filter((_, i) => i % keep === 0), track: rec.track.filter((_, i) => i % keep === 0) };
}
const keys = [['water angle', 'flow', 0, '°'], ['turn rate', 'rate', 0, '°/s']];
for (const [kn, name, secs, keep, cap] of [[5, 'r1-hard-over-5kn', 13, 1, 'OLD (top): the blade carried twice what a foil can (lift number 2.0), so more tiller always turned faster. NEW (bottom): it lets go near 15 to 20° of water angle (rudder light goes red) and then carries only the flat-plate force. 45° now turns fastest; 60° is no faster and brakes harder. Compare turn rate, speed and rudder light.'],
  [1, 'r1-hard-over-1kn', 39, 3, 'Played at 3 times speed. NEW (bottom): 60° turns no faster than 45° and stops the boat after about 70° of turn, while 30° keeps her moving and turning. It still out-turns 30° for the first 10 seconds. Watch speed and heading.']]) {
  const cells = []; for (const after of [false, true]) for (const ang of [30, 45, 60]) cells.push(hardOver('hboat', kn, ang, after, secs, keep));
  writeScenario(name, { title: `H-boat, ${kn} knot${kn > 1 ? 's' : ''}, sails down: tiller hard over to 30, 45, 60°`, caption: 1, strip: [cap], cols: 3, rows: 2, cells, scale: kn > 1 ? 7 : 14, forceScale: kn > 1 ? 0.03 : 0.5, font: 16, stack: true, insetZoom: 1.6, speedup: keep, extraKeys: keys, W: 900, H: 900 });
}
// tiller let go after a shove: old model centres the rudder, new one lets the blade trail
{ const cells = [];
  for (const after of [false, true]) for (const key of ['hboat', 'ifboat']) {
    SM.C.R1 = after; const B = HULLS[key], b = makeBoat(key, { u: 5 * KN }), rec = recorder(B);
    run(b, 2, () => ({ tillerDeg: 0, sails: false }), () => ({ wind: 0 })); b.t = 0; b.X = 0; b.Y = 0; b.u = 5 * KN; let done = false;
    run(b, 12, (bb) => { if (!done && bb.t >= 1) { bb.r = 6 * RAD; done = true; } return { tillerDeg: 0, tillerFree: true, sails: false }; }, () => ({ wind: 0 }), (bb) => rec.take(bb, { note: '', hd: r2(bb.psi / RAD, 1) }));
    cells.push({ boat: key, title: `${after ? 'NEW: blade trails free' : 'OLD: rudder centred'}`, frames: rec.frames, track: rec.track });
  }
  writeScenario('r1-tiller-let-go', { title: 'Tiller let go at 5 knots, then the bow is shoved (6°/s): H-boat left, Folkboat right', caption: 1, strip: ['OLD (top): letting go only centred the rudder, which then worked as a fixed fin. NEW (bottom): the blade swings to lie along the water (watch the rudder angle), so the boat is knocked further off course. Compare where the heading ends. The Folkboat does NOT hold her course better than the H-boat here: that pass mark is failed.'],
    cols: 2, rows: 2, cells, scale: 9, forceScale: 0.05, font: 16, stack: true, insetZoom: 1.6, extraKeys: [['heading', 'hd', 1, '°'], ['turn rate', 'rate', 1, '°/s']], W: 900, H: 900 }); }
SM.C.R1 = true;
