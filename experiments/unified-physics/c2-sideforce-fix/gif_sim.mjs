// gif_sim.mjs: frames for c2-wash-old-vs-new.gif. One hold-out hull (default Sysser 33, the wide shallow one that was worst),
// one tank run near 6 deg leeway, towed captive from a standing start of the water (fresh slices) for 3 hull transits,
// without and with C2 (R1 = R2 = false). model.js is loaded with two read-outs added per slice (wash felt, force); no physics changed.
//   node gif_sim.mjs [sys]  -> out/gif_frames.json
import { readFileSync, writeFileSync } from 'node:fs';
import { loadModel } from './tow.mjs';
const sys = +(process.argv[2] || 33), RAD = Math.PI / 180, DT = 1 / 240;
const bodies = JSON.parse(readFileSync(new URL('./out/bodies.json', import.meta.url)));
const cases = JSON.parse(readFileSync(new URL('./out/delft_cases.json', import.meta.url)));
const SAILS = JSON.parse(readFileSync(new URL('./out/sails.json', import.meta.url))).hboat;
const READ = (s) => { const a = 'm._arm = arm;'; if (!s.includes(a)) throw new Error('patch'); return s.replace(a, 'm._Fy = Fy; m._wash = wash; m._arm = arm;'); };
const c = cases.find((q) => q.sys === sys), bd = bodies[sys], d = bd.data, Lref = c.L * bd.s;
const t = c.tests.filter((z) => Math.abs(z.beta) >= 3 && z.V / Math.sqrt(9.81 * c.L) < 0.4).sort((a, b) => Math.abs(Math.abs(a.beta) - 6) - Math.abs(Math.abs(b.beta) - 6))[0];
const beta = Math.abs(t.beta), U = t.V * Math.sqrt(bd.s), xF = c.L / 2 - c.lcb - c.dFore, xA = c.L / 2 - c.lcb - c.dAft;
const tank = { sideN: Math.abs(t.Ff + t.Fa) * bd.s ** 3, clr: (t.Ff * xF + t.Fa * xA) / (t.Ff + t.Fa) / c.L }; // Froude scaling: force x scale^3
const runs = {};
for (const [k, M] of [['old', loadModel(false, false, READ, false)], ['new', loadModel(false, false, READ, true)]]) {
  const b = new M.Boat(d, SAILS, { u: U }), u = U * Math.cos(beta * RAD), v = -U * Math.sin(beta * RAD);
  const hold = () => { b.u = u; b.v = v; b.r = 0; b.p = 0; b.phi = 0; }; hold(); b.markers = [b.newMarker(0)]; // the water ahead is still: slices enter at the bow
  const every = 12, nT = Math.round(3 * d.L / U / DT), frames = []; let aY = 0, aX = 0, aN = 0, aR = 0, k2 = 0; const hist = [];
  for (let i = 0; i < nT; i++) {
    const v0 = b.v; b.step(DT, { tillerDeg: 0, sails: false }, { wind: 0 }); const dv = b.v - v0;
    for (const m of b.markers) { const dP = m.G * m._c * dv; m.Plin -= dP; m.Patt -= dP * m._kf; } hold();
    const o = b.out; aY += o.keelY + o.rudderY; aX += o.hullX; aN += o.nRud + o.nHull; aR += o.rudderY; k2++;
    if (i % every === every - 1) {
      hist.push([aY / k2, aX / k2, aN / k2, aR / k2]); aY = aX = aN = aR = 0; k2 = 0;
      const w = hist.slice(-10), Y = w.reduce((s, q) => s + q[0], 0) / w.length, X = w.reduce((s, q) => s + q[1], 0) / w.length, N = w.reduce((s, q) => s + q[2], 0) / w.length, R = w.reduce((s, q) => s + q[3], 0) / w.length;
      frames.push({ t: +(b.t).toFixed(3), side: Math.round(Y * Math.cos(beta * RAD) + X * Math.sin(beta * RAD)), rud: Math.round(R), clr: Math.abs(Y) > 50 ? +((bd.xcg - N / Y) / Lref).toFixed(3) : null,
        m: b.markers.map((m) => [+m.x.toFixed(2), +(m._wash / v || 0).toFixed(2), +((m.Pw + m.Pcf + m.Patt) / (v * 1)).toFixed(3)]) });
    }
  }
  runs[k] = frames; const f = frames[frames.length - 1]; console.log(k, 'side', f.side, 'N, rudder', f.rud, 'centre', f.clr, '| tank', Math.round(tank.sideN), tank.clr.toFixed(3));
}
const keel = [], rud = []; for (let i = 0; i < d.n; i++) { const fin = d.T[i] > d.canoeDepth[i] + 1e-6; keel.push(fin && !(d.rud0[i] > 0) ? 1 : 0); rud.push(d.rud0[i] > 0 ? 1 : 0); }
writeFileSync(new URL('./out/gif_frames.json', import.meta.url), JSON.stringify({ sys, beta, U, L: d.L, dx: d.dx, halfBeam: d.halfBeam, T: Array.from(d.T), keel, rud, v: U * Math.sin(beta * RAD), tank, bt: c.bwl / c.tc, runs }));
