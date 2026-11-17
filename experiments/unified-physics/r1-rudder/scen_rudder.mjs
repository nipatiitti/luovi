// Scripted manoeuvre 0: rudder hard over to 30, 45, 60 degrees at 5 knots and at 1 knot, coasting (sails down,
// no wind) so that only the hull and rudder act. One file per boat.
import fs from 'fs';
import { recorder, writeScenario, makeBoat, run, HULLS, KN, RAD, r2 } from './scen_lib.mjs';
const rows = [];
for (const key of Object.keys(HULLS)) {
  const cells = [];
  for (const kn of [5, 1]) for (const ang of [30, 45, 60]) {
    const B = HULLS[key], b = makeBoat(key, { psiDeg: 0, u: kn * KN }), rec = recorder(B);
    run(b, 1.5, () => ({ tillerDeg: 0, sails: false }), () => ({ wind: 0 })); // let the slices fill
    b.t = 0; b.X = 0; b.Y = 0; b.u = kn * KN;
    const st = { peakRate: 0, peakFlow: 0, flow: {}, minAtt: 1, sp: {}, hd: {}, peakLoad: 0 };
    run(b, 14, (bb, t) => ({ tillerDeg: t < 1 ? 0 : ang, sails: false }), () => ({ wind: 0 }), (bb) => {
      rec.take(bb, { note: bb.t < 1 ? 'straight' : `rudder ${ang}°` });
      const tt = bb.t - 1, o = bb.out;
      st.peakRate = Math.max(st.peakRate, bb.r / RAD); st.peakFlow = Math.max(st.peakFlow, o.rudderFlowDeg); st.minAtt = Math.min(st.minAtt, o.rudderAttach);
      st.peakLoad = Math.max(st.peakLoad, Math.hypot(o.rudderY, o.rudderX));
      for (const q of [0.5, 1, 2, 4, 8]) if (Math.abs(tt - q) < 0.026) { st.flow[q] = r2(o.rudderFlowDeg, 1); st.sp[q] = r2(bb.speed() / KN); st.hd[q] = r2(bb.psi / RAD, 0); }
    });
    cells.push({ boat: key, title: `${kn} kn, rudder ${ang}°`, frames: rec.frames, track: rec.track });
    rows.push({ boat: key, startKn: kn, rudderDeg: ang, peakTurnRateDegS: r2(st.peakRate, 1), headingAfter4s: st.hd[4], headingAfter8s: st.hd[8], speedAfter4sKn: st.sp[4], speedLostAfter4sPct: r2(100 * (1 - st.sp[4] / kn), 0), speedAfter8sKn: st.sp[8],
      peakRudderFlowDeg: r2(st.peakFlow, 1), flowAt: st.flow, minAttachment: r2(st.minAtt), peakRudderLoadN: Math.round(st.peakLoad) });
  }
  writeScenario(`g0-rudder-${key}${process.env.R1 === '0' ? '-before' : ''}`, { title: `${HULLS[key].name}: rudder hard over, coasting with sails down`, cols: 3, rows: 2, cells, scale: 7, forceScale: 0.03, font: 16, stack: true, insetZoom: 1.6,
    extraKeys: [['flow on rudder', 'flow', 0, '°'], ['turn rate', 'rate', 0, '°/s']], W: 900, H: 900 });
}
fs.writeFileSync(new URL(`./out/numbers-rudder${process.env.R1 === '0' ? '-before' : ''}.json`, import.meta.url), JSON.stringify(rows, null, 1));
for (const r of rows) console.log(r.boat, `${r.startKn} kn ${r.rudderDeg} deg: peak rate ${r.peakTurnRateDegS} deg/s, heading 4 s ${r.headingAfter4s} 8 s ${r.headingAfter8s}, speed 4 s ${r.speedAfter4sKn} kn (-${r.speedLostAfter4sPct}%) 8 s ${r.speedAfter8sKn}, peak flow ${r.peakRudderFlowDeg} deg, flow at ${JSON.stringify(r.flowAt)}, min attach ${r.minAttachment}, peak load ${r.peakRudderLoadN} N`);
