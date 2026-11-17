// Stage 1 check: flat elliptic wing in free air (no mirror) against lifting-line / Helmbold.
const { World, RHO } = require('./uvlm.js');
function run(Nc, Ns, AR, alphaDeg, steps) {
  const b = 8, c0 = 4 * b / (Math.PI * AR), S = Math.PI / 4 * b * c0, al = alphaDeg * Math.PI / 180, V = 6;
  // wing along z (span), chord along -x, at height 100 (no mirror), pitched by alpha about z: wind fixed along -x
  const P = (s, v, out) => { const z = (v - 0.5) * b, c = c0 * Math.sqrt(Math.max(1e-4, 1 - (2 * z / b) ** 2)); const xl = 0.25 * c; // quarter-chord line straight
    const xs = xl - s * c; out[0] = xs * Math.cos(al); out[1] = -xs * Math.sin(al) ; out[2] = z + 100; };
  const W = new World({ dt: 0.05, mirror: false, R: +(process.env.R||60), luffShed: false, selfRows: 0, k1: +(process.env.K1||1), k0: +(process.env.K0||0.1), kb: +(process.env.KB||0.25), wind: (z, o) => { o[0] = -V; o[1] = 0; o[2] = 0; } });
  W.addSail(P, Nc, Ns); W.finalize();
  for (let k = 0; k < steps; k++) W.step();
  const q = 0.5 * RHO * V * V * W.sails[0].area;
  return { CL: W.F[1] / q, CD: -W.F[0] / q, S: W.sails[0].area, Sexact: S };
}
for (const AR of [4]) for (const [Nc, Ns] of [[6, 12]]) {
  const t0 = Date.now(); const r = run(Nc, Ns, AR, 5, 120); const a = 5 * Math.PI / 180;
  const ARe = 64 / r.S; // actual lattice aspect ratio
  const ll = 2 * Math.PI * a / (1 + 2 / ARe), hb = 2 * Math.PI * ARe * a / (2 + Math.sqrt(ARe * ARe + 4));
  console.log(`AR ${AR} ${Nc}x${Ns}: CL ${r.CL.toFixed(4)} lifting-line ${ll.toFixed(4)} Helmbold ${hb.toFixed(4)} | CDi ${r.CD.toFixed(5)} CL^2/(pi AR) ${(r.CL * r.CL / Math.PI / ARe).toFixed(5)} ratio ${(r.CD / (r.CL * r.CL / Math.PI / ARe)).toFixed(3)} | area ${r.S.toFixed(2)}/${r.Sexact.toFixed(2)} ${Date.now() - t0}ms`);
}
