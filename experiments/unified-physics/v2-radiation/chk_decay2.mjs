import { SM, makeBoat, tow, hydro, decay, KN, RAD } from './sealib.mjs';
const h = hydro(makeBoat('hboat')); SM.C.RIGQ = 1;
for (const [nm, mem, rad] of [['memory', true, 0], ['frozen ', false, 1], ['law    ', false, 0]]) for (const U of [0, 5 * KN]) for (const dt of [1 / 240, 1 / 120]) for (const mode of ['heave', 'pitch']) {
  SM.C.MEMORY = mem; SM.C.RADIATION = rad ? 2 * Math.PI / (mode === 'heave' ? h.Theave : h.Tpitch) : 0;
  const b = makeBoat('hboat', mode === 'heave' ? { zeta: 0.02, u: U } : { thetaDeg: 0.5, u: U }), ts = [], xs = [];
  tow(b, U, 14, dt, null, (bb) => { ts.push(bb.t); xs.push(mode === 'heave' ? bb.zeta : bb.theta); });
  // damping ratio from the first two extremes of opposite sign (works for heavy damping): overshoot ratio r = exp(-pi z / sqrt(1 - z^2))
  let mn = 0, tmn = 0; for (let i = 0; i < xs.length; i++) if (xs[i] < mn) { mn = xs[i]; tmn = ts[i]; } const r = -mn / xs[0], lr = Math.log(1 / r), z = lr / Math.sqrt(Math.PI ** 2 + lr * lr);
  console.log(nm, mode, 'U', (U / KN).toFixed(0), 'dt 1/' + Math.round(1 / dt), 'first undershoot ratio', r.toFixed(3), 'at t', tmn.toFixed(2), 'damping ratio', (z * 100).toFixed(1) + '%', 'end', xs[xs.length - 1].toExponential(1)); }
