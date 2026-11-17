// section.mjs
// One transverse hull section: its immersed outline, its sideways (sway) added mass under a
// rigid-lid free surface, and its sharpness number.
//
// Frame: y to port, z up, waterline at z = 0. A section is described by a small spec object:
//   { kind: 'ellipse' | 'box', b: half breadth at the waterline, Tc: canoe-body draft,
//     rb: bilge radius (box only),
//     blade: null | { Tk: depth of the blade's lower edge below the waterline,
//                     hk: half thickness, rk: radius of the lower edge } }
// A blade is anything thin on the centreline below the canoe body: fin keel, long keel,
// skeg, rudder. The spec is what a later bake would replace by a clipped section polygon.
//
// Everything here is per unit water density (multiply added mass by rho).

/** Immersed outline from (-b, 0) round the bottom to (+b, 0), as [y, z] points. */
export function outline(spec) {
  const { kind, b, Tc } = spec;
  const pts = [];
  const hasCanoe = b > 1e-9 && Tc > 1e-9;
  if (hasCanoe && kind === 'box') {
    const r = Math.max(1e-6, Math.min(spec.rb ?? 0, b, Tc));
    pts.push([-b, 0]);
    const n = 10;
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * (Math.PI / 2);
      pts.push([-(b - r) - r * Math.cos(a), -(Tc - r) - r * Math.sin(a)]);
    }
    for (let i = n; i >= 0; i--) {
      const a = (i / n) * (Math.PI / 2);
      pts.push([(b - r) + r * Math.cos(a), -(Tc - r) - r * Math.sin(a)]);
    }
    pts.push([b, 0]);
  } else if (hasCanoe) {
    const n = 48;
    for (let i = 0; i <= n; i++) {
      const t = (i / n) * Math.PI;
      pts.push([-b * Math.cos(t), -Tc * Math.sin(t)]);
    }
  }
  const bl = spec.blade;
  if (!bl || bl.Tk <= (hasCanoe ? canoeDepthAt(pts, 0) : 0) + 1e-9) return pts;
  const hk = bl.hk;
  if (!hasCanoe || hk >= b) {
    return [[-hk, 0], [-hk, -bl.Tk], [hk, -bl.Tk], [hk, 0]];
  }
  const zc = -canoeDepthAt(pts, hk);
  const left = pts.filter((p) => p[0] < -hk);
  const right = pts.filter((p) => p[0] > hk);
  return [...left, [-hk, zc], [-hk, -bl.Tk], [hk, -bl.Tk], [hk, zc], ...right];
}

/** Depth of a canoe outline (positive down) at lateral position |y|. */
function canoeDepthAt(pts, y) {
  for (let i = 1; i < pts.length; i++) {
    const [y0, z0] = pts[i - 1];
    const [y1, z1] = pts[i];
    if (y0 <= y && y <= y1 && y1 > y0) return -(z0 + ((z1 - z0) * (y - y0)) / (y1 - y0));
  }
  return 0;
}

/** Deepest point of the section below the waterline. */
export function draft(spec) {
  const canoe = spec.b > 1e-9 ? spec.Tc : 0;
  return Math.max(canoe, spec.blade ? spec.blade.Tk : 0);
}

/**
 * Edge radius over local draft: the geometric input of THE ONE SHARPNESS RULE of the
 * experiment. r is the smallest convex radius the cross-flow has to turn round (blade lower
 * edge, bilge radius, keel line or turn of the bilge of an elliptical section; the waterline
 * ends do not count, no water goes round them) and T the local draft. The slice law turns it
 * into a sharpness number exp(-(r/T)/K_SHARP): 1 for a knife edge, 0 for a round bilge.
 */
export function edgeRadiusOverDraft(spec) {
  const T = draft(spec);
  if (T <= 0) return Infinity;
  let r = Infinity;
  if (spec.b > 1e-9 && spec.Tc > 1e-9) {
    r = spec.kind === 'box'
      ? Math.min(spec.rb ?? 0, spec.b, spec.Tc)
      : Math.min((spec.b * spec.b) / spec.Tc, // at the keel line
          Math.pow((spec.b * spec.b + spec.Tc * spec.Tc) / 2, 1.5) / (spec.b * spec.Tc)); // turn of the bilge
  }
  if (spec.blade && spec.blade.Tk > (spec.b > 1e-9 ? spec.Tc : 0)) r = Math.min(r, spec.blade.rk);
  return r / T;
}

/**
 * Sway added mass of the immersed section under a rigid lid, per unit density [m^2].
 * Method: the outline is mirrored in the waterline to a closed double body; a constant-panel
 * boundary-element solve of the exterior Neumann problem (unit sideways velocity) gives the
 * potential on the surface; the immersed half owns half of the double body's added mass.
 * Check: a plate of depth T gives (pi/2) T^2, a half circle gives (pi/2) R^2.
 */
export function swayAddedMass(spec) {
  const T = draft(spec);
  if (T <= 1e-9) return 0;
  const lower = outline(spec);
  // Thin blades are thickened to 0.5% of draft for conditioning; added mass is insensitive to it.
  const minHalf = 0.005 * T;
  const work = spec.blade && spec.blade.hk < minHalf
    ? outline({ ...spec, blade: { ...spec.blade, hk: minHalf } })
    : lower;
  const h = T / 40;
  const half = subdivide(work, h);
  const upper = half.slice(1, -1).reverse().map(([y, z]) => [y, -z]);
  const nodes = [...half, ...upper];
  return 0.5 * doubleBodyAddedMass(nodes);
}

function subdivide(pts, h) {
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const [y0, z0] = pts[i];
    const [y1, z1] = pts[i + 1];
    const n = Math.max(1, Math.ceil(Math.hypot(y1 - y0, z1 - z0) / h));
    for (let k = 0; k < n; k++) out.push([y0 + ((y1 - y0) * k) / n, z0 + ((z1 - z0) * k) / n]);
  }
  out.push(pts[pts.length - 1]);
  return out;
}

/** Added mass (per unit density) of a closed polygon moving sideways in unbounded fluid. */
export function doubleBodyAddedMass(nodes) {
  const n = nodes.length;
  let area2 = 0;
  for (let i = 0; i < n; i++) {
    const [y0, z0] = nodes[i];
    const [y1, z1] = nodes[(i + 1) % n];
    area2 += y0 * z1 - y1 * z0;
  }
  const orient = area2 > 0 ? 1 : -1; // counter-clockwise: outward normal is (tz, -ty)
  const mid = [], tan = [], nor = [], len = [];
  for (let i = 0; i < n; i++) {
    const [y0, z0] = nodes[i];
    const [y1, z1] = nodes[(i + 1) % n];
    const l = Math.hypot(y1 - y0, z1 - z0);
    const ty = (y1 - y0) / l, tz = (z1 - z0) / l;
    mid.push([(y0 + y1) / 2, (z0 + z1) / 2]);
    tan.push([ty, tz]);
    nor.push([orient * tz, -orient * ty]);
    len.push(l);
  }
  // 0.5 phi_i + (1/2pi) sum_j phi_j H_ij = (1/2pi) sum_j q_j G_ij, q = dphi/dn = n_y
  const M = new Float64Array(n * n);
  const rhs = new Float64Array(n);
  const inv2pi = 1 / (2 * Math.PI);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const dy = mid[i][0] - nodes[j][0], dz = mid[i][1] - nodes[j][1];
      const xi = dy * tan[j][0] + dz * tan[j][1];
      const eta = dy * nor[j][0] + dz * nor[j][1];
      const u1 = -xi, u2 = len[j] - xi;
      let G, H;
      if (i === j) {
        G = u2 * Math.log(Math.abs(u2)) - u2 - (u1 * Math.log(Math.abs(u1)) - u1);
        H = 0;
      } else {
        const F = (u) => u * 0.5 * Math.log(u * u + eta * eta) - u + eta * Math.atan(u / eta);
        G = F(u2) - F(u1);
        H = -(Math.atan(u2 / eta) - Math.atan(u1 / eta));
        if (Math.abs(eta) < 1e-12) H = 0;
      }
      M[i * n + j] = inv2pi * H + (i === j ? 0.5 : 0);
      rhs[i] += inv2pi * G * nor[j][0];
    }
  }
  const phi = solve(M, rhs, n);
  let a = 0;
  for (let j = 0; j < n; j++) a -= phi[j] * nor[j][0] * len[j];
  return a;
}

function solve(M, b, n) {
  for (let c = 0; c < n; c++) {
    let p = c, best = Math.abs(M[c * n + c]);
    for (let r = c + 1; r < n; r++) {
      const v = Math.abs(M[r * n + c]);
      if (v > best) { best = v; p = r; }
    }
    if (p !== c) {
      for (let k = c; k < n; k++) { const t = M[c * n + k]; M[c * n + k] = M[p * n + k]; M[p * n + k] = t; }
      const t = b[c]; b[c] = b[p]; b[p] = t;
    }
    const d = M[c * n + c];
    for (let r = c + 1; r < n; r++) {
      const f = M[r * n + c] / d;
      if (f === 0) continue;
      for (let k = c; k < n; k++) M[r * n + k] -= f * M[c * n + k];
      b[r] -= f * b[c];
    }
  }
  const x = new Float64Array(n);
  for (let r = n - 1; r >= 0; r--) {
    let s = b[r];
    for (let k = r + 1; k < n; k++) s -= M[r * n + k] * x[k];
    x[r] = s / M[r * n + r];
  }
  return x;
}
