// PROTOTYPE, THROWAWAY. Answers luovi issue #13: cost per 60 Hz tick of a
// substepped XPBD rig solver at H-boat and Suomen Joutsen scale, plus the
// statics checks True Wind reported XPBD failing. Run: node rig-cost.ts
//
// Hot loop uses only + - * / and Math.sqrt (exact under IEEE), so the cost is
// what the deterministic build would pay. Flat Float64Array SoA layout as in
// ADR 0003. One Gauss-Seidel sweep per substep (Macklin et al. 2019, Small
// Steps), lambda reset every substep.

const TICK_HZ = 60;
const TICK_DT = 1 / TICK_HZ;
const RHO_AIR = 1.225;
const G = 9.81;

type Material = { Et: number; Gt: number; areal: number; name: string };
const DACRON: Material = { Et: 100e3, Gt: 12e3, areal: 0.3, name: "Dacron 7oz (Et 100 kN/m)" };
const NYLON: Material = { Et: 15e3, Gt: 2e3, areal: 0.045, name: "Nylon spinnaker (Et 15 kN/m)" };

const EA_POLYESTER = 3e5;
const EA_DYNEEMA = 3e6;
const EA_WIRE = 2.8e6;
const MAST_EA = 7e7;
const MAST_EI = 1.4e5;
const MAST_GJ = 1.0e5;

class Builder {
  px: number[] = []; py: number[] = []; pz: number[] = []; w: number[] = [];
  qx: number[] = []; qy: number[] = []; qz: number[] = []; qw: number[] = []; wq: number[] = [];
  dA: number[] = []; dB: number[] = []; dRest: number[] = []; dAlpha: number[] = []; dKind: string[] = []; kind = "cloth";
  ropeNodes: number[] = []; ropeStart: number[] = []; ropeLen: number[] = []; ropeAlpha: number[] = [];
  ssA: number[] = []; ssB: number[] = []; ssQ: number[] = []; ssL: number[] = []; ssAlpha: number[] = [];
  btA: number[] = []; btB: number[] = []; btRx: number[] = []; btRy: number[] = []; btRz: number[] = []; btAlpha: number[] = []; btAlphaT: number[] = [];
  tA: number[] = []; tB: number[] = []; tC: number[] = [];
  counts = { cloth: 0, standing: 0, spar: 0, ropes: 0, cosserat: 0, attach: 0 };

  particle(x: number, y: number, z: number, mass: number): number {
    this.px.push(x); this.py.push(y); this.pz.push(z); this.w.push(mass > 0 ? 1 / mass : 0);
    return this.px.length - 1;
  }
  pin(x: number, y: number, z: number): number { return this.particle(x, y, z, 0); }

  distance(a: number, b: number, k: number, rest?: number): void {
    const dx = this.px[b] - this.px[a], dy = this.py[b] - this.py[a], dz = this.pz[b] - this.pz[a];
    this.dA.push(a); this.dB.push(b);
    this.dRest.push(rest ?? Math.sqrt(dx * dx + dy * dy + dz * dz));
    this.dAlpha.push(1 / k); this.dKind.push(this.kind);
  }

  rope(nodes: number[], EA: number, slack = 0): void {
    let L = 0;
    for (let i = 0; i + 1 < nodes.length; i++) {
      const a = nodes[i], b = nodes[i + 1];
      const dx = this.px[b] - this.px[a], dy = this.py[b] - this.py[a], dz = this.pz[b] - this.pz[a];
      L += Math.sqrt(dx * dx + dy * dy + dz * dz);
    }
    this.ropeStart.push(this.ropeNodes.length);
    for (const n of nodes) this.ropeNodes.push(n);
    this.ropeStart.push(this.ropeNodes.length);
    this.ropeLen.push(L + slack);
    this.ropeAlpha.push(L / EA);
    this.counts.ropes++;
  }

  // Straight Cosserat rod from p0 along dir, n segments. Returns particle ids and quaternion ids.
  cosserat(p0: [number, number, number], dir: [number, number, number], length: number, n: number,
    massPerM: number, EA: number, EI: number, GJ: number, pinRoot: boolean): { parts: number[]; quats: number[] } {
    const l = length / n;
    const parts: number[] = [];
    const quats: number[] = [];
    for (let i = 0; i <= n; i++) {
      const m = massPerM * l * (i === 0 || i === n ? 0.5 : 1);
      const pinned = pinRoot && i === 0;
      parts.push(this.particle(p0[0] + dir[0] * l * i, p0[1] + dir[1] * l * i, p0[2] + dir[2] * l * i, pinned ? 0 : m));
    }
    // quaternion rotating e3 onto dir
    const [qx, qy, qz, qw] = quatFromE3(dir);
    for (let i = 0; i < n; i++) {
      this.qx.push(qx); this.qy.push(qy); this.qz.push(qz); this.qw.push(qw);
      const m = massPerM * l;
      const inertia = (m * l * l) / 12 + 1e-9;
      this.wq.push(pinRoot && i === 0 ? 0 : 1 / inertia);
      quats.push(this.qx.length - 1);
      this.ssA.push(parts[i]); this.ssB.push(parts[i + 1]); this.ssQ.push(quats[i]);
      this.ssL.push(l); this.ssAlpha.push(1 / (EA * l));
      this.counts.cosserat++;
    }
    for (let i = 0; i + 1 < n; i++) {
      this.btA.push(quats[i]); this.btB.push(quats[i + 1]);
      this.btRx.push(0); this.btRy.push(0); this.btRz.push(0);
            this.btAlpha.push(l / (4 * EI)); this.btAlphaT.push(l / (4 * GJ));
    }
    return { parts, quats };
  }

  // Sail cloth: cols along u (chord), rows along v (up). Returns grid of particle ids [row][col].
  sail(origin: [number, number, number], u: [number, number, number], v: [number, number, number],
    chord: number, height: number, cols: number, rows: number, mat: Material, camber: number): number[][] {
    const grid: number[][] = [];
    const lx = chord / (cols - 1), lz = height / (rows - 1);
    const area = chord * height;
    const nodeMass = (mat.areal * area) / (cols * rows);
    const nx = u[1] * v[2] - u[2] * v[1], ny = u[2] * v[0] - u[0] * v[2], nz = u[0] * v[1] - u[1] * v[0];
    for (let r = 0; r < rows; r++) {
      const row: number[] = [];
      for (let c = 0; c < cols; c++) {
        const s = c / (cols - 1);
        const bulge = camber * chord * 4 * s * (1 - s);
        const x = origin[0] + u[0] * lx * c + v[0] * lz * r + nx * bulge;
        const y = origin[1] + u[1] * lx * c + v[1] * lz * r + ny * bulge;
        const z = origin[2] + u[2] * lx * c + v[2] * lz * r + nz * bulge;
        row.push(this.particle(x, y, z, nodeMass));
      }
      grid.push(row);
    }
    const savedKind = this.kind; this.kind = "cloth";
    const kH = mat.Et * (height / rows) / lx, kV = mat.Et * (chord / cols) / lz, kS = mat.Gt, kB = mat.Et * 1e-3;
    let n = 0;
    for (let r = 0; r < rows; r++) for (let c = 0; c + 1 < cols; c++) { this.distance(grid[r][c], grid[r][c + 1], kH); n++; }
    for (let r = 0; r + 1 < rows; r++) for (let c = 0; c < cols; c++) { this.distance(grid[r][c], grid[r + 1][c], kV); n++; }
    for (let r = 0; r + 1 < rows; r++) for (let c = 0; c + 1 < cols; c++) {
      this.distance(grid[r][c], grid[r + 1][c + 1], kS); this.distance(grid[r + 1][c], grid[r][c + 1], kS); n += 2;
    }
    if (!process.env.NO_BEND) {
      for (let r = 0; r < rows; r++) for (let c = 0; c + 2 < cols; c++) { this.distance(grid[r][c], grid[r][c + 2], kB); n++; }
      for (let r = 0; r + 2 < rows; r++) for (let c = 0; c < cols; c++) { this.distance(grid[r][c], grid[r + 2][c], kB); n++; }
    }
    this.counts.cloth += n; this.kind = savedKind === "cloth" ? "attach" : savedKind;
    for (let r = 0; r + 1 < rows; r++) for (let c = 0; c + 1 < cols; c++) {
      this.tA.push(grid[r][c]); this.tB.push(grid[r][c + 1]); this.tC.push(grid[r + 1][c + 1]);
      this.tA.push(grid[r][c]); this.tB.push(grid[r + 1][c + 1]); this.tC.push(grid[r + 1][c]);
    }
    return grid;
  }

  build(): World { return new World(this); }
}

function quatFromE3(d: [number, number, number]): [number, number, number, number] {
  // rotation taking (0,0,1) to d
  const dot = d[2];
  if (dot > 1 - 1e-12) return [0, 0, 0, 1];
  if (dot < -1 + 1e-12) return [1, 0, 0, 0];
  const cx = -d[1], cy = d[0], cz = 0;
  const w = 1 + dot;
  const n = Math.sqrt(cx * cx + cy * cy + cz * cz + w * w);
  return [cx / n, cy / n, cz / n, w / n];
}

class World {
  n: number; px: Float64Array; py: Float64Array; pz: Float64Array;
  ox: Float64Array; oy: Float64Array; oz: Float64Array;
  vx: Float64Array; vy: Float64Array; vz: Float64Array; w: Float64Array;
  fx: Float64Array; fy: Float64Array; fz: Float64Array;
  nq: number; qx: Float64Array; qy: Float64Array; qz: Float64Array; qw: Float64Array;
  qox: Float64Array; qoy: Float64Array; qoz: Float64Array; qow: Float64Array;
  avx: Float64Array; avy: Float64Array; avz: Float64Array; wq: Float64Array;
  dA: Int32Array; dB: Int32Array; dRest: Float64Array; dAlpha: Float64Array;
  ropeNodes: Int32Array; ropeStart: Int32Array; ropeLen: Float64Array; ropeAlpha: Float64Array;
  ssA: Int32Array; ssB: Int32Array; ssQ: Int32Array; ssL: Float64Array; ssAlpha: Float64Array;
  btA: Int32Array; btB: Int32Array; btRx: Float64Array; btRy: Float64Array; btRz: Float64Array; btAlpha: Float64Array; btAlphaT: Float64Array;
  tA: Int32Array; tB: Int32Array; tC: Int32Array;
  dLam: Float64Array; ropeLam: Float64Array; ssLx: Float64Array; ssLy: Float64Array; ssLz: Float64Array;
  btLx: Float64Array; btLy: Float64Array; btLz: Float64Array;
  counts: Builder["counts"]; dKind: string[];
  windX = 0; windY = 0; windZ = 0; gravity = G; damping = 0.5;
  extraFx: Float64Array; extraFy: Float64Array; extraFz: Float64Array;

  constructor(b: Builder) {
    this.n = b.px.length;
    this.px = Float64Array.from(b.px); this.py = Float64Array.from(b.py); this.pz = Float64Array.from(b.pz);
    this.ox = new Float64Array(this.n); this.oy = new Float64Array(this.n); this.oz = new Float64Array(this.n);
    this.vx = new Float64Array(this.n); this.vy = new Float64Array(this.n); this.vz = new Float64Array(this.n);
    this.fx = new Float64Array(this.n); this.fy = new Float64Array(this.n); this.fz = new Float64Array(this.n);
    this.extraFx = new Float64Array(this.n); this.extraFy = new Float64Array(this.n); this.extraFz = new Float64Array(this.n);
    this.w = Float64Array.from(b.w);
    this.nq = b.qx.length;
    this.qx = Float64Array.from(b.qx); this.qy = Float64Array.from(b.qy); this.qz = Float64Array.from(b.qz); this.qw = Float64Array.from(b.qw);
    this.qox = new Float64Array(this.nq); this.qoy = new Float64Array(this.nq); this.qoz = new Float64Array(this.nq); this.qow = new Float64Array(this.nq);
    this.avx = new Float64Array(this.nq); this.avy = new Float64Array(this.nq); this.avz = new Float64Array(this.nq);
    this.wq = Float64Array.from(b.wq);
    this.dA = Int32Array.from(b.dA); this.dB = Int32Array.from(b.dB); this.dRest = Float64Array.from(b.dRest); this.dAlpha = Float64Array.from(b.dAlpha);
    this.ropeNodes = Int32Array.from(b.ropeNodes); this.ropeStart = Int32Array.from(b.ropeStart);
    this.ropeLen = Float64Array.from(b.ropeLen); this.ropeAlpha = Float64Array.from(b.ropeAlpha);
    this.ssA = Int32Array.from(b.ssA); this.ssB = Int32Array.from(b.ssB); this.ssQ = Int32Array.from(b.ssQ); this.ssL = Float64Array.from(b.ssL); this.ssAlpha = Float64Array.from(b.ssAlpha);
    this.btA = Int32Array.from(b.btA); this.btB = Int32Array.from(b.btB); this.btRx = Float64Array.from(b.btRx); this.btRy = Float64Array.from(b.btRy); this.btRz = Float64Array.from(b.btRz); this.btAlpha = Float64Array.from(b.btAlpha); this.btAlphaT = Float64Array.from(b.btAlphaT);
    this.tA = Int32Array.from(b.tA); this.tB = Int32Array.from(b.tB); this.tC = Int32Array.from(b.tC);
    this.counts = b.counts; this.dKind = b.dKind;
    this.dLam = new Float64Array(this.dA.length); this.ropeLam = new Float64Array(this.ropeLen.length);
    this.ssLx = new Float64Array(this.ssA.length); this.ssLy = new Float64Array(this.ssA.length); this.ssLz = new Float64Array(this.ssA.length);
    this.btLx = new Float64Array(this.btA.length); this.btLy = new Float64Array(this.btA.length); this.btLz = new Float64Array(this.btA.length);
  }

  // Per-triangle aero: apparent wind at centroid, sin(alpha) from the normal, Cp from a piecewise curve.
  aero(): void {
    const { px, py, pz, vx, vy, vz, fx, fy, fz, tA, tB, tC } = this;
    const q = 0.5 * RHO_AIR;
    for (let t = 0; t < tA.length; t++) {
      const a = tA[t], b = tB[t], c = tC[t];
      const e1x = px[b] - px[a], e1y = py[b] - py[a], e1z = pz[b] - pz[a];
      const e2x = px[c] - px[a], e2y = py[c] - py[a], e2z = pz[c] - pz[a];
      let nx = e1y * e2z - e1z * e2y, ny = e1z * e2x - e1x * e2z, nz = e1x * e2y - e1y * e2x;
      const twoA = Math.sqrt(nx * nx + ny * ny + nz * nz);
      if (twoA < 1e-12) continue;
      const area = 0.5 * twoA;
      nx /= twoA; ny /= twoA; nz /= twoA;
      const wx = this.windX - (vx[a] + vx[b] + vx[c]) / 3;
      const wy = this.windY - (vy[a] + vy[b] + vy[c]) / 3;
      const wz = this.windZ - (vz[a] + vz[b] + vz[c]) / 3;
      const w2 = wx * wx + wy * wy + wz * wz;
      if (w2 < 1e-9) continue;
      const wn = Math.sqrt(w2);
      const s = (wx * nx + wy * ny + wz * nz) / wn;
      // Cp(sin alpha): linear lift slope to 0.4, plateau toward 1.2 at normal incidence, odd symmetric
      const as = s < 0 ? -s : s;
      const cp = as < 0.4 ? 3.0 * as : 1.2;
      const p = q * w2 * (s < 0 ? -cp : cp) * area / 3;
      fx[a] += p * nx; fy[a] += p * ny; fz[a] += p * nz;
      fx[b] += p * nx; fy[b] += p * ny; fz[b] += p * nz;
      fx[c] += p * nx; fy[c] += p * ny; fz[c] += p * nz;
    }
  }

  tick(nsub: number, iters = 1): void {
    const dt = TICK_DT / nsub;
    const { n, nq, px, py, pz, ox, oy, oz, vx, vy, vz, w, fx, fy, fz, extraFx, extraFy, extraFz } = this;
    const damp = 1 / (1 + this.damping * dt);
    const dt2 = dt * dt;
    for (let s = 0; s < nsub; s++) {
      fx.fill(0); fy.fill(0); fz.fill(0);
      this.aero();
      for (let i = 0; i < n; i++) {
        const wi = w[i];
        ox[i] = px[i]; oy[i] = py[i]; oz[i] = pz[i];
        if (wi === 0) continue;
        vx[i] += dt * (fx[i] + extraFx[i]) * wi;
        vy[i] += dt * (fy[i] + extraFy[i]) * wi;
        vz[i] += dt * ((fz[i] + extraFz[i]) * wi - this.gravity);
        px[i] += dt * vx[i]; py[i] += dt * vy[i]; pz[i] += dt * vz[i];
      }
      this.predictQuats(dt);
      this.dLam.fill(0); this.ropeLam.fill(0);
      this.ssLx.fill(0); this.ssLy.fill(0); this.ssLz.fill(0); this.btLx.fill(0); this.btLy.fill(0); this.btLz.fill(0);
      for (let it = 0; it < iters; it++) {
        this.solveDistance(dt2);
        this.solveRopes(dt2);
        this.solveStretchShear(dt2);
        this.solveBendTwist(dt2);
      }
      const inv = 1 / dt;
      for (let i = 0; i < n; i++) {
        if (w[i] === 0) continue;
        vx[i] = (px[i] - ox[i]) * inv * damp;
        vy[i] = (py[i] - oy[i]) * inv * damp;
        vz[i] = (pz[i] - oz[i]) * inv * damp;
      }
      this.updateAngular(dt, damp);
    }
  }

  predictQuats(dt: number): void {
    const { nq, qx, qy, qz, qw, qox, qoy, qoz, qow, avx, avy, avz, wq } = this;
    for (let i = 0; i < nq; i++) {
      qox[i] = qx[i]; qoy[i] = qy[i]; qoz[i] = qz[i]; qow[i] = qw[i];
      if (wq[i] === 0) continue;
      // q += dt/2 * q * (0, omega_body)
      const x = qx[i], y = qy[i], z = qz[i], ww = qw[i];
      const wx = avx[i], wy = avy[i], wz = avz[i];
      const h = 0.5 * dt;
      let nx = x + h * (ww * wx + y * wz - z * wy);
      let ny = y + h * (ww * wy + z * wx - x * wz);
      let nz = z + h * (ww * wz + x * wy - y * wx);
      let nw = ww + h * (-x * wx - y * wy - z * wz);
      const inv = 1 / Math.sqrt(nx * nx + ny * ny + nz * nz + nw * nw);
      qx[i] = nx * inv; qy[i] = ny * inv; qz[i] = nz * inv; qw[i] = nw * inv;
    }
  }

  updateAngular(dt: number, damp: number): void {
    const { nq, qx, qy, qz, qw, qox, qoy, qoz, qow, avx, avy, avz, wq } = this;
    const f = (2 / dt) * damp;
    for (let i = 0; i < nq; i++) {
      if (wq[i] === 0) continue;
      // omega_body = 2/dt * (conj(q_old) * q).xyz
      const ax = -qox[i], ay = -qoy[i], az = -qoz[i], aw = qow[i];
      const bx = qx[i], by = qy[i], bz = qz[i], bw = qw[i];
      const rx = aw * bx + ax * bw + ay * bz - az * by;
      const ry = aw * by - ax * bz + ay * bw + az * bx;
      const rz = aw * bz + ax * by - ay * bx + az * bw;
      const rw = aw * bw - ax * bx - ay * by - az * bz;
      const sgn = rw < 0 ? -1 : 1;
      avx[i] = f * rx * sgn; avy[i] = f * ry * sgn; avz[i] = f * rz * sgn;
    }
  }

  solveDistance(dt2: number): void {
    const { px, py, pz, w, dA, dB, dRest, dAlpha, dLam } = this;
    for (let c = 0; c < dA.length; c++) {
      const a = dA[c], b = dB[c];
      const wa = w[a], wb = w[b];
      const ws = wa + wb;
      if (ws === 0) continue;
      const dx = px[b] - px[a], dy = py[b] - py[a], dz = pz[b] - pz[a];
      const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (len < 1e-12) continue;
      const C = len - dRest[c];
      const at = dAlpha[c] / dt2;
      const dl = (-C - at * dLam[c]) / (ws + at);
      dLam[c] += dl;
      const k = dl / len;
      px[a] -= wa * k * dx; py[a] -= wa * k * dy; pz[a] -= wa * k * dz;
      px[b] += wb * k * dx; py[b] += wb * k * dy; pz[b] += wb * k * dz;
    }
  }

  // Unilateral: sum of segment lengths <= L. One lambda per rope, equal tension along it.
  gx = new Float64Array(64); gy = new Float64Array(64); gz = new Float64Array(64);
  solveRopes(dt2: number): void {
    const { px, py, pz, w, ropeNodes, ropeStart, ropeLen, ropeAlpha, ropeLam, gx, gy, gz } = this;
    for (let r = 0; r < ropeLen.length; r++) {
      const s = ropeStart[2 * r], e = ropeStart[2 * r + 1];
      const cnt = e - s;
      let total = 0;
      for (let i = 0; i < cnt; i++) { gx[i] = 0; gy[i] = 0; gz[i] = 0; }
      for (let i = 0; i + 1 < cnt; i++) {
        const a = ropeNodes[s + i], b = ropeNodes[s + i + 1];
        const dx = px[b] - px[a], dy = py[b] - py[a], dz = pz[b] - pz[a];
        const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
        total += len;
        if (len < 1e-12) continue;
        const ux = dx / len, uy = dy / len, uz = dz / len;
        gx[i] -= ux; gy[i] -= uy; gz[i] -= uz;
        gx[i + 1] += ux; gy[i + 1] += uy; gz[i + 1] += uz;
      }
      const C = total - ropeLen[r];
      if (C <= 0) continue;
      let ws = 0;
      for (let i = 0; i < cnt; i++) ws += w[ropeNodes[s + i]] * (gx[i] * gx[i] + gy[i] * gy[i] + gz[i] * gz[i]);
      if (ws === 0) continue;
      const at = ropeAlpha[r] / dt2;
      const dl = (-C - at * ropeLam[r]) / (ws + at);
      ropeLam[r] += dl;
      for (let i = 0; i < cnt; i++) {
        const p = ropeNodes[s + i];
        const k = w[p] * dl;
        px[p] += k * gx[i]; py[p] += k * gy[i]; pz[p] += k * gz[i];
      }
    }
  }

  // Kugelstadt and Schoemer 2016 stretch-shear, with an XPBD compliance term in the denominator.
  // Kugelstadt and Schoemer 2016 stretch-shear as XPBD: C = (pb - pa)/l - d3(q), d3 = R(q) e3,
  // gradients -I/l, I/l and -J with J = d(d3)/dq (J J^T is about 4 I for a unit quaternion).
  solveStretchShear(dt2: number): void {
    const { px, py, pz, w, qx, qy, qz, qw, wq, ssA, ssB, ssQ, ssL, ssAlpha, ssLx, ssLy, ssLz } = this;
    for (let c = 0; c < ssA.length; c++) {
      const a = ssA[c], b = ssB[c], q = ssQ[c];
      const l = ssL[c];
      const x = qx[q], y = qy[q], z = qz[q], ww = qw[q];
      const d3x = 2 * (x * z + ww * y);
      const d3y = 2 * (y * z - ww * x);
      const d3z = 1 - 2 * (x * x + y * y);
      const Cx = (px[b] - px[a]) / l - d3x;
      const Cy = (py[b] - py[a]) / l - d3y;
      const Cz = (pz[b] - pz[a]) / l - d3z;
      const wa = w[a], wb = w[b], wqq = wq[q];
      const at = ssAlpha[c] / dt2;
      const D = (wa + wb) / (l * l) + 4 * wqq + at;
      if (D === 0) continue;
      const lx = (-Cx - at * ssLx[c]) / D, ly = (-Cy - at * ssLy[c]) / D, lz = (-Cz - at * ssLz[c]) / D;
      ssLx[c] += lx; ssLy[c] += ly; ssLz[c] += lz;
      const ka = -wa / l, kb = wb / l;
      px[a] += ka * lx; py[a] += ka * ly; pz[a] += ka * lz;
      px[b] += kb * lx; py[b] += kb * ly; pz[b] += kb * lz;
      if (wqq === 0) continue;
      // dq = wq * (-J^T) * lambda
      const nx = x - wqq * (2 * z * lx - 2 * ww * ly - 4 * x * lz);
      const ny = y - wqq * (2 * ww * lx + 2 * z * ly - 4 * y * lz);
      const nz = z - wqq * (2 * x * lx + 2 * y * ly);
      const nw = ww - wqq * (2 * y * lx - 2 * x * ly);
      const inv = 1 / Math.sqrt(nx * nx + ny * ny + nz * nz + nw * nw);
      qx[q] = nx * inv; qy[q] = ny * inv; qz[q] = nz * inv; qw[q] = nw * inv;
    }
  }

  solveBendTwist(dt2: number): void {
    const { qx, qy, qz, qw, wq, btA, btB, btRx, btRy, btRz, btAlpha, btAlphaT, btLx, btLy, btLz } = this;
    for (let c = 0; c < btA.length; c++) {
      const a = btA[c], b = btB[c];
      const wa = wq[a], wb = wq[b];
      const ws = wa + wb;
      if (ws === 0) continue;
      const ax = -qx[a], ay = -qy[a], az = -qz[a], aw = qw[a];
      const bx = qx[b], by = qy[b], bz = qz[b], bw = qw[b];
      // omega = conj(qa) * qb
      let ox = aw * bx + ax * bw + ay * bz - az * by;
      let oy = aw * by - ax * bz + ay * bw + az * bx;
      let oz = aw * bz + ax * by - ay * bx + az * bw;
      const ow = aw * bw - ax * bx - ay * by - az * bz;
      const rx = btRx[c], ry = btRy[c], rz = btRz[c];
      const mx = ox - rx, my = oy - ry, mz = oz - rz;
      const pxx = ox + rx, pyy = oy + ry, pzz = oz + rz;
      if (mx * mx + my * my + mz * mz > pxx * pxx + pyy * pyy + pzz * pzz) { ox = pxx; oy = pyy; oz = pzz; } else { ox = mx; oy = my; oz = mz; }
      const at = btAlpha[c] / dt2, atT = btAlphaT[c] / dt2;
      const f = 1 / (ws + at), fT = 1 / (ws + atT);
      // lambda = -(C + at*lam)/D ; we apply dq0 = +wa qb (0,-lambda), so keep ox = -lambda
      ox = (ox + at * btLx[c]) * f; oy = (oy + at * btLy[c]) * f; oz = (oz + atT * btLz[c]) * fT;
      btLx[c] -= ox; btLy[c] -= oy; btLz[c] -= oz;
      const sx = qx[a], sy = qy[a], sz = qz[a], sw = qw[a];
      // qa += wa * qb * omega ; qb -= wb * qa * omega (omega has zero scalar part)
      if (wa !== 0) {
        const nx = qx[a] + wa * (bw * ox + by * oz - bz * oy);
        const ny = qy[a] + wa * (bw * oy + bz * ox - bx * oz);
        const nz = qz[a] + wa * (bw * oz + bx * oy - by * ox);
        const nw = qw[a] + wa * (-bx * ox - by * oy - bz * oz);
        const inv = 1 / Math.sqrt(nx * nx + ny * ny + nz * nz + nw * nw);
        qx[a] = nx * inv; qy[a] = ny * inv; qz[a] = nz * inv; qw[a] = nw * inv;
      }
      if (wb !== 0) {
        const nx = qx[b] - wb * (sw * ox + sy * oz - sz * oy);
        const ny = qy[b] - wb * (sw * oy + sz * ox - sx * oz);
        const nz = qz[b] - wb * (sw * oz + sx * oy - sy * ox);
        const nw = qw[b] - wb * (-sx * ox - sy * oy - sz * oz);
        const inv = 1 / Math.sqrt(nx * nx + ny * ny + nz * nz + nw * nw);
        qx[b] = nx * inv; qy[b] = ny * inv; qz[b] = nz * inv; qw[b] = nw * inv;
      }
      void ow;
    }
  }

  maxSpeed(): number {
    let m = 0;
    for (let i = 0; i < this.n; i++) {
      const s = this.vx[i] * this.vx[i] + this.vy[i] * this.vy[i] + this.vz[i] * this.vz[i];
      if (s > m) m = s;
    }
    return Math.sqrt(m);
  }
  hasNaN(): boolean {
    for (let i = 0; i < this.n; i++) if (Number.isNaN(this.px[i] + this.py[i] + this.pz[i])) return true;
    for (let i = 0; i < this.nq; i++) if (Number.isNaN(this.qx[i] + this.qw[i])) return true;
    return false;
  }
}

// ---------------------------------------------------------------- rigs

type RigSpec = { name: string; cols: number; rows: number; sails: number; mat: Material };

function buildHboat(cols: number, rows: number): World {
  const b = new Builder();
  const mastH = 11, boomL = 3.3;
  const mast = b.cosserat([0, 0, 0.5], [0, 0, 1], mastH, 8, 6, MAST_EA, MAST_EI, MAST_GJ, true);
  const head = mast.parts[8];
  const stem = b.pin(3.6, 0, 0.3), stern = b.pin(-3.2, 0, 0.3);
  const chainP = b.pin(0, 1.1, 0.2), chainS = b.pin(0, -1.1, 0.2);
  const chainP2 = b.pin(0.3, 1.1, 0.2), chainS2 = b.pin(0.3, -1.1, 0.2);
  // standing rigging with 3 kN pretension: rest length shortened by T L / EA
  const standing = (a: number, c: number, EA: number, T: number) => {
    const dx = b.px[c] - b.px[a], dy = b.py[c] - b.py[a], dz = b.pz[c] - b.pz[a];
    const L = Math.sqrt(dx * dx + dy * dy + dz * dz);
    b.rope([a, c], EA, -L * T / EA);
    b.counts.standing++;
  };
  standing(head, stem, EA_WIRE, 3000);
  standing(head, stern, EA_WIRE, 2500);
  standing(head, chainP, EA_WIRE, 3000);
  standing(head, chainS, EA_WIRE, 3000);
  standing(mast.parts[4], chainP2, EA_WIRE, 2000);
  standing(mast.parts[4], chainS2, EA_WIRE, 2000);
  standing(mast.parts[6], chainP, EA_WIRE, 1500);
  standing(mast.parts[6], chainS, EA_WIRE, 1500);
  standing(mast.parts[6], b.pin(-2.5, 0.8, 0.3), EA_DYNEEMA, 1000);
  standing(mast.parts[6], b.pin(-2.5, -0.8, 0.3), EA_DYNEEMA, 1000);
  // boom: stiff distance chain, gooseneck to mast
  const boom = [mast.parts[1], b.particle(-boomL / 2, 0, 1.9, 4), b.particle(-boomL, 0, 1.9, 4)];
  b.kind = "spar"; b.distance(boom[0], boom[1], 5e6); b.distance(boom[1], boom[2], 5e6); b.distance(boom[0], boom[2], 5e6); b.kind = "attach";
  b.counts.spar += 3;
  // main: luff on mast, foot on boom
  const mainH = mastH - 1.5, mainC = boomL;
  const main = b.sail([-0.05, 0, 1.9], [-1, 0, 0], [0, 0, 1], mainC, mainH, cols, rows, DACRON, 0.08);
  for (let r = 0; r < rows; r++) {
    const z = 1.9 + (mainH * r) / (rows - 1);
    const mi = Math.min(8, Math.round((z - 0.5) / (mastH / 8)));
    b.distance(main[r][0], mast.parts[mi], 2e5); b.counts.attach++;
    if (mi > 0) { b.distance(main[r][0], mast.parts[mi - 1], 2e5); b.counts.attach++; }
  }
  b.distance(main[0][cols - 1], boom[2], 2e5); b.counts.attach++;
  // jib: luff on forestay
  const jibH = 9, jibC = 2.6;
  const jib = b.sail([3.4, 0, 0.6], [-1, 0, 0], [-0.3, 0, 0.954], jibC, jibH, cols, rows, DACRON, 0.1);
  for (let r = 0; r < rows; r++) { b.distance(jib[r][0], head, 2e5); b.distance(jib[r][0], stem, 2e5); b.counts.attach += 2; }
  // running rigging
  const winch = (x: number, y: number) => b.pin(x, y, 0.4);
  b.rope([main[rows - 1][0], head, mast.parts[0], winch(0.3, 0.2)], EA_DYNEEMA, 0.002);
  b.rope([jib[rows - 1][0], head, mast.parts[0], winch(0.3, -0.2)], EA_DYNEEMA, 0.002);
  const trav = b.pin(-3.2, 0, 0.6);
  b.rope([boom[2], trav, boom[1], winch(-1.8, 0), winch(-1.2, 0.3)], EA_POLYESTER, 0.02);
  b.rope([jib[0][cols - 1], b.pin(1.0, 1.0, 0.4), winch(-0.5, 1.0)], EA_POLYESTER, 0.0);
  b.rope([jib[0][cols - 1], b.pin(1.0, -1.0, 0.4), winch(-0.5, -1.0)], EA_POLYESTER, 0.5);
  b.rope([main[0][cols - 1], boom[2], boom[1]], EA_POLYESTER, 0.0);
  b.rope([main[1][0], mast.parts[1], winch(0.2, 0.1)], EA_POLYESTER, 0.0);
  b.rope([boom[1], mast.parts[0], winch(0.2, -0.1)], EA_POLYESTER, 0.0);
  // spinnaker gear and the rest of the running lines, as polylines into the same particles
  const pole = [mast.parts[2], b.particle(1.5, 1.0, 2.5, 2), b.particle(2.8, 2.0, 2.5, 2)];
  b.kind = "spar"; b.distance(pole[0], pole[1], 5e6); b.distance(pole[1], pole[2], 5e6); b.counts.spar += 2; b.kind = "attach";
  b.rope([pole[2], mast.parts[5], winch(0.1, 0.1)], EA_POLYESTER, 0.0);
  b.rope([pole[2], b.pin(2.5, 0, 0.3), winch(0.1, -0.1)], EA_POLYESTER, 0.0);
  b.rope([pole[2], b.pin(-2.0, 1.2, 0.5), winch(-1.0, 1.1)], EA_POLYESTER, 0.3);
  b.rope([pole[2], b.pin(-2.0, -1.2, 0.5), winch(-1.0, -1.1)], EA_POLYESTER, 0.3);
  b.rope([main[rows - 1][cols - 1], main[rows - 2][cols - 1], main[rows - 3][cols - 1]], EA_POLYESTER, 0.05);
  for (let i = 0; i < 8; i++) b.rope([mast.parts[1 + (i % 6)], winch(0.5 * (i - 4), 0.6 * (i % 2 ? 1 : -1))], EA_POLYESTER, 0.05);
  return b.build();
}

function buildJoutsen(cols: number, rows: number): World {
  const b = new Builder();
  const masts = [[-20, 0], [-5, 0], [10, 0]];
  const yardsPerMast = [6, 6, 6];
  let sailCount = 0;
  const deckPins: number[] = [];
  for (let i = 0; i < 40; i++) deckPins.push(b.pin(-35 + i * 1.8, (i % 2 ? 6 : -6), 1));
  for (let m = 0; m < 3; m++) {
    const [mx, my] = masts[m];
    const mastPins: number[] = [];
    for (let k = 0; k <= 7; k++) mastPins.push(b.pin(mx, my, 3 + k * 6));
    // topmast sections as Cosserat rods carrying standing rigging
    const top = b.cosserat([mx, my, 33], [0, 0, 1], 12, 4, 40, MAST_EA, 4 * MAST_EI, 4 * MAST_GJ, true);
    for (let s = 0; s < 10; s++) {
      const dp = deckPins[(m * 10 + s) % deckPins.length];
      const a = top.parts[1 + (s % 4)];
      const dx = b.px[dp] - b.px[a], dy = b.py[dp] - b.py[a], dz = b.pz[dp] - b.pz[a];
      const L = Math.sqrt(dx * dx + dy * dy + dz * dz);
      b.rope([a, dp], EA_WIRE, -L * 8000 / EA_WIRE); b.counts.standing++;
    }
    for (let y = 0; y < yardsPerMast[m]; y++) {
      const z = 6 + y * 5.5;
      const yardL = 22 - y * 2.2;
      const yard = b.cosserat([mx, my - yardL / 2, z], [0, 1, 0], yardL, 10, 15, MAST_EA / 2, MAST_EI, MAST_GJ, false);
      const mid = yard.parts[5];
      const mp = mastPins[Math.min(7, Math.round((z - 3) / 6))];
      b.kind = "spar"; b.distance(mid, mp, 1e7); b.distance(yard.parts[4], mp, 1e7); b.distance(yard.parts[6], mp, 1e7); b.counts.spar += 3; b.kind = "attach";
      const upper = mastPins[Math.min(7, Math.round((z - 3) / 6) + 1)];
      b.rope([yard.parts[0], upper, mastPins[0]], EA_WIRE, 0.0);
      b.rope([yard.parts[10], upper, mastPins[0]], EA_WIRE, 0.0);
      b.rope([yard.parts[0], deckPins[(y * 3 + m * 7) % deckPins.length], deckPins[(y * 3 + m * 7 + 1) % deckPins.length]], EA_POLYESTER, 0.1);
      b.rope([yard.parts[10], deckPins[(y * 3 + m * 7 + 2) % deckPins.length], deckPins[(y * 3 + m * 7 + 3) % deckPins.length]], EA_POLYESTER, 0.1);
      b.rope([mid, upper, mastPins[1]], EA_DYNEEMA, 0.0);
      // square sail hanging from the yard
      const chord = yardL * 0.95, height = 5.0;
      const sail = b.sail([mx + 0.3, my - chord / 2, z - height], [0, 1, 0], [0, 0, 1], chord, height, cols, rows, DACRON, 0.06);
      sailCount++;
      for (let c = 0; c < cols; c++) {
        const yi = Math.round((c / (cols - 1)) * 10);
        b.distance(sail[rows - 1][c], yard.parts[yi], 2e5); b.counts.attach++;
      }
      // sheets to the yard below or the deck, clewlines and buntlines
      const lowerYardPin = y === 0 ? deckPins[(m * 5 + y) % deckPins.length] : mastPins[Math.max(0, Math.round((z - 3) / 6) - 1)];
      b.rope([sail[0][0], lowerYardPin, deckPins[(m * 4 + y * 2) % deckPins.length]], EA_POLYESTER, 0.05);
      b.rope([sail[0][cols - 1], lowerYardPin, deckPins[(m * 4 + y * 2 + 1) % deckPins.length]], EA_POLYESTER, 0.05);
      b.rope([sail[0][0], yard.parts[2], mp, deckPins[(m + y) % deckPins.length]], EA_POLYESTER, 0.8);
      b.rope([sail[0][cols - 1], yard.parts[8], mp, deckPins[(m + y + 5) % deckPins.length]], EA_POLYESTER, 0.8);
      b.rope([sail[0][Math.floor(cols / 2)], yard.parts[5], mp, deckPins[(m + y + 9) % deckPins.length]], EA_POLYESTER, 0.8);
    }
  }
  // staysails and jibs between masts: 12 triangular-ish cloths on stays
  for (let s = 0; s < 12; s++) {
    const x0 = -28 + s * 4.5;
    const stayTop = b.pin(x0 + 6, 0, 30), stayFoot = b.pin(x0, 0, 3);
    const sail = b.sail([x0 + 0.2, 0, 3.5], [1, 0, 0], [0.22, 0, 0.975], 6, 18, cols, rows, DACRON, 0.08);
    sailCount++;
    for (let r = 0; r < rows; r++) { b.distance(sail[r][0], stayTop, 2e5); b.distance(sail[r][0], stayFoot, 2e5); b.counts.attach += 2; }
    b.rope([sail[rows - 1][0], stayTop, deckPins[s % deckPins.length]], EA_DYNEEMA, 0.0);
    b.rope([sail[0][cols - 1], deckPins[(s + 7) % deckPins.length], deckPins[(s + 8) % deckPins.length]], EA_POLYESTER, 0.05);
    b.rope([sail[0][cols - 1], deckPins[(s + 17) % deckPins.length], deckPins[(s + 18) % deckPins.length]], EA_POLYESTER, 0.6);
  }
  // remaining standing rigging to reach a few hundred constraints total
  const w = b.build();
  w.counts.cloth += 0;
  (w as unknown as { sailCount: number }).sailCount = sailCount;
  return w;
}

// ---------------------------------------------------------------- timing

function hr(): number { return Number(process.hrtime.bigint()) / 1e6; }

function timeTicks(w: World, nsub: number, ticks: number): { median: number; p95: number; max: number; nan: boolean; vmax: number } {
  w.windX = -3; w.windY = -7; w.windZ = 0;
  for (let i = 0; i < 60; i++) w.tick(nsub);
  const t = new Float64Array(ticks);
  for (let i = 0; i < ticks; i++) {
    const a = hr();
    w.tick(nsub);
    t[i] = hr() - a;
  }
  t.sort();
  return { median: t[ticks >> 1], p95: t[Math.floor(ticks * 0.95)], max: t[ticks - 1], nan: w.hasNaN(), vmax: w.maxSpeed() };
}

function fmt(x: number, d = 3): string { return x.toFixed(d).padStart(8); }

function costSection(): void {
  console.log("\n== Cost per 60 Hz tick (ms), one Gauss-Seidel sweep per substep, wind 7.6 m/s on all sails ==");
  const configs: { name: string; make: () => World }[] = [
    { name: "H-boat 6x6", make: () => buildHboat(6, 6) },
    { name: "H-boat 8x12", make: () => buildHboat(8, 12) },
    { name: "Joutsen 6x6", make: () => buildJoutsen(6, 6) },
    { name: "Joutsen 8x12", make: () => buildJoutsen(8, 12) },
  ];
  for (const cfg of configs) {
    const probe = cfg.make();
    const c = probe.counts;
    console.log(`\n${cfg.name}: particles ${probe.n}, quats ${probe.nq}, triangles ${probe.tA.length}`);
    console.log(`  distance constraints ${probe.dA.length} (cloth ${c.cloth}, attach ${c.attach}, standing ${c.standing}, rigid spar ${c.spar}), ropes ${c.ropes}, cosserat segments ${c.cosserat}, bend-twist ${probe.btA.length}`);
    console.log("  substeps   rate   median     p95     max   vmax(m/s) NaN");
    for (const nsub of [1, 2, 4, 8, 16, 32, 64]) {
      const w = cfg.make();
      const r = timeTicks(w, nsub, 600);
      console.log(`  ${String(nsub).padStart(8)} ${String(nsub * 60).padStart(6)} ${fmt(r.median)} ${fmt(r.p95)} ${fmt(r.max)} ${fmt(r.vmax, 2)}   ${r.nan ? "YES" : "no"}`);
    }
  }
}

// ---------------------------------------------------------------- statics

function settle(w: World, nsub: number, iters: number, seconds: number): void {
  for (let i = 0; i < seconds * TICK_HZ; i++) w.tick(nsub, iters);
}

function sheetStretch(w: World, grid: number[][]): number {
  const rows = grid.length, cols = grid[0].length;
  let s = 0;
  for (let c = 0; c < cols; c++) s += w.pz[grid[0][c]] - w.pz[grid[rows - 1][c]];
  return s / cols;
}

function clothStatics(): void {
  console.log("\n== Cloth statics: sheet hung from its top row, 1 kN on the bottom row, gravity off, 6 s settle ==");
  console.log("   stretch of the sheet height in mm; 'ref' is 200 iterations per substep at 32 substeps (converged XPBD)");
  const cases: { name: string; cols: number; rows: number; mat: Material; shear: boolean }[] = [
    { name: "6x6 Dacron structural only", cols: 6, rows: 6, mat: DACRON, shear: false },
    { name: "6x6 Dacron full (shear+bend)", cols: 6, rows: 6, mat: DACRON, shear: true },
    { name: "8x12 Dacron full", cols: 8, rows: 12, mat: DACRON, shear: true },
    { name: "6x6 Nylon full (soft)", cols: 6, rows: 6, mat: NYLON, shear: true },
  ];
  const W = 3, H = 8, F = 1000;
  for (const cs of cases) {
    const make = () => {
      const b = new Builder();
      const grid = b.sail([0, 0, 0], [1, 0, 0], [0, 0, -1], W, H, cs.cols, cs.rows, cs.mat, 0);
      if (!cs.shear) {
        // drop shear and bend constraints: keep only the first rows*(cols-1)+(rows-1)*cols
        const keep = cs.rows * (cs.cols - 1) + (cs.rows - 1) * cs.cols;
        b.dA.length = keep; b.dB.length = keep; b.dRest.length = keep; b.dAlpha.length = keep;
      }
      b.tA.length = 0; b.tB.length = 0; b.tC.length = 0;
      for (let c = 0; c < cs.cols; c++) b.w[grid[0][c]] = 0;
      const w = b.build();
      w.gravity = 0; w.damping = 6;
      for (let c = 0; c < cs.cols; c++) w.extraFz[grid[cs.rows - 1][c]] = -F / cs.cols;
      return { w, grid };
    };
    const ref = make();
    settle(ref.w, 32, 200, 6);
    const refS = (sheetStretch(ref.w, ref.grid) - H) * 1000;
    const analytic = (F / (W * cs.mat.Et)) * H * 1000;
    let line = `  ${cs.name.padEnd(52)} ref ${refS.toFixed(2)} mm (analytic structural ${analytic.toFixed(2)})\n    substeps:`;
    for (const nsub of [1, 2, 4, 8, 16, 32, 64]) {
      const t = make();
      settle(t.w, nsub, 1, 6);
      const s = (sheetStretch(t.w, t.grid) - H) * 1000;
      line += ` ${nsub}:${s.toFixed(2)}mm(${(100 * s / refS).toFixed(0)}%)`;
    }
    console.log(line);
  }
}

function ropeStatics(): void {
  console.log("\n== Rope statics: 10 m line through two blocks, 100 kg hung on the end, 6 s settle ==");
  const cases = [
    { name: "Polyester EA 300 kN (analytic 32.7 mm)", EA: EA_POLYESTER },
    { name: "Dyneema EA 3 MN (analytic 3.27 mm)", EA: EA_DYNEEMA },
  ];
  for (const cs of cases) {
    let line = `  ${cs.name.padEnd(40)}`;
    for (const nsub of [1, 2, 4, 8, 16, 32, 64]) {
      const b = new Builder();
      const winch = b.pin(0, 0, 10);
      const bl1 = b.pin(3, 0, 10), bl2 = b.pin(3, 0, 6);
      const m = b.particle(3, 0, 3, 100);
      b.rope([winch, bl1, bl2, m], cs.EA, 0);
      const w = b.build();
      w.damping = 4;
      settle(w, nsub, 1, 6);
      const stretch = (3 - w.pz[m]) * 1000;
      const analytic = (100 * G * 10) / cs.EA * 1000;
      line += ` ${nsub}:${stretch.toFixed(2)}mm(${(100 * stretch / analytic).toFixed(0)}%)`;
    }
    console.log(line);
  }
}

function mastStatics(): void {
  console.log("\n== Cosserat mast: 11 m cantilever, EI 1.4e5, 200 N tip load, analytic tip deflection 0.634 m ==");
  let line = "  8 segments ";
  for (const nsub of [1, 2, 4, 8, 16, 32, 64]) {
    const b = new Builder();
    const mast = b.cosserat([0, 0, 0], [0, 0, 1], 11, 8, 6, MAST_EA, MAST_EI, MAST_GJ, true);
    const w = b.build();
    w.gravity = 0; w.damping = 3;
    w.extraFx[mast.parts[8]] = 200;
    settle(w, nsub, 1, 8);
    const analytic = (200 * 11 ** 3) / (3 * MAST_EI);
    line += ` ${nsub}:${w.px[mast.parts[8]].toFixed(3)}m(${(100 * w.px[mast.parts[8]] / analytic).toFixed(0)}%)${w.hasNaN() ? "NaN" : ""}`;
  }
  console.log(line);
}

// windward cap shroud is rope 2 (masthead to the windward chainplate)
function forestay(w: World, r = 2): number {
  const a = w.ropeNodes[w.ropeStart[2 * r]], c = w.ropeNodes[w.ropeStart[2 * r + 1] - 1];
  const dx = w.px[c] - w.px[a], dy = w.py[c] - w.py[a], dz = w.pz[c] - w.pz[a];
  const stretch = Math.sqrt(dx * dx + dy * dy + dz * dz) - w.ropeLen[r];
  return stretch > 0 ? stretch / w.ropeAlpha[r] : 0;
}

function billowStability(): void {
  console.log("\n== Billow and tension jitter: H-boat 6x6 in 7.6 m/s wind, 20 s, then a 15 m/s gust for 5 s ==");
  console.log("   reports peak particle speed and the std of forestay tension over the last 2 s (N); a static rig should be quiet");
  for (const nsub of [2, 4, 8, 16, 32]) {
    const w = buildHboat(6, 6);
    w.windX = -3; w.windY = -7; w.windZ = 0;
    let peak = 0;
    for (let i = 0; i < 20 * TICK_HZ; i++) { w.tick(nsub); peak = Math.max(peak, w.maxSpeed()); }
    w.windX = -6; w.windY = -14;
    let gustPeak = 0;
    const tens: number[] = [];
    for (let i = 0; i < 5 * TICK_HZ; i++) {
      w.tick(nsub); gustPeak = Math.max(gustPeak, w.maxSpeed());
      if (i >= 3 * TICK_HZ) {
        tens.push(forestay(w));
      }
    }
    const mean = tens.reduce((s, x) => s + x, 0) / tens.length;
    const sd = Math.sqrt(tens.reduce((s, x) => s + (x - mean) ** 2, 0) / tens.length);
    console.log(`  substeps ${String(nsub).padStart(2)}: peak speed ${peak.toFixed(2)} m/s, gust peak ${gustPeak.toFixed(2)} m/s, windward cap shroud ${mean.toFixed(0)} N sd ${sd.toFixed(1)} N ${w.hasNaN() ? "NaN!" : ""}`);
  }
}

function mastDiscretisation(): void {
  console.log("\n== Cosserat mast discretisation: converged (32 substeps x 200 iterations) and 64-substep one-sweep tip deflection vs segments ==");
  for (const segs of [4, 8, 16, 32]) {
    const run = (nsub: number, iters: number) => {
      const b = new Builder();
      const mast = b.cosserat([0, 0, 0], [0, 0, 1], 11, segs, 6, MAST_EA, MAST_EI, MAST_GJ, true);
      const w = b.build();
      w.gravity = 0; w.damping = 3;
      w.extraFx[mast.parts[segs]] = 200;
      settle(w, nsub, iters, 8);
      return w.px[mast.parts[segs]];
    };
    const analytic = (200 * 11 ** 3) / (3 * MAST_EI);
    const ref = run(32, 200), one = run(64, 1);
    console.log(`  ${String(segs).padStart(2)} segments: converged ${ref.toFixed(3)} m (${(100 * ref / analytic).toFixed(0)}%), one sweep at 64 substeps ${one.toFixed(3)} m (${(100 * one / analytic).toFixed(0)}%)`);
  }
}

function mastHinges(): void {
  const segs = 8;
  const b = new Builder();
  const mast = b.cosserat([0, 0, 0], [0, 0, 1], 11, segs, 6, MAST_EA, MAST_EI, MAST_GJ, true);
  const w = b.build();
  w.gravity = 0; w.damping = 3;
  w.extraFx[mast.parts[segs]] = 200;
  settle(w, 32, 200, 8);
  const l = 11 / segs;
  console.log("hinge  x      theta(rad)   expected M l/EI   ratio   shear(C lateral)");
  for (let i = 0; i + 1 < segs; i++) {
    const a = mast.quats[i], c = mast.quats[i + 1];
    const ax = -w.qx[a], ay = -w.qy[a], az = -w.qz[a], aw = w.qw[a];
    const bx = w.qx[c], by = w.qy[c], bz = w.qz[c], bw = w.qw[c];
    const ox = aw * bx + ax * bw + ay * bz - az * by;
    const oy = aw * by - ax * bz + ay * bw + az * bx;
    const oz = aw * bz + ax * by - ay * bx + az * bw;
    const th = 2 * Math.sqrt(ox * ox + oy * oy + oz * oz);
    const x = (i + 1) * l;
    const exp = (200 * (11 - x) * l) / MAST_EI;
    console.log(`${String(i + 1).padStart(3)}  ${x.toFixed(3)}  ${th.toExponential(3)}  ${exp.toExponential(3)}  ${(th / exp).toFixed(3)}`);
  }
  for (let i = 0; i < segs; i++) {
    const q = mast.quats[i];
    const x = w.qx[q], y = w.qy[q], z = w.qz[q], ww = w.qw[q];
    const d3x = 2 * (x * z + ww * y), d3y = 2 * (y * z - ww * x), d3z = 1 - 2 * (x * x + y * y);
    const a = mast.parts[i], c = mast.parts[i + 1];
    const Cx = (w.px[c] - w.px[a]) / l - d3x, Cy = (w.py[c] - w.py[a]) / l - d3y, Cz = (w.pz[c] - w.pz[a]) / l - d3z;
    console.log(`seg ${i} C = ${Cx.toExponential(2)} ${Cy.toExponential(2)} ${Cz.toExponential(2)}  d3=(${d3x.toFixed(4)},${d3y.toFixed(4)},${d3z.toFixed(4)})`);
  }
  console.log("tip x", w.px[mast.parts[segs]].toFixed(4));
}

function snapshot(w: World): { x: number[]; y: number[]; z: number[] } {
  return { x: Array.from(w.px), y: Array.from(w.py), z: Array.from(w.pz) };
}
function geometry(make: () => World): unknown {
  const w = make();
  const t0 = snapshot(w);
  w.windX = -3; w.windY = -7;
  for (let i = 0; i < 20 * TICK_HZ; i++) w.tick(16);
  const edges: [number, number, string][] = [];
  for (let c = 0; c < w.dA.length; c++) edges.push([w.dA[c], w.dB[c], w.dKind[c]]);
  const ropes: number[][] = [];
  for (let r = 0; r < w.ropeLen.length; r++) ropes.push(Array.from(w.ropeNodes.subarray(w.ropeStart[2 * r], w.ropeStart[2 * r + 1])));
  const cosserat: [number, number][] = [];
  for (let c = 0; c < w.ssA.length; c++) cosserat.push([w.ssA[c], w.ssB[c]]);
  const tris: [number, number, number][] = [];
  for (let t = 0; t < w.tA.length; t++) tris.push([w.tA[t], w.tB[t], w.tC[t]]);
  return { t0, settled: snapshot(w), pinned: Array.from(w.w).map((v) => v === 0), edges, ropes, cosserat, tris };
}

function dump(): void {
  const out: Record<string, unknown> = {};
  out.geometry = { hboat: geometry(() => buildHboat(6, 6)), joutsen: geometry(() => buildJoutsen(6, 6)) };
  // cloth statics series
  const W = 3, H = 8, F = 1000;
  const cloth: unknown[] = [];
  for (const cs of [
    { name: "6x6 Dacron, structural only", cols: 6, rows: 6, mat: DACRON, shear: false },
    { name: "6x6 Dacron", cols: 6, rows: 6, mat: DACRON, shear: true },
    { name: "8x12 Dacron", cols: 8, rows: 12, mat: DACRON, shear: true },
    { name: "6x6 Nylon", cols: 6, rows: 6, mat: NYLON, shear: true },
  ]) {
    const make = () => {
      const b = new Builder();
      const grid = b.sail([0, 0, 0], [1, 0, 0], [0, 0, -1], W, H, cs.cols, cs.rows, cs.mat, 0);
      if (!cs.shear) { const keep = cs.rows * (cs.cols - 1) + (cs.rows - 1) * cs.cols; b.dA.length = keep; b.dB.length = keep; b.dRest.length = keep; b.dAlpha.length = keep; b.dKind.length = keep; }
      b.tA.length = 0; b.tB.length = 0; b.tC.length = 0;
      for (let c = 0; c < cs.cols; c++) b.w[grid[0][c]] = 0;
      const w = b.build(); w.gravity = 0; w.damping = 6;
      for (let c = 0; c < cs.cols; c++) w.extraFz[grid[cs.rows - 1][c]] = -F / cs.cols;
      return { w, grid };
    };
    const ref = make(); settle(ref.w, 32, 200, 6);
    const series: unknown[] = [];
    let shape: unknown = null;
    for (const nsub of [1, 2, 4, 8, 16, 32, 64]) {
      const t = make(); settle(t.w, nsub, 1, 6);
      series.push({ nsub, mm: (sheetStretch(t.w, t.grid) - H) * 1000 });
      if (nsub === 8 && cs.name === "6x6 Dacron") shape = { ...snapshot(t.w), grid: t.grid, ref: snapshot(ref.w) };
    }
    cloth.push({ name: cs.name, ref: (sheetStretch(ref.w, ref.grid) - H) * 1000, analytic: (F / (W * cs.mat.Et)) * H * 1000, series, shape });
  }
  out.cloth = cloth;
  const rope: unknown[] = [];
  for (const cs of [{ name: "Polyester, EA 300 kN", EA: EA_POLYESTER }, { name: "Dyneema, EA 3 MN", EA: EA_DYNEEMA }]) {
    const series: unknown[] = [];
    for (const nsub of [1, 2, 4, 8, 16, 32, 64]) {
      const b = new Builder();
      const winch = b.pin(0, 0, 10), bl1 = b.pin(3, 0, 10), bl2 = b.pin(3, 0, 6), m = b.particle(3, 0, 3, 100);
      b.rope([winch, bl1, bl2, m], cs.EA, 0);
      const w = b.build(); w.damping = 4; settle(w, nsub, 1, 6);
      series.push({ nsub, mm: (3 - w.pz[m]) * 1000 });
    }
    rope.push({ name: cs.name, analytic: (100 * G * 10) / cs.EA * 1000, series });
  }
  out.rope = rope;
  const mast: unknown[] = [];
  for (const segs of [4, 8, 16]) {
    const run = (nsub: number, iters: number) => {
      const b = new Builder();
      const m = b.cosserat([0, 0, 0], [0, 0, 1], 11, segs, 6, MAST_EA, MAST_EI, MAST_GJ, true);
      const w = b.build(); w.gravity = 0; w.damping = 3; w.extraFx[m.parts[segs]] = 200;
      settle(w, nsub, iters, 8);
      return { tip: w.px[m.parts[segs]], shape: m.parts.map((p) => [w.px[p], w.pz[p]]) };
    };
    const series: unknown[] = [];
    for (const nsub of [1, 2, 4, 8, 16, 32, 64]) series.push({ nsub, m: run(nsub, 1).tip });
    const ref = run(32, 200);
    mast.push({ segs, converged: ref.tip, shape: ref.shape, series });
  }
  out.mast = { analytic: (200 * 11 ** 3) / (3 * MAST_EI), cases: mast };
  const cost: unknown[] = [];
  for (const cfg of [
    { name: "H-boat 6x6", make: () => buildHboat(6, 6) },
    { name: "H-boat 8x12", make: () => buildHboat(8, 12) },
    { name: "Joutsen 6x6", make: () => buildJoutsen(6, 6) },
    { name: "Joutsen 8x12", make: () => buildJoutsen(8, 12) },
  ]) {
    const probe = cfg.make();
    const series: unknown[] = [];
    for (const nsub of [1, 2, 4, 8, 16, 32, 64]) { const r = timeTicks(cfg.make(), nsub, 300); series.push({ nsub, ...r }); }
    cost.push({ name: cfg.name, particles: probe.n, distance: probe.dA.length, ropes: probe.ropeLen.length, cosserat: probe.ssA.length, triangles: probe.tA.length, counts: probe.counts, series });
  }
  out.cost = cost;
  const billow: unknown[] = [];
  for (const nsub of [2, 4, 8, 16, 32]) {
    const w = buildHboat(6, 6); w.windX = -3; w.windY = -7;
    const trace: number[] = [];
    let peak = 0;
    for (let i = 0; i < 25 * TICK_HZ; i++) {
      if (i === 20 * TICK_HZ) { w.windX = -6; w.windY = -14; }
      w.tick(nsub); peak = Math.max(peak, w.maxSpeed());
      trace.push(forestay(w));
    }
    billow.push({ nsub, peak, forestay: trace });
  }
  out.billow = billow;
  require("node:fs").writeFileSync("dump.json", JSON.stringify(out));
  console.log("wrote dump.json");
}

const only = process.argv[2];
if (only === "rigstatics") {
  console.log("H-boat rig statics, no wind, 20 s settle: masthead position and standing rigging tensions vs substeps; ref = 32 substeps x 100 iterations");
  const run = (nsub: number, iters: number) => {
    const w = buildHboat(6, 6);
    w.damping = 2;
    for (let i = 0; i < 20 * TICK_HZ; i++) w.tick(nsub, iters);
    const head = w.ssB[7];
    const t = [0, 1, 2, 3].map((r) => forestay(w, r).toFixed(0)).join(" / ");
    return `masthead (${w.px[head].toFixed(3)}, ${w.py[head].toFixed(3)}, ${w.pz[head].toFixed(3)}) forestay/backstay/capP/capS N ${t}`;
  };
  console.log("  ref  " + run(32, 100));
  for (const nsub of [4, 8, 16, 32, 64, 128]) console.log(`  ${String(nsub).padStart(3)}  ` + run(nsub, 1));
}
if (only === "mastvariants") {
  // Isolate the slow standing-rigging convergence: Cosserat chain stiffness vs masthead coupling.
  const variant = (name: string, mastEA: number, rigid: boolean) => {
    const run = (nsub: number, iters: number) => {
      const b = new Builder();
      let head: number;
      if (rigid) {
        const foot = b.pin(0, 0, 0.5);
        head = b.particle(0, 0, 11.5, 50);
        b.kind = "spar"; b.distance(foot, head, 7e7 / 11); b.kind = "attach";
      } else {
        head = b.cosserat([0, 0, 0.5], [0, 0, 1], 11, 8, 6, mastEA, MAST_EI, MAST_GJ, true).parts[8];
      }
      const pins = [b.pin(3.6, 0, 0.3), b.pin(-3.2, 0, 0.3), b.pin(0, 1.1, 0.2), b.pin(0, -1.1, 0.2)];
      for (const [i, c] of pins.entries()) {
        const dx = b.px[c] - b.px[head], dy = b.py[c] - b.py[head], dz = b.pz[c] - b.pz[head];
        const L = Math.sqrt(dx * dx + dy * dy + dz * dz);
        b.rope([head, c], EA_WIRE, -L * [3000, 2500, 3000, 3000][i] / EA_WIRE);
      }
      const w = b.build(); w.damping = 2;
      for (let i = 0; i < 20 * TICK_HZ; i++) w.tick(nsub, iters);
      return [0, 1, 2, 3].map((r) => forestay(w, r));
    };
    const ref = run(32, 100);
    let line = `  ${name.padEnd(44)} ref ${ref.map((t) => t.toFixed(0)).join("/")} N;`;
    for (const nsub of [8, 16, 32, 64, 128, 256]) {
      const t = run(nsub, 1);
      line += ` ${nsub}:${(100 * t[0] / ref[0]).toFixed(0)}%`;
    }
    console.log(line);
  };
  console.log("Masthead with four pretensioned wires, no wind, forestay tension as % of converged, per substep count");
  variant("8-seg Cosserat, mast EA 7e7 (aluminium)", 7e7, false);
  variant("8-seg Cosserat, mast EA 7e6", 7e6, false);
  variant("8-seg Cosserat, mast EA 7e5", 7e5, false);
  variant("rigid mast: one distance constraint, 50 kg head", 0, true);
}
if (only === "joutsen") {
  for (const nsub of [8, 16]) {
    const w = buildJoutsen(6, 6);
    const r = timeTicks(w, nsub, 600);
    console.log(`Joutsen 6x6 ${process.env.NO_BEND ? "without" : "with"} bend constraints (${w.dA.length} distance), ${nsub} substeps: median ${r.median.toFixed(3)} p95 ${r.p95.toFixed(3)} ms`);
  }
}
if (only === "dump") dump();
if (only === "probe") {
  for (const nsub of [8, 16, 32, 64]) {
    const w = buildJoutsen(6, 6); w.windX = -3; w.windY = -7;
    let firstNaN = -1, peak = 0;
    for (let i = 0; i < 1500; i++) { w.tick(nsub); peak = Math.max(peak, w.maxSpeed()); if (w.hasNaN()) { firstNaN = i; break; } }
    console.log(`Joutsen 6x6 nsub ${nsub}: first NaN tick ${firstNaN}, peak speed ${peak.toFixed(1)} m/s`);
  }
  for (const nsub of [8, 16, 32]) {
    const w = buildHboat(6, 6); w.windX = -3; w.windY = -7;
    let peak = 0;
    for (let i = 0; i < 1500; i++) { w.tick(nsub); peak = Math.max(peak, w.maxSpeed()); }
    console.log(`H-boat 6x6 nsub ${nsub}: NaN ${w.hasNaN()}, peak speed ${peak.toFixed(1)} m/s, forestay ${forestay(w).toFixed(0)} N`);
  }
}
if (only === "hinges") mastHinges();
if (only === "mast") mastDiscretisation();
if (!only || only === "statics") { clothStatics(); ropeStatics(); mastStatics(); }
if (!only || only === "billow") billowStability();
if (!only || only === "cost") costSection();
