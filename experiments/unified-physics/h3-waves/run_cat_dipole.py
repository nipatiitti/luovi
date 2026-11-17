import json, numpy as np
import os; OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'out'); os.makedirs(OUT, exist_ok=True)  # git-ignored
from wave import *; from hulls import *
out = {}
# ---- Wigley sanity
S = 0.1487
fn = [0.25, 0.267, 0.289, 0.316, 0.35, 0.40, 0.45, 0.50]
st = wigley()
out['wigley'] = {f: resistance(st, f * np.sqrt(G)) / (0.5 * 1000 * f * f * G * S) * 1e3 for f in fn}
print('Wigley Cw e3', {k: round(v, 3) for k, v in out['wigley'].items()})
fl = np.array([0.05, 0.06, 0.08, 0.10, 0.12, 0.15])
print('low Fn Cw e3', [round(resistance(st, f * np.sqrt(G)) / (0.5 * 1000 * f * f * G * S) * 1e3, 4) for f in fl])
# ---- catamaran: Wigley demihulls L/B 10, B/T 1.6
L = 1.0; B = 0.1; T = B / 1.6
d = wigley(L, B, T, N=61)
Fns = np.round(np.arange(0.2, 1.001, 0.025), 3)
tau = {}
for s in (0.2, 0.3, 0.4, 0.5):
    tau[s] = []
    for f in Fns:
        Rp, R1, R2 = pair_resistance(d, d, s * L, f * np.sqrt(G * L))
        tau[s].append(Rp / (R1 + R2))
    a = np.array(tau[s])
    print('S/L %.1f tau max %.2f at Fn %.3f, min %.2f at Fn %.3f, at 0.33: %.2f at 0.5: %.2f at 0.9: %.2f' % (
        s, a.max(), Fns[a.argmax()], a.min(), Fns[a.argmin()], np.interp(0.33, Fns, a), np.interp(0.5, Fns, a), np.interp(0.9, Fns, a)))
out['cat'] = dict(Fn=Fns.tolist(), tau={str(k): v for k, v in tau.items()})
# one hull lifting out at S/L 0.3, Fn 0.5
lift = []
U = 0.5 * np.sqrt(G * L)
R0 = resistance(d, U)
for h in np.linspace(0, 1, 11):
    d2 = wigley(L, B, T, N=61, lift=h * T)
    Rp, R1, R2 = pair_resistance(d, d2, 0.3 * L, U)
    lift.append((h, Rp / R0, R2 / R0))
print('lift (fraction of draft, pair drag / one hull, lifted hull alone / one hull):')
print(' '.join('%.1f:%.2f/%.2f' % l for l in lift))
out['lift'] = lift
# ---- wave drag due to side force: lateral dipole (keel circulation left in the wake)
rho = 1025.0
Lw = 6.3; Tk = 1.3; Tc = 0.40; chord = 0.9; xk = 0.2     # H-boat-like: waterline, draft, canoe depth, keel chord, keel mid position
Fside = 1500.0
def dipole_stack(U, shape, ch=chord):
    zz = -Tk * np.linspace(0, 1, 60) ** 1.3
    ell = np.sqrt(np.maximum(1 - (zz / Tk) ** 2, 0))
    if shape == 'to_surface':      # rigid-lid image: full circulation carried to the waterline by the hull
        g = ell
    elif shape == 'fades_in_hull': # circulation falls linearly to zero through the canoe body depth
        g = ell * np.clip(-zz / Tc, 0, 1)
    g0 = Fside / (rho * U * np.trapezoid(g[::-1], zz[::-1]))   # side force = rho U int Gamma dz
    Gam = g0 * g
    x = np.array([xk - ch / 2, xk + ch / 2])                    # impulse builds linearly over the chord, then stays in the wake
    Y = np.vstack([Gam, 0 * Gam]) / (2 * U)                     # source-equivalent offset: mu/(2U); mu = 0 ahead, Gamma behind
    return dict(x=x, z=np.vstack([zz, zz]), Y=Y)
def dip_R(U, shape, ch=chord, lam_max=40):
    k0 = G / U ** 2
    t, w = tgrid(k0, Lw, lam_max)
    J = kochin(dipole_stack(U, shape, ch), k0, t) * np.sinh(t)
    return 4 * rho * G ** 2 / (np.pi * U ** 2) * np.sum(w * np.cosh(t) ** 2 * np.abs(J) ** 2)
res = {}
for shape in ('to_surface', 'fades_in_hull'):
    row = []
    for f in (0.2, 0.25, 0.3, 0.35, 0.4, 0.5):
        U = f * np.sqrt(G * Lw)
        Di = Fside ** 2 / (np.pi * rho * U ** 2 * Tk ** 2)
        row.append((f, dip_R(U, shape), Di))
    res[shape] = row
    print(shape, ' '.join('Fn%.2f: %.1fN = %.0f%% of induced %.0fN;' % (f, r, 100 * r / Di, Di) for f, r, Di in row))
U = 0.35 * np.sqrt(G * Lw)
print('sensitivity at Fn 0.35: chord 0.5/0.9/1.5 m:', [round(dip_R(U, 'to_surface', c), 1) for c in (0.5, 0.9, 1.5)],
      [round(dip_R(U, 'fades_in_hull', c), 1) for c in (0.5, 0.9, 1.5)], 'cutoff 20/40/80:', [round(dip_R(U, 'to_surface', 0.9, lm), 1) for lm in (20, 40, 80)])
out['dipole'] = res
json.dump(out, open(os.path.join(OUT, 'cat_dipole.json'), 'w'))
