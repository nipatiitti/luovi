// sim.mjs
// Time-domain sailing model in the horizontal plane with roll: surge, sway, yaw, heel.
// Flat water, rigid lid. The water side is the repaired slice law of experiment H1/H2
// (slicelaw.mjs, shed fraction 1, sharpness sets cross-flow drag only) carried on Lagrangian
// markers: slices of water that stay where they are while the hull slides over them.
//
// Axes: world X east, Y north. Heading psi clockwise from north. Body: u forward, v to
// starboard, r = yaw rate (bow to starboard positive), heel phi and p = roll rate (starboard
// side down positive). Station coordinate x runs from the bow end of the waterline aft.
// Rudder angle delta positive = trailing edge to starboard = bow turns to starboard when
// moving ahead.
//
// What is new against the steady law, and why:
//  1. A change of a section's sideways speed that happens IN TIME (the boat accelerating
//     sideways, in yaw or in roll, or the rudder being moved) is answered at once and
//     reversibly by the water the slice has "filled" (G, the entrained water of that slice).
//     That part sits in the mass matrix: the integrated state is the total momentum
//     (M + entrained water) * velocity, solved every sub-step. A change that the slice meets
//     by TRAVELLING along the hull is handled by the frozen steady rule, unchanged.
//  2. Every law is written in velocity components; nothing divides by speed except one
//     regularised 1/u in the surge bookkeeping (uEps).
import { CONSTANTS } from './slicelaw.mjs';

export const WATER = { rho: 1000, nu: 1.19e-6 };
export const AIR = { rho: 1.225 };
export const G0 = 9.81;

/** Constants of the time-domain layer. One value for every boat. */
export const MODEL = {
  markerSpacing: 0.05,      // [m] water travel between slices
  uEps: 0.05,               // [m/s] regularises 1/u in the surge (suction and wake-energy) terms
  depthFrac: 0.424,         // side force of a slice acts at 4/(3 pi) of local draft (flat plate)
  surgeAddedMassFrac: 0.05, // surge entrained water, slender hull (ellipsoid estimate)
  waveCoef: 0.012,          // wave-resistance stand-in: R = weight * waveCoef * (Fn/waveFnRef)^waveExp,
  waveFnRef: 0.35,          //   drawn by eye through remembered Delft-series residuary values
  waveExp: 6,               //   (0.0015, 0.005, 0.012, 0.027 of weight at Fn 0.25, 0.30, 0.35, 0.40)
  windageCdA: 1.2,          // [m^2] hull, rig and crew drag area, always on
  windageHeight: 1.5,       // [m] above the waterline
};

/** Placeholder rig: one smooth lift and drag curve against angle of attack. */
export const SAIL = {
  CL0: 1.5,        // lift coefficient = CL0 * sin(2 alpha)
  CD0: 0.05,       // drag coefficient = CD0 + CD1 * sin^2(alpha)
  CD1: 1.0,
  sheetDeg: 15,    // boom angle off the centreline, always on the side away from the wind
  switchDeg: 8,    // the boom crosses smoothly: sheet = sheetDeg * tanh(apparent wind angle / switchDeg)
};

const sq = (a) => a * a;
const clamp = (a, lo, hi) => Math.min(hi, Math.max(lo, a));

/** Station table of a precomputed body plus what the time-domain model needs per station. */
export function makeHullTable(body, rudderFraction) {
  const n = body.x.length;
  const girth = body.specs.map((s, i) => {
    const hasCanoe = s.b > 1e-9 && s.Tc > 1e-9;
    let g = 0;
    if (hasCanoe) { const a = s.b, b = s.Tc; g += 0.5 * Math.PI * (3 * (a + b) - Math.sqrt((3 * a + b) * (a + 3 * b))); }
    if (s.blade && s.blade.Tk > (hasCanoe ? s.Tc : 0)) g += 2 * (s.blade.Tk - (hasCanoe ? s.Tc : 0)) + 2 * s.blade.hk;
    return g;
  });
  const dx = body.L / (n - 1);
  let wetted = 0;
  for (let i = 1; i < n; i++) wetted += 0.5 * (girth[i] + girth[i - 1]) * dx;
  return {
    L: body.L, n, dx, x: body.x, A: body.A, T: body.T,
    sharp: body.rOverT.map((q) => Math.exp(-q / CONSTANTS.K_SHARP)),
    rud: body.x.map(rudderFraction), halfBeam: body.specs.map((s) => s.b),
    canoeDraft: body.specs.map((s) => (s.b > 1e-9 ? s.Tc : 0)), wetted,
  };
}

function lookup(tab, x, out) {
  const q = clamp(x / tab.dx, 0, tab.n - 1 - 1e-9);
  const i = Math.floor(q), f = q - i;
  out.A = tab.A[i] + (tab.A[i + 1] - tab.A[i]) * f;
  out.T = tab.T[i] + (tab.T[i + 1] - tab.T[i]) * f;
  out.sharp = tab.sharp[i] + (tab.sharp[i + 1] - tab.sharp[i]) * f;
  out.rud = tab.rud[i] + (tab.rud[i + 1] - tab.rud[i]) * f;
  return out;
}

/** Sail force in body axes from the air's velocity relative to the centre of effort. */
export function sailForce(rig, ax, ay, phi, aback = false) {
  const aye = ay * Math.cos(phi); // only the flow across the heeled mast counts
  const V = Math.hypot(ax, aye);
  if (V < 1e-9) return { fx: 0, fy: 0, fyMast: 0, awa: 0, alpha: 0 };
  const awa = Math.atan2(-aye, -ax); // apparent wind angle, positive from starboard
  const rad = Math.PI / 180;
  const sheet = aback ? Math.PI / 2 : SAIL.sheetDeg * rad * Math.tanh(awa / (SAIL.switchDeg * rad));
  const alpha = clamp(awa - sheet, -Math.PI / 2, Math.PI / 2);
  // aback: only the jib, 40% of the area, is held squared across the boat
  const q = 0.5 * AIR.rho * V * V * rig.area * (aback ? 0.4 : 1);
  const cl = SAIL.CL0 * Math.sin(2 * alpha), cd = SAIL.CD0 + SAIL.CD1 * sq(Math.sin(alpha));
  const fx = q * (cd * ax + cl * -aye) / V;
  const fyMast = q * (cd * aye + cl * ax) / V;
  return { fx, fy: fyMast * Math.cos(phi), fyMast, awa, alpha };
}

export class Boat {
  /**
   * cfg: { name, table, mass, kYaw, kRoll, GM, xcg, rig: { area, ceHeight, ceX }, shedStall }
   * init: { X, Y, psiDeg, u }
   */
  constructor(cfg, init = {}) {
    this.cfg = cfg; this.tab = cfg.table;
    this.K = { ...CONSTANTS, ...(cfg.lawOverride ?? {}) };
    this.X = init.X ?? 0; this.Y = init.Y ?? 0; this.psi = ((init.psiDeg ?? 0) * Math.PI) / 180;
    this.phi = 0; this.u = init.u ?? 0; this.v = 0; this.r = 0; this.p = 0; this.delta = 0; this.t = 0;
    this.markers = []; this.exited = [];
    const d = MODEL.markerSpacing;
    for (let x = d / 2; x < this.tab.L; x += d) this.markers.push(this.newMarker(x));
    this.out = {};
    this._h0 = {}; this._h1 = {}; this._hm = {};
  }
  newMarker(x) { return { x, Plin: 0, Patt: 0, Pw: 0, Pcf: 0, Aw: 0, s: 0, ell: 0, G: 0, cap: 0 }; }

  /** Entrained water in sway [kg] at the moment (what the slices under the hull have filled). */
  entrainedSway() { let s = 0; for (const m of this.markers) s += m.G; return s * MODEL.markerSpacing * WATER.rho; }

  /**
   * One sub-step. ctl: { deltaCmdDeg, rateDegPerS }. env: { wind [m/s, blowing from north],
   * sails: true|false, aback: bool, kickN: extra yaw moment [N m], captive: hold the motion }.
   */
  step(dt, ctl, env) {
    const { cfg, tab, K } = this;
    const rho = WATER.rho, d = MODEL.markerSpacing;
    const rad = Math.PI / 180;
    const { u, v, r, p, phi } = this;
    const ch = Math.cos(phi), ch2 = ch * ch;

    // ---- rudder with rate limit
    const dOld = this.delta;
    const dCmd = clamp(ctl.deltaCmdDeg, -35, 35) * rad;
    const dMax = (ctl.rateDegPerS ?? 30) * rad * dt;
    this.delta = dOld + clamp(dCmd - dOld, -dMax, dMax);
    const tOld = Math.tan(dOld), tNew = Math.tan(this.delta);

    // ---- air
    const W = env.wind ?? 0;
    const cps = Math.cos(this.psi), sps = Math.sin(this.psi);
    const twx = -W * cps, twy = W * sps; // true wind (air velocity) in body axes
    const aCe = cfg.xcg - cfg.rig.ceX;   // centre of effort ahead of the centre of gravity [m]
    let Xs = 0, Ys = 0, Ks = 0, Ns = 0, sail = { fx: 0, fy: 0, awa: 0, alpha: 0 };
    if (env.sails !== false) {
      sail = sailForce(cfg.rig, twx - u, twy - (v + r * aCe + p * cfg.rig.ceHeight), phi, env.aback);
      Xs += sail.fx; Ys += sail.fy; Ks += sail.fyMast * cfg.rig.ceHeight;
      Ns += aCe * sail.fy - cfg.rig.ceHeight * Math.sin(phi) * sail.fx;
    }
    {
      const ax = twx - u, ay = twy - v, V = Math.hypot(ax, ay);
      const f = 0.5 * AIR.rho * MODEL.windageCdA * V;
      Xs += f * ax; Ys += f * ay; Ks += f * ay * MODEL.windageHeight;
    }

    // ---- water: frozen slice law on each marker for the change met by travelling
    let Yc = 0, Nc = 0, Kc = 0, Xc = 0;        // from the slices [N, N m]
    let m11 = 0, m12 = 0, m13 = 0, m22 = 0, m23 = 0, m33 = 0; // entrained-water matrix
    let Iy = 0;                                 // sideways impulse of the entrained water [N s]
    let b1 = 0, b2 = 0, b3 = 0;                 // impulse from moving the rudder [N s]
    let Yrud = 0, Ykeel = 0, Mkeel = 0, Xind = 0;
    const invU = u / (u * u + sq(MODEL.uEps));
    const h0 = this._h0, h1 = this._h1;
    const dxs = u * dt;
    for (const m of this.markers) {
      const x0 = m.x, x1 = x0 + dxs, dx = Math.abs(dxs), xm = 0.5 * (x0 + x1);
      lookup(tab, x0, h0); lookup(tab, x1, h1);
      const A0 = h0.A * ch2, A1 = h1.A * ch2;
      const Tm = 0.5 * (h0.T + h1.T) * ch, sh = 0.5 * (h0.sharp + h1.sharp), fr = 0.5 * (h0.rud + h1.rud);
      const arm = cfg.xcg - xm, z = MODEL.depthFrac * Tm;
      const slope = fr * tOld; // sideways slope of the centreline here (deflected rudder)
      const w = v + r * arm - p * z + u * slope; // section's sideways speed through still water
      const wash = m.Aw > 0 ? (m.Pw / m.Aw) * Math.min(1, A1 > 0 ? m.Aw / A1 : 1) : 0;
      const wrel = w - wash;
      const target = A1 * wrel;
      const Teff = Math.sqrt((2 * A1) / Math.PI);
      m.ell = (A1 > A0 && A1 > 0 ? m.ell * (A0 / A1) : m.ell) + dx;
      const cap = 0.5 * Math.abs(u) * K.CL_MAX * Teff * m.ell;
      m.cap = cap;
      const limit = (q) => (!Number.isFinite(K.CL_MAX) ? q : cap > 1e-12 ? cap * Math.tanh(q / cap) : 0);
      const before = m.Patt;
      let shedNow = 0;
      const loading = target * m.Plin >= 0 && Math.abs(target) >= Math.abs(m.Plin);
      if (!loading) {
        const base = target * m.Plin > 0 ? target : 0;
        const newAtt = Math.abs(limit(base)) < Math.abs(m.Patt) ? limit(base) : m.Patt;
        shedNow = m.Patt - newAtt; // every section keeps all it lets go (the repaired rule)
        m.Plin = base; m.Patt = newAtt;
        if (shedNow !== 0) m.Aw = Math.max(m.Aw, A0);
      }
      const gain = K.LAMBDA > 0 ? (Teff > 0 ? 1 - Math.exp(-dx / (K.LAMBDA * 2 * Teff)) : 0) : 1;
      if (target * m.Plin >= 0 && Math.abs(target) > Math.abs(m.Plin)) {
        m.Plin += (target - m.Plin) * gain;
        const newAtt = limit(m.Plin);
        if (Math.abs(newAtt) < Math.abs(m.Patt)) { shedNow += m.Patt - newAtt; m.Aw = Math.max(m.Aw, A0); }
        m.Patt = newAtt;
      }
      const washMid = m.Aw > 0 ? (m.Pw + 0.5 * shedNow) / m.Aw : 0;
      m.Pw += shedNow;
      // the water this slice has filled: the same rule run on a unit sideways speed
      m.G = A1 >= m.G ? m.G + (A1 - m.G) * gain : A1;

      // cross-flow drag, growing with the slice's sideways travel in drafts
      let fcf = 0;
      if (Tm > 1e-9) {
        m.s += (Math.abs(wrel) * dt) / Tm;
        const cdv = K.CD_ROUND + (K.CD_SHARP - K.CD_ROUND) * sh;
        const s0 = K.S0_ROUND * (1 - sh);
        const grown = s0 > 1e-9 ? 1 - Math.exp(-m.s / s0) : 1;
        fcf = 0.5 * cdv * grown * Tm * Math.abs(wrel) * wrel;
        m.Pcf += fcf * dt;
      }
      const dPconv = m.Patt - before + shedNow;
      const Fy = -rho * d * (dPconv / dt + fcf); // on the hull, normal to the local surface
      Yc += Fy; Nc += Fy * arm; Kc += -Fy * z;
      Yrud += Fy * fr; Ykeel += Fy * (1 - fr); Mkeel += Fy * (1 - fr) * arm;
      // surge: the surface is tilted where the rudder is over; full suction at the leading
      // edges; and the energy left in the wake is paid for (drag due to side force)
      const suction = rho * d * invU * (w * dPconv) / dt;
      const wakeEnergy = rho * d * invU * (washMid * shedNow) / dt;
      Xc += Fy * slope + suction - wakeEnergy;
      Xind += suction - wakeEnergy + Fy * slope;

      // entrained water follows changes in time at once: goes into the mass matrix
      const g = rho * d * m.G;
      m11 += g; m12 += g * arm; m13 += -g * z; m22 += g * arm * arm; m23 += -g * arm * z; m33 += g * z * z;
      Iy += g * (v + r * arm - p * z);
      const dwr = fr * u * (tNew - tOld); // the rudder being moved pushes water at once
      if (dwr !== 0) { b1 -= g * dwr; b2 -= g * dwr * arm; b3 += g * dwr * z; m.Plin += m.G * dwr; }
      m._arm = arm; m._z = z;
      m.x = x1;
    }

    // ---- surge resistance: friction line on wetted area plus the stated wave stand-in
    const Re = Math.max(1e5, (Math.abs(u) * tab.L) / WATER.nu);
    const Cf = 0.075 / sq(Math.log10(Re) - 2);
    const Rf = 0.5 * rho * tab.wetted * Cf * u * Math.abs(u);
    const Fn = Math.abs(u) / Math.sqrt(G0 * tab.L);
    const Rw = Math.sign(u) * cfg.mass * G0 * MODEL.waveCoef * Math.pow(Fn / MODEL.waveFnRef, MODEL.waveExp);

    // ---- total momentum update. (M + entrained) * new velocity = old momentum + impulses.
    const M = cfg.mass, Iz = M * sq(cfg.kYaw), Ix = M * sq(cfg.kRoll);
    const kickN = env.kickN ?? 0;
    const f1 = Yc + Ys - M * u * r;
    const f2 = Nc + Ns + kickN;
    const f3 = Kc + Ks - M * G0 * cfg.GM * Math.sin(phi);
    const a11 = M + m11, a22 = Iz + m22, a33 = Ix + m33;
    let [dv, dr, dp] = solve3(a11, m12, m13, a22, m23, a33, f1 * dt + b1, f2 * dt + b2, f3 * dt + b3);
    const Xtot = Xs + Xc - Rf - Rw + r * (M * v + Iy);
    let du = (Xtot * dt) / (M * (1 + MODEL.surgeAddedMassFrac));
    if (env.captive) { du = 0; dv = 0; dr = 0; dp = 0; } // towed at fixed motion (checks only)

    // the slices' held impulse follows the change in time (reversible part)
    for (const m of this.markers) {
      m.Plin += m.G * (dv + dr * m._arm - dp * m._z);
      const c = m.cap;
      m.Patt = !Number.isFinite(K.CL_MAX) ? m.Plin : c > 1e-12 ? c * Math.tanh(m.Plin / c) : 0;
    }

    // ---- kinematics
    this.u = u + du; this.v = v + dv; this.r = r + dr; this.p = p + dp;
    this.X += (this.u * sps + this.v * cps) * dt;
    this.Y += (this.u * cps - this.v * sps) * dt;
    this.psi += this.r * dt; this.phi += this.p * dt; this.t += dt;

    // ---- slices leave at one end and enter at the other
    const L = tab.L;
    let lo = Infinity, hi = -Infinity, removed = false;
    for (const m of this.markers) {
      if (m.x < 0 || m.x > L) {
        removed = true;
        const xb = cfg.xcg - clamp(m.x, 0, L);
        this.exited.push({ t: this.t, X: this.X + xb * sps, Y: this.Y + xb * cps, P: m.Pw + m.Pcf });
      } else { if (m.x < lo) lo = m.x; if (m.x > hi) hi = m.x; }
    }
    if (removed) this.markers = this.markers.filter((m) => m.x >= 0 && m.x <= L);
    if (this.markers.length === 0) { lo = L; hi = 0; if (this.u >= 0) this.markers.push(this.newMarker(0)), (lo = 0); else this.markers.push(this.newMarker(L)), (hi = L); }
    if (this.u > 0) while (lo >= d) { lo -= d; this.markers.unshift(this.newMarker(lo)); }
    if (this.u < 0) while (hi <= L - d) { hi += d; this.markers.push(this.newMarker(hi)); }

    const o = this.out;
    o.sailX = sail.fx; o.sailY = sail.fy; o.awa = sail.awa; o.alpha = sail.alpha;
    o.rudderY = Yrud; o.keelY = Ykeel; o.keelArm = Math.abs(Ykeel) > 1 ? Mkeel / Ykeel : 0;
    o.hullX = Xc; o.friction = Rf; o.wave = Rw; o.induced = -Xind; o.turnDrag = -r * (M * v + Iy);
    o.entrained = m11; o.yawAdded = m22;
  }
}

function solve3(a11, a12, a13, a22, a23, a33, b1, b2, b3) {
  // symmetric 3x3 by Cramer
  const c11 = a22 * a33 - a23 * a23, c12 = a13 * a23 - a12 * a33, c13 = a12 * a23 - a13 * a22;
  const det = a11 * c11 + a12 * c12 + a13 * c13;
  const c22 = a11 * a33 - a13 * a13, c23 = a12 * a13 - a11 * a23, c33 = a11 * a22 - a12 * a12;
  return [
    (c11 * b1 + c12 * b2 + c13 * b3) / det,
    (c12 * b1 + c22 * b2 + c23 * b3) / det,
    (c13 * b1 + c23 * b2 + c33 * b3) / det,
  ];
}
