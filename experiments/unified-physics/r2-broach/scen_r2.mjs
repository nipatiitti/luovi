// scen_r2.mjs: the three GIF scenarios (H-boat), before and after, with every number that goes in result.md.
import fs from 'fs'; import { OLD, NEW, HULLS, make, run, helm, hdg, KN, RAD } from './r2lib.mjs';
const key = 'hboat', B = HULLS[key], MAXHELM = 35, r = (v, d = 2) => +(+v).toFixed(d);
function record(SM, { course, main, jib, w0, w1, easeAt, newCourse, T = 22 }) {
  const b = make(SM, key, { psiDeg: course, u: 2.5 });
  run(b, 50, (bb) => ({ tillerDeg: helm(bb, course, MAXHELM), mainSheet: main, jibSheet: jib, crew: 1 }), () => ({ wind: w0 * KN, windDir: 0 }));
  b.t = 0; b.X = 0; b.Y = 0; const frames = []; let k = 0;
  const wind = (t) => w0 + (w1 - w0) * NEW.clamp((t - 3) / 2, 0, 1);
  const st = { peakHeel: 0, peakHelm: 0, minGrip: 1, peakAir: 0, peakOff: 0, tLost: null, peakLoad: 0 };
  run(b, T, (bb, t) => ({ tillerDeg: helm(bb, t > 3 && newCourse !== undefined ? newCourse : course, MAXHELM), mainSheet: easeAt !== undefined && t > easeAt ? 70 : main, jibSheet: jib, crew: 1 }), (t) => ({ wind: wind(t) * KN, windDir: 0 }), (bb) => {
    const o = bb.out, side = o.awaDeg >= 0 ? 1 : -1, want = bb.t > 3 && newCourse !== undefined ? newCourse : course, off = hdg(bb) - want, ch = Math.cos(bb.phi);
    const tip = o.rudderDepth !== undefined ? o.rudderDepth : bb.d.T[Math.round(bb.rudderX / bb.d.dx)] * ch, cover = o.rudderCover !== undefined ? o.rudderCover : bb.d.canoeDepth[Math.round(bb.rudderX / bb.d.dx)] * ch;
    st.peakHeel = Math.max(st.peakHeel, Math.abs(bb.phi) / RAD); st.peakHelm = Math.max(st.peakHelm, -bb.delta * side / RAD); st.minGrip = Math.min(st.minGrip, o.rudderAttach); st.peakAir = Math.max(st.peakAir, o.rudderAir || 0); st.peakLoad = Math.max(st.peakLoad, Math.abs(o.rudderY));
    if (bb.t > 3) { st.peakOff = Math.max(st.peakOff, off * (newCourse !== undefined ? 1 : 1)); if (st.tLost === null && newCourse === undefined && off > 20) st.tLost = r(bb.t - 3, 1); }
    if (k++ % 2) return;
    frames.push({ t: r(bb.t, 1), X: r(bb.X), Y: r(bb.Y), psi: r(bb.psi, 3), phi: r(bb.phi, 3), delta: r(bb.delta, 3), boom: r(o.boomDeg, 1), jib: r(o.jibDeg, 1), kn: r(bb.speed() / KN, 1), wind: r(wind(bb.t), 0),
      grip: r(o.rudderAttach), air: r(o.rudderAir || 0), load: Math.round(Math.abs(o.rudderY)), helm: r(-bb.delta * side / RAD, 1), heel: r(Math.abs(bb.phi) / RAD, 1), off: r(off, 1),
      nLever: Math.round(o.nLever * side), nSide: Math.round(o.nSailSide * side), nHull: Math.round(o.nHull * side), nRud: Math.round(o.nRud * side), rise: r(o.rise || 0, 3), tip: r(tip, 3), cover: r(cover, 3),
      note: bb.t < 3 ? `${w0} knots` : (w1 !== w0 ? `puff ${w1} knots` : `${w0} knots`) + (newCourse !== undefined ? ', helm up to bear away' : '') + (easeAt !== undefined && bb.t > easeAt ? ', MAIN EASED' : ', main held') });
  });
  st.endHeading = r(hdg(b), 0); st.endHeel = r(Math.abs(b.phi) / RAD, 0); st.endKn = r(b.speed() / KN, 1);
  for (const q of Object.keys(st)) if (typeof st[q] === 'number') st[q] = r(st[q], 2);
  return { frames, st };
}
const BR = { course: -90, main: 30, jib: 28 }, CH = { course: -45, main: 8, jib: 12 };
const numbers = {};
function gif(name, title, caption, cells) {
  const out = { title, caption, offLabel: name.startsWith('g2') ? 'still to turn to the new course (dashed)' : undefined, maxHelm: MAXHELM, boat: { loa: B.loa, beam: B.beam, bowOverhang: B.bowOverhang, xcg: B.xcg, mastX: B.rig.mastX, E: B.rig.E, J: B.rig.J, rudderX: 6.0, freeboard: B.rig.freeboard,
    halfBeamMax: Math.max(...B.halfBeam), canoeDepthMax: Math.max(...B.canoeDepth), keelDepth: Math.max(...B.T), rudderDepthUpright: 0.95, rudHalfBeam: B.halfBeam[Math.round(6.0 / B.dx)], rudCanoe: B.canoeDepth[Math.round(6.0 / B.dx)] }, cells: [] };
  numbers[name] = {};
  for (const [label, SM, spec] of cells) { const q = record(SM, spec); out.cells.push({ label, frames: q.frames }); numbers[name][label] = q.st; console.log(name, '|', label, JSON.stringify(q.st)); }
  fs.writeFileSync(new URL(`./out/${name}.json`, import.meta.url), JSON.stringify(out));
}
gif('g1-puff-broach', 'Beam reach, puff from 12 to 32 knots, helmsman holds course, nothing eased',
  'Watch the rudder angle climb as she heels. Before: the rudder always wins. After: it runs out, sucks air, and she rounds up.',
  [['BEFORE (sailing-test model)', OLD, { ...BR, w0: 12, w1: 32 }], ['AFTER (heeled geometry + air)', NEW, { ...BR, w0: 12, w1: 32 }]]);
gif('g2-bear-away-pinned', 'Close-hauled in 24 knots: helm up to bear away with the MAIN PINNED IN',
  'Before: she bears away on the rudder alone. After: the rudder lets go and she refuses, luffing instead.',
  [['BEFORE (sailing-test model)', OLD, { ...CH, w0: 24, w1: 24, newCourse: -110 }], ['AFTER (heeled geometry + air)', NEW, { ...CH, w0: 24, w1: 24, newCourse: -110 }]]);
gif('g3-ease-main', 'Same puff, 12 to 32 knots on a beam reach, new model: main held against main eased',
  'Left: main held, she broaches. Right: main dumped 1.5 s after the puff starts; the turning moment collapses and the rudder holds.',
  [['AFTER, main held', NEW, { ...BR, w0: 12, w1: 32 }], ['AFTER, main eased at 4.5 s', NEW, { ...BR, w0: 12, w1: 32, easeAt: 4.5 }]]);
// extra numbers (no GIF)
for (const [nm, spec] of [['puff 12-22 close-hauled, course held', { ...CH, w0: 12, w1: 22 }], ['puff 12-22 beam reach, course held', { ...BR, w0: 12, w1: 22 }], ['puff 12-28 beam reach, course held', { ...BR, w0: 12, w1: 28 }], ['bear away pinned, 20 kn', { ...CH, w0: 20, w1: 20, newCourse: -110 }], ['bear away main eased, 24 kn', { ...CH, w0: 24, w1: 24, newCourse: -110, easeAt: 3.5 }]]) {
  numbers[nm] = { before: record(OLD, spec).st, after: record(NEW, spec).st }; console.log(nm, JSON.stringify(numbers[nm]));
}
fs.writeFileSync(new URL('./out/numbers-r2.json', import.meta.url), JSON.stringify(numbers, null, 1));
