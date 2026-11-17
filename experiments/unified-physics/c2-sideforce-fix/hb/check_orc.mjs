// Loose check, not tuned to: H-boat steady close-hauled speed against the ORC 2026 beat (research note hboat-polar-target).
// ORC wind is at 10 m; the model has no height profile, so the wind is scaled by 0.909 (log profile at 5 m, same note).
import { settle } from './scen_lib.mjs'; import { KN } from './lib.mjs';
for (const [tws, twa, orcVmg] of [[8, 42.2, 3.37], [16, 38.2, 4.26]]) {
  let best = null;
  for (const main of [4, 8, 12, 18, 25]) for (const jib of [8, 12, 16]) {
    const b = settle('hboat', { windKn: tws * 0.909, courseDeg: -twa, main, jib, seconds: 60 }), s = b.snapshot();
    if (!best || s.speedKn > best.speedKn) best = { main, jib, ...s };
  }
  console.log(`TWS ${tws} kn, ${twa} deg: model ${best.speedKn.toFixed(2)} kn (main ${best.main}, jib ${best.jib}, heel ${Math.abs(best.heelDeg).toFixed(0)}, leeway ${best.leewayDeg.toFixed(1)}), ORC ${(orcVmg / Math.cos(twa * Math.PI / 180)).toFixed(2)} kn`);
}
for (const key of ['hboat', 'ifboat']) { const b = settle(key, {}); const o = b.out, geo = (b.delta + Math.atan2(-b.v - b.r * (b.d.xcg - b.rudderX), b.u)) * 180 / Math.PI; console.log(key, 'steady rudder: geometric angle to the water', geo.toFixed(1), 'felt', o.rudderFlowDeg.toFixed(1), 'entrained sway kg', o.entrained.toFixed(0)); }
