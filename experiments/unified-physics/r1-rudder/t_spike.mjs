import { makeBoat, SM, KN, RAD } from './scen_lib.mjs';
const tag = process.env.R1 === '0' ? 'BEFORE' : 'AFTER'; for (const k of (process.env.OFF || '').split(',')) if (k) SM.C[k] = true;
for (const key of ['hboat', 'ifboat']) for (const ang of [30, 60]) { const b = makeBoat(key, { u: 5 * KN }); for (let i = 0; i < 360; i++) b.step(1 / 240, { tillerDeg: 0, sails: false }, { wind: 0 }); b.u = 5 * KN;
  const L = []; for (let i = 0; i < 240 * 8; i++) { b.step(1 / 240, { tillerDeg: ang, sails: false }, { wind: 0 }); L.push(Math.hypot(b.out.rudderY, b.out.rudderX)); }
  // smooth load (0.25 s mean) and roughness (rms of sub-step load about that mean, after the first second)
  const sm = L.map((_, i) => { let s = 0, k = 0; for (let j = Math.max(0, i - 30); j <= Math.min(L.length - 1, i + 30); j++) { s += L[j]; k++; } return s / k; });
  let rough = 0, n = 0, pk = 0, pkRaw = 0, jumps = 0; for (let i = 0; i < L.length; i++) { pk = Math.max(pk, sm[i]); pkRaw = Math.max(pkRaw, L[i]); if (i > 240) { rough += (L[i] - sm[i]) ** 2; n++; if (Math.abs(L[i] - sm[i]) > 0.5 * sm[i]) jumps++; } }
  console.log(tag, key, ang, 'deg: peak load raw', Math.round(pkRaw), 'N, 0.25 s mean', Math.round(pk), 'N; roughness rms', Math.round(Math.sqrt(rough / n)), 'N; sub-steps more than 50% off the mean:', jumps, 'of', n); }
