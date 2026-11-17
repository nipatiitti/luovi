# Applies the critic's test knobs to a COPY of h4-tack/code/sim.mjs (run in that copy's folder).
s=open('sim.mjs').read()
def rep(a,b):
    global s
    assert s.count(a)==1,a
    s=s.replace(a,b)
rep("const sq = (a) => a * a;","const sq = (a) => a * a;\nexport const KNOB = { gScale: 1, iyScale: 1, washScale: 1, suctionLoss: false, sailHold: false };")
rep("const wash = m.Aw > 0 ? (m.Pw / m.Aw) * Math.min(1, A1 > 0 ? m.Aw / A1 : 1) : 0;","const wash = KNOB.washScale * (m.Aw > 0 ? (m.Pw / m.Aw) * Math.min(1, A1 > 0 ? m.Aw / A1 : 1) : 0);")
rep("const suction = rho * d * invU * (w * dPconv) / dt;","const sucK = KNOB.suctionLoss && Math.abs(m.Plin) > 1e-12 ? Math.min(1, Math.abs(m.Patt / m.Plin)) ** 2 : 1;\n      const suction = sucK * rho * d * invU * (w * dPconv) / dt;")
rep("const g = rho * d * m.G;","const g = KNOB.gScale * rho * d * m.G;")
rep("const Xtot = Xs + Xc - Rf - Rw + r * (M * v + Iy);","const Xtot = Xs + Xc - Rf - Rw + r * (M * v + KNOB.iyScale * Iy);\n    this.out.XsAll = Xs; this.out.rMv = r * M * v; this.out.rIy = r * KNOB.iyScale * Iy; this.out.Rf = Rf; this.out.Rw = Rw; this.out.Xc = Xc;")
open('sim.mjs','w').write(s)
