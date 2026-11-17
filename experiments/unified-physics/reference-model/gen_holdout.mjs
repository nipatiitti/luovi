// gen_holdout.mjs: writes data/holdout.json, the small stored set the smoke check tows: three hulls of the Delft
// Systematic Yacht Hull Series hold-out (a narrow one, a typical one and a wide shallow one), each as the section stack
// the model runs on, with the steady slice law's side force (h1b-holdout, every constant frozen, SHED_FRACTION 1) and
// the tank's for a few runs below Froude 0.40 at 3 degrees of leeway or more.
// Needs the Delft cases extracted by ../h1b-holdout/extract_delft.py into ../h1b-holdout/out/delft_cases.json (the tank
// data is not in the repository: measurements https://doi.org/10.4121/21501402, hydrostatics https://doi.org/10.4121/21501375).
// The stored file is what makes smoke.mjs run without them. About 30 s.
// Scale: built at model scale as in h1b, then Froude-scaled to the case's full scale (lengths x s, speed x sqrt s),
// because the model's slice spacing is a fixed 0.05 m. Coefficients are side force over 500 U^2 L Tmax.
import fs from 'fs';
import { precompute, delftModel } from '../h1b-holdout/hulls.mjs';
import { marchSteady, CONSTANTS } from '../h1b-holdout/slicelaw.mjs';
const SYS = (process.argv[2] || '6,33,45').split(',').map(Number), RUNS = 3;
const cases = JSON.parse(fs.readFileSync(new URL('../h1b-holdout/out/delft_cases.json', import.meta.url), 'utf8'));
const r5 = (v) => +(+v).toPrecision(6), out = [];
for (const sys of SYS) {
  const c = cases.find((q) => q.sys === sys), body = precompute(delftModel(c), 131), s = c.scale, n = body.x.length;
  const rl = c.L - c.LER, rud = [], rud0 = [], sharp = [], cd = [];
  for (let i = 0; i < n; i++) {
    const sp = body.specs[i], Tc = sp.b > 1e-9 ? sp.Tc : 0, isR = sp.blade && body.x[i] > rl && sp.blade.Tk > Tc;
    rud0.push(isR ? 1 : 0); rud.push(isR ? r5((sp.blade.Tk - Tc) / sp.blade.Tk) : 0);
    const q = body.rOverT[i]; sharp.push(Number.isFinite(q) ? r5(Math.exp(-q / 0.1)) : 0); cd.push(r5(Tc * s));
  }
  const halfBeam = body.specs.map((sp) => r5(sp.b * s)), L = body.L * s, dx = L / (n - 1);
  let wetted = 0; for (let i = 1; i < n; i++) wetted += 0.5 * (Math.PI * (halfBeam[i] + cd[i]) + Math.PI * (halfBeam[i - 1] + cd[i - 1])) * dx * 0.5;
  const xcg = (c.L / 2 - c.lcb) * s, Tmax = body.Tmax * s, Lref = c.L * s;
  const data = { L, n, dx, A: body.A.map((a) => r5(a * s * s)), T: body.T.map((t) => r5(t * s)), sharp, rud, rud0, halfBeam, canoeDepth: cd, wetted: r5(wetted),
    beam: 1.15 * c.bwl * s, rig: { freeboard: 0.09 * c.L * s, BAS: 1, P: 10, mastX: 0.35 * L }, // deck beam, freeboard and rig are placeholders: the sails are down
    mass: 1e12, kYaw: 1, kRoll: 1, GM: 0, crewMass: 0, crewYMax: 0, xcg, tillerMaxDeg: 30,
    hydro: { LWL: Lref, volc: 1 }, waveDrag: { source: 'none (captive tow: side force only)', curve: [[0.1, 0], [0.7, 0]] } };
  const xF = c.L / 2 - c.lcb - c.dFore, xA = c.L / 2 - c.lcb - c.dAft, q = (V) => 500 * V * V * c.L * body.Tmax;
  const pick = c.tests.filter((t) => Math.abs(t.beta) >= 3 && t.V / Math.sqrt(9.81 * c.L) < 0.4).sort((a, b) => Math.abs(a.beta) - Math.abs(b.beta));
  const runs = [pick[0], pick[Math.floor(pick.length / 2)], pick[pick.length - 1]].slice(0, RUNS).map((t) => {
    const beta = Math.abs(t.beta), m = marchSteady(body, { U: t.V, betaDeg: beta }, { ...CONSTANTS, SHED_FRACTION: 1 });
    return { U: r5(t.V * Math.sqrt(s)), froude: r5(t.V / Math.sqrt(9.81 * c.L)), betaDeg: r5(beta), steadyLaw: r5(m.sideForce / q(t.V)), tank: r5(Math.abs(t.Ff + t.Fa) / q(t.V)), steadyLawCentre: r5(m.xCLR / c.L), tankCentre: r5((t.Ff * xF + t.Fa * xA) / (t.Ff + t.Fa) / c.L) };
  });
  out.push({ sys, scale: s, Lref: r5(Lref), Tmax: r5(Tmax), xcg: r5(xcg), bwlOverTc: r5(c.bwl / c.tc), runs, data });
  console.log('Sys', sys, 'B/T', (c.bwl / c.tc).toFixed(1), runs.map((r) => `beta ${r.betaDeg} law ${r.steadyLaw} tank ${r.tank}`).join('; '));
}
fs.writeFileSync(new URL('./data/holdout.json', import.meta.url), JSON.stringify({ source: 'Delft Systematic Yacht Hull Series, DOI 10.4121/21501402 and 10.4121/21501375; hull stacks built from main particulars by ../h1b-holdout/hulls.mjs', hulls: out }));
