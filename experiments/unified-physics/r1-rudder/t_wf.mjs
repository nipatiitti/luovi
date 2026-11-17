// rectangular fins of effective aspect ratio 3, 2, 1 (surface mirror) against Whicker and Fehlner; plate law after stall
import { isoData, sweep } from './t_iso.mjs'; import { SM } from './lib.mjs';
const tag = process.env.R1 === '0' ? 'BEFORE' : 'AFTER';
const plate = (a) => { const s = Math.sin(a * Math.PI / 180); return 1.2 * s / (0.56 + 0.44 * s); };
for (const [ARe, slopeWF, stallWF, clWF] of [[3, 3.15, 23, 1.25], [2, 2.46, 29, 1.33], [1, 1.43, 38, 1.24]]) {
  const { h } = isoData('hboat', (x, h, i) => h.rud[i] > 0); let S = 0; const c = 0.37, span = ARe / 2 * c;
  for (let i = 0; i < h.n; i++) if (h.rud[i] > 0) { h.T[i] = span; h.A[i] = Math.PI / 2 * span * span; h.sharp[i] = 1; h.rud[i] = 0; S += span * h.dx; }
  const angs = []; for (let a = 2; a <= 44; a += 2) angs.push(a); angs.push(50, 60, 75);
  const r = sweep(SM, h, S, 2.57, 'drift', angs, 5);
  let pk = r[0]; for (const q of r) if (q.a <= 44 && q.CL > pk.CL) pk = q;
  const at = (a) => r.find((q) => q.a === a);
  console.log(tag, 'ARe', ARe, 'slope/rad', (at(4).CL / (4 * Math.PI / 180)).toFixed(2), `(tank ${slopeWF})`, 'peak lift', pk.CL, 'at', pk.a, `deg (tank ${clWF} at ${stallWF})`, 'normal force at 30/44/60/75:', [30, 44, 60, 75].map((a) => at(a).CN).join(' '), 'plate law', [30, 44, 60, 75].map((a) => plate(a).toFixed(2)).join(' '));
}
