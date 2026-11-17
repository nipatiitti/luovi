// chk_rao3.mjs: second reference: classical strip theory with the damping at the encounter frequency AND the added mass that belongs to it
// (Kramers-Kronig of the same formula). Adds 'kk' to out/rao2.json and prints the memory model against both references.
import fs from 'fs';
import { SM, makeBoat, tow, KN } from './sealib.mjs';
const L = 6.386, dt = 1 / 240, f = new URL('./out/rao2.json', import.meta.url), res = JSON.parse(fs.readFileSync(f)); const w = { ref: [0, 0, 0], kk: [0, 0, 0] };
SM.C.MEMORY = false; SM.C.RADIATION_KK = true;
for (const row of res) { const lam = row.ll * L, k = 2 * Math.PI / lam, U = row.Ukn * KN, we = row.we, a = row.a; SM.C.RADIATION = we;
  const sea = SM.makeSea({ regular: { a, lambda: lam }, dir: 0 }), b = makeBoat('hboat', { u: U }), Te = 2 * Math.PI / we, total = 40, nper = Math.floor(15 / Te), t0 = total - nper * Te;
  let cz = 0, sz = 0, cq = 0, sq = 0, n = 0;
  tow(b, U, total, dt, sea, (bb) => { if (bb.t < t0) return; const c = Math.cos(we * bb.t), s = Math.sin(we * bb.t); cz += bb.zeta * c; sz += bb.zeta * s; cq += bb.theta * c; sq += bb.theta * s; n++; });
  row.kk = { heave: +(2 * Math.hypot(cz, sz) / n / a).toFixed(3), pitch: +(2 * Math.hypot(cq, sq) / n / (k * a)).toFixed(3) };
  for (const r of ['ref', 'kk']) { const dh = Math.abs(row.mem.heave - row[r].heave), dp = Math.abs(row.mem.pitch - row[r].pitch), rel = Math.max(dh / Math.max(row[r].heave, 0.2), dp / Math.max(row[r].pitch, 0.2)); row['err_' + r] = +rel.toFixed(2); if (rel > 0.15) w[r][0]++; w[r][1] = Math.max(w[r][1], rel); w[r][2]++; }
  console.log(row.Ukn, 'kn λ/L', row.ll, 'heave ref/consistent ref/memory', row.ref.heave, row.kk.heave, row.mem.heave, ' pitch', row.ref.pitch, row.kk.pitch, row.mem.pitch, ' worst error vs ref, vs consistent', row.err_ref, row.err_kk); }
console.log('points outside 15% (error relative to max(reference, 0.2)), worst, of:', JSON.stringify(w));
fs.writeFileSync(f, JSON.stringify(res));
