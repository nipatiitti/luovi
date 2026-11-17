// diag.mjs: steady force breakdown, old H-boat data against the class data (same model)
import fs from 'fs'; import { SM, HULLS, SAILS, run, KN, RAD, helmTo } from './lib.mjs';
const OH = JSON.parse(fs.readFileSync(new URL('../out/old/hulls.json', import.meta.url))), OS = JSON.parse(fs.readFileSync(new URL('../out/old/sails.json', import.meta.url)));
export const SETS = { old: [OH.hboat, OS.hboat], real: [HULLS.hboat, SAILS.hboat] };
if (process.argv[1].endsWith('diag.mjs')) for (const [nm, course, main, jib, w] of [['close-hauled', -45, 8, 12, 8], ['close-hauled', -45, 8, 12, 12], ['close-hauled', -45, 8, 12, 16], ['close-hauled', -45, 8, 12, 20], ['close-hauled', -45, 8, 12, 24], ['beam reach', -90, 30, 28, 12], ['beam reach', -90, 30, 28, 24]]) for (const k of ['old', 'real']) {
  const b = new SM.Boat(SETS[k][0], SETS[k][1], { psiDeg: course, u: 2.5 }), a = {}; let n = 0;
  run(b, 60, (bb) => ({ tillerDeg: helmTo(bb, course * RAD, 60), mainSheet: main, jibSheet: jib, crew: 1 }), () => ({ wind: w * KN, windDir: 0 }), (bb) => { if (bb.t > 50) { n++; const o = bb.out, q = { kn: bb.speed() / KN, leeway: bb.leewayDeg(), heel: -bb.phi / RAD, helm: -bb.delta / RAD, sailX: o.sailX, sailY: o.sailY, hullX: o.hullX, rudX: o.rudderX, fric: o.friction, wave: o.wave, keelY: o.keelY, rudY: o.rudderY, awa: o.awaDeg, aws: o.aws / KN, nLever: o.nLever, nSailSide: o.nSailSide, nHull: o.nHull, nRud: o.nRud, nDrag: o.nDrag, air: o.rudderAir, fMain: o.fMain, fJib: o.fJib }; for (const kk in q) a[kk] = (a[kk] || 0) + q[kk]; } });
  console.log(nm, w, k.padEnd(5), Object.entries(a).map(([kk, v]) => `${kk} ${(v / n).toFixed(Math.abs(v / n) < 20 ? 2 : 0)}`).join(' '));
}
