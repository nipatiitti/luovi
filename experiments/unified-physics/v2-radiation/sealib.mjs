// sealib.mjs: helpers for the v1-seaway checks.
import { SM, HULLS, makeBoat, KN, RAD } from './lib.mjs';
export { SM, HULLS, makeBoat, KN, RAD };
export const G = 9.81, RHO = 1000;
/** Towed boat: speed U and heading held, no sails, free to heave and pitch only. each(b, t) every step. */
export function tow(b, U, seconds, dt, sea, each) {
  const psi0 = b.psi, n = Math.round(seconds / dt);
  for (let i = 0; i < n; i++) {
    b.u = U; b.v = 0; b.r = 0; b.p = 0; b.phi = 0; b.psi = psi0;
    b.step(dt, { sails: false, tillerDeg: 0 }, { wind: 0, windDir: 0, sea });
    if (!Number.isFinite(b.zeta + b.theta)) throw new Error('blew up at t=' + b.t.toFixed(2));
    if (each) each(b, i);
  }
}
export function hydro(b) { // hydrostatic estimates from the same section tables
  const sd = b.d.sea, k0 = Math.round(-sd.h0 / sd.dh), M = b.d.mass; let Aw = 0, IL = 0, m33 = 0, m55 = 0, mx = 0;
  for (const q of sd.stations) { const arm = b.d.xcg - q.s; Aw += q.B[k0] * sd.ds; IL += q.B[k0] * arm * arm * sd.ds; mx += q.B[k0] * arm * sd.ds; m33 += RHO * q.A[k0] * sd.ds; m55 += RHO * q.A[k0] * arm * arm * sd.ds; }
  const Iyy = M * sd.kPitch ** 2;
  return { Aw, IL, m33, m55, Iyy, M, Theave: 2 * Math.PI * Math.sqrt((M + m33) / (RHO * G * Aw)), Tpitch: 2 * Math.PI * Math.sqrt((Iyy + m55) / (RHO * G * IL)), TheaveNoAm: 2 * Math.PI * Math.sqrt(M / (RHO * G * Aw)) };
}
/** Period and damping ratio from a decaying trace (successive same-sign peaks). */
export function decay(ts, xs) {
  const pk = []; for (let i = 1; i < xs.length - 1; i++) if (xs[i] > xs[i - 1] && xs[i] >= xs[i + 1] && xs[i] > 0) pk.push([ts[i], xs[i]]);
  if (pk.length < 3) return { T: NaN, zeta: NaN, peaks: pk.length };
  const T = (pk[Math.min(4, pk.length - 1)][0] - pk[0][0]) / Math.min(4, pk.length - 1), ld = Math.log(pk[0][1] / pk[1][1]), ld2 = Math.log(pk[1][1] / pk[2][1]);
  return { T, zeta1: ld / Math.sqrt(4 * Math.PI ** 2 + ld * ld), zeta2: ld2 / Math.sqrt(4 * Math.PI ** 2 + ld2 * ld2), peaks: pk.length };
}
