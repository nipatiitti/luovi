// chk_rao2.mjs: regular head waves at 0 and 5 knots with the radiation memory (no frequency supplied) and with v1's frozen-frequency stand-in,
// added to v1's rao.json (law = no radiation, ref = classical strip theory with b at the encounter frequency) -> out/rao2.json
import fs from 'fs';
import { SM, makeBoat, tow, KN, G } from './sealib.mjs';
const L = 6.386, dt = 1 / 240, res = JSON.parse(fs.readFileSync(new URL('./out/rao.json', import.meta.url)));
let worst = { heave: 0, pitch: 0 }, worstAbs = { heave: 0, pitch: 0 };
for (const row of res) { const lam = row.ll * L, k = 2 * Math.PI / lam, U = row.Ukn * KN, we = row.we, a = row.a;
  for (const mode of ['mem', 'frz']) { SM.C.MEMORY = mode === 'mem'; SM.C.RADIATION = mode === 'mem' ? 0 : 3.689;
    const sea = SM.makeSea({ regular: { a, lambda: lam }, dir: 0 }), b = makeBoat('hboat', { u: U }), Te = 2 * Math.PI / we, total = 40, nper = Math.floor(15 / Te), t0 = total - nper * Te;
    let cz = 0, sz = 0, cq = 0, sq = 0, n = 0;
    tow(b, U, total, dt, sea, (bb) => { if (bb.t < t0) return; const c = Math.cos(we * bb.t), s = Math.sin(we * bb.t); cz += bb.zeta * c; sz += bb.zeta * s; cq += bb.theta * c; sq += bb.theta * s; n++; });
    row[mode] = { heave: +(2 * Math.hypot(cz, sz) / n / a).toFixed(3), pitch: +(2 * Math.hypot(cq, sq) / n / (k * a)).toFixed(3) }; }
  for (const m of ['heave', 'pitch']) { const d = row.mem[m] - row.ref[m]; row['d' + m] = +(d / row.ref[m] * 100).toFixed(0); if (row.ref[m] > 0.2) worst[m] = Math.max(worst[m], Math.abs(d / row.ref[m])); worstAbs[m] = Math.max(worstAbs[m], Math.abs(d)); }
  console.log(row.Ukn, 'kn λ/L', row.ll, 'heave law/ref/frozen/memory', row.law.heave, row.ref.heave, row.frz.heave, row.mem.heave, `(${row.dheave}%)`, ' pitch', row.law.pitch, row.ref.pitch, row.frz.pitch, row.mem.pitch, `(${row.dpitch}%)`); }
console.log('worst relative difference memory vs reference where reference > 0.2:', JSON.stringify(worst), 'worst absolute:', JSON.stringify(worstAbs));
SM.C.MEMORY = true; SM.C.RADIATION = 0;
fs.writeFileSync(new URL('./out/rao2.json', import.meta.url), JSON.stringify(res));
