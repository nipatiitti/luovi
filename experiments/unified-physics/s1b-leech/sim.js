// 2D unsteady lumped-vortex sail section(s) with leech shedding (Kutta) and conditional luff shedding.
// Circulation is counter-clockwise positive. Units SI. Throwaway experiment code.
'use strict';
const TWO_PI = 2 * Math.PI;

const DEFAULTS = {
  rho: 1.225,
  dt: 1 / 30,          // flow step, s (the note's 20-30 Hz)
  coreFrac: 0.05,      // vortex core radius / reference chord
  shedFrac: 0.3,       // new vortex placed this fraction of (velocity*dt) off the edge
  decayChords: 0,      // e-folding distance of shed circulation in chords of travel (0 = no decay)
  killChords: 10,      // wake dropped beyond this many chords
  Scrit: 0.1,          // critical luff suction (dimensionless)
  kjSign: -1, kj: false,           // also compute per-sail Kutta-Joukowski force
  sep: false,          // lee-side separation located by a boundary-layer criterion, second shear layer shed from there
  Ksep: 0.6,           // share of the lee boundary layer's vorticity flux (u^2/2) that survives into the shed layer (Katz 1981; Fage & Johansen)
  Tlag: 1.5,           // lag of the separation point, chord transits (Beddoes-Leishman Tf = 3 semi-chords)
  x0: 0.1,             // turbulent boundary layer taken to start behind a luff bubble at this chord fraction
  strat: 0.39,         // Stratford's separation constant
  nu: 1.5e-5,          // air, m^2/s
  corePanels: 0,       // if > 0: core radius = corePanels * longest panel length (overrides coreFrac)
  teSep: false,        // lagging trailing-edge separation state
  Csep: 0.5,           // canonical pressure recovery the lee-side boundary layer can stand
  Tsep: 1.5,           // lag of the separation point, chord transits
  refChord: 3,
};

// Suction normaliser: first-panel circulation of an N-panel flat plate per unit (normal wash * chord)
const KNcache = {};
function KN(N) {
  if (KNcache[N]) return KNcache[N];
  const A = [], b = [];
  for (let i = 0; i < N; i++) {
    A.push([]);
    const xc = (i + 0.75) / N;
    for (let j = 0; j < N; j++) { const xv = (j + 0.25) / N; A[i].push(1 / (TWO_PI * (xc - xv))); }
    b.push(-1);
  }
  const g = solve(A, b);
  return (KNcache[N] = Math.abs(g[0]));
}
function solve(A, b) {
  const n = b.length; const M = A.map((r, i) => r.concat([b[i]]));
  for (let k = 0; k < n; k++) {
    let p = k; for (let i = k + 1; i < n; i++) if (Math.abs(M[i][k]) > Math.abs(M[p][k])) p = i;
    [M[k], M[p]] = [M[p], M[k]];
    for (let i = k + 1; i < n; i++) { const f = M[i][k] / M[k][k]; if (f !== 0) for (let j = k; j <= n; j++) M[i][j] -= f * M[k][j]; }
  }
  const x = new Array(n);
  for (let i = n - 1; i >= 0; i--) { let s = M[i][n]; for (let j = i + 1; j < n; j++) s -= M[i][j] * x[j]; x[i] = s / M[i][i]; }
  return x;
}
function invert(A) {
  const n = A.length; const M = A.map((r, i) => { const e = new Array(n).fill(0); e[i] = 1; return r.concat(e); });
  for (let k = 0; k < n; k++) {
    let p = k; for (let i = k + 1; i < n; i++) if (Math.abs(M[i][k]) > Math.abs(M[p][k])) p = i;
    [M[k], M[p]] = [M[p], M[k]];
    const d = M[k][k]; for (let j = 0; j < 2 * n; j++) M[k][j] /= d;
    for (let i = 0; i < n; i++) if (i !== k) { const f = M[i][k]; if (f !== 0) for (let j = 0; j < 2 * n; j++) M[i][j] -= f * M[k][j]; }
  }
  return M.map(r => r.slice(n));
}

// A sail: circular arc, chord c, camber ratio eps (bulge to +y in sail frame), luff at `luff`,
// chord rotated by `sheet` radians (counter-clockwise).
function makeSail(o) {
  const N = o.N, c = o.chord, eps = o.camber || 0;
  const cs = Math.cos(o.sheet || 0), sn = Math.sin(o.sheet || 0);
  const lx = (o.luff || [0, 0])[0], ly = (o.luff || [0, 0])[1];
  const h = eps * c;
  const R = eps ? (c * c / 4 + h * h) / (2 * Math.abs(h)) : 0, phi0 = eps ? Math.asin(c / (2 * R)) : 0, sg = Math.sign(eps);
  function pt(s) { // s in [0,1] along the arc; returns position, tangent, normal in world frame
    let x, y, tx, ty;
    if (!eps) { x = s * c; y = 0; tx = 1; ty = 0; }
    else { const ph = -phi0 + 2 * phi0 * s; x = c / 2 + R * Math.sin(ph); y = sg * (R * Math.cos(ph) - (R - Math.abs(h))); tx = Math.cos(ph); ty = -sg * Math.sin(ph); }
    return { x: lx + cs * x - sn * y, y: ly + sn * x + cs * y, tx: cs * tx - sn * ty, ty: sn * tx + cs * ty };
  }
  const arcLen = eps ? 2 * phi0 * R : c;
  const S = { N, c, eps, pt, arcLen, dl: arcLen / N, xv: [], yv: [], xc: [], yc: [], nx: [], ny: [], tx: [], ty: [], sc: [],
    gam: new Array(N).fill(0), f: 1, Scrit: o.Scrit, S: 0, leShed: 0, outline: [] };
  for (let i = 0; i < N; i++) {
    const v = pt((i + 0.25) / N), k = pt((i + 0.75) / N);
    S.xv.push(v.x); S.yv.push(v.y); S.xc.push(k.x); S.yc.push(k.y);
    S.tx.push(k.tx); S.ty.push(k.ty); S.nx.push(-k.ty); S.ny.push(k.tx); S.sc.push((i + 0.75) / N);
  }
  for (let i = 0; i <= 40; i++) { const p = pt(i / 40); S.outline.push([p.x, p.y]); }
  S.nodes = []; for (let i = 0; i <= N; i++) { const p = pt(i / N); S.nodes.push([p.x, p.y]); }
  const a = pt(0), b = pt(1);
  S.luff = [a.x, a.y]; S.leech = [b.x, b.y];
  // Luff suction S (Ramesh's A0) as a quadrature of the normal wash over the chord angle theta, x/c = (1-cos theta)/2:
  // S*V = (1/pi) * sum_i dtheta_i * (wash through the cloth at collocation i). Weights depend on geometry only.
  // Fourier weights: sum_i wn[n][i] * wash_i gives A_n * V of thin-aerofoil theory (A_0 is the luff suction S).
  // Panel weights are corrected (smallest change) so that wash shapes 1, cos(theta) .. cos(4 theta) are projected exactly.
  { const th = x => Math.acos(1 - 2 * x), w0 = [], thc = []; S.pt = pt;
    for (let i = 0; i < N; i++) { w0.push((th((i + 1) / N) - th(i / N)) / Math.PI); thc.push(th((i + 0.75) / N)); }
    const Mm = Math.min(5, N), C = []; for (let n = 0; n < Mm; n++) C.push(thc.map(t => Math.cos(n * t)));
    const CCt = C.map(r1 => C.map(r2 => r1.reduce((q, v, i) => q + v * r2[i], 0)));
    S.wn = []; for (let n = 0; n < Mm; n++) { const base = w0.map((w, i) => n === 0 ? w : -2 * w * Math.cos(n * thc[i]));
      const res = C.map((r, k) => (k === n ? (n === 0 ? 1 : -1) : 0) - r.reduce((q, v, i) => q + v * base[i], 0));
      const lam = solve(CCt, res); S.wn.push(base.map((w, i) => w + C.reduce((q, r, k) => q + r[i] * lam[k], 0))); }
    S.sw = S.wn[0]; }
  S.sepCum = new Array(N).fill(0); S.us = 0; S.sig = 1;
  return S;
}

function makeSim(sails, opt) {
  const P = Object.assign({}, DEFAULTS, opt || {});
  const coreR = P.corePanels > 0 ? P.corePanels * Math.max(...sails.map(q => q.dl)) : P.coreFrac * P.refChord, core2 = coreR * coreR;
  const nb = sails.reduce((s, b) => s + b.N, 0);
  const off = []; { let o = 0; for (const s of sails) { off.push(o); o += s.N; } }
  // flat arrays of bound vortex and collocation data
  const XV = new Float64Array(nb), YV = new Float64Array(nb), XC = new Float64Array(nb), YC = new Float64Array(nb);
  const NX = new Float64Array(nb), NY = new Float64Array(nb), G = new Float64Array(nb);
  sails.forEach((s, m) => { for (let i = 0; i < s.N; i++) { const k = off[m] + i; XV[k] = s.xv[i]; YV[k] = s.yv[i]; XC[k] = s.xc[i]; YC[k] = s.yc[i]; NX[k] = s.nx[i]; NY[k] = s.ny[i]; } });
  let Ainv = null, Rm = null, Amat = null; const nSails = sails.length;
  function buildA() {
    const A = [];
    for (let i = 0; i < nb; i++) { A.push(new Array(nb));
      for (let j = 0; j < nb; j++) { const dx = XC[i] - XV[j], dy = YC[i] - YV[j], r2 = dx * dx + dy * dy; A[i][j] = (-dy * NX[i] + dx * NY[i]) / (TWO_PI * r2); } }
    Ainv = invert(A); Amat = A;
    // wash that the OTHER sails' bound vortices put through sail m, already weighted for the luff suction sum
    Rm = sails.map((sm, m) => { const r = new Float64Array(nb); for (let j = 0; j < nb; j++) { if (j >= off[m] && j < off[m] + sm.N) continue; let t = 0; for (let i = 0; i < sm.N; i++) t += sm.sw[i] * A[off[m] + i][j]; r[j] = t; } return r; });
  }
  buildA(); const AinvTrue = Ainv;
  // wake
  let wx = [], wy = [], wg = [], wsrc = []; // wsrc: 2*sail + (0 leech, 1 luff)
  const st = { t: 0, F: sails.map(() => [0, 0]), Fkj: sails.map(() => [0, 0]), wake: { x: wx, y: wy, g: wg, src: wsrc } };
  let Iref = sails.map(() => null); const farG = sails.map(() => 0);

  function wakeVelAt(x, y) { let u = 0, v = 0; for (let k = 0; k < wx.length; k++) { const dx = x - wx[k], dy = y - wy[k], q = wg[k] / (TWO_PI * (dx * dx + dy * dy + core2)); u -= q * dy; v += q * dx; } return [u, v]; }
  function boundVelAt(x, y) { let u = 0, v = 0; for (let k = 0; k < nb; k++) { const dx = x - XV[k], dy = y - YV[k], q = G[k] / (TWO_PI * (dx * dx + dy * dy + core2)); u -= q * dy; v += q * dx; } return [u, v]; }
  function mulAinv(col) { const r = new Float64Array(nb); for (let i = 0; i < nb; i++) { let s = 0; const row = Ainv[i]; for (let j = 0; j < nb; j++) s += row[j] * col[j]; r[i] = s; } return r; }
  function colOf(px, py) { const c = new Float64Array(nb); for (let i = 0; i < nb; i++) { const dx = XC[i] - px, dy = YC[i] - py, r2 = dx * dx + dy * dy + core2; c[i] = (-dy * NX[i] + dx * NY[i]) / (TWO_PI * r2); } return c; }
  function crosses(x0, y0, x1, y1) { // does the move cross any sail?
    for (const s of sails) { const nd = s.nodes; for (let i = 0; i < nd.length - 1; i++) {
      const ax = nd[i][0], ay = nd[i][1], bx = nd[i + 1][0], by = nd[i + 1][1];
      const d = (x1 - x0) * (by - ay) - (y1 - y0) * (bx - ax); if (Math.abs(d) < 1e-14) continue;
      const tt = ((ax - x0) * (by - ay) - (ay - y0) * (bx - ax)) / d, uu = ((ax - x0) * (y1 - y0) - (ay - y0) * (x1 - x0)) / d;
      if (tt >= 0 && tt <= 1 && uu >= 0 && uu <= 1) return [bx - ax, by - ay];
    } } return null;
  }

  function step(W) { // W = [wx, wy] wind velocity this step
    const dt = P.dt, V2 = W[0] * W[0] + W[1] * W[1], V = Math.sqrt(V2);
    // trailing-edge separation: effective normals aft of the separation point lie square to the wind
    if (P.teSep) {
      let changed = false;
      sails.forEach((s, m) => { for (let i = 0; i < s.N; i++) { const k = off[m] + i; let nx = s.nx[i], ny = s.ny[i];
        // smooth weight: fraction of this panel lying aft of the separation point
        const w = Math.sqrt(Math.min(1, Math.max(0, ((i + 1) / s.N - s.f) * s.N))); // square root: a short flap is worth more than its length
        if (w > 0 && V > 1e-9) { let ex = -W[1] / V, ey = W[0] / V; if (ex * nx + ey * ny < 0) { ex = -ex; ey = -ey; }
          nx = (1 - w) * nx + w * ex; ny = (1 - w) * ny + w * ey; const l = Math.hypot(nx, ny); nx /= l; ny /= l; }
        if (Math.abs(nx - NX[k]) + Math.abs(ny - NY[k]) > 1e-9) { NX[k] = nx; NY[k] = ny; changed = true; } } });
      if (changed) buildA();
    }
    // second shear layer: a vortex released from the lee-side separation point, strength from the boundary layer's vorticity flux
    const gsep = sails.map(() => 0);
    if (P.sep) sails.forEach((s, m) => { if (s.f >= 0.985 || s.us <= 0) return; const p0 = s.pt(s.f), nx = -p0.ty, ny = p0.tx, g = -s.sig * P.Ksep * 0.5 * s.us * s.us * dt;
      const px = p0.x + s.sig * nx * coreR + P.shedFrac * dt * s.us * p0.tx, py = p0.y + s.sig * ny * coreR + P.shedFrac * dt * s.us * p0.ty;
      wx.push(px); wy.push(py); wg.push(g); wsrc.push(3 * m + 2); gsep[m] = g; for (let i = 0; i < s.N; i++) if ((i + 0.5) / s.N > s.f) s.sepCum[i] += g; });
    // right-hand side
    const b = new Float64Array(nb), UW = new Float64Array(nb), VW = new Float64Array(nb);
    for (let i = 0; i < nb; i++) { const w = wakeVelAt(XC[i], YC[i]); UW[i] = W[0] + w[0]; VW[i] = W[1] + w[1]; b[i] = -(UW[i] * NX[i] + VW[i] * NY[i]); }
    const p = mulAinv(b);
    // candidate new vortices: leech (always) and luff (conditional) for each sail
    const cand = [];
    sails.forEach((s, m) => { for (const e of [0, 1]) { const ed = e ? s.luff : s.leech; const w = wakeVelAt(ed[0], ed[1]);
      let px = ed[0] + P.shedFrac * dt * (W[0] + w[0]), py = ed[1] + P.shedFrac * dt * (W[1] + w[1]);
      cand.push({ m, e, x: px, y: py, q: null, active: e === 0, g: 0 }); } });
    const Gold = sails.map((s, m) => { let t = 0; for (let i = 0; i < s.N; i++) t += G[off[m] + i]; return t; });
    const sumOver = (vec, m) => { let t = 0; for (let i = 0; i < sails[m].N; i++) t += vec[off[m] + i]; return t; };
    let gamma = null; const sgn = sails.map(() => 0), SV = sails.map(() => 0);
    // S*V for sail m from a right-hand-side-like vector (b = minus wash): positive when the suction is on the +normal side
    // (vec = right-hand side from wind, wake and new vortices; gam = bound circulations, which add the other sails' wash)
    const SVof = (vec, m, gam) => { let t = 0; const s = sails[m]; for (let i = 0; i < s.N; i++) t -= s.sw[i] * vec[off[m] + i]; if (gam && nSails > 1) { const r = Rm[m]; for (let j = 0; j < nb; j++) t += r[j] * gam[j]; } return t; };
    for (let pass = 0; pass < 3; pass++) {
      const act = cand.filter(c => c.active); for (const c of act) if (!c.q) { c.col = colOf(c.x, c.y); c.q = mulAinv(c.col); }
      // unknown strengths g_k: per sail circulation conservation, and luff suction pinned at critical where active
      const M = [], r = [];
      sails.forEach((s, m) => { M.push(act.map(c => sumOver(c.q, m) - (c.m === m ? 1 : 0))); r.push(sumOver(p, m) - (Gold[m] - gsep[m])); });
      act.filter(c => c.e === 1).forEach(c => { M.push(act.map(a => SVof(a.col, c.m, a.q))); r.push(SVof(b, c.m, p) - sgn[c.m] * sails[c.m].Scrit * V); });
      const g = solve(M, r); act.forEach((c, i) => c.g = g[i]);
      gamma = Float64Array.from(p); for (const c of act) for (let i = 0; i < nb; i++) gamma[i] -= c.g * c.q[i];
      let again = false;
      sails.forEach((s, m) => { let sv = SVof(b, m, p); for (const c of act) sv -= c.g * SVof(c.col, m, c.q); SV[m] = sv; const le = cand[2 * m + 1];
        if (!le.active && sv * sv > s.Scrit * s.Scrit * V2 * (1 + 1e-9)) { le.active = true; sgn[m] = Math.sign(sv); again = true; } });
      if (!again) break;
    }
    for (let i = 0; i < nb; i++) G[i] = gamma[i];
    sails.forEach((s, m) => { for (let i = 0; i < s.N; i++) s.gam[i] = G[off[m] + i]; s.S = V > 1e-9 ? SV[m] / V : 0; s.leShed = cand[2 * m + 1].active ? sgn[m] : 0; });
    for (const c of cand) if (c.active) { wx.push(c.x); wy.push(c.y); wg.push(c.g); wsrc.push(3 * c.m + c.e); }
    // force from the rate of change of vortex impulse, per sail (bound + its own shed vortices) and total
    const Im = sails.map(() => [0, 0]);
    sails.forEach((s, m) => { for (let i = 0; i < s.N; i++) { const k = off[m] + i; Im[m][0] += -G[k] * YV[k]; Im[m][1] += G[k] * XV[k]; } });
    for (let k = 0; k < wx.length; k++) { const m = Math.floor(wsrc[k] / 3); Im[m][0] += -wg[k] * wy[k]; Im[m][1] += wg[k] * wx[k]; }
    sails.forEach((s, m) => { st.F[m] = Iref[m] ? [P.rho * ((Im[m][0] - Iref[m][0]) / dt - farG[m] * W[1]), P.rho * ((Im[m][1] - Iref[m][1]) / dt + farG[m] * W[0])] : [0, 0]; });
    // Per-sail force by Kutta-Joukowski on the bound vortices (wind + wake + the other bound vortices). Its time average is the
    // sail's own load including what the other sail does to it; the impulse force above is exact only for the whole rig.
    if (P.kj) sails.forEach((s, m) => { let fx = 0, fy = 0; for (let i = 0; i < s.N; i++) { const k = off[m] + i; const wv = wakeVelAt(XV[k], YV[k]); let u = W[0] + wv[0], v = W[1] + wv[1];
      for (let j = 0; j < nb; j++) if (j !== k) { const dx = XV[k] - XV[j], dy = YV[k] - YV[j], q = G[j] / (TWO_PI * (dx * dx + dy * dy)); u -= q * dy; v += q * dx; }
      fx += P.rho * G[k] * v; fy -= P.rho * G[k] * u; }
      // unsteady part of the pressure jump: rho * d/dt of the circulation ahead of each panel (luff-shed circulation included)
      s.levTot = (s.levTot || 0) + (cand[2 * m + 1].active ? cand[2 * m + 1].g : 0); let cum = s.levTot; const prev = s.cumPrev || null; const now = [];
      for (let i = 0; i < s.N; i++) { cum += G[off[m] + i]; const c = cum - 0.5 * G[off[m] + i] + s.sepCum[i]; now.push(c); if (prev) { const d = P.kjSign * P.rho * (c - prev[i]) / dt * s.dl; fx += d * s.nx[i]; fy += d * s.ny[i]; } }
      s.cumPrev = now; st.Fkj[m] = [fx, fy]; });
    // trailing-edge separation state update from the lattice's own lee-side pressure recovery
    if (P.teSep) {
      // Loading the cloth would carry if the lee-side flow stayed attached to the leech (true normals, present wind and wake)
      const bT = new Float64Array(nb); sails.forEach((s, m) => { for (let i = 0; i < s.N; i++) { const k = off[m] + i; bT[k] = -(UW[k] * s.nx[i] + VW[k] * s.ny[i]); } });
      const gA = new Float64Array(nb); for (let i = 0; i < nb; i++) { let t = 0; const row = AinvTrue[i]; for (let j = 0; j < nb; j++) t += row[j] * bT[j]; gA[i] = t; }
      sails.forEach((s, m) => {
        let target = 1; const xs = [], qs = []; let ok = true;
        for (let i = 0; i < s.N; i++) { const k = off[m] + i; const ut = UW[k] * s.tx[i] + VW[k] * s.ty[i]; if (ut <= 0) ok = false;
          xs.push((i + 0.5) / s.N); qs.push(Math.abs(ut) + 0.5 * Math.abs(gA[k]) / s.dl); if (i === s.N - 1) { xs.push(1); qs.push(Math.abs(ut)); } }
        if (ok && !s.leShed) {
          // lee-side speed sampled from a quarter chord aft (ahead of that the peak belongs to the luff and is judged by S)
          const X0 = 0.25, M = 40; let qm = 0, found = false; let j = 0;
          for (let n = 0; n <= M && !found; n++) { const x = X0 + (1 - X0) * n / M; while (j < xs.length - 2 && xs[j + 1] < x) j++;
            const q = qs[j] + (qs[j + 1] - qs[j]) * (x - xs[j]) / (xs[j + 1] - xs[j]);
            if (q > qm) qm = q; else if (q < qm * Math.sqrt(1 - P.Csep)) { target = x; found = true; } } }
        s.fTarget = target; s.f += (target - s.f) * Math.min(1, dt * V / (P.Tsep * s.c)); });
    }
    if (P.sep) sails.forEach((s, m) => {
      // Lee-side edge velocity from the model's own flow: thin-aerofoil series fitted to the wash the sail is cancelling
      // (wash through sail m from everything else = minus the wash of its own bound vortices), plus the tangential onset flow.
      const An = s.wn.map(() => 0); let gt = 0, utm = 0;
      for (let i = 0; i < s.N; i++) { const k = off[m] + i; let w = 0; for (let j = 0; j < s.N; j++) w -= Amat[k][off[m] + j] * G[off[m] + j]; for (let n = 0; n < An.length; n++) An[n] += s.wn[n][i] * w; gt -= G[k]; utm += UW[k] * s.tx[i] + VW[k] * s.ty[i]; }
      const sig = gt >= 0 ? 1 : -1; let target = 1, us = 0; const M = 60, xs = [], us_ = [];
      if (utm > 0) {
        for (let q = 0; q <= M; q++) { const x = P.x0 + (1 - P.x0) * q / M, th = Math.acos(1 - 2 * x); let gam = An[0] * (1 + Math.cos(th)) / Math.max(1e-6, Math.sin(th)); for (let n = 1; n < An.length; n++) gam += An[n] * Math.sin(n * th);
          const fi = Math.min(s.N - 1.001, Math.max(0, x * s.N - 0.75)), i0 = Math.floor(fi), k = off[m] + i0, fr = fi - i0;
          const ut = (1 - fr) * (UW[k] * s.tx[i0] + VW[k] * s.ty[i0]) + fr * (UW[k + 1] * s.tx[i0 + 1] + VW[k + 1] * s.ty[i0 + 1]);
          xs.push(x); us_.push(Math.max(1e-6, ut + sig * gam)); } // gam here is half the sheet strength: gamma/2 = V*(series), wn carries V
        // Stratford's turbulent separation criterion from the suction peak aft
        let im = 0; for (let q = 1; q <= M; q++) if (us_[q] > us_[im]) im = q; const um = us_[im], L = s.arcLen;
        let xeq = xs[0] * L * Math.pow(us_[0] / um, 3); for (let q = 1; q <= im; q++) xeq += 0.5 * (Math.pow(us_[q] / um, 3) + Math.pow(us_[q - 1] / um, 3)) * (xs[q] - xs[q - 1]) * L;
        let Fprev = 0;
        for (let q = im + 1; q <= M; q++) { const cp = 1 - (us_[q] / um) ** 2, cpm = 1 - (us_[q - 1] / um) ** 2, xp = (xs[q] - xs[im]) * L + xeq;
          const F = cp * Math.sqrt(Math.max(0, xp * (cp - cpm) / ((xs[q] - xs[q - 1]) * L))), lim = P.strat * Math.pow(1e-6 * um * xp / P.nu, 0.1);
          if (F >= lim || cp > 4 / 7) { const fr = F >= lim && F > Fprev ? Math.min(1, Math.max(0, (lim - Fprev) / (F - Fprev))) : 1; target = xs[q - 1] + fr * (xs[q] - xs[q - 1]); break; } Fprev = F; }
      }
      s.fTarget = target; s.f += (target - s.f) * Math.min(1, dt * V / (P.Tlag * s.c)); s.sig = sig;
      // edge speed at the separation point, for the next step's shed strength
      const xq = Math.max(P.x0, Math.min(1, s.f)), fq = (xq - P.x0) / (1 - P.x0) * M, q0 = Math.min(M - 1, Math.floor(fq)); s.us = xs.length ? us_[q0] + (fq - q0) * (us_[q0 + 1] - us_[q0]) : 0; });
    // move the wake: wind + bound + wake, all with a core
    const n = wx.length, ux = new Float64Array(n), uy = new Float64Array(n);
    for (let i = 0; i < n; i++) { const bv = boundVelAt(wx[i], wy[i]); ux[i] = W[0] + bv[0]; uy[i] = W[1] + bv[1]; }
    for (let i = 0; i < n; i++) { const xi = wx[i], yi = wy[i], gi = wg[i]; for (let j = i + 1; j < n; j++) { const dx = xi - wx[j], dy = yi - wy[j], q = 1 / (TWO_PI * (dx * dx + dy * dy + core2));
      ux[i] -= wg[j] * q * dy; uy[i] += wg[j] * q * dx; ux[j] += gi * q * dy; uy[j] -= gi * q * dx; } }
    for (let i = 0; i < n; i++) { let x1 = wx[i] + dt * ux[i], y1 = wy[i] + dt * uy[i]; const cr = crosses(wx[i], wy[i], x1, y1);
      if (cr) { const l = Math.hypot(cr[0], cr[1]), tx = cr[0] / l, ty = cr[1] / l, d = (ux[i] * tx + uy[i] * ty) * dt; x1 = wx[i] + d * tx; y1 = wy[i] + d * ty; if (crosses(wx[i], wy[i], x1, y1)) { x1 = wx[i]; y1 = wy[i]; } }
      wx[i] = x1; wy[i] = y1; }
    // housekeeping (decay and deletion do not count as force)
    const kill2 = (P.killChords * P.refChord) ** 2, dec = P.decayChords > 0 ? Math.exp(-dt * V / (P.decayChords * P.refChord)) : 1;
    const cx = sails[sails.length - 1].xc[0], cy = sails[sails.length - 1].yc[0];
    // Vortices dropped at the far boundary, and circulation removed by decay, are lumped per sail into one far vortex
    // that keeps drifting with the wind: it no longer induces velocity but still carries impulse.
    const Hb = sails.map(() => [0, 0]); for (let k = 0; k < n; k++) { const m = Math.floor(wsrc[k] / 3); Hb[m][0] += -wg[k] * wy[k]; Hb[m][1] += wg[k] * wx[k]; }
    let w = 0; for (let k = 0; k < n; k++) { const dx = wx[k] - cx, dy = wy[k] - cy, m = Math.floor(wsrc[k] / 3);
      if (dx * dx + dy * dy > kill2) { farG[m] += wg[k]; continue; }
      farG[m] += wg[k] * (1 - dec); wx[w] = wx[k]; wy[w] = wy[k]; wg[w] = wg[k] * dec; wsrc[w] = wsrc[k]; w++; }
    wx.length = wy.length = wg.length = wsrc.length = w;
    const Ha = sails.map(() => [0, 0]); for (let k = 0; k < w; k++) { const m = Math.floor(wsrc[k] / 3); Ha[m][0] += -wg[k] * wy[k]; Ha[m][1] += wg[k] * wx[k]; }
    Iref = sails.map((s, m) => [Im[m][0] + (Ha[m][0] - Hb[m][0]), Im[m][1] + (Ha[m][1] - Hb[m][1])]);
    st.t += dt;
  }
  // swap in a new shape for sail m (same panel count); circulation and wake are kept
  function setShape(m, ns) { const s = sails[m]; for (const key of ['pt', 'xv', 'yv', 'xc', 'yc', 'nx', 'ny', 'tx', 'ty', 'outline', 'nodes', 'luff', 'leech', 'eps', 'dl', 'arcLen']) s[key] = ns[key];
    for (let i = 0; i < s.N; i++) { const k = off[m] + i; XV[k] = s.xv[i]; YV[k] = s.yv[i]; XC[k] = s.xc[i]; YC[k] = s.yc[i]; NX[k] = s.nx[i]; NY[k] = s.ny[i]; } buildA(); }
  return { step, st, sails, P, setShape };
}

// lift (square to wind, positive to the left of the wind) and drag (along wind) coefficients
function coeffs(F, W, rho, c) { const V2 = W[0] * W[0] + W[1] * W[1], V = Math.sqrt(V2), q = 0.5 * rho * V2 * c; return { cl: (-F[0] * W[1] + F[1] * W[0]) / V / q, cd: (F[0] * W[0] + F[1] * W[1]) / V / q }; }

// fixed wind angle from an impulsive start: time-averaged coefficients and noise
function fixedRun(o) {
  const U = o.U || 8, c = o.chord || 3, opt = Object.assign({ refChord: c }, o.opt || {});
  const sail = makeSail({ N: o.N, chord: c, camber: o.camber, Scrit: opt.Scrit !== undefined ? opt.Scrit : DEFAULTS.Scrit });
  const sim = makeSim([sail], opt); const a = o.alpha * Math.PI / 180, W = [U * Math.cos(a), U * Math.sin(a)];
  const dt = sim.P.dt, T = (o.transits || 40) * c / U, n = Math.round(T / dt), n0 = Math.round(n * (o.skip || 0.4));
  const cl = [], cd = [], fmag = [];
  for (let i = 0; i < n; i++) { sim.step(W); if (i >= n0) { const k = coeffs(sim.st.F[0], W, sim.P.rho, c); cl.push(k.cl); cd.push(k.cd); } }
  const mean = v => v.reduce((s, x) => s + x, 0) / v.length;
  const mcl = mean(cl), mcd = mean(cd), m = Math.round(0.5 / dt);
  // half-second running average of the force vector; RMS deviation relative to mean force size
  let acc = 0, cnt = 0; for (let i = 0; i + m <= cl.length; i++) { let a1 = 0, a2 = 0; for (let j = 0; j < m; j++) { a1 += cl[i + j]; a2 += cd[i + j]; } a1 /= m; a2 /= m; acc += (a1 - mcl) ** 2 + (a2 - mcd) ** 2; cnt++; }
  const noise = Math.sqrt(acc / cnt) / Math.max(1e-9, Math.hypot(mcl, mcd));
  return { cl: mcl, cd: mcd, noise, nw: sim.st.wake.x.length, f: sail.f };
}
module.exports = { makeSail, makeSim, coeffs, fixedRun, KN, DEFAULTS };
