# patch2.py: the exact edits that turn v1-seaway's model.js (plus the diagnostic switches used in chk_src*.mjs) into v2-radiation's.
s=open('model.js').read()
def rep(a,b):
    global s
    assert s.count(a)==1,a[:50]; s=s.replace(a,b)
rep("    SEA: true,","""    MEMORY: true,             // v2: per-section wave-radiation force with memory (no frequency supplied anywhere)
    MEM_BLOCKS: 2,            // spring-damper-mass blocks per section (2 states each)
    SEA: true,""")
rep("  class Boat {", r"""  /** v2-radiation. The classical 2D heave radiation damping of a section of waterline breadth B and mean draft Tm,
   *  b(w) = rho g^2 Abar^2 / w^3, Abar = 2 sin(min(k B / 2, pi/2)) exp(-k Tm), k = w^2 / g, written without dimensions:
   *  b = rho sqrt(g) B^1.5 2^-1.5 bh(Om; tau), Om = w sqrt(B / 2g), tau = Tm / B, bh = 4 sin^2(min(Om^2, pi/2)) exp(-4 tau Om^2) / Om^3.
   *  One family in tau. For each tau on a grid, fitted ONCE at load by a sum of nb passive blocks
   *  K(s) = kap s / (s^2 + a s + Om0^2)  (a spring, a damper and a mass in series), Re K = kap a Om^2 / ((Om0^2 - Om^2)^2 + a^2 Om^2) >= 0.
   *  K(0) = 0 (a steady cross-flow feels no radiation force), K(inf) = 0 (the impact-limit added mass stays whole in the momentum term). */
  const radTarget = (Om, tau) => 4 * sq(Math.sin(Math.min(Om * Om, Math.PI / 2))) * Math.exp(-4 * tau * Om * Om) / (Om * Om * Om);
  const radBlocks = (p, nb, Om) => { let b = 0; for (let j = 0; j < nb; j++) { const kap = Math.exp(p[3 * j]), a = Math.exp(p[3 * j + 1]), o2 = Math.exp(2 * p[3 * j + 2]); b += kap * a * Om * Om / (sq(o2 - Om * Om) + a * a * Om * Om); } return b; };
  function fitRadiation(nb) {
    const taus = [], nT = 25; for (let i = 0; i < nT; i++) taus.push(0.004 * Math.pow(2 / 0.004, i / (nT - 1)));
    const Oms = []; for (let i = 1; i <= 100; i++) Oms.push(0.04 * i);
    const tab = [], errs = []; let p = null;
    const nm = (f, x0) => { const n = x0.length; let S = [x0.slice()]; for (let i = 0; i < n; i++) { const y = x0.slice(); y[i] += 0.3; S.push(y); } let F = S.map(f);
      for (let it = 0; it < 4000; it++) { const idx = F.map((v, i) => i).sort((a, b) => F[a] - F[b]); S = idx.map((i) => S[i]); F = idx.map((i) => F[i]); if (F[n] - F[0] < 1e-12 * (1e-9 + F[0])) break;
        const c = new Array(n).fill(0); for (let i = 0; i < n; i++) for (let k = 0; k < n; k++) c[k] += S[i][k] / n;
        const pt = (t) => c.map((ck, k) => ck + t * (S[n][k] - ck)); let xr = pt(-1), fr = f(xr);
        if (fr < F[0]) { const xe = pt(-2), fe = f(xe); if (fe < fr) { S[n] = xe; F[n] = fe; } else { S[n] = xr; F[n] = fr; } }
        else if (fr < F[n - 1]) { S[n] = xr; F[n] = fr; }
        else { const xc = pt(fr < F[n] ? -0.5 : 0.5), fc = f(xc); if (fc < Math.min(fr, F[n])) { S[n] = xc; F[n] = fc; } else { for (let i = 1; i <= n; i++) { S[i] = S[i].map((v, k) => S[0][k] + 0.5 * (v - S[0][k])); F[i] = f(S[i]); } } } }
      return S[0]; };
    for (let it = 0; it < taus.length; it++) { const tau = taus[it], tg = Oms.map((O) => radTarget(O, tau)), norm = tg.reduce((s, v) => s + v * v, 0);
      const cost = (q) => { let e = 0; for (let i = 0; i < Oms.length; i++) e += sq(radBlocks(q, nb, Oms[i]) - tg[i]); return e / norm; };
      const starts = p ? [p] : []; // several starts (centre frequencies spread over the band), the previous tau's answer first; the best is kept
      for (const [lo, hi] of [[0.3, 1.2], [0.5, 1.6], [0.2, 0.9], [0.7, 2.2]]) { const q = []; for (let j = 0; j < nb; j++) { const o = nb > 1 ? lo * Math.pow(hi / lo, j / (nb - 1)) : Math.sqrt(lo * hi); q.push(Math.log(1.5 * o), Math.log(0.9 * o), Math.log(o)); } starts.push(q); }
      let best = Infinity; for (let q of starts) { for (let r = 0; r < 3; r++) q = nm(cost, q); const c = cost(q); if (c < best) { best = c; p = q; } }
      { const bl = []; for (let j = 0; j < nb; j++) bl.push(p.slice(3 * j, 3 * j + 3)); bl.sort((x, y) => x[2] - y[2]); p = [].concat(...bl); } // blocks in order of centre frequency, so that interpolating between taus is smooth
      tab[it] = p.slice(); errs[it] = Math.sqrt(cost(p)); }
    return { nb, taus, tab, errs, lt0: Math.log(taus[0]), dlt: Math.log(taus[1] / taus[0]) };
  }
  let RADFIT = null;

  class Boat {""")
rep("      this.reset(init);\n    }","""      if (this.sd) { if (!RADFIT || RADFIT.nb !== C.MEM_BLOCKS) RADFIT = fitRadiation(C.MEM_BLOCKS); const n = this.ns * C.MEM_BLOCKS;
        for (const k of ['x1', 'x2', 'bet', 'om', 'm1', 'g']) this['r_' + k] = new Float64Array(n); this.r_c = new Float64Array(this.ns); this.r_f = new Float64Array(this.ns); this.r_wp = new Float64Array(this.ns); }
      this.reset(init);
    }""")
rep("this.seaInit = false;","this.seaInit = false; if (this.r_x1) { this.r_x1.fill(0); this.r_x2.fill(0); }")
# per section: memory force, linearised in this step's new vertical velocity (implicit, like the added mass)
rep("          const Pi = rhoS * a33 * wrel, fc = u >= 0","""          if (MEM) { // v2: radiation memory. Block states x1 (spring), x2 (mass), energy (x1^2 + x2^2)/2; force on the hull -sum beta x1 at the step's midpoint
            let cI = 0, f0 = 0; const i0 = i * nb;
            if (B > 1e-3) { const tau = clamp(tab(q.S, h) / B, RF.taus[0], 2), ft = clamp((Math.log(tau) - RF.lt0) / RF.dlt, 0, RF.taus.length - 1.001), it = Math.floor(ft), fr = ft - it, pa = RF.tab[it], pb = RF.tab[it + 1];
              const tB = Math.sqrt(B / (2 * G0)), sc = rhoS * Math.sqrt(G0) * B * Math.sqrt(B) * 0.35355339 * ds / tB;
              for (let j = 0; j < nb; j++) { const kap = sc * Math.exp(pa[3 * j] + fr * (pb[3 * j] - pa[3 * j])), a = Math.exp(pa[3 * j + 1] + fr * (pb[3 * j + 1] - pa[3 * j + 1])) / tB, om = Math.exp(pa[3 * j + 2] + fr * (pb[3 * j + 2] - pa[3 * j + 2])) / tB;
                const bet = Math.sqrt(kap), D = 2 + a * dt + 0.5 * om * om * dt * dt, m0 = (2 * this.r_x1[i0 + j] - dt * om * this.r_x2[i0 + j]) / D, g = dt * bet / D; // midpoint x1 = m0 + g w_new
                this.r_bet[i0 + j] = bet; this.r_om[i0 + j] = om; this.r_m1[i0 + j] = m0; this.r_g[i0 + j] = g; f0 -= bet * m0; cI += bet * g; }
            } else for (let j = 0; j < nb; j++) { this.r_bet[i0 + j] = 0; this.r_om[i0 + j] = 0; this.r_m1[i0 + j] = 0; this.r_x1[i0 + j] = 0; this.r_x2[i0 + j] = 0; }
            this.r_c[i] = cI; this.r_wp[i] = wpart; const fm = f0 - cI * wpart; this.r_f[i] = f0 - cI * wrel; fd += this.r_f[i]; // (fd carries last step's velocity for the bookkeeping below; the solve uses the new one)
            Fz += fm - this.r_f[i]; Mq += (fm - this.r_f[i]) * arm; c33 += cI; c35 += cI * arm; c55 += cI * arm * arm; }
          const Pi = rhoS * a33 * wrel, fc = u >= 0""")
rep("const rhoS = rho, P = this.s_P,","const MEM = C.MEMORY, RF = RADFIT, nb = C.MEM_BLOCKS; c33 = 0; c35 = 0; c55 = 0;\n        const rhoS = rho, P = this.s_P,")
rep("let Fz = 0, Mq = 0, h33 = 0,","let c33 = 0, c35 = 0, c55 = 0, Fz = 0, Mq = 0, h33 = 0,")
rep("const a11 = M + h33, a12 = h35, a22 = Iyy + h55,","const a11 = M + h33 + c33 * dt, a12 = h35 + c35 * dt, a22 = Iyy + h55 + c55 * dt,")
rep("        const PwzN = h33 * wzN + h35 * qN + Pex;","""        const PwzN = h33 * wzN + h35 * qN + Pex;
        if (C.MEMORY) { const nb = C.MEM_BLOCKS, x1 = this.r_x1, x2 = this.r_x2; let Erad = 0; // advance the memory states (trapezoid: exactly energy-conserving apart from the block's own damper)
          for (let i = 0; i < this.ns; i++) { const wN = wzN + this.sArm[i] * qN + this.r_wp[i];
            for (let j = 0, k = i * nb; j < nb; j++, k++) { const bet = this.r_bet[k]; if (bet === 0) continue; const m1 = this.r_m1[k] + this.r_g[k] * wN; x1[k] = 2 * m1 - x1[k]; x2[k] += dt * this.r_om[k] * m1; } } }""")
open('model.js','w').write(s)
