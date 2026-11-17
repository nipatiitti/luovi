// model.js: the sailing-test model. One dependency-free module for Node and the browser.
// Hull: the h4 time-domain slice model (surge, sway, yaw, heel; water-fixed slices 0.05 m apart), with the
// changes listed under CHANGES. Sails: a precomputed table (gen_sails.mjs). Wave drag: Delft table.
// Nothing here knows which boat it is; a boat is the data object handed to `new Boat(data, sailTable)`.
//
// Axes: world X east, Y north; the true wind blows from windDir (0 = from north). Heading psi clockwise from
// north. Body: u forward, v to starboard, r bow to starboard, heel phi and p starboard side down. Station x
// runs aft from the bow end of the waterline. Rudder angle positive = trailing edge to starboard.
//
// CHANGES against h4 sim.mjs (each is global, none is per boat):
//  1. Each slice's hull values are averaged over its 0.05 m cell (cumulative tables), so a slice crossing an
//     edge no longer delivers its impulse in one sub-step (critic, section 2).
//  2. Leading-edge suction fades with the square of held over linear loading (critic's tested form).
//  3. The loading limit is h1b's attachment number X (Kirchhoff factor ((1+sqrt X)/2)^2, offset 1.25, drop 0.1),
//     now a lagged state per station: it follows its target over ATTACH_LAG chord transits of water travel.
//  4. A turned section works in the velocity component NORMAL to its own surface (u sin + w cos), and its force
//     acts along that normal; suction acts along the chord. For small angles this is h4's u*slope form. Needed
//     because the tiller now goes to 60 degrees, where tan() makes the cross-flow 1.7 times the boat speed.
//  5. Wash: water shed by sections upstream is felt at (1 + x/sqrt(x^2 + s^2))/2 of its far-wake value, x the
//     travel since it was shed and s the wake's depth: the classical result that the downwash at a lifting
//     line is half the far-wake value (semi-infinite vortex pair). No constant.
//  6. Entrained water is NOT reduced (owner judged the h4 tack loss right).
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.SailModel = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const WATER = { rho: 1000, nu: 1.19e-6 }, AIR = { rho: 1.225 }, G0 = 9.81, KN = 0.5144, RAD = Math.PI / 180;
  const C = {
    // slice law, frozen since h1/h2 (sources in h1b result and slicelaw.mjs)
    CD_SHARP: 2.0, CD_ROUND: 0.6, S0_ROUND: 1.0, LAMBDA: 0.25, CL_MAX: 1.1,
    STALL_OFFSET: 1.25, STALL_DROP: 0.1, // h1b attachment number (chosen once there, not held out)
    ATTACH_LAG: 1.5,          // chord transits for the attachment number to follow (Beddoes-Leishman, as on the air side)
    // h4 time-domain layer
    markerSpacing: 0.05, uEps: 0.05, depthFrac: 0.424, surgeAddedMassFrac: 0.05,
    windageCdA: 1.2, windageHeight: 1.5, // hull, rig and crew drag area [m^2] and its height (h4, assumed)
    dt: 1 / 240,              // sub-step h4 found stable
    // run-time sail layer
    SAIL_LAG: 1.5,            // chord transits of apparent wind for the sail force to follow the table (s4 fallback lag)
    tillerRate: 120,          // deg/s the rudder can follow the tiller (h4 "slammed" rate; a hand is that fast)
    sheetRate: 25,            // deg/s of sheet angle (assumed)
    crewRate: 0.8,            // of full travel per second (assumed)
    // r2-broach: heeled geometry
    SUCTION_SHARE: 2 / 3,     // share of a section's loading carried as suction on its low-pressure face (thin-aerofoil rule of thumb)
    CD_AIRED: 2 * Math.PI / (4 + Math.PI), // cross-flow drag of a plate whose lee face is at ambient pressure (Kirchhoff-Rayleigh free streamline, 0.88)
    FS_RELEASE: 4 / (Math.PI * Math.PI), // entrained water of a blade whose root is at a pressure-release surface, over the same blade under a wall (exact, plate)
    heelStepDeg: 2.5, heelMaxDeg: 75, // grid of the heeled-section tables
    heel: { rise: true, camber: true, rudderAxis: true, dragArm: true, air: true }, // each r2 term can be switched off for before/after runs (not per boat)
  };
  const sq = (a) => a * a, clamp = (a, lo, hi) => Math.min(hi, Math.max(lo, a));
  const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));

  function cumulative(arr, dx) { const c = new Float64Array(arr.length); for (let i = 1; i < arr.length; i++) c[i] = c[i - 1] + 0.5 * (arr[i] + arr[i - 1]) * dx; return c; }
  function cumAt(c, x, dx, n) { const q = clamp(x / dx, 0, n - 1), i = Math.min(n - 2, Math.floor(q)), f = q - i; return c[i] + (c[i + 1] - c[i]) * f; }

  /** Sail table lookup. Returns forces per unit dynamic pressure and reference area, in the frame "wind from starboard". */
  function tableLookup(T, awaDeg, ms, js, out) {
    const ax = T.awa, mx = T.ms, jx = T.js, na = ax.length, nm = mx.length, nj = jx.length, st = T.stride;
    const loc = (arr, v) => { let i = 0; while (i < arr.length - 2 && v > arr[i + 1]) i++; return [i, clamp((v - arr[i]) / (arr[i + 1] - arr[i]), 0, 1)]; };
    const [ia, fa0] = loc(ax, awaDeg), [im, fm0] = loc(mx, ms);
    // the jib axis has a gap between -8 and +8 (the clew is on one side or the other): never interpolate across it
    const half = nj / 2; let ij, fj;
    if (js < 0) { [ij, fj] = loc(jx.slice(0, half), js); } else { [ij, fj] = loc(jx.slice(half), js); ij += half; }
    const sm = (f) => f * f * (3 - 2 * f); // smooth blend so the force has no kinks at grid lines
    const fa = sm(fa0), fm = sm(fm0), fjs = sm(fj);
    for (let k = 0; k < st; k++) out[k] = 0;
    for (let a = 0; a < 2; a++) for (let m = 0; m < 2; m++) for (let j = 0; j < 2; j++) {
      const w = (a ? fa : 1 - fa) * (m ? fm : 1 - fm) * (j ? fjs : 1 - fjs);
      if (w === 0) continue;
      const base = (((ia + a) * nm + (im + m)) * nj + (ij + j)) * st;
      for (let k = 0; k < st; k++) out[k] += w * T.data[base + k];
    }
    return out;
  }

  /** Area, lateral moment and deepest point of the part of polygon P (points [y, zeta], y to the low side, zeta up from the
   *  upright waterline) that is under water when the boat is heeled by phi (low side down) and has risen by h. */
  function immersed(P, sn, cs, h) {
    const n = P.length; let S = 0, My = 0, dmax = 0; const q = [];
    const ht = (p) => p[1] * cs - p[0] * sn + h; // height above the water
    for (let i = 0; i < n; i++) {
      const a = P[i], b = P[(i + 1) % n], za = ht(a), zb = ht(b);
      if (za < 0) q.push([a[0] * cs + a[1] * sn, za]);
      if ((za < 0) !== (zb < 0)) { const f = za / (za - zb), y = a[0] + (b[0] - a[0]) * f, z = a[1] + (b[1] - a[1]) * f; q.push([y * cs + z * sn, 0]); }
    }
    for (let i = 0; i < q.length; i++) { const a = q[i], b = q[(i + 1) % q.length], c = a[0] * b[1] - b[0] * a[1]; S += c; My += (a[0] + b[0]) * c; if (-a[1] > dmax) dmax = -a[1]; }
    S *= 0.5; My /= 6;
    return [Math.abs(S), Math.abs(S) > 1e-9 ? My / S : 0, dmax];
  }
  /** Heeled-section tables from the boat's own section data: for each heel angle the rise of the hull that keeps the
   *  displaced volume, and per station the canoe body's deepest immersed point and the lateral position of its
   *  immersed area. Topsides: straight from the waterline to the deck edge (max beam, at the freeboard height). */
  function heelGeometry(d) {
    const n = d.n, dx = d.dx, F = d.rig.freeboard, flare = (d.beam / 2) / Math.max.apply(null, d.halfBeam);
    const polys = [];
    for (let i = 0; i < n; i++) {
      const b = d.halfBeam[i], Tc = d.canoeDepth[i];
      if (b < 1e-6) { polys.push(null); continue; }
      const P = []; for (let k = 0; k <= 32; k++) { const t = (k / 32) * Math.PI; P.push([-b * Math.cos(t), -Tc * Math.sin(t)]); }
      P.push([b * flare, F], [-b * flare, F]); polys.push(P);
    }
    const vol = (sn, cs, h) => { let V = 0; for (let i = 0; i < n; i++) if (polys[i]) V += immersed(polys[i], sn, cs, h)[0] * dx; return V; };
    const V0 = vol(0, 1, 0), tab = [];
    for (let deg = 0; deg <= C.heelMaxDeg + 1e-9; deg += C.heelStepDeg) {
      const sn = Math.sin(deg * RAD), cs = Math.cos(deg * RAD);
      let lo = -0.5, hi = 1.5; for (let it = 0; it < 40; it++) { const mid = 0.5 * (lo + hi); if (vol(sn, cs, mid) > V0) lo = mid; else hi = mid; }
      const h = deg === 0 ? 0 : 0.5 * (lo + hi), yc = new Float64Array(n), dc = new Float64Array(n); let sy = 0, sa = 0;
      for (let i = 0; i < n; i++) if (polys[i]) { const r = immersed(polys[i], sn, cs, h); yc[i] = r[1]; dc[i] = r[2]; sy += r[0] * r[1]; sa += r[0]; }
      const dyc = new Float64Array(n); for (let i = 0; i < n; i++) dyc[i] = (yc[Math.min(n - 1, i + 1)] - yc[Math.max(0, i - 1)]) / ((Math.min(n - 1, i + 1) - Math.max(0, i - 1)) * dx);
      tab.push({ h, yc, dyc, dc, ycMean: sa > 0 ? sy / sa : 0 });
    }
    return tab;
  }

  class Boat {
    /** data: one entry of hulls.json; sails: its entry of sails.json; init: { psiDeg, u, X, Y } */
    constructor(data, sails, init) {
      init = init || {};
      this.d = data; this.sails = sails;
      const n = data.n, dx = data.dx;
      this.cA = cumulative(data.A, dx); this.cT = cumulative(data.T, dx); this.cS = cumulative(data.sharp, dx); this.cR = cumulative(data.rud, dx);
      // where the turning part and the fixed part sit, for drawing the arrows (from the tables, not from names)
      let sa = 0, sx = 0, ka = 0, kx = 0;
      for (let i = 0; i < n; i++) { sa += data.A[i] * data.rud[i]; sx += data.A[i] * data.rud[i] * i * dx; ka += data.A[i] * (1 - data.rud[i]); kx += data.A[i] * (1 - data.rud[i]) * i * dx; }
      this.rudderX = sx / sa; this.keelX = kx / ka;
      // Delft residuary curve, as a fraction of canoe-body weight against Froude number
      this.rrFn = data.delftRr.map((q) => q[0]); this.rrV = data.delftRr.map((q) => Math.max(0, q[1]));
      this.ncell = Math.ceil(data.L / C.markerSpacing) + 1;
      this.hg = heelGeometry(data); this.hRise = 0; this.ycMean = 0;
      this.wDc = new Float64Array(n); this.wDyc = new Float64Array(n); this.wYc = new Float64Array(n);
      this.reset(init);
    }
    reset(init) {
      init = init || {};
      this.X = init.X || 0; this.Y = init.Y || 0; this.psi = (init.psiDeg || 0) * RAD;
      this.phi = 0; this.u = init.u || 0; this.v = 0; this.r = 0; this.p = 0; this.t = 0;
      this.delta = 0; this.mainSheet = init.mainSheet === undefined ? 12 : init.mainSheet; this.jibSheet = init.jibSheet === undefined ? 14 : init.jibSheet;
      this.jibSide = init.jibSide || 0; // +1 clew to port, -1 clew to starboard, 0 = not yet set (takes the lee side at the first step)
      this.crew = 0; // -1 full to port, +1 full to starboard
      this.markers = []; const d = C.markerSpacing;
      for (let x = d / 2; x < this.d.L; x += d) this.markers.push(this.newMarker(x));
      this.Xatt = new Float64Array(this.ncell).fill(1); this.Fa = new Float64Array(this.ncell);
      this.sf = new Float64Array(12); this.sfInit = false; // lagged sail force coefficients
      this.out = { sailX: 0, sailY: 0, mainX: 0, mainY: 0, jibX: 0, jibY: 0, keelY: 0, rudderY: 0, rudderFlowDeg: 0, rudderAttach: 1, fMain: 1, fJib: 1, awaDeg: 0, aws: 0, boomDeg: 0, jibDeg: 0, wave: 0, friction: 0, hullX: 0, crewK: 0 };
      this._tmp = new Float64Array(13);
    }
    newMarker(x) { return { x, _fa: 0, Plin: 0, Patt: 0, Pw: 0, Pcf: 0, Aw: 0, xw: 0, s: 0, ell: 0, G: 0, cap: 0, _arm: 0, _z: 0, _c: 1, _cell: 0, _kf: 1, _dP: 0 }; }
    /** Heeled-section values at the present heel (linear in heel between table rows). */
    setHeel(phi) {
      const H = C.heel, a = Math.min(Math.abs(phi) / RAD, C.heelMaxDeg - 1e-6) / C.heelStepDeg, k = Math.floor(a), f = a - k, t0 = this.hg[k], t1 = this.hg[k + 1];
      const sg = phi >= 0 ? 1 : -1, n = this.d.n, ch = Math.cos(phi), T = this.d.T, cd = this.d.canoeDepth;
      this.hRise = H.rise ? t0.h + (t1.h - t0.h) * f : 0; this.ycMean = H.dragArm ? sg * (t0.ycMean + (t1.ycMean - t0.ycMean) * f) : 0;
      for (let i = 0; i < n; i++) {
        this.wDc[i] = H.rise ? t0.dc[i] + (t1.dc[i] - t0.dc[i]) * f : cd[i] * ch;
        this.wDyc[i] = H.camber ? sg * (t0.dyc[i] + (t1.dyc[i] - t0.dyc[i]) * f) : 0;
        this.wYc[i] = sg * (t0.yc[i] + (t1.yc[i] - t0.yc[i]) * f);
      }
    }
    at(arr, x) { const n = this.d.n, q = clamp(x / this.d.dx, 0, n - 1), i = Math.min(n - 2, Math.floor(q)), f = q - i; return arr[i] + (arr[i + 1] - arr[i]) * f; }
    /** Deepest immersed point of the heeled section at x [m below the water], and the same for the canoe body alone. */
    depthAt(x, ch) { return Math.max(this.at(this.wDc, x), this.at(this.d.T, x) * ch - this.hRise); }
    cell(c, x) { const d = C.markerSpacing, n = this.d.n, dx = this.d.dx; return (cumAt(c, x + d / 2, dx, n) - cumAt(c, x - d / 2, dx, n)) / d; }
    kirch(X) { const q = 0.5 * (1 + Math.sqrt(X)); return q * q; }
    residuary(Fn) {
      const f = this.rrFn, v = this.rrV;
      if (Fn <= f[0]) return v[0] * sq(Fn / f[0]) * sq(Fn / f[0]);
      for (let i = 1; i < f.length; i++) if (Fn <= f[i]) return v[i - 1] + (v[i] - v[i - 1]) * (Fn - f[i - 1]) / (f[i] - f[i - 1]);
      return v[v.length - 1];
    }

    /**
     * One sub-step. ctl: { tillerDeg (rudder angle wanted), mainSheet, jibSheet [deg], jibSide (+1 port, -1 starboard),
     * jibFly (true = jib sheet let go), crew (-1..1), sails (false = sails down) }. env: { wind [m/s], windDir [rad, direction it blows from] }.
     */
    step(dt, ctl, env) {
      const d0 = this.d, rho = WATER.rho, d = C.markerSpacing;
      const u = this.u, v = this.v, r = this.r, p = this.p, phi = this.phi;
      const ch = Math.cos(phi), ch2 = ch * ch, H = C.heel, chr = H.rudderAxis ? Math.max(ch, 0.2) : 1, tph = Math.tan(clamp(phi, -1.4, 1.4));
      this.setHeel(phi); const hR = this.hRise;

      // ---- controls with rate limits
      const dOld = this.delta;
      const lim = d0.tillerMaxDeg;
      this.delta = dOld + clamp(clamp(ctl.tillerDeg || 0, -lim, lim) * RAD - dOld, -C.tillerRate * RAD * dt, C.tillerRate * RAD * dt);
      if (ctl.mainSheet !== undefined) this.mainSheet += clamp(ctl.mainSheet - this.mainSheet, -C.sheetRate * dt, C.sheetRate * dt);
      if (ctl.jibSheet !== undefined) this.jibSheet += clamp(ctl.jibSheet - this.jibSheet, -C.sheetRate * dt, C.sheetRate * dt);
      if (ctl.crew !== undefined) this.crew += clamp(ctl.crew - this.crew, -C.crewRate * dt, C.crewRate * dt);
      const tOld = Math.tan(dOld), tNew = Math.tan(this.delta);

      // ---- air
      const W = env.wind || 0, rel = this.psi - (env.windDir || 0);
      const twx = -W * Math.cos(rel), twy = W * Math.sin(rel); // air velocity in body axes
      const rig = d0.rig, T = this.sails, o = this.out;
      const hCE = rig.freeboard + rig.BAS + 0.39 * rig.P;    // where the apparent wind is taken (about the centre of area)
      const aMast = d0.xcg - rig.mastX;                        // mast ahead of the centre of gravity
      let Xs = 0, Ys = 0, Ks = 0, Ns = 0;
      {
        const ax = twx - u, ay = (twy - (v + r * aMast + p * hCE)) * ch; // only the flow across the heeled mast counts
        const V = Math.hypot(ax, ay), awa = Math.atan2(-ay, -ax);
        if (this.jibSide === 0) this.jibSide = awa >= 0 ? 1 : -1;
        if (ctl.jibSide) this.jibSide = ctl.jibSide;
        const side = awa >= 0 ? 1 : -1; // mirror so that the table always sees wind from starboard
        const c = tableLookup(T, Math.abs(awa) / RAD, this.mainSheet, this.jibSheet * this.jibSide * side, this._tmp);
        // body-frame coefficients: [mainFx, mainFy, mainK, mainN, mainKx, jibFx, jibFy, jibK, jibN, jibKx, fMain, fJib]
        const jf = ctl.jibFly ? 0 : 1; // a jib let fly carries nothing (it would flog; flogging is not modelled)
        const tgt = [c[0], side * c[1], side * c[2], side * c[3], c[4], jf * c[6], jf * side * c[7], jf * side * c[8], jf * side * c[9], jf * c[10], c[5], jf ? c[11] : 100];
        const gain = this.sfInit ? 1 - Math.exp(-dt * V / (C.SAIL_LAG * T.chordRef)) : 1; this.sfInit = true;
        const sf = this.sf; for (let k = 0; k < 12; k++) sf[k] += (tgt[k] - sf[k]) * gain;
        const on = ctl.sails === false ? 0 : 1, q = on * 0.5 * AIR.rho * V * V * T.areaRef * 1e-3;
        const mx = q * sf[0], my = q * sf[1], jx = q * sf[5], jy = q * sf[6];
        Xs += mx + jx; Ys += (my + jy) * ch; Ks += q * (sf[2] + sf[7]);
        Ns += q * (sf[3] + sf[8]) * ch + aMast * (my + jy) * ch - Math.sin(phi) * q * (sf[4] + sf[9]);
        o.nLever = -Math.sin(phi) * q * (sf[4] + sf[9]); o.nSailSide = q * (sf[3] + sf[8]) * ch + aMast * (my + jy) * ch;
        o.mainX = mx; o.mainY = my * ch; o.jibX = jx; o.jibY = jy * ch; o.sailX = mx + jx; o.sailY = (my + jy) * ch;
        o.fMain = on ? sf[10] / 100 : 1; o.fJib = on ? sf[11] / 100 : 1; o.awaDeg = awa / RAD; o.aws = V;
        o.boomDeg = -side * c[12] / 10; o.jibDeg = ctl.jibFly ? -side * Math.min(80, Math.abs(awa) / RAD) : -this.jibSide * this.jibSheet; // drawing: positive = clew to starboard
        o.sailsUp = on; o.jibFly = ctl.jibFly ? 1 : 0;
      }
      {
        const ax = twx - u, ay = twy - v, V = Math.hypot(ax, ay), f = 0.5 * AIR.rho * C.windageCdA * V;
        Xs += f * ax; Ys += f * ay; Ks += f * ay * C.windageHeight;
      }
      const Kcrew = d0.crewMass * G0 * this.crew * d0.crewYMax * ch; o.crewK = Kcrew;

      // ---- water
      let Yc = 0, Nc = 0, Kc = 0, Xc = 0, m11 = 0, m12 = 0, m13 = 0, m22 = 0, m23 = 0, m33 = 0, Iy = 0, b1 = 0, b2 = 0, b3 = 0;
      let Ndrag = 0, airS = 0, Nrud = 0, Yrud = 0, Ykeel = 0, Xrud = 0, flowS = 0, flowW = 0, attS = 0;
      const dxs = u * dt, n = d0.n, sdx = d0.dx, Xatt = this.Xatt, Fa = this.Fa;
      for (let mi = 0; mi < this.markers.length; mi++) {
        const m = this.markers[mi];
        const x0 = m.x, x1 = x0 + dxs, dx = Math.abs(dxs), xm = 0.5 * (x0 + x1);
        // r2: a section's entrained water scales with the square of its true depth below the water at this heel
        // (for a blade: its tip depth, T cos(heel) minus the hull's rise; before, T cos(heel) with no rise)
        const Tu0 = this.at(d0.T, x0), Tu1 = this.at(d0.T, x1), Tum = this.at(d0.T, xm);
        // r2 AIR (a): where the suction a station carries exceeds the head of water over its blade, the surface is drawn down
        // to the blade and stops acting as a wall there; Fa is the share of the blade's span where that is so (lagged, per station)
        const ci = clamp(Math.floor(x1 / d), 0, this.ncell - 1); m._cell = ci;
        const kfs = H.air ? 1 - (1 - C.FS_RELEASE) * Fa[ci] : 1;
        const A0 = Tu0 > 1e-6 ? this.cell(this.cA, x0) * sq(this.depthAt(x0, ch) / Tu0) * kfs : 0, A1 = Tu1 > 1e-6 ? this.cell(this.cA, x1) * sq(this.depthAt(x1, ch) / Tu1) * kfs : 0;
        const Tm = Tum > 1e-6 ? this.cell(this.cT, xm) * this.depthAt(xm, ch) / Tum : 0, sh = this.cell(this.cS, xm), fr = this.cell(this.cR, xm);
        const arm = d0.xcg - xm, z = C.depthFrac * Tm;
        // r2: the canoe body's immersed area sits to the low side by yc(x); a slice passing along the hull is pushed sideways
        // at u dyc/dx by the canoe body's share of the section (half-ellipse value pi/2 depth^2), not by the blade, which is straight
        const dcn = this.at(this.wDc, xm), cfrac = A1 > 1e-9 ? Math.min(1, 0.5 * Math.PI * dcn * dcn / A1) : 1;
        const wcam = u * this.at(this.wDyc, xm) * cfrac;
        // local surface: turned by theta where the rudder is over
        const sO = fr * tOld, cO = 1 / Math.sqrt(1 + sO * sO), snO = sO * cO;
        const wlat = v + r * arm - p * z;
        // r2: the rudder turns about its heeled stock, so its angle sets the full blade-normal speed u sin(angle); in the
        // horizontal measure used here (blade-normal times 1/cos heel) that is u sin / cos(heel)
        const w = u * snO / chr + (wlat + wcam) * cO; // section's speed through still water, normal to its surface
        const ut = u * cO - wlat * snO;           // and along its surface
        const invUt = ut / (ut * ut + sq(C.uEps));
        if (m.Aw > 0) m.xw += dx;
        const sw = Math.sqrt((2 * m.Aw) / Math.PI);
        const near = m.Aw > 0 ? 0.5 * (1 + m.xw / Math.sqrt(m.xw * m.xw + sw * sw + 1e-12)) : 0;
        const wash = m.Aw > 0 ? near * (m.Pw / m.Aw) * Math.min(1, A1 > 0 ? m.Aw / A1 : 1) : 0;
        const wrel = w - wash, target = A1 * wrel;
        const Teff = Math.sqrt((2 * A1) / Math.PI);
        m.ell = (A1 > A0 && A1 > 0 ? m.ell * (A0 / A1) : m.ell) + dx;
        const cap = 0.5 * Math.abs(ut) * C.CL_MAX * (Teff / Math.sqrt(kfs)) * m.ell; m.cap = cap; // the limit goes with the blade's true depth
        // attachment number of this station: lagged, body-fixed
        {
          const ratio = Math.abs(m.Plin) / Math.max(cap, 1e-9);
          let Xt = 1 / (1 + Math.exp(clamp((ratio - C.STALL_OFFSET) / C.STALL_DROP, -40, 40)));
          // r2 AIR (b): once a station has let go, air fills the separated face over the same share of span, and attachment
          // is regained only on the span air cannot reach. Inception is unchanged: it needs separated flow (Harwood et al. 2016).
          {
            const cover = Math.max(0, this.at(d0.canoeDepth, x1) * ch - hR), span = this.at(d0.T, x1) * ch - hR - cover;
            const head = C.SUCTION_SHARE * ratio * C.CL_MAX * ut * ut / (2 * G0);
            const fa = H.air && span > 1e-3 ? clamp((head - cover) / span, 0, 1) : 0;
            Fa[ci] += (fa - Fa[ci]) * (1 - Math.exp(-Math.abs(ut) * dt / (C.ATTACH_LAG * Math.max(m.ell, d))));
            if (Xatt[ci] < Xt) Xt = Math.min(Xt, Math.max(Xatt[ci], 1 - Fa[ci]));
          }
          Xatt[ci] += (Xt - Xatt[ci]) * (1 - Math.exp(-Math.abs(ut) * dt / (C.ATTACH_LAG * Math.max(m.ell, d))));
        }
        const kf = this.kirch(Xatt[ci]);
        const before = m.Patt;
        let shedNow = 0;
        if (Math.abs(m.Plin * kf) < Math.abs(m.Patt)) { // the station has let go: what it no longer holds stays in the water
          shedNow = m.Patt - m.Plin * kf; m.Patt = m.Plin * kf;
          if (A0 > m.Aw) { m.Aw = A0; m.xw = 0; }
        }
        const loading = target * m.Plin >= 0 && Math.abs(target) >= Math.abs(m.Plin);
        if (!loading) {
          const base = target * m.Plin > 0 ? target : 0;
          const newAtt = Math.abs(base * kf) < Math.abs(m.Patt) ? base * kf : m.Patt;
          shedNow = m.Patt - newAtt;
          m.Plin = base; m.Patt = newAtt;
          if (shedNow !== 0 && A0 > m.Aw) { m.Aw = A0; m.xw = 0; }
        }
        const gain = Teff > 0 ? 1 - Math.exp(-dx / (C.LAMBDA * 2 * Teff)) : 0;
        if (target * m.Plin >= 0 && Math.abs(target) > Math.abs(m.Plin)) {
          m.Plin += (target - m.Plin) * gain;
          const newAtt = m.Plin * kf;
          if (Math.abs(newAtt) < Math.abs(m.Patt)) { shedNow += m.Patt - newAtt; if (A0 > m.Aw) { m.Aw = A0; m.xw = 0; } }
          m.Patt = newAtt;
        }
        const washMid = m.Aw > 0 ? (m.Pw + 0.5 * shedNow) / m.Aw : 0;
        m.Pw += shedNow;
        m.G = A1 >= m.G ? m.G + (A1 - m.G) * gain : A1;

        let fcf = 0;
        if (Tm > 1e-9) {
          m.s += (Math.abs(wrel) * dt) / Tm;
          const cdv = C.CD_ROUND + (C.CD_SHARP - C.CD_ROUND) * sh, s0 = C.S0_ROUND * (1 - sh);
          const grown = s0 > 1e-9 ? 1 - Math.exp(-m.s / s0) : 1;
          // r2 AIR (c): on the aired share of the span the separated lee face is at ambient pressure, not at wake suction
          const aired = H.air ? 1 - Fa[ci] * (1 - C.CD_AIRED / C.CD_SHARP) : 1;
          fcf = 0.5 * cdv * aired * grown * Tm * Math.abs(wrel) * wrel;
          m.Pcf += fcf * dt;
        }
        const dPconv = m.Patt - before + shedNow;
        const Fn = -rho * d * (dPconv / dt + fcf);      // on the hull, along the local normal
        // suction along the chord, fading as the loading saturates; and the wake's energy is paid for
        const sucK = Math.abs(m.Plin) > 1e-12 ? sq(Math.min(1, Math.abs(m.Patt / m.Plin))) : 1;
        const St = rho * d * invUt * (sucK * w * dPconv - washMid * shedNow) / dt;
        const Fy = Fn * cO - St * snO * chr, Fx = Fn * snO / chr + St * cO;
        // r2: fore-and-aft forces act where the section is: the blade's share out to the high side at (depth + rise) tan(heel),
        // the canoe body's share at its immersed area's centre on the low side
        const yoff = H.dragArm ? cfrac * this.at(this.wYc, xm) - (1 - cfrac) * (z + hR) * tph : 0;
        Yc += Fy; Nc += Fy * arm - yoff * Fx; Kc += -Fy * z; Xc += Fx; Ndrag -= yoff * Fx;
        Yrud += Fy * fr; Ykeel += Fy * (1 - fr); Xrud += Fx * fr; Nrud += Fy * arm * fr;
        if (fr > 0.5) { airS += (A1 + 1e-9) * Fa[ci]; }
        if (fr > 0.5) { const wt = A1 + 1e-9; flowS += wt * Math.atan2(wrel, Math.abs(ut)); flowW += wt; attS += wt * Xatt[ci]; }

        // entrained water follows changes in time at once: mass matrix (lateral part of the normal direction)
        const g = rho * d * m.G, gl = g * cO * cO;
        m11 += gl; m12 += gl * arm; m13 += -gl * z; m22 += gl * arm * arm; m23 += -gl * arm * z; m33 += gl * z * z;
        Iy += gl * wlat;
        if (fr > 0 && tNew !== tOld) { // the rudder being moved pushes water at once
          const sN = fr * tNew, cN = 1 / Math.sqrt(1 + sN * sN), dwr = (u * sN * cN / chr + (wlat + wcam) * cN) - w;
          b1 -= g * dwr * cN; b2 -= g * dwr * cN * arm; b3 += g * dwr * cN * z; m._dP = m.G * dwr;
        }
        m._arm = arm; m._z = z; m._c = cO; m._kf = kf;
        m.x = x1;
      }

      // ---- surge resistance: friction line, and the Delft table for wave-making (placeholder)
      const Re = Math.max(1e5, (Math.abs(u) * d0.L) / WATER.nu);
      const Cf = 0.075 / sq(Math.log10(Re) - 2);
      const Rf = 0.5 * rho * d0.wetted * Cf * u * Math.abs(u);
      const Fnr = Math.abs(u) / Math.sqrt(G0 * d0.hydro.LWL);
      const Rw = Math.sign(u) * rho * G0 * d0.hydro.volc * this.residuary(Fnr);

      // ---- total momentum update
      const M = d0.mass, Iz = M * sq(d0.kYaw), Ix = M * sq(d0.kRoll);
      Nc += this.ycMean * (Rf + Rw); Ndrag += this.ycMean * (Rf + Rw); // r2: hull friction and wave drag act at the immersed hull's centre
      const f1 = Yc + Ys - M * u * r, f2 = Nc + Ns, f3 = Kc + Ks + Kcrew - M * G0 * d0.GM * Math.sin(phi);
      const sol = solve3(M + m11, m12, m13, Iz + m22, m23, Ix + m33, f1 * dt + b1, f2 * dt + b2, f3 * dt + b3);
      const dv = sol[0], dr = sol[1], dp = sol[2];
      const Xtot = Xs + Xc - Rf - Rw + r * (M * v + Iy);
      const du = (Xtot * dt) / (M * (1 + C.surgeAddedMassFrac));
      for (let mi = 0; mi < this.markers.length; mi++) {
        const m = this.markers[mi];
        const dP = m.G * m._c * (dv + dr * m._arm - dp * m._z) + m._dP; m._dP = 0;
        m.Plin += dP; m.Patt += dP * m._kf; // the reversible part, held as far as the station is attached
      }

      // ---- kinematics
      const cps = Math.cos(this.psi), sps = Math.sin(this.psi);
      this.u = u + du; this.v = v + dv; this.r = r + dr; this.p = p + dp;
      this.X += (this.u * sps + this.v * cps) * dt; this.Y += (this.u * cps - this.v * sps) * dt;
      this.psi += this.r * dt; this.phi += this.p * dt; this.t += dt;

      // ---- slices leave at one end and enter at the other
      const L = d0.L; let lo = Infinity, hi = -Infinity, removed = false;
      for (let mi = 0; mi < this.markers.length; mi++) { const m = this.markers[mi]; if (m.x < 0 || m.x > L) removed = true; else { if (m.x < lo) lo = m.x; if (m.x > hi) hi = m.x; } }
      if (removed) this.markers = this.markers.filter((m) => m.x >= 0 && m.x <= L);
      if (this.markers.length === 0) { if (this.u >= 0) { this.markers.push(this.newMarker(0)); lo = hi = 0; } else { this.markers.push(this.newMarker(L)); lo = hi = L; } }
      if (this.u > 0) while (lo >= d) { lo -= d; this.markers.unshift(this.newMarker(lo)); }
      if (this.u < 0) while (hi <= L - d) { hi += d; this.markers.push(this.newMarker(hi)); }

      o.keelY = Ykeel; o.rudderY = Yrud; o.rudderX = Xrud; o.hullX = Xc; o.friction = Rf; o.wave = Rw;
      o.rudderFlowDeg = flowW > 0 ? flowS / flowW / RAD : 0; o.rudderAttach = flowW > 0 ? attS / flowW : 1;
      o.nRud = Nrud; o.nHull = Nc - Nrud; o.nDrag = Ndrag; o.rudderAir = flowW > 0 ? airS / flowW : 0; o.rise = hR; o.rudderDepth = this.depthAt(this.rudderX, ch); o.rudderCover = this.at(d0.canoeDepth, this.rudderX) * ch - hR; o.entrained = m11; o.turnDrag = -r * (M * v + Iy);
    }

    /** Derived readouts. */
    speed() { return Math.hypot(this.u, this.v); }
    leewayDeg() { return Math.atan2(-this.v * (this.out.awaDeg >= 0 ? 1 : -1), Math.abs(this.u)) / RAD; }
    snapshot() {
      const o = this.out;
      return { t: this.t, X: this.X, Y: this.Y, psi: this.psi, phi: this.phi, u: this.u, v: this.v, r: this.r, delta: this.delta,
        crew: this.crew, mainSheet: this.mainSheet, jibSheet: this.jibSheet, jibSide: this.jibSide, boomDeg: o.boomDeg, jibDeg: o.jibDeg,
        sailX: o.sailX, sailY: o.sailY, keelY: o.keelY, rudderY: o.rudderY, rudderX: o.rudderX, rudderFlowDeg: o.rudderFlowDeg, rudderAttach: o.rudderAttach,
        fMain: o.fMain, fJib: o.fJib, awaDeg: o.awaDeg, aws: o.aws, wave: o.wave, friction: o.friction, sailsUp: o.sailsUp,
        speedKn: this.speed() / KN, leewayDeg: this.leewayDeg(), heelDeg: this.phi / RAD, rudderDeg: this.delta / RAD };
    }
  }

  function solve3(a11, a12, a13, a22, a23, a33, b1, b2, b3) {
    const c11 = a22 * a33 - a23 * a23, c12 = a13 * a23 - a12 * a33, c13 = a12 * a23 - a13 * a22;
    const det = a11 * c11 + a12 * c12 + a13 * c13;
    const c22 = a11 * a33 - a13 * a13, c23 = a12 * a13 - a11 * a23, c33 = a11 * a22 - a12 * a12;
    return [(c11 * b1 + c12 * b2 + c13 * b3) / det, (c12 * b1 + c22 * b2 + c23 * b3) / det, (c13 * b1 + c23 * b2 + c33 * b3) / det];
  }

  /** "Hold course" helper (optional in the page, used by the scripts): h4's stand-in helmsman, same for every boat. */
  function helmTo(b, courseRad, maxDeg) {
    return clamp(1.5 * (wrap(courseRad - b.psi) / RAD) - 1.5 * (b.r / RAD), -(maxDeg || 30), maxDeg || 30);
  }

  const PLACEHOLDERS = [
    'wave drag: Delft table, not the model',
    'sails: rigid, no cloth, no flapping, plate law past stall',
    'water carried round in a turn: slender estimate, unverified',
    'keel wash on rudder: likely too strong',
    'flat water, steady wind',
  ];
  return { Boat, C, KN, RAD, G0, helmTo, wrap, clamp, tableLookup, PLACEHOLDERS };
});
