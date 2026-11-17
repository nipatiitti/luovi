// chk_rao.mjs: regular head waves, towed at 0 and 5 knots, free to heave and pitch. Slice law as proposed against the same
// equations with the classical 2D radiation damping at the encounter frequency (= ordinary strip theory in the
// Gerritsma-Beukelman relative-motion form), and Gerritsma-Beukelman's radiated-energy added resistance from that reference.
import fs from 'fs';
import { SM, makeBoat, tow, hydro, KN, G, RHO } from './sealib.mjs';
const L = 6.386, Bwl = 1.84, dt = 1 / 240, res = [];
const lams = [0.5, 0.7, 0.85, 1, 1.15, 1.3, 1.5, 1.75, 2, 2.25, 2.5, 3, 3.5, 4, 5, 6];
for (const Ukn of [0, 5]) for (const ll of lams) {
  const lam = ll * L, k = 2 * Math.PI / lam, w = Math.sqrt(G * k), U = Ukn * KN, we = w + k * U, a = Math.min(0.04, lam / 150), row = { Ukn, ll, we: +we.toFixed(3), a };
  for (const mode of ['law', 'ref']) {
    SM.C.RADIATION = mode === 'law' ? 0 : we;
    const sea = SM.makeSea({ regular: { a, lambda: lam }, dir: 0 }), b = makeBoat('hboat', { u: U });
    const Te = 2 * Math.PI / we, total = mode === 'law' ? 150 : 40, nper = Math.floor((mode === 'law' ? 60 : 15) / Te), t0 = total - nper * Te;
    let cz = 0, sz = 0, cq = 0, sq = 0, fx = 0, fk = 0, n = 0; const ns = b.ns, cw = new Float64Array(ns), sw = new Float64Array(ns);
    tow(b, U, total, dt, sea, (bb) => { if (bb.t < t0) return; const c = Math.cos(we * bb.t), s = Math.sin(we * bb.t); cz += bb.zeta * c; sz += bb.zeta * s; cq += bb.theta * c; sq += bb.theta * s; fx += bb.out.seaX; fk += bb.out.seaFK; n++; for (let i = 0; i < ns; i++) { cw[i] += bb.s_wrelS[i] * c; sw[i] += bb.s_wrelS[i] * s; } });
    const heave = 2 * Math.hypot(cz, sz) / n / a, pitch = 2 * Math.hypot(cq, sq) / n / (k * a), Raw = -fx / n, nd = RHO * G * a * a * Bwl * Bwl / L;
    row[mode] = { heave: +heave.toFixed(3), pitch: +pitch.toFixed(3), Raw: +Raw.toFixed(2), RawND: +(Raw / nd).toFixed(2) };
    if (mode === 'ref') { // Gerritsma and Beukelman 1972: Raw = k / (2 we) * integral of b' |Vz|^2, b' = b - U da/dx (x forward)
      const sd = b.d.sea, k0 = Math.round(-sd.h0 / sd.dh), kk = we * we / G; let R = 0;
      for (let i = 0; i < ns; i++) { const q = sd.stations[i], B = q.B[k0]; if (B < 1e-6) continue; const Ab = 2 * Math.sin(Math.min(Math.PI / 2, kk * B / 2)) * Math.exp(-kk * q.S[k0] / B), bb = RHO * G * G * Ab * Ab / we ** 3;
        const da = RHO * ((sd.stations[Math.min(ns - 1, i + 1)].A[k0]) - (sd.stations[Math.max(0, i - 1)].A[k0])) / (2 * sd.ds), V2 = 4 * (cw[i] ** 2 + sw[i] ** 2) / (n * n); R += (bb + U * da) * V2 * sd.ds; }
      row.gb = { Raw: +(k / (2 * we) * R).toFixed(2), RawND: +(k / (2 * we) * R / nd).toFixed(2) };
    }
  }
  res.push(row); console.log(JSON.stringify(row));
}
SM.C.RADIATION = 0;
fs.writeFileSync(new URL('./out/rao.json', import.meta.url), JSON.stringify(res));
