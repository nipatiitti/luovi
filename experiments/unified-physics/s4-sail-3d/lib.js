// Shared runner helpers for experiment S4.
const U = require('./uvlm.js');
const VREF = 6, DT = 0.05, ZREF = U.FUJIN.deck + U.FUJIN.zGCE, EXPO = 0.10;
function trim(beta) { return Math.min(85, Math.max(3, beta - 20)); } // boom angle: 20 deg of angle of attack at the foot until the boom is on the shrouds
function makeWorld(o) {
  const W = new U.World(Object.assign({ dt: DT, R: 36, luffShed: true, wind: U.windProfile(VREF, ZREF, o.beta, o.expo === undefined ? EXPO : o.expo) }, o.world || {}));
  for (const s of o.sails) W.addSail(s.P, s.Nc, s.Ns, s.opt);
  W.finalize(); return W;
}
function coeffs(W, beta, Sref) {
  const q = 0.5 * U.RHO * VREF * VREF * Sref, b = beta * Math.PI / 180;
  const Fx = W.F[0], Fy = W.F[1];
  return { CX: Fx / q, CY: Fy / q, CL: (Fx * Math.sin(b) + Fy * Math.cos(b)) / q, CD: (-Fx * Math.cos(b) + Fy * Math.sin(b)) / q };
}
// run and gather statistics over the last tAvg seconds; noise = RMS of the half-second boxcar average about the mean, relative to the mean total force
function runStats(W, beta, Sref, T, tAvg, onStep) {
  const n = Math.round(T / DT), n0 = n - Math.round(tAvg / DT), ser = [];
  for (let k = 0; k < n; k++) { W.step(); const c = coeffs(W, beta, Sref); c.zce = W.Ms.reduce((a, m) => a + m[0], 0) / W.F[1]; c.xce = W.Ms.reduce((a, m) => a + m[1], 0) / W.F[1]; ser.push(c); if (onStep) onStep(k, c); }
  const tail = ser.slice(n0), mean = k => tail.reduce((a, c) => a + c[k], 0) / tail.length;
  const m = { CX: mean('CX'), CY: mean('CY'), CL: mean('CL'), CD: mean('CD'), zce: mean('zce'), xce: mean('xce') };
  const w = Math.round(0.5 / DT), box = []; for (let k = 0; k + w <= tail.length; k++) { let sx = 0, sy = 0; for (let j = 0; j < w; j++) { sx += tail[k + j].CX; sy += tail[k + j].CY; } box.push([sx / w, sy / w]); }
  const tot = Math.hypot(m.CX, m.CY); let v = 0, vr = 0; for (const b of box) v += (b[0] - m.CX) ** 2 + (b[1] - m.CY) ** 2; for (const c of tail) vr += (c.CX - m.CX) ** 2 + (c.CY - m.CY) ** 2;
  m.CT = tot; m.noise = Math.sqrt(v / box.length) / tot; m.rawNoise = Math.sqrt(vr / tail.length) / tot; m.ser = ser;
  return m;
}
module.exports = Object.assign({ VREF, DT, ZREF, EXPO, trim, makeWorld, coeffs, runStats }, U);
