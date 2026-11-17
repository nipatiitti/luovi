import { makeBoat, run, SM, KN, RAD } from './scen_lib.mjs';
const key = process.argv[2] || 'hboat', ang = +(process.argv[3] || 60), kn = +(process.argv[4] || 5);
if (process.argv[5]) SM.C.tillerRate = +process.argv[5];
const b = makeBoat(key, { u: kn * KN }); run(b, 1.5, () => ({ tillerDeg: 0, sails: false }), () => ({ wind: 0 })); b.u = kn * KN; b.t = 0; let k = 0;
run(b, 5, () => ({ tillerDeg: ang, sails: false }), () => ({ wind: 0 }), (bb) => { if (k++ % 4 === 0 || bb.t < 1) console.log(bb.t.toFixed(2), 'delta', (bb.delta / RAD).toFixed(0), 'u', bb.u.toFixed(2), 'v', bb.v.toFixed(2), 'r', (bb.r / RAD).toFixed(1), 'flow', bb.out.rudderFlowDeg.toFixed(1), 'att', bb.out.rudderAttach.toFixed(2), 'Y', Math.round(bb.out.rudderY), 'X', Math.round(bb.out.rudderX), 'keelY', Math.round(bb.out.keelY)); });
