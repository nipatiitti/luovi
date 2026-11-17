// peak rudder load (0.25 s running mean) for a slam to 60 degrees at 5 knots, three tiller rates
import { makeBoat, SM, KN } from './scen_lib.mjs';
const tag = process.env.R1 === '0' ? 'BEFORE' : 'AFTER';
for (const rate of [120, 60, 30]) { SM.C.tillerRate = rate; const b = makeBoat('hboat', { u: 5 * KN }); for (let i = 0; i < 360; i++) b.step(1 / 240, { tillerDeg: 0, sails: false }, { wind: 0 }); b.u = 5 * KN;
  const L = []; for (let i = 0; i < 240 * 8; i++) { b.step(1 / 240, { tillerDeg: 60, sails: false }, { wind: 0 }); L.push(Math.hypot(b.out.rudderY, b.out.rudderX)); }
  let pk = 0; for (let i = 30; i < L.length - 30; i++) { let s = 0; for (let j = i - 30; j <= i + 30; j++) s += L[j]; pk = Math.max(pk, s / 61); }
  console.log(tag, 'slam to 60 deg at', rate, 'deg/s: peak load', Math.round(pk), 'N, number', (pk / 1109).toFixed(2)); }
