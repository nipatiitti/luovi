import { OLD, NEW, make, run, helm, hdg, KN, RAD } from './r2lib.mjs';
const key = process.env.BOAT || 'hboat';
function scen(name, { course, main, jib, w0, w1, way, maxHelm = 35, T = 30, newCourse }) {
  for (const [tag, SM] of [['before', OLD], ['after ', NEW]]) {
    const b = make(SM, key, { psiDeg: course, u: 2.5 });
    const env = (t) => ({ wind: (w0 + (w1 - w0) * NEW.clamp((t - 3) / 2, 0, 1)) * KN, windDir: 0 });
    try { run(b, 50, (bb) => ({ tillerDeg: helm(bb, course, maxHelm), mainSheet: main, jibSheet: jib, crew: 1 }), () => ({ wind: w0 * KN, windDir: 0 })); } catch (e) { console.log(name, tag, 'settle blew'); continue; }
    b.t = 0; const s0 = `${(b.speed() / KN).toFixed(1)} kn heel ${(-b.phi / RAD).toFixed(0)} rud ${(-b.delta / RAD).toFixed(1)}`;
    let pkHeel = 0, pkRud = 0, minAtt = 1, pkErr = 0, pkAir = 0, tLost = null, line = '';
    try { run(b, T, (bb, t) => {
      const c = { tillerDeg: helm(bb, t > 3 && newCourse !== undefined ? newCourse : course, maxHelm), mainSheet: main, jibSheet: jib, crew: 1 };
      if (t > 3 && way === 'free') c.tillerDeg = 0;
      if (t > 4.5 && way === 'ease') c.mainSheet = 70;
      return c; }, env, (bb) => { const e = hdg(bb) - (bb.t > 3 && newCourse !== undefined ? newCourse : course);
        pkHeel = Math.max(pkHeel, -bb.phi / RAD); pkRud = Math.max(pkRud, -bb.delta / RAD); minAtt = Math.min(minAtt, bb.out.rudderAttach); pkAir = Math.max(pkAir, bb.out.rudderAir || 0);
        if (bb.t > 3 && newCourse === undefined) { pkErr = Math.max(pkErr, e); if (tLost === null && e > 20) tLost = bb.t - 3; }
        if (process.env.TRACE && Math.abs(bb.t % 1) < 0.03) line += `\n   t ${bb.t.toFixed(0)} hdg ${hdg(bb).toFixed(0)} heel ${(-bb.phi / RAD).toFixed(0)} rud ${(-bb.delta / RAD).toFixed(0)} att ${bb.out.rudderAttach.toFixed(2)} air ${(bb.out.rudderAir || 0).toFixed(2)} sp ${(bb.speed() / KN).toFixed(1)} flow ${bb.out.rudderFlowDeg.toFixed(0)}`; }); } catch (e) { line += ' BLEW UP'; }
    console.log(`${name} | ${tag} | start ${s0} | peak heel ${pkHeel.toFixed(0)} peak weather helm ${pkRud.toFixed(0)} min attach ${minAtt.toFixed(2)} air ${pkAir.toFixed(2)} | luffed off course by ${pkErr.toFixed(0)} deg${tLost !== null ? ' (20 deg off after ' + tLost.toFixed(1) + ' s)' : ''} | end hdg ${hdg(b).toFixed(0)} heel ${(-b.phi / RAD).toFixed(0)} ${(b.speed() / KN).toFixed(1)} kn${line}`);
  }
}
const CH = { course: -45, main: 8, jib: 12 }, BR = { course: -90, main: 30, jib: 28 }, BRP = { course: -90, main: 8, jib: 28 };
const CR = { course: -65, main: 16, jib: 18 };
if (process.env.SET === '2') {
scen('beam reach puff 12-30, hold course  ', { ...BR, w0: 12, w1: 30 });
scen('beam reach puff 12-32, hold course  ', { ...BR, w0: 12, w1: 32 });
scen('beam reach puff 12-32, ease main    ', { ...BR, w0: 12, w1: 32, way: 'ease' });
scen('close reach 65 puff 12-26, hold     ', { ...CR, w0: 12, w1: 26 });
scen('close reach 65 puff 12-30, hold     ', { ...CR, w0: 12, w1: 30 });
scen('close reach 65 puff 12-30, ease main', { ...CR, w0: 12, w1: 30, way: 'ease' });
scen('bear away 45->110 in 22 kn, main pinned', { ...CH, w0: 22, w1: 22, newCourse: -110 });
scen('bear away 45->110 in 24 kn, main eased ', { ...CH, w0: 24, w1: 24, newCourse: -110, way: 'ease' });
} else {
scen('close-hauled puff 12-22, hold course', { ...CH, w0: 12, w1: 22 });
scen('close-hauled puff 12-22, tiller free', { ...CH, w0: 12, w1: 22, way: 'free' });
scen('beam reach puff 12-22, hold course  ', { ...BR, w0: 12, w1: 22 });
scen('beam reach puff 12-22, tiller free  ', { ...BR, w0: 12, w1: 22, way: 'free' });
scen('beam reach puff 12-22, ease main    ', { ...BR, w0: 12, w1: 22, way: 'ease' });
scen('beam reach puff 12-28, hold course  ', { ...BR, w0: 12, w1: 28 });
scen('beam reach puff 12-28, ease main    ', { ...BR, w0: 12, w1: 28, way: 'ease' });
scen('bear away 45->110 in 20 kn, main pinned', { ...CH, w0: 20, w1: 20, newCourse: -110 });
scen('bear away 45->110 in 20 kn, main eased ', { ...CH, w0: 20, w1: 20, newCourse: -110, way: 'ease' });
scen('bear away 45->110 in 24 kn, main pinned', { ...CH, w0: 24, w1: 24, newCourse: -110 });
}
