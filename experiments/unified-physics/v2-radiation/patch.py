import re
p='model.js'; s=open(p).read()
def rep(a,b,cnt=1):
    global s
    assert s.count(a)>=1, a[:60]
    s=s.replace(a,b,cnt)
# constants
rep("    heel: { rise: true,", """    // v1-seaway (all global)
    SEA: true,                // heave and pitch from the slice law; false gives v3 back exactly
    CD_HEAVE: 0.6,            // cross-flow drag of a round section moving vertically, on its waterline breadth: the same CD_ROUND as the lateral law
    RADIATION: 0,             // 0 = the slice law as proposed (no wave radiation). REFERENCE ONLY: a frequency [rad/s] at which the classical 2D
                              // heave radiation damping b = rho g^2 Abar^2 / w^3, Abar = 2 sin(w^2 B / 2g) exp(-w^2 Tm / g) (Jensen, Mansour & Olsen 2004) is added per section
    heel: { rise: true,""")
# sea factory before class Boat
rep("  class Boat {", r"""  /** v1-seaway. A spectral sea of analytic deep-water components (same form as packages/sim-ocean: JONSWAP frequency density,
   *  Donelan sech^2 spreading), from wind speed U10 and fetch through the build's fetch laws (alpha = 0.076 X^-0.22,
   *  fp U/g = 3.5 X^-0.33). dir = direction the wind blows FROM (rad, 0 = north); waves run downwind. Or one regular wave: { regular: {a, lambda}, dir }. */
  function makeSea(o) {
    const g = G0, comps = [], dirTo = (o.dir || 0) + Math.PI; let info;
    if (o.regular) { const k = 2 * Math.PI / o.regular.lambda, w = Math.sqrt(g * k); comps.push({ a: o.regular.a, k, w, kx: k * Math.sin(dirTo), ky: k * Math.cos(dirTo), ph: 0 }); info = { Hs: 2 * o.regular.a, Tp: 2 * Math.PI / w, Lp: o.regular.lambda }; }
    else {
      const U = o.wind, Xf = g * o.fetch / (U * U), alpha = 0.076 * Math.pow(Xf, -0.22), wp = 2 * Math.PI * 3.5 * Math.pow(Xf, -0.33) * g / U, gam = o.gamma === undefined ? 1 : o.gamma;
      const Sw = (w) => { const sg = w <= wp ? 0.07 : 0.09, e = Math.exp(-0.5 * sq((w - wp) / (sg * wp))); return alpha * g * g * Math.pow(w, -5) * Math.exp(-1.25 * Math.pow(wp / w, 4)) * Math.pow(gam, e); };
      const nf = o.nf || 28, nd = o.nd || 5, w0 = 0.6 * wp, w1 = 3.2 * wp; let seed = o.seed || 12345, m0 = 0; const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
      for (let i = 0; i < nf; i++) { // geometric spacing so the many short components do not repeat early
        const wa = w0 * Math.pow(w1 / w0, i / nf), wb = w0 * Math.pow(w1 / w0, (i + 1) / nf), w = wa + (wb - wa) * (0.25 + 0.5 * rnd()), k = w * w / g, E = Sw(w) * (wb - wa); m0 += E;
        const rr = w / wp, beta = rr < 0.95 ? 2.61 * Math.pow(rr, 1.3) : rr < 1.6 ? 2.28 * Math.pow(rr, -1.3) : 1.24;
        for (let j = 0; j < nd; j++) { // equal-variance directions: quantiles of the sech^2 law
          const uq = (j + 0.25 + 0.5 * rnd()) / nd, th = Math.atanh((2 * uq - 1) * Math.tanh(beta * Math.PI)) / beta, d = dirTo + th;
          comps.push({ a: Math.sqrt(2 * E / nd), k, w, kx: k * Math.sin(d), ky: k * Math.cos(d), ph: 2 * Math.PI * rnd() }); }
      }
      info = { Hs: 4 * Math.sqrt(m0), Tp: 2 * Math.PI / wp, Lp: 2 * Math.PI * g / (wp * wp), alpha, wind: U, fetch: o.fetch, gamma: gam };
    }
    const nc = comps.length;
    return { comps, info, nc,
      height(X, Y, t) { let e = 0; for (let j = 0; j < nc; j++) { const c = comps[j]; e += c.a * Math.cos(c.kx * X + c.ky * Y - c.w * t + c.ph); } return e; } };
  }

  class Boat {""")
# constructor: sea tables
rep("      this.reset(init);\n    }\n    reset(init) {", """      this.sd = data.sea || null;
      if (this.sd) { const sd = this.sd, ns = sd.stations.length, k0 = Math.round(-sd.h0 / sd.dh); this.ns = ns;
        this.sS0 = new Float64Array(ns); this.sTm = new Float64Array(ns); this.sArm = new Float64Array(ns);
        for (let i = 0; i < ns; i++) { const q = sd.stations[i]; this.sS0[i] = q.S[k0]; this.sTm[i] = q.B[k0] > 1e-6 ? q.S[k0] / q.B[k0] : 0; this.sArm[i] = data.xcg - q.s; }
        for (const k of ['eta', 'etaE', 'wo', 'slx', 'sly', 'vo', 'wetB', 'imm', 'P', 'wrelS', 'fdyn']) this['s_' + k] = new Float64Array(ns); }
      this.reset(init);
    }
    reset(init) {""")
rep("      this.delta = 0; this.deltaDot = 0;", "      this.zeta = init.zeta || 0; this.theta = (init.thetaDeg || 0) * RAD; this.wz = 0; this.q = 0; this.Pwz = 0; this.Pwq = 0; this.seaInit = false; this.accBow = 0; this.accCockpit = 0;\n      this.delta = 0; this.deltaDot = 0;")
# apparent wind feels pitch rate
rep("const ax = twx - u, ay = (twy - (v + r * aMast + p * hCE)) * ch;", "const ax = twx - u - (C.SEA && this.sd ? this.q * hCE : 0), ay = (twy - (v + r * aMast + p * hCE)) * ch; // v1: a pitching rig moves through the air")
# seaway block before water
rep("      // ---- water\n", r"""      // ---- v1-seaway: heave and pitch by the same slice law, in the proposal's body-coordinate form.
      // Per section: water's vertical impulse P = rho a33(immersed shape now) w_rel, force on the hull -(dP/dt + U dP/ds) (s aft).
      // d/dt of a33 at the instantaneous waterline is the entry (slam) term; U dP/ds is the Munk pitch moment and what leaves at an
      // immersed counter. Buoyancy and wave pressure: rho g x (area under the local wave surface), the wave's elevation attenuated
      // with depth (Smith) by exp(-k x mean static draft of that section). Integrated in total momentum (boat + water) below.
      const SEA = C.SEA && this.sd, sea = env.sea || null; let Fz = 0, Mq = 0, m33 = 0, m35 = 0, m55 = 0, Pex = 0, Pexq = 0, XseaFK = 0, YseaFK = 0, NseaFK = 0, slyS = 0, slyW = 0, Fdrag = 0;
      if (SEA) {
        const sd = this.sd, ns = this.ns, ds = sd.ds, eta = this.s_eta, etaE = this.s_etaE, wo = this.s_wo, slx = this.s_slx, sly = this.s_sly, vo = this.s_vo;
        const sps0 = Math.sin(this.psi), cps0 = Math.cos(this.psi), sth = Math.sin(this.theta), cth = Math.cos(this.theta);
        eta.fill(0); etaE.fill(0); wo.fill(0); slx.fill(0); sly.fill(0); vo.fill(0);
        if (sea) { const cs = sea.comps, t = this.t;
          for (let j = 0; j < sea.nc; j++) { const c = cs[j], kf = c.kx * sps0 + c.ky * cps0, kl = c.kx * cps0 - c.ky * sps0, ph0 = c.kx * this.X + c.ky * this.Y - c.w * t + c.ph;
            for (let i = 0; i < ns; i++) { const arm = this.sArm[i] * cth, ph = ph0 + kf * arm, co = Math.cos(ph), si = Math.sin(ph), at = c.a * Math.exp(-c.k * this.sTm[i]);
              eta[i] += c.a * co; etaE[i] += at * co; wo[i] += at * c.w * si; slx[i] -= at * kf * si; sly[i] -= at * kl * si; vo[i] += at * c.w * co * kl / c.k; } } }
        const rhoS = rho, P = this.s_P, cdh = C.CD_HEAVE, wR = C.RADIATION; let Pprev = 0, Fconv = 0, Mconv = 0;
        const tab = (arr, h) => { const a = clamp((h - sd.h0) / sd.dh, 0, sd.nh - 1), k = Math.min(sd.nh - 2, Math.floor(a)); return arr[k] + (arr[k + 1] - arr[k]) * (a - k); };
        for (let i = 0; i < ns; i++) { const q = sd.stations[i], arm = this.sArm[i], zs = this.zeta + arm * sth, h = eta[i] - zs, hE = etaE[i] - zs;
          const a33 = tab(q.A, h), B = tab(q.B, h), Sb = tab(q.S, hE), wpart = -u * sth - wo[i], wrel = this.wz + arm * this.q + wpart, g33 = rhoS * a33 * ds;
          this.s_wetB[i] = B; this.s_imm[i] = h; this.s_wrelS[i] = wrel;
          m33 += g33; m35 += g33 * arm; m55 += g33 * arm * arm; Pex += g33 * wpart; Pexq += g33 * arm * wpart;
          let f = rhoS * G0 * (Sb - this.sS0[i]) * ds;                                  // buoyancy and wave pressure (less the still-water share that carries the weight)
          let fd = -0.5 * rhoS * cdh * B * Math.abs(wrel) * wrel * ds;             // cross-flow drag of the section moving vertically through the water
          if (wR > 0 && B > 1e-6) { const kk = wR * wR / G0, Ab = 2 * Math.sin(Math.min(Math.PI / 2, kk * B / 2)) * Math.exp(-kk * (tab(q.S, h) / B)); fd -= rhoS * G0 * G0 * Ab * Ab / (wR * wR * wR) * wrel * ds; }
          const Pi = rhoS * a33 * wrel, fc = u >= 0 ? -u * (Pi - Pprev) : 0; Pprev = Pi; P[i] = Pi; // what the moving hull carries along: -U dP/ds, upwind difference
          Fconv += fc; Mconv += fc * arm; Fdrag += fd; this.s_fdyn[i] = fd + fc;
          Fz += f + fd + fc; Mq += (f + fd + fc) * arm;
          XseaFK -= rhoS * G0 * Sb * slx[i] * ds; const fy = -rhoS * G0 * Sb * sly[i] * ds; YseaFK += fy; NseaFK += fy * arm; slyS += Sb * sly[i]; slyW += Sb; }
        if (u < 0) { let Pn = 0; for (let i = ns - 1; i >= 0; i--) { const fc = u * (P[i] - Pn); Pn = P[i]; Fz += fc; Mq += fc * this.sArm[i]; } }
      }
      const seaSlope = slyW > 0 ? Math.atan(slyS / slyW) : 0;
      // ---- water
""")
# orbital velocity felt by the lateral slices
rep("        const wlat = v + r * arm - p * z;", "        const wlat = v + r * arm - p * z - (SEA && sea ? this.s_vo[clamp(Math.round((xm - this.sd.stations[0].s) / this.sd.ds), 0, this.ns - 1)] : 0); // v1: less the wave's orbital velocity across the hull")
# total momentum
rep("const f1 = Yc + Ys - M * u * r, f2 = Nc + Ns + (env.yawMoment || 0), f3 = Kc + Ks + Kcrew - M * G0 * d0.GM * Math.sin(phi);",
    "const f1 = Yc + Ys + YseaFK - M * u * r, f2 = Nc + Ns + NseaFK + (env.yawMoment || 0), f3 = Kc + Ks + Kcrew - M * G0 * d0.GM * Math.sin(phi + seaSlope); // v1: wave pressure pushes sideways and turns; the hull rights itself to the local wave slope")
rep("      const Xtot = Xs + Xc - Rf - Rw + r * (M * v + Iy);", r"""      // v1: heave and pitch, total momentum of boat and entrained water: (M + m33) wz' + m35 q' + Pex = M wz + (water's impulse last step) + F dt
      let XseaDyn = 0;
      if (SEA) {
        const Iyy = M * sq(this.sd.kPitch), hCEp = rig.freeboard + rig.BAS + 0.39 * rig.P;
        if (!this.seaInit) { this.Pwz = m33 * this.wz + m35 * this.q + Pex; this.Pwq = m35 * this.wz + m55 * this.q + Pexq; this.seaInit = true; }
        const Mp = Mq - Xs * hCEp; // the sails' drive acts high up: bow-down moment
        const r1 = M * this.wz + this.Pwz - Pex + Fz * dt, r2 = Iyy * this.q + this.Pwq - Pexq + Mp * dt;
        const a11 = M + m33, a12 = m35, a22 = Iyy + m55, det = a11 * a22 - a12 * a12, wzN = (r1 * a22 - r2 * a12) / det, qN = (a11 * r2 - a12 * r1) / det;
        const PwzN = m33 * wzN + m35 * qN + Pex;
        // the dynamic vertical force acts square to the hull's own axis, so a pitched hull feels part of it fore and aft
        XseaDyn = -(-(PwzN - this.Pwz) / dt + Fz - 0) * 0 - ((-(PwzN - this.Pwz) / dt) + Fdrag) * Math.sin(this.theta);
        const armB = d0.xcg - this.sd.stations[0].s, armC = d0.xcg - 5.0;
        this.accBow = (wzN - this.wz + armB * (qN - this.q)) / dt; this.accCockpit = (wzN - this.wz + armC * (qN - this.q)) / dt;
        this.Pwz = PwzN; this.Pwq = m35 * wzN + m55 * qN + Pexq; this.wz = wzN; this.q = qN;
        this.zeta += this.wz * dt; this.theta += this.q * dt;
        o.seaX = XseaFK + XseaDyn; o.seaFK = XseaFK; o.m33 = m33; o.m55 = m55;
      }
      const Xtot = Xs + Xc - Rf - Rw + r * (M * v + Iy) + XseaFK + XseaDyn;""")
rep("  return { Boat, C, KN,", "  return { makeSea, Boat, C, KN,")
open(p,'w').write(s)
