// chatter.mjs: sub-step roughness of the water forces through a tack (does the helm buzz?)
import { finBoat, longBoat } from './boats.mjs';
import * as S from './scenarios.mjs';
for (const cfg of [finBoat(), longBoat()]) {
  const { b } = S.settle(cfg);
  const rows = [];
  let over = false;
  for (let i = 0; i < 240 * 12; i++) {
    const turned = Math.atan2(Math.sin(b.psi + Math.PI / 4), Math.cos(b.psi + Math.PI / 4)) * 180 / Math.PI;
    if (turned >= 65) over = true;
    b.step(S.DT, b.t < 1 ? { deltaCmdDeg: S.helmTo(b, -45), rateDegPerS: 25 } : over ? { deltaCmdDeg: S.helmTo(b, 45), rateDegPerS: 25 } : { deltaCmdDeg: 30, rateDegPerS: 25 }, { wind: 12 * S.KN });
    rows.push([b.out.hullX, b.out.keelY, b.out.rudderY]);
  }
  for (const [k, name] of [[0, 'surge'], [1, 'keel side'], [2, 'rudder side']]) {
    let jump = 0, range = 0, lo = 1e9, hi = -1e9;
    for (let i = 1; i < rows.length; i++) { jump = Math.max(jump, Math.abs(rows[i][k] - rows[i - 1][k])); lo = Math.min(lo, rows[i][k]); hi = Math.max(hi, rows[i][k]); }
    console.log(cfg.key, name, 'range', (hi - lo).toFixed(0), 'N, largest step-to-step jump', jump.toFixed(1), 'N =', (100 * jump / (hi - lo)).toFixed(1), '% of range');
  }
}
