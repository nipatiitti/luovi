import { SM, makeBoat, tow, hydro, decay, KN, RAD } from './sealib.mjs';
const out = {};
const h = hydro(makeBoat('hboat')); console.log('hydrostatic', JSON.stringify(h, (k, v) => typeof v === 'number' ? +v.toFixed(3) : v));
for (const rad of [0, 'ref']) for (const U of [0, 5 * KN]) for (const dt of [1 / 240, 1 / 120]) for (const mode of ['heave', 'pitch']) {
  SM.C.RADIATION = rad === 0 ? 0 : 2 * Math.PI / (mode === 'heave' ? h.Theave : h.Tpitch);
  const b = makeBoat('hboat', mode === 'heave' ? { zeta: 0.10, u: U } : { thetaDeg: 3, u: U }), ts = [], xs = [];
  tow(b, U, 14, dt, null, (bb) => { ts.push(bb.t); xs.push(mode === 'heave' ? bb.zeta : bb.theta); });
  const d = decay(ts, xs); console.log(rad === 0 ? 'slice law  ' : 'with radiat', mode, 'U', (U / KN).toFixed(0), 'dt 1/' + Math.round(1 / dt), 'T', d.T.toFixed(3), 'damping ratio first/second cycle', (d.zeta1 * 100).toFixed(1) + '%', (d.zeta2 * 100).toFixed(1) + '%', 'end', xs[xs.length - 1].toExponential(2));
}
