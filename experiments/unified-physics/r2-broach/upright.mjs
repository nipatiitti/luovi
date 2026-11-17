// upright side-effect check: coasting turn from 5 kn with 30 and 60 degrees of helm, sails down; and a 20-degree tack
import { OLD, NEW, make, run, KN, RAD } from './r2lib.mjs';
for (const key of ['hboat', 'ifboat']) for (const helmDeg of [10, 30, 60]) { const o = [];
  for (const SM of [OLD, NEW]) { const b = make(SM, key, { psiDeg: 0, u: 5 * KN }); let pk = 0, minAtt = 1, air = 0; run(b, 4, () => ({ tillerDeg: helmDeg, sails: false }), () => ({ wind: 0, windDir: 0 }), (bb) => { pk = Math.max(pk, Math.abs(bb.r) / RAD); minAtt = Math.min(minAtt, bb.out.rudderAttach); air = Math.max(air, bb.out.rudderAir || 0); });
    o.push(`peak turn ${pk.toFixed(1)} deg/s, speed left ${(b.speed() / KN).toFixed(2)} kn, min attach ${minAtt.toFixed(2)}, air ${air.toFixed(2)}`); }
  console.log(key, 'helm', helmDeg, '| before:', o[0], '| after:', o[1]); }
