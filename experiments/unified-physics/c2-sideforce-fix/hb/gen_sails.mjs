// gen_sails.mjs: offline sail force table. A small STEADY horseshoe lattice (one bound vortex per spanwise strip
// at the quarter chord, control point at three-quarter chord, mirror image in the water plane) for the attached
// 3D load and the jib and main interaction, plus the s4 fallback: one separation state per strip from the
// strip's own luff suction, fading the strip into the flat-plate normal-force law. This is NOT the s4 unsteady
// ring lattice (62 to 213 ms a step; a 3330-case table per boat would have taken hours); same constants.
import fs from 'fs';
export const SAILC = {
  Scrit: 0.5, Sfull: 1.0, // luff suction where separation starts and is complete (s4 fallback, a priori)
  CN90: 1.2,              // flat plate square to the flow (s4 fallback)
  camber: 0.10,           // depth over chord of both sails when full (s4 Fujin value)
  twist0: 10, twistPerDeg: 0.25, // TWIST RULE: head twists off by 10 deg + 0.25 deg per deg of sheet angle, both sails (assumed; no vang or traveller is modelled)
  NsMain: 12, NsJib: 10,
};
const rad = Math.PI / 180;
const CNsep = (s) => SAILC.CN90 * s / (0.56 + 0.44 * s); // Hoerner fit as used in s4 fallback.js
export const GRID = {
  awa: Array.from({ length: 37 }, (_, i) => i * 5),
  ms: [0, 6, 12, 20, 30, 45, 60, 75, 90],
  js: [-60, -40, -25, -15, -8, 8, 15, 25, 40, 60], // jib chord angle; negative = clew held on the windward side (aback)
};
// velocity induced at P by a straight vortex segment A->B of unit circulation (Biot-Savart, small core)
function seg(P, A, B, out) {
  const r1x = P[0] - A[0], r1y = P[1] - A[1], r1z = P[2] - A[2], r2x = P[0] - B[0], r2y = P[1] - B[1], r2z = P[2] - B[2];
  const cx = r1y * r2z - r1z * r2y, cy = r1z * r2x - r1x * r2z, cz = r1x * r2y - r1y * r2x;
  const c2 = cx * cx + cy * cy + cz * cz, n1 = Math.hypot(r1x, r1y, r1z), n2 = Math.hypot(r2x, r2y, r2z);
  const l2 = (B[0] - A[0]) ** 2 + (B[1] - A[1]) ** 2 + (B[2] - A[2]) ** 2;
  const k = ((n1 + n2) / (n1 * n2 * (n1 * n2 + r1x * r2x + r1y * r2y + r1z * r2z) + 1e-12)) / (4 * Math.PI) * (c2 / (c2 + 1e-4 * l2 * 0 + 4e-4)); // core 2 cm
  out[0] += k * cx; out[1] += k * cy; out[2] += k * cz;
}
function luSolve(A, b, n) {
  for (let c = 0; c < n; c++) {
    let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
    [A[c], A[p]] = [A[p], A[c]]; [b[c], b[p]] = [b[p], b[c]];
    for (let r = c + 1; r < n; r++) { const f = A[r][c] / A[c][c]; if (!f) continue; for (let k = c; k < n; k++) A[r][k] -= f * A[c][k]; b[r] -= f * b[c]; }
  }
  const x = new Array(n);
  for (let r = n - 1; r >= 0; r--) { let s = b[r]; for (let k = r + 1; k < n; k++) s -= A[r][k] * x[k]; x[r] = s / A[r][r]; }
  return x;
}
/** Strips of both sails. Frame: x forward from the mast, y to starboard, z up from the water. Wind from starboard. */
function build(rig, awa, mainFoot, jibAngle) {
  const strips = [];
  const zBoom = rig.freeboard + rig.BAS, pMain = rig.E * rig.P / rig.mainArea - 1; // chord = E (1 - zeta)^p gives the measured area
  const add = (sail, luff0, luff1, chord0, chord1, th0, th1, side) => {
    const a = awa * rad;
    const mk = (L, th, c, fr) => [L[0] - fr * c * Math.cos(th), L[1] - fr * c * Math.sin(th), L[2]];
    const c0 = Math.max(chord0, 0.02), c1 = Math.max(chord1, 0.02);
    const Lm = [0, 1, 2].map((k) => 0.5 * (luff0[k] + luff1[k])), thm = 0.5 * (th0 + th1), cm = 0.5 * (c0 + c1);
    const alpha = a - thm, sgn = alpha >= 0 ? 1 : -1;
    const fill = Math.min(1, Math.abs(Math.sin(alpha)) * 4 / SAILC.Scrit); // cloth stand-in: flat at zero incidence, full depth once a flat sail would reach the critical luff suction
    const m = SAILC.camber * fill;
    const thc = thm - sgn * 2 * m; // surface slope at three-quarter chord of a parabolic arc: 2m off the chord line
    strips.push({ sail, A: mk(luff0, th0, c0, 0.25), B: mk(luff1, th1, c1, 0.25), TA: mk(luff0, th0, c0, 1), TB: mk(luff1, th1, c1, 1),
      on: alpha * side > 0, cp: mk(Lm, thm, cm, 0.75), nc: [Math.sin(thc), -Math.cos(thc), 0], nl: [Math.sin(thm), -Math.cos(thm), 0], th: thm, c: cm, alpha, sgn, m,
      area: cm * Math.hypot(luff1[0] - luff0[0], luff1[2] - luff0[2]), L: Lm });
  };
  const twM = (SAILC.twist0 + SAILC.twistPerDeg * mainFoot) * rad, twJ = (SAILC.twist0 + SAILC.twistPerDeg * Math.abs(jibAngle)) * rad * Math.sign(jibAngle);
  for (let i = 0; i < SAILC.NsMain; i++) {
    const z0 = i / SAILC.NsMain, z1 = (i + 1) / SAILC.NsMain;
    add(0, [0, 0, zBoom + z0 * rig.P], [0, 0, zBoom + z1 * rig.P], rig.E * (1 - z0) ** pMain, rig.E * (1 - z1) ** pMain, mainFoot * rad + twM * z0, mainFoot * rad + twM * z1, 1);
  }
  const cf = 2 * rig.jibArea / rig.I;
  for (let i = 0; i < SAILC.NsJib; i++) {
    const z0 = i / SAILC.NsJib, z1 = (i + 1) / SAILC.NsJib;
    add(1, [rig.J * (1 - z0), 0, rig.freeboard + z0 * rig.I], [rig.J * (1 - z1), 0, rig.freeboard + z1 * rig.I], cf * (1 - z0), cf * (1 - z1), jibAngle * rad + twJ * z0, jibAngle * rad + twJ * z1, awa - jibAngle >= 0 ? 1 : -1);
  }
  return strips;
}
function solveCase(rig, awa, mainFoot, jibAngle) {
  const S = build(rig, awa, mainFoot, jibAngle), n = S.length, a = awa * rad;
  const V = [-Math.cos(a), -Math.sin(a), 0], far = 150; // unit wind
  const legs = S.map((s) => [[s.TA[0] + far * V[0], s.TA[1] + far * V[1], s.TA[2]], s.TA, s.A, s.B, s.TB, [s.TB[0] + far * V[0], s.TB[1] + far * V[1], s.TB[2]]]);
  const tmp = [0, 0, 0];
  const induced = (P, j, skipBound) => { // unit horseshoe j and its image, at P
    tmp[0] = tmp[1] = tmp[2] = 0; const q = legs[j];
    for (let k = 0; k < 5; k++) { if (skipBound && k === 2) continue; seg(P, q[k], q[k + 1], tmp); }
    const im = [0, 0, 0], Pm = [P[0], P[1], -P[2]];
    for (let k = 0; k < 5; k++) seg(Pm, q[k], q[k + 1], im);
    return [tmp[0] + im[0], tmp[1] + im[1], tmp[2] - im[2]];
  };
  const a_ = S.map((s) => S.map((_, j) => { const v = induced(s.cp, j, false); return v[0] * s.nc[0] + v[1] * s.nc[1]; }));
  // CLOTH RULE: a strip the wind strikes on the lee face of its sail carries nothing (it lifts or luffs). For the
  // main, whose boom is free inside the sheet's limit, the lee side is the side away from the wind; for the jib,
  // whose clew is held, it is the side the foot fills to, so a jib held to windward fills aback.
  for (let i = 0; i < n; i++) if (!S[i].on) for (let j = 0; j < n; j++) { a_[i][j] = i === j ? 1 : 0; a_[j][i] = i === j ? 1 : 0; }
  const rhs0 = S.map((s) => (s.on ? -(V[0] * s.nc[0] + V[1] * s.nc[1]) : 0));
  // pass 1: everything attached. The bound vortex runs up the luff, so lee-side lift is negative circulation here.
  let g = luSolve(a_.map((r) => r.slice()), rhs0.slice(), n);
  const sep = (gi, s) => { const Sv = 4 * Math.abs(-gi / (Math.PI * s.c) - s.sgn * 2 * s.m); return Math.min(1, Math.max(0, 1 - (Sv - SAILC.Scrit) / (SAILC.Sfull - SAILC.Scrit))); };
  let f = S.map((s, i) => sep(g[i], s));
  const gPlate = S.map((s) => (s.on ? 1 : 0) * -0.5 * s.c * CNsep(Math.abs(Math.sin(s.alpha))) * Math.cos(s.alpha) * s.sgn);
  // pass 2 (my addition): the separation states are those of the attached lattice, as in the s4 fallback. A
  // separated strip then sheds only the circulation of its plate lift, so a stalled or backed sail does not act
  // on its neighbour as if it were attached; the attached strips are re-solved once in that field.
  const M = a_.map((r, i) => (f[i] < 0.02 ? r.map((_, j) => (i === j ? 1 : 0)) : r.map((v, j) => v * f[j])));
  const b = rhs0.map((v, i) => { if (f[i] < 0.02) return g[i]; let s = v; for (let j = 0; j < n; j++) s -= a_[i][j] * (1 - f[j]) * gPlate[j]; return s; });
  g = luSolve(M, b, n);
  const act = g.map((gi, i) => f[i] * gi + (1 - f[i]) * gPlate[i]);
  if (process.env.DBG) console.log(S.map((s, i) => `${s.sail}: alpha ${(s.alpha / rad).toFixed(1)} m ${s.m.toFixed(3)} g/pic ${(-g[i] / (Math.PI * s.c)).toFixed(3)} f ${f[i].toFixed(2)}`).join('\n'));
  // forces: unit wind speed, unit density; coefficient = force / (0.5 * total area)
  const res = [0, 1].map(() => ({ fx: 0, fy: 0, k: 0, n: 0, kx: 0, f: 0, area: 0, mz: 0 }));
  S.forEach((s, i) => {
    const mid = [0, 1, 2].map((k) => 0.5 * (s.A[k] + s.B[k])), vl = [V[0], V[1], 0];
    for (let j = 0; j < n; j++) { const v = induced(mid, j, j === i); vl[0] += act[j] * v[0]; vl[1] += act[j] * v[1]; vl[2] += act[j] * v[2]; }
    const l = [s.B[0] - s.A[0], s.B[1] - s.A[1], s.B[2] - s.A[2]];
    // attached: Kutta-Joukowski on the bound vortex with the strip's attached circulation
    const fa = [g[i] * (vl[1] * l[2] - vl[2] * l[1]), g[i] * (vl[2] * l[0] - vl[0] * l[2])];
    const fn = (s.on ? 1 : 0) * 0.5 * CNsep(Math.abs(Math.sin(s.alpha))) * s.area * s.sgn; // separated: plate normal force along the lee normal
    const fx = f[i] * fa[0] + (1 - f[i]) * fn * s.nl[0], fy = f[i] * fa[1] + (1 - f[i]) * fn * s.nl[1];
    const share = Math.min(1, 2 * s.m / Math.max(1e-6, Math.abs(g[i]) / (Math.PI * s.c))); // part of the attached lift that comes from camber
    const cpf = (0.25 + 0.25 * share) * f[i] + 0.5 * (1 - f[i]); // attached: incidence lift at quarter chord, camber lift at mid chord; separated: mid chord
    const px = s.L[0] - cpf * s.c * Math.cos(s.th), py = s.L[1] - cpf * s.c * Math.sin(s.th);
    const r = res[s.sail];
    r.fx += fx; r.fy += fy; r.k += fy * s.L[2]; r.kx += fx * s.L[2]; r.n += px * fy - py * fx; r.f += f[i] * s.area; r.area += s.area;
    r.mz += (px - s.L[0]) * fy - (py - s.L[1]) * fx; // about the luff: positive pushes the clew to port (out, for wind from starboard)
  });
  return res;
}
export function makeTable(rig) {
  const Aref = rig.mainArea + rig.jibArea, q = 0.5 * Aref, data = [];
  for (const awa of GRID.awa) for (const ms of GRID.ms) for (const j of GRID.js) {
    const r = solveCase(rig, awa, ms, j), boom = Math.min(ms, awa); // a slack boom lies along the wind (drawing only)
    for (const s of r) data.push(Math.round(1e3 * s.fx / q), Math.round(1e3 * s.fy / q), Math.round(1e3 * s.k / q), Math.round(1e3 * s.n / q), Math.round(1e3 * s.kx / q), Math.round(100 * s.f / s.area));
    data.push(Math.round(boom * 10));
  }
  return { awa: GRID.awa, ms: GRID.ms, js: GRID.js, stride: 13, data, areaRef: Aref, chordRef: 0.5 * (rig.mainArea / rig.P + rig.jibArea / rig.I) };
}
export { solveCase };
if (process.argv[1].endsWith('gen_sails.mjs')) {
  const hulls = JSON.parse(fs.readFileSync(new URL('../out/hulls.json', import.meta.url)));
  const out = {}; const t0 = Date.now();
  for (const k of Object.keys(hulls)) out[k] = makeTable(hulls[k].rig);
  fs.writeFileSync(new URL('../out/sails.json', import.meta.url), JSON.stringify(out));
  console.log('table built in', ((Date.now() - t0) / 1000).toFixed(1), 's');
  const rig = hulls.hboat.rig, q = 0.5 * (rig.mainArea + rig.jibArea);
  const show = (awa, ms, j) => { const r = solveCase(rig, awa, ms, j), boom = Math.min(ms, awa); console.log(`awa ${awa} main ${ms} (boom ${boom.toFixed(1)}) jib ${j}: main Cx ${(r[0].fx / q).toFixed(3)} Cy ${(r[0].fy / q).toFixed(3)} f ${(r[0].f / r[0].area).toFixed(2)} zce ${(r[0].k / r[0].fy).toFixed(2)} | jib Cx ${(r[1].fx / q).toFixed(3)} Cy ${(r[1].fy / q).toFixed(3)} f ${(r[1].f / r[1].area).toFixed(2)} | total CL ${((r[0].fx + r[1].fx) * Math.sin(awa * rad) / q - (r[0].fy + r[1].fy) * Math.cos(awa * rad) / q).toFixed(2)} CD ${(-(r[0].fx + r[1].fx) * Math.cos(awa * rad) / q - (r[0].fy + r[1].fy) * Math.sin(awa * rad) / q).toFixed(2)}`); };
  show(25, 6, 12); show(30, 6, 15); show(30, 12, 15); show(30, 30, 15); show(30, 0, 15); show(30, 12, 8); show(45, 20, 20); show(90, 45, 40); show(90, 6, 15); show(135, 75, 60); show(180, 90, 60); show(0, 6, 15); show(5, 6, 15); show(10, 12, -15); show(30, 12, -15); show(0, 45, -40); show(60, 20, -25);
}
