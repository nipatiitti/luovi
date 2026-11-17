// Fallback named in the notes: lattice stays attached (Kutta at leech, head, foot; luff never sheds); each spanwise strip carries
// one lagging separation state f (1 attached, 0 separated) driven by the lattice's own luff suction, and the strip force is
// blended toward a separated-plate normal force. Constants (global, a priori):
const C = {
  Scrit: 0.5,   // suction where separation starts (flat plate: S = 4 sin(alpha), so about 7 deg past ideal entry)
  Sfull: 1.0,   // suction where the strip is fully separated (about 14.5 deg past ideal entry)
  tauChords: 1.5, // lag, in chord-transit times (dynamic-stall models use about 3 semi-chords)
  CN90: 1.2,    // finite flat plate normal to the flow
};
// separated plate normal force coefficient against sin(alpha)=|Vn|/V : Hoerner's fit CN = CN90 * s / (0.56 + 0.44 s) (quoted from memory)
function CNsep(s) { return C.CN90 * s / (0.56 + 0.44 * s); }
function init(W) { return { f: W.sails.map(s => new Float64Array(s.Ns).fill(1)) }; }
function step(W, st, RHO) {
  const out = { F: [0, 0, 0], Fs: W.sails.map(() => [0, 0, 0]), Mz: 0, Mx: 0, Ms: W.sails.map(() => [0, 0]), dp: new Float64Array(W.Np) }, w = [0, 0, 0];
  W.sails.forEach((s, k) => {
    for (let j = 0; j < s.Ns; j++) {
      const p0 = s.p0 + j; W.wind(W.xc[3 * p0 + 2], w); const V = Math.hypot(w[0], w[1], w[2]);
      const chord = W.lc[p0] / s.se[1];
      const S = Math.abs(W.Sval[k][j]);
      const target = Math.min(1, Math.max(0, 1 - (S - C.Scrit) / (C.Sfull - C.Scrit)));
      const tau = C.tauChords * chord / V; st.f[k][j] += (target - st.f[k][j]) * (1 - Math.exp(-W.dt / tau));
      const f = st.f[k][j];
      for (let i = 0; i < s.Nc; i++) {
        const p = s.p0 + i * s.Ns + j, nx = W.nn[3 * p], ny = W.nn[3 * p + 1], nz = W.nn[3 * p + 2];
        W.wind(W.xc[3 * p + 2], w); const Vn = w[0] * nx + w[1] * ny + w[2] * nz, Vp = Math.hypot(w[0], w[1], w[2]);
        const fs = 0.5 * RHO * Vp * Vp * CNsep(Math.abs(Vn) / Vp) * Math.sign(Vn) * W.area[p];
        const fx = f * W.Fp[3 * p] + (1 - f) * fs * nx, fy = f * W.Fp[3 * p + 1] + (1 - f) * fs * ny, fz = f * W.Fp[3 * p + 2] + (1 - f) * fs * nz;
        out.F[0] += fx; out.F[1] += fy; out.F[2] += fz; out.Fs[k][0] += fx; out.Fs[k][1] += fy; out.Fs[k][2] += fz;
        out.Ms[k][0] += fy * W.xc[3 * p + 2]; out.Ms[k][1] += fy * W.xc[3 * p];
        out.dp[p] = (fx * nx + fy * ny + fz * nz) / W.area[p];
      }
    }
  });
  return out;
}
module.exports = { C, init, step, CNsep };
