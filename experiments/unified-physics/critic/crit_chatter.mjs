import { finBoat } from './boats.mjs';
import * as S from './scenarios.mjs';
import { MODEL } from './sim.mjs';
for (const [d,dt] of [[0.05,1/240],[0.025,1/240],[0.0125,1/240],[0.05,1/960],[0.2,1/240]]) {
  MODEL.markerSpacing = d;
  const cfg = finBoat(); const { b } = S.settle(cfg, 12, 40, dt);
  const rows = []; let over = false;
  const n=Math.round(12/dt);
  for (let i = 0; i < n; i++) {
    const turned = Math.atan2(Math.sin(b.psi + Math.PI / 4), Math.cos(b.psi + Math.PI / 4)) * 180 / Math.PI;
    if (turned >= 65) over = true;
    b.step(dt, b.t < 1 ? { deltaCmdDeg: S.helmTo(b, -45), rateDegPerS: 25 } : over ? { deltaCmdDeg: S.helmTo(b, 45), rateDegPerS: 25 } : { deltaCmdDeg: 30, rateDegPerS: 25 }, { wind: 12 * S.KN });
    rows.push([b.out.hullX, b.out.keelY, b.out.rudderY]);
  }
  let out=`marker ${d} m, dt 1/${Math.round(1/dt)}:`;
  for (const [k, name] of [[0, 'surge'], [1, 'keel'], [2, 'rudder']]) {
    let jump = 0, lo = 1e9, hi = -1e9;
    for (let i = 1; i < rows.length; i++) { jump = Math.max(jump, Math.abs(rows[i][k] - rows[i - 1][k])); lo = Math.min(lo, rows[i][k]); hi = Math.max(hi, rows[i][k]); }
    out+=` ${name} range ${(hi-lo).toFixed(0)} jump ${jump.toFixed(1)} N;`;
  }
  console.log(out);
}
