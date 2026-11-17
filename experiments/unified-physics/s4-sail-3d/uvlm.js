'use strict';
// Unsteady vortex-ring lattice for rigid sails. Experiment S4 (throwaway).
// Axes: x forward (bow), y to leeward, z up. Water plane z=0 (mirror image).
// Wind blows with velocity V(z)*(-cos b, sin b, 0), b = apparent wind angle off the bow.
const RHO = 1.225, FOURPI = 4 * Math.PI;
let ox = 0, oy = 0, oz = 0;
let KCOUNT = 0;
function seg(px, py, pz, ax, ay, az, bx, by, bz, rc2) {
  const r1x = px - ax, r1y = py - ay, r1z = pz - az, r2x = px - bx, r2y = py - by, r2z = pz - bz;
  const cx = r1y * r2z - r1z * r2y, cy = r1z * r2x - r1x * r2z, cz = r1x * r2y - r1y * r2x;
  const r0x = bx - ax, r0y = by - ay, r0z = bz - az;
  const l2 = r0x * r0x + r0y * r0y + r0z * r0z;
  const den = cx * cx + cy * cy + cz * cz + rc2 * l2;
  const d1 = Math.sqrt(r1x * r1x + r1y * r1y + r1z * r1z), d2 = Math.sqrt(r2x * r2x + r2y * r2y + r2z * r2z);
  if (den < 1e-16 || d1 < 1e-9 || d2 < 1e-9) { ox = oy = oz = 0; return; }
  const k = ((r0x * r1x + r0y * r1y + r0z * r1z) / d1 - (r0x * r2x + r0y * r2y + r0z * r2z) / d2) / (FOURPI * den);
  ox = k * cx; oy = k * cy; oz = k * cz;
}

function luSolve(A, b, n) { // in place, partial pivoting; A row-major
  for (let c = 0; c < n; c++) {
    let p = c, m = Math.abs(A[c * n + c]);
    for (let r = c + 1; r < n; r++) { const v = Math.abs(A[r * n + c]); if (v > m) { m = v; p = r; } }
    if (p !== c) { for (let k = c; k < n; k++) { const t = A[c * n + k]; A[c * n + k] = A[p * n + k]; A[p * n + k] = t; } const t = b[c]; b[c] = b[p]; b[p] = t; }
    const d = A[c * n + c];
    for (let r = c + 1; r < n; r++) {
      const f = A[r * n + c] / d; if (f === 0) continue;
      for (let k = c + 1; k < n; k++) A[r * n + k] -= f * A[c * n + k];
      b[r] -= f * b[c];
    }
  }
  for (let r = n - 1; r >= 0; r--) { let s = b[r]; for (let k = r + 1; k < n; k++) s -= A[r * n + k] * b[k]; b[r] = s / A[r * n + r]; }
  return b;
}

class World {
  constructor(o) {
    this.dt = o.dt; this.wind = o.wind; // wind(z,out3)
    this.mirror = o.mirror !== false;
    this.R = o.R || 36;               // wake rows kept
    this.Scrit = o.Scrit === undefined ? 0.5 : o.Scrit;
    this.luffShed = !!o.luffShed;
    this.k0 = o.k0 === undefined ? 0.1 : o.k0;   // wake core at birth, in panel sizes
    this.k1 = o.k1 === undefined ? 1.0 : o.k1;   // wake core when grown ("panel-wide")
    this.Kg = o.Kg || 9;              // rows over which the core grows (about one chord of travel)
    this.selfRows = o.selfRows === undefined ? 9 : o.selfRows; // wake self-induction for the first chord only
    this.decay = o.tau ? Math.exp(-o.dt / o.tau) : 1;
    this.standoff = o.standoff === undefined ? 0.15 : o.standoff;
    this.kb = o.kb === undefined ? 0.25 : o.kb;
    this.kw = o.kw === undefined ? 1.0 : o.kw;   // core for wake-on-wake induction, in panel sizes
    this.selfSrc = o.selfSrc === undefined ? 2 * this.selfRows : o.selfSrc;  // core of bound segments when convecting wake nodes
    this.sails = []; this.t = 0; this.nstep = 0;
  }
  addSail(P, Nc, Ns, opt) { this.sails.push({ P, Nc, Ns, opt: opt || {} }); }
  finalize() {
    let Np = 0, Nn = 0;
    for (const s of this.sails) { s.p0 = Np; s.n0 = Nn; Np += s.Nc * s.Ns; Nn += (s.Nc + 1) * (s.Ns + 1); }
    this.Np = Np; this.Nn = Nn;
    const X = this.X = new Float64Array(3 * Nn);
    const xc = this.xc = new Float64Array(3 * Np), nn = this.nn = new Float64Array(3 * Np), area = this.area = new Float64Array(Np);
    const tc = this.tc = new Float64Array(3 * Np), ts = this.ts = new Float64Array(3 * Np), lc = this.lc = new Float64Array(Np), ls = this.ls = new Float64Array(Np);
    this.psail = new Int32Array(Np); this.corners = new Float64Array(12 * Np);
    const segs = []; this.edges = [];
    const a = [0, 0, 0], b = [0, 0, 0], c = [0, 0, 0], d = [0, 0, 0];
    this.sails.forEach((s, si) => {
      const { Nc, Ns, P } = s;
      const se = []; for (let i = 0; i <= Nc; i++) se.push(1 - Math.cos(Math.PI * i / (2 * Nc)));
      s.se = se; let Atot = 0;
      const nid = (i, j) => s.n0 + i * (Ns + 1) + j, pid = (i, j) => s.p0 + i * Ns + j;
      for (let i = 0; i <= Nc; i++) for (let j = 0; j <= Ns; j++) {
        const sr = i < Nc ? se[i] + 0.25 * (se[i + 1] - se[i]) : 1;
        P(sr, j / Ns, a); X.set(a, 3 * nid(i, j));
      }
      for (let i = 0; i < Nc; i++) for (let j = 0; j < Ns; j++) {
        const p = pid(i, j), u = se[i] + 0.75 * (se[i + 1] - se[i]), v = (j + 0.5) / Ns, e = 1e-4;
        P(u, v, a); xc.set(a, 3 * p);
        P(u + e, v, b); P(u - e, v, c); const su = [(b[0] - c[0]) / (2 * e), (b[1] - c[1]) / (2 * e), (b[2] - c[2]) / (2 * e)];
        P(u, v + e, b); P(u, v - e, c); const sv = [(b[0] - c[0]) / (2 * e), (b[1] - c[1]) / (2 * e), (b[2] - c[2]) / (2 * e)];
        let nx = su[1] * sv[2] - su[2] * sv[1], ny = su[2] * sv[0] - su[0] * sv[2], nz = su[0] * sv[1] - su[1] * sv[0];
        const nl = Math.hypot(nx, ny, nz); nn[3 * p] = nx / nl; nn[3 * p + 1] = ny / nl; nn[3 * p + 2] = nz / nl;
        const lu = Math.hypot(...su), lv = Math.hypot(...sv);
        for (let k = 0; k < 3; k++) { tc[3 * p + k] = su[k] / lu; ts[3 * p + k] = sv[k] / lv; }
        lc[p] = lu * (se[i + 1] - se[i]); ls[p] = lv / Ns;
        P(se[i], j / Ns, a); P(se[i], (j + 1) / Ns, b); P(se[i + 1], (j + 1) / Ns, c); P(se[i + 1], j / Ns, d);
        this.corners.set(a, 12 * p); this.corners.set(b, 12 * p + 3); this.corners.set(c, 12 * p + 6); this.corners.set(d, 12 * p + 9);
        const e1 = [c[0] - a[0], c[1] - a[1], c[2] - a[2]], e2 = [d[0] - b[0], d[1] - b[1], d[2] - b[2]];
        area[p] = 0.5 * Math.hypot(e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]);
        Atot += area[p]; this.psail[p] = si;
      }
      s.area = Atot; s.h = Math.sqrt(Atot / (Nc * Ns));
      // edges: {nodes, panels, sigma, kind}
      const mk = (kind, nodes, panels, sigma) => { const E = { kind, sail: si, nodes, panels, sigma, m: panels.length, id: this.edges.length }; this.edges.push(E); return E; };
      const rng = n => Array.from({ length: n }, (_, k) => k);
      const eL = mk('luff', rng(Ns + 1).map(j => nid(0, j)), rng(Ns).map(j => pid(0, j)), +1);
      const eT = mk('leech', rng(Ns + 1).map(j => nid(Nc, j)), rng(Ns).map(j => pid(Nc - 1, j)), -1);
      const eF = mk('foot', rng(Nc + 1).map(i => nid(i, 0)), rng(Nc).map(i => pid(i, 0)), -1);
      const eH = mk('head', rng(Nc + 1).map(i => nid(i, Ns)), rng(Nc).map(i => pid(i, Ns - 1)), +1);
      // bound segments with net circulation = G[pp]-G[pm], optional edge strip
      for (let i = 0; i <= Nc; i++) for (let j = 0; j < Ns; j++)
        segs.push({ a: nid(i, j), b: nid(i, j + 1), pp: i < Nc ? pid(i, j) : -1, pm: i > 0 ? pid(i - 1, j) : -1, e: i === 0 ? eL : i === Nc ? eT : null, t: j, own: i < Nc ? pid(i, j) : pid(i - 1, j) });
      for (let j = 0; j <= Ns; j++) for (let i = 0; i < Nc; i++)
        segs.push({ a: nid(i, j), b: nid(i + 1, j), pp: j > 0 ? pid(i, j - 1) : -1, pm: j < Ns ? pid(i, j) : -1, e: j === 0 ? eF : j === Ns ? eH : null, t: i, own: j < Ns ? pid(i, j) : pid(i, j - 1) });
    });
    this.segs = segs; const Ng = this.Ng = segs.length;
    // ring corner node ids per panel
    this.ring = new Int32Array(4 * Np);
    this.sails.forEach(s => { for (let i = 0; i < s.Nc; i++) for (let j = 0; j < s.Ns; j++) { const p = s.p0 + i * s.Ns + j, n = (ii, jj) => s.n0 + ii * (s.Ns + 1) + jj; this.ring.set([n(i, j), n(i, j + 1), n(i + 1, j + 1), n(i + 1, j)], 4 * p); } });
    // precompute bound-bound influence (rigid sails): normal velocity at collocation, velocity at segment midpoints
    this.sm = new Float64Array(3 * Ng);
    for (let g = 0; g < Ng; g++) for (let k = 0; k < 3; k++) this.sm[3 * g + k] = 0.5 * (X[3 * segs[g].a + k] + X[3 * segs[g].b + k]);
    const A0 = this.A0 = new Float64Array(Np * Np), B = this.B = new Float64Array(3 * Ng * Np);
    const v = [0, 0, 0];
    for (let p = 0; p < Np; p++) {
      for (let k = 0; k < Np; k++) { this.ringVel(xc[3 * k], xc[3 * k + 1], xc[3 * k + 2], p, v); A0[k * Np + p] = v[0] * nn[3 * k] + v[1] * nn[3 * k + 1] + v[2] * nn[3 * k + 2]; }
      for (let g = 0; g < Ng; g++) { this.ringVel(this.sm[3 * g], this.sm[3 * g + 1], this.sm[3 * g + 2], p, v); B[3 * (g * Np + p)] = v[0]; B[3 * (g * Np + p) + 1] = v[1]; B[3 * (g * Np + p) + 2] = v[2]; }
    }
    // wake storage per edge
    const R = this.R, nsail = this.sails.length;
    for (const E of this.edges) {
      E.W = new Float64Array(3 * (R + 1) * (E.m + 1)); E.G = new Float64Array(R * E.m); E.side = new Int8Array((R + 1) * (E.m + 1) * nsail); E.nr = 1;
      E.vel = new Float64Array(3 * (R + 1) * (E.m + 1)); E.shed = new Uint8Array(E.m); E.phi = new Float64Array(E.m);
      E.h = this.sails[E.sail].h;
      for (let i = 0; i <= E.m; i++) for (let k = 0; k < 3; k++) E.W[3 * i + k] = X[3 * E.nodes[i] + k];
    }
    this.G = new Float64Array(Np); this.Gprev = new Float64Array(Np); this.dp = new Float64Array(Np);
    this.uwc = new Float64Array(3 * Np); this.uws = new Float64Array(3 * Ng);
    this.F = [0, 0, 0]; this.Fs = this.sails.map(() => [0, 0, 0]); this.Ms = this.sails.map(() => [0, 0]);
    this.Sval = this.sails.map(s => new Float64Array(s.Ns));
  }
  ringVel(px, py, pz, p, out) {
    const X = this.X, r = this.ring; let vx = 0, vy = 0, vz = 0;
    for (let q = 0; q < 4; q++) {
      const a = 3 * r[4 * p + q], b = 3 * r[4 * p + (q + 1) % 4];
      seg(px, py, pz, X[a], X[a + 1], X[a + 2], X[b], X[b + 1], X[b + 2], 1e-10); vx += ox; vy += oy; vz += oz;
      if (this.mirror) { seg(px, py, -pz, X[a], X[a + 1], X[a + 2], X[b], X[b + 1], X[b + 2], 1e-10); vx += ox; vy += oy; vz -= oz; }
    }
    out[0] = vx; out[1] = vy; out[2] = vz;
  }
  core(E, r) { return E.h * Math.min(this.k1, this.k0 + (this.k1 - this.k0) * r / this.Kg); }
  // velocity induced at P by old wake rings (q>=1) of all edges, optionally only rows<=rmax
  wakeVel(px, py, pz, out, rmax, cmin, inc0) {
    const q0 = inc0 ? 0 : 1;
    let vx = 0, vy = 0, vz = 0; const mir = this.mirror;
    for (const E of this.edges) {
      const m = E.m, W = E.W, G = E.G, nr = E.nr, m1 = m + 1;
      const rl = Math.min(nr - 1, rmax === undefined ? 1e9 : rmax);
      for (let r = q0; r <= rl; r++) {
        const cm = cmin ? cmin * E.h : 0, c1 = Math.max(cm, this.core(E, r)), c1s = c1 * c1, c2 = Math.max(cm, this.core(E, r + 0.5)), c2s = c2 * c2;
        if (r >= 1) for (let t = 0; t < m; t++) { // row segs (t,r)->(t+1,r): +G[r] - G[r-1] (old rings only: q>=1)
          let g = (r <= nr - 2 ? G[r * m + t] : 0) - (r - 1 >= q0 ? G[(r - 1) * m + t] : 0);
          if (g > -1e-9 && g < 1e-9) continue;
          const a = 3 * (r * m1 + t), b = a + 3;
          seg(px, py, pz, W[a], W[a + 1], W[a + 2], W[b], W[b + 1], W[b + 2], c1s); vx += g * ox; vy += g * oy; vz += g * oz; KCOUNT++;
          if (mir) { seg(px, py, -pz, W[a], W[a + 1], W[a + 2], W[b], W[b + 1], W[b + 2], c1s); vx += g * ox; vy += g * oy; vz -= g * oz; }
        }
        if (r <= nr - 2) for (let i = 0; i <= m; i++) { // side segs (i,r)->(i,r+1): G[i-1]-G[i]
          const g = (i > 0 ? G[r * m + i - 1] : 0) - (i < m ? G[r * m + i] : 0);
          if (g > -1e-9 && g < 1e-9) continue;
          const a = 3 * (r * m1 + i), b = a + 3 * m1;
          seg(px, py, pz, W[a], W[a + 1], W[a + 2], W[b], W[b + 1], W[b + 2], c2s); vx += g * ox; vy += g * oy; vz += g * oz; KCOUNT++;
          if (mir) { seg(px, py, -pz, W[a], W[a + 1], W[a + 2], W[b], W[b + 1], W[b + 2], c2s); vx += g * ox; vy += g * oy; vz -= g * oz; }
        }
      }
    }
    out[0] = vx; out[1] = vy; out[2] = vz;
  }
  // unit newest ring (q=0) of edge E strip t at P
  ring0Vel(E, t, px, py, pz, out) {
    const W = E.W, m1 = E.m + 1; let vx = 0, vy = 0, vz = 0;
    const id = [3 * t, 3 * (t + 1), 3 * (m1 + t + 1), 3 * (m1 + t)];
    const c0 = this.core(E, 0.5), c1 = this.core(E, 1), cs = [1e-10, c0 * c0, c1 * c1, c0 * c0];
    for (let q = 0; q < 4; q++) {
      const a = id[q], b = id[(q + 1) % 4];
      seg(px, py, pz, W[a], W[a + 1], W[a + 2], W[b], W[b + 1], W[b + 2], cs[q]); vx += ox; vy += oy; vz += oz;
      if (this.mirror) { seg(px, py, -pz, W[a], W[a + 1], W[a + 2], W[b], W[b + 1], W[b + 2], cs[q]); vx += ox; vy += oy; vz -= oz; }
    }
    out[0] = vx; out[1] = vy; out[2] = vz;
  }
  boundVelAt(px, py, pz, out, gnet) { // regularised, from net bound segments
    const X = this.X, segs = this.segs; let vx = 0, vy = 0, vz = 0;
    for (let g = 0; g < segs.length; g++) {
      const G = gnet[g]; if (G > -1e-9 && G < 1e-9) continue;
      const s = segs[g], a = 3 * s.a, b = 3 * s.b, c = this.kb * this.sails[this.psail[s.own]].h, c2 = c * c;
      seg(px, py, pz, X[a], X[a + 1], X[a + 2], X[b], X[b + 1], X[b + 2], c2); vx += G * ox; vy += G * oy; vz += G * oz;
      if (this.mirror) { seg(px, py, -pz, X[a], X[a + 1], X[a + 2], X[b], X[b + 1], X[b + 2], c2); vx += G * ox; vy += G * oy; vz -= G * oz; }
    }
    out[0] = vx; out[1] = vy; out[2] = vz;
  }
  netSeg() {
    const segs = this.segs, G = this.G, out = this._gn || (this._gn = new Float64Array(this.Ng));
    for (let g = 0; g < segs.length; g++) {
      const s = segs[g]; let v = (s.pp >= 0 ? G[s.pp] : 0) - (s.pm >= 0 ? G[s.pm] : 0);
      if (s.e) v += s.e.G[s.t] ; // newest wake ring: its edge segment runs a->b with strength G0 (= -sigma*phi)
      out[g] = v;
    }
    return out;
  }
  step() {
    const { Np, Ng, dt, xc, nn, X, R } = this; const v = [0, 0, 0], w = [0, 0, 0], u = [0, 0, 0];
    const nsail = this.sails.length;
    // A. velocities at wake nodes, then shift and convect
    const gnet = this.netSeg();
    for (const E of this.edges) {
      const m1 = E.m + 1, nr = E.nr;
      for (let r = 0; r < nr; r++) for (let i = 0; i < m1; i++) {
        const o = 3 * (r * m1 + i), px = E.W[o], py = E.W[o + 1], pz = E.W[o + 2];
        this.wind(pz, w); this.boundVelAt(px, py, pz, v, gnet);
        let vx = w[0] + v[0], vy = w[1] + v[1], vz = w[2] + v[2];
        if (this.selfRows > 0 && r <= this.selfRows) { this.wakeVel(px, py, pz, u, this.selfSrc, this.kw, true); vx += u[0]; vy += u[1]; vz += u[2]; }
        E.vel[o] = vx; E.vel[o + 1] = vy; E.vel[o + 2] = vz;
      }
    }
    for (const E of this.edges) {
      const m1 = E.m + 1, m = E.m, nr = E.nr, last = Math.min(nr - 1, R - 1);
      for (let r = last; r >= 0; r--) {
        for (let i = 0; i < m1; i++) {
          const o = 3 * (r * m1 + i), o2 = o + 3 * m1;
          E.W[o2] = E.W[o] + dt * E.vel[o]; E.W[o2 + 1] = E.W[o + 1] + dt * E.vel[o + 1]; E.W[o2 + 2] = Math.max(0.02, E.W[o + 2] + dt * E.vel[o + 2]);
          for (let k = 0; k < nsail; k++) E.side[(r + 1) * m1 * nsail + i * nsail + k] = E.side[r * m1 * nsail + i * nsail + k];
        }
        if (r < R - 1) for (let t = 0; t < m; t++) E.G[(r + 1) * m + t] = E.G[r * m + t] * this.decay;
      }
      E.nr = Math.min(nr + 1, R + 1);
      // row-0 labels: own sail side = side the wind blows toward at the shedding panel
      for (let i = 0; i < m1; i++) {
        const p = E.panels[Math.min(i, m - 1)]; this.wind(xc[3 * p + 2], w);
        const s = w[0] * nn[3 * p] + w[1] * nn[3 * p + 1] + w[2] * nn[3 * p + 2] >= 0 ? 1 : -1;
        for (let k = 0; k < nsail; k++) E.side[i * nsail + k] = k === E.sail ? s : 0;
      }
    }
    // C. keep wake nodes on their side of every sail (re-inject on crossing)
    this.enforceSides();
    // D. old-wake velocity at collocation points and segment midpoints
    const uwc = this.uwc, uws = this.uws;
    for (let k = 0; k < Np; k++) { this.wakeVel(xc[3 * k], xc[3 * k + 1], xc[3 * k + 2], v); uwc[3 * k] = v[0]; uwc[3 * k + 1] = v[1]; uwc[3 * k + 2] = v[2]; }
    for (let g = 0; g < Ng; g++) { this.wakeVel(this.sm[3 * g], this.sm[3 * g + 1], this.sm[3 * g + 2], v); uws[3 * g] = v[0]; uws[3 * g + 1] = v[1]; uws[3 * g + 2] = v[2]; }
    // E. newest-ring unit influences
    for (const E of this.edges) {
      if (!E.r0n) { E.r0n = new Float64Array(E.m * Np); E.r0s = new Float64Array(E.m * Ng * 3); }
      const active = E.kind !== 'luff' || (this.luffShed && this.sails[E.sail].opt.luffShed !== false);
      E.active = active; if (!active) continue;
      for (let t = 0; t < E.m; t++) {
        for (let k = 0; k < Np; k++) { this.ring0Vel(E, t, xc[3 * k], xc[3 * k + 1], xc[3 * k + 2], v); E.r0n[t * Np + k] = v[0] * nn[3 * k] + v[1] * nn[3 * k + 1] + v[2] * nn[3 * k + 2]; }
        for (let g = 0; g < Ng; g++) { this.ring0Vel(E, t, this.sm[3 * g], this.sm[3 * g + 1], this.sm[3 * g + 2], v); const o = 3 * (t * Ng + g); E.r0s[o] = v[0]; E.r0s[o + 1] = v[1]; E.r0s[o + 2] = v[2]; }
      }
    }
    // F. solve, with luff shedding found by two passes
    const rhs0 = new Float64Array(Np);
    for (let k = 0; k < Np; k++) { this.wind(xc[3 * k + 2], w); rhs0[k] = -((w[0] + uwc[3 * k]) * nn[3 * k] + (w[1] + uwc[3 * k + 1]) * nn[3 * k + 1] + (w[2] + uwc[3 * k + 2]) * nn[3 * k + 2]); }
    const luffs = this.edges.filter(E => E.kind === 'luff' && E.active);
    for (const E of luffs) { E.shed.fill(0); E.sgn = E.sgn || new Float64Array(E.m); E.gcrit = E.gcrit || new Float64Array(E.m); }
    const A = new Float64Array(Np * Np); let Gs;
    this.Gprev.set(this.G);
    for (let pass = 0; pass < 3; pass++) {
      A.set(this.A0); const rhs = Float64Array.from(rhs0);
      for (const E of this.edges) {
        if (!E.active) continue;
        for (let t = 0; t < E.m; t++) {
          if (E.kind === 'luff' && !E.shed[t]) continue;
          const p = E.panels[t], c = -E.sigma; // ring0 strength = -sigma*phi, phi = G_p (Kutta) or G_p - sgn*gcrit
          for (let k = 0; k < Np; k++) A[k * Np + p] += c * E.r0n[t * Np + k];
          if (E.kind === 'luff') { const cst = -c * E.sgn[t] * E.gcrit[t]; for (let k = 0; k < Np; k++) rhs[k] -= cst * E.r0n[t * Np + k]; }
        }
      }
      Gs = luSolve(A, rhs, Np);
      if (!luffs.length) break;
      let changed = false;
      for (const E of luffs) {
        const s = this.sails[E.sail];
        for (let t = 0; t < E.m; t++) {
          const p = E.panels[t]; this.wind(xc[3 * p + 2], w); const V = Math.hypot(w[0], w[1], w[2]);
          const chord = this.lc[p] / s.se[1];
          const gc = this.Scrit * V * chord * Math.sqrt(s.se[1]); E.gcrit[t] = gc;
          const g1 = Gs[p];
          if (!E.shed[t]) { if (Math.abs(g1) > gc * 1.0001) { E.shed[t] = 1; E.sgn[t] = Math.sign(g1); changed = true; } }
          else if ((g1 - E.sgn[t] * gc) * E.sgn[t] < 0) { E.shed[t] = 0; changed = true; }
        }
      }
      if (!changed) break;
    }
    this.G.set(Gs);
    for (const E of this.edges) for (let t = 0; t < E.m; t++) {
      const p = E.panels[t]; let phi = 0;
      if (E.active) phi = E.kind === 'luff' ? (E.shed[t] ? Gs[p] - E.sgn[t] * E.gcrit[t] : 0) : Gs[p];
      E.G[t] = -E.sigma * phi;
    }
    // suction parameter per strip (for display)
    for (const E of this.edges) if (E.kind === 'luff') { const s = this.sails[E.sail]; for (let t = 0; t < E.m; t++) { const p = E.panels[t]; this.wind(xc[3 * p + 2], w); this.Sval[E.sail][t] = Gs[p] / (Math.hypot(w[0], w[1], w[2]) * (this.lc[p] / s.se[1]) * Math.sqrt(s.se[1])); } }
    // G. forces: Kutta-Joukowski on every bound segment + unsteady term
    const gn = this.netSeg(), segs = this.segs, B = this.B, G = this.G;
    this.F = [0, 0, 0]; this.Fs = this.sails.map(() => [0, 0, 0]); this.Ms = this.sails.map(() => [0, 0, 0]);
    const fp = this._fp || (this._fp = new Float64Array(Np)); fp.fill(0);
    (this.Fp || (this.Fp = new Float64Array(3 * Np))).fill(0);
    for (let g = 0; g < Ng; g++) {
      const gg = gn[g]; if (gg > -1e-12 && gg < 1e-12) continue;
      const s = segs[g]; this.wind(this.sm[3 * g + 2], w);
      let vx = w[0] + uws[3 * g], vy = w[1] + uws[3 * g + 1], vz = w[2] + uws[3 * g + 2];
      const o = 3 * g * Np; for (let p = 0; p < Np; p++) { const q = G[p]; vx += q * B[o + 3 * p]; vy += q * B[o + 3 * p + 1]; vz += q * B[o + 3 * p + 2]; }
      for (const E of this.edges) { if (!E.active) continue; for (let t = 0; t < E.m; t++) { const q = E.G[t]; if (q === 0) continue; const oo = 3 * (t * Ng + g); vx += q * E.r0s[oo]; vy += q * E.r0s[oo + 1]; vz += q * E.r0s[oo + 2]; } }
      const dx = X[3 * s.b] - X[3 * s.a], dy = X[3 * s.b + 1] - X[3 * s.a + 1], dz = X[3 * s.b + 2] - X[3 * s.a + 2];
      const fx = RHO * gg * (vy * dz - vz * dy), fy = RHO * gg * (vz * dx - vx * dz), fz = RHO * gg * (vx * dy - vy * dx);
      this.addForce(s.own, fx, fy, fz, this.sm[3 * g], this.sm[3 * g + 1], this.sm[3 * g + 2]);
      fp[s.own] += fx * nn[3 * s.own] + fy * nn[3 * s.own + 1] + fz * nn[3 * s.own + 2];
    }
    if (this.nstep > 0) for (let p = 0; p < Np; p++) {
      const f = RHO * (G[p] - this.Gprev[p]) / dt * this.area[p];
      this.addForce(p, f * nn[3 * p], f * nn[3 * p + 1], f * nn[3 * p + 2], xc[3 * p], xc[3 * p + 1], xc[3 * p + 2]); fp[p] += f;
    }
    for (let p = 0; p < Np; p++) this.dp[p] = fp[p] / this.area[p];
    this.t += dt; this.nstep++;
  }
  addForce(p, fx, fy, fz, x, y, z) {
    const k = this.psail[p]; this.F[0] += fx; this.F[1] += fy; this.F[2] += fz;
    const f = this.Fs[k]; f[0] += fx; f[1] += fy; f[2] += fz;
    const Fp = this.Fp; Fp[3 * p] += fx; Fp[3 * p + 1] += fy; Fp[3 * p + 2] += fz;
    const M = this.Ms[k]; M[0] += fy * z; M[1] += fy * x; M[2] += fx * z; // side-force moments (height, fore-aft) and drive height
  }
  enforceSides() {
    const { Np, xc, nn, tc, ts, lc, ls } = this; const nsail = this.sails.length;
    for (const E of this.edges) {
      const m1 = E.m + 1;
      for (let r = 2; r < E.nr; r++) for (let i = 0; i < m1; i++) {
        const o = 3 * (r * m1 + i); let px = E.W[o], py = E.W[o + 1], pz = E.W[o + 2];
        for (let k = 0; k < nsail; k++) {
          const s = this.sails[k]; let best = -1, bd = 1e30;
          for (let p = s.p0; p < s.p0 + s.Nc * s.Ns; p++) { const dx = px - xc[3 * p], dy = py - xc[3 * p + 1], dz = pz - xc[3 * p + 2], d2 = dx * dx + dy * dy + dz * dz; if (d2 < bd) { bd = d2; best = p; } }
          const p = best, dx = px - xc[3 * p], dy = py - xc[3 * p + 1], dz = pz - xc[3 * p + 2];
          const a = dx * tc[3 * p] + dy * tc[3 * p + 1] + dz * tc[3 * p + 2], b = dx * ts[3 * p] + dy * ts[3 * p + 1] + dz * ts[3 * p + 2];
          if (Math.abs(a) > 0.5 * lc[p] || Math.abs(b) > 0.45 * ls[p]) continue;
          const d = dx * nn[3 * p] + dy * nn[3 * p + 1] + dz * nn[3 * p + 2], dmin = this.standoff * s.h;
          const li = r * m1 * nsail + i * nsail + k; let lab = E.side[li];
          if (lab === 0) { if (Math.abs(d) < dmin) continue; lab = E.side[li] = d > 0 ? 1 : -1; }
          if (d * lab < dmin) { const sh = lab * dmin - d; px += sh * nn[3 * p]; py += sh * nn[3 * p + 1]; pz += sh * nn[3 * p + 2]; this.nfix = (this.nfix || 0) + 1; }
        }
        E.W[o] = px; E.W[o + 1] = py; E.W[o + 2] = pz;
      }
    }
  }
}

// ---------- sail shapes ----------
function camberLine(s, m, p) { return s < p ? m / (p * p) * (2 * p * s - s * s) : m / ((1 - p) * (1 - p)) * (1 - 2 * p + 2 * p * s - s * s); }
function interp(tab, v) { // tab: [[v,c],...]
  for (let k = 1; k < tab.length; k++) if (v <= tab[k][0]) { const f = (v - tab[k - 1][0]) / (tab[k][0] - tab[k - 1][0]); return tab[k - 1][1] + f * (tab[k][1] - tab[k - 1][1]); }
  return tab[tab.length - 1][1];
}
// Generic sail: luff from tack T to head Hd (straight), chord table, sheet angle d0 (rad) at the foot plus twist (rad) to the head,
// camber m with draft position p. Sections are horizontal and swing about the luff.
function sailShape(o) {
  return function (s, v, out) {
    const c = interp(o.chords, v), dl = o.d0 + o.twist * v, f = camberLine(s, o.camber * (o.camberTop !== undefined ? (1 - v) + v * o.camberTop / o.camber : 1), o.draft || 0.45);
    const lx = o.T[0] + v * (o.Hd[0] - o.T[0]), ly = o.T[1] + v * (o.Hd[1] - o.T[1]), lz = o.T[2] + v * (o.Hd[2] - o.T[2]);
    const cd = Math.cos(dl), sd = Math.sin(dl);
    out[0] = lx + c * (-s * cd + f * sd); out[1] = ly + c * (s * sd + f * cd); out[2] = lz;
  };
}
// Fujin (Tahara, Masuyama, Fukasawa, Katori 2012, table 1)
const FUJIN = {
  mainChords: [[0, 4.44], [0.1, 4.13], [0.2, 3.85], [0.4, 3.23], [0.6, 2.43], [0.8, 1.39], [1, 0.15]],
  jibChords: [[0, 4.89], [0.1, 4.44], [0.2, 3.94], [0.4, 2.94], [0.6, 1.97], [0.8, 0.98], [1, 0.10]],
  deck: 1.1, // freeboard assumed (not in the paper)
  mainArea: 33.2, jibArea: 26.1, zGCE: 4.8,
};
function fujinMain(d0deg, twistDeg, camber) {
  const z0 = FUJIN.deck + 1.32;
  return sailShape({ chords: FUJIN.mainChords, T: [0, 0, z0], Hd: [-0.3, 0, z0 + 12.5], d0: d0deg * Math.PI / 180, twist: twistDeg * Math.PI / 180, camber: camber === undefined ? 0.10 : camber });
}
function fujinJib(d0deg, twistDeg, camber) {
  const z0 = FUJIN.deck + 0.25;
  return sailShape({ chords: FUJIN.jibChords, T: [3.61, 0, z0], Hd: [0.25, 0, FUJIN.deck + 10.7], d0: d0deg * Math.PI / 180, twist: twistDeg * Math.PI / 180, camber: camber === undefined ? 0.10 : camber, draft: 0.4 });
}
function windProfile(Vref, zref, betaDeg, expo) {
  const b = betaDeg * Math.PI / 180, cx = -Math.cos(b), cy = Math.sin(b);
  return function (z, out) { const V = expo ? Vref * Math.pow(Math.max(z, 0.3) / zref, expo) : Vref; out[0] = V * cx; out[1] = V * cy; out[2] = 0; };
}
module.exports = { World, sailShape, fujinMain, fujinJib, FUJIN, windProfile, RHO, camberLine, kcount: () => KCOUNT };
