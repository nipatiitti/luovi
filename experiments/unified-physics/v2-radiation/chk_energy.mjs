import { SM, makeBoat, KN, RAD } from './sealib.mjs';
SM.C.EBUDGET = true;
for (const [kn, Mom] of [[6.5, -2500], [6.5, 0], [0, -2500]]) { const b = makeBoat('hboat', { thetaDeg: 1, u: kn * KN }), dt = 1 / 240, psi0 = b.psi;
  for (let i = 0; i < 80 / dt; i++) { b.u = kn * KN; b.v = 0; b.r = 0; b.p = 0; b.phi = 0; b.psi = psi0; if (i === 40 / dt) { for (const k of ['hyd', 'drag', 'conv', 'inert']) b.E[k].fill(0); b.E.ext = 0; b.E.T = 0; }
    b.step(dt, { sails: false, tillerDeg: 0 }, { wind: 0, windDir: 0, sea: null, pitchMoment: Mom }); }
  const E = b.E, sum = (a, i0 = 0, i1 = 999) => a.reduce((s, x, i) => s + (i >= i0 && i < i1 ? x : 0), 0) / E.T;
  console.log(kn, 'kn, moment', Mom, ': mean power W into heave+pitch: buoyancy', sum(E.hyd).toFixed(1), 'drag', sum(E.drag).toFixed(1), 'convective', sum(E.conv).toFixed(1), 'inertial', sum(E.inert).toFixed(1), 'ext', (E.ext / E.T).toFixed(1));
  const st = b.d.sea.stations; let line = '';
  for (let i0 = 0; i0 < st.length; i0 += 8) line += ` s${st[i0].s.toFixed(1)}: c${sum(E.conv, i0, i0 + 8).toFixed(1)} i${sum(E.inert, i0, i0 + 8).toFixed(1)} h${sum(E.hyd, i0, i0 + 8).toFixed(1)} d${sum(E.drag, i0, i0 + 8).toFixed(1)} |`;
  console.log(line); }
