"""The two demo boats' canoe bodies as section stacks for slice.py (x forward, z down from the static waterline)."""
import json, os, numpy as np
HERE = os.path.dirname(os.path.abspath(__file__))
KN = 0.5144; RHO = 1000.0; NU = 1.19e-6; G = 9.81      # the reference model's water and knot

def load(): return json.load(open(os.path.join(HERE, 'boat_sections.json')))

def stack(b, M=48):
    u = np.linspace(0, 1, M) ** 1.5                     # denser near the waterline, as for the Delft hulls
    if b['kind'] == 'ellipse':
        s = b['dx'] * np.arange(len(b['halfBeam'])); hb = np.array(b['halfBeam']); T = np.array(b['canoeDepth'])
        z = -T[:, None] * u[None]; Y = hb[:, None] * np.sqrt(np.maximum(1 - u[None] ** 2, 0.0))
    else:
        s = [b['ends'][0]]; zs = [np.zeros(M)]; Ys = [np.zeros(M)]
        for q in b['stations']:
            h = np.array(q['half']); zz = h[-1, 0] * u         # h runs from the waterline down to the keel line
            s.append(q['s']); zs.append(zz); Ys.append(np.interp(-zz, -h[:, 0], h[:, 1]))
        s.append(b['ends'][1]); zs.append(np.zeros(M)); Ys.append(np.zeros(M))
        s = np.array(s); z = np.array(zs); Y = np.array(Ys)
    Y[:, -1] = 0.0
    area = 2 * np.trapezoid(Y[:, ::-1], z[:, ::-1], axis=1)
    return dict(x=-(s - s[0]), z=z, Y=Y, b=Y[:, 0].copy(), area=area)

def friction(b, V):
    """Skin friction as the reference model takes it: ITTC-57 line on the waterline length, whole wetted area."""
    Re = np.maximum(1e5, V * b['L'] / NU)
    return 0.5 * RHO * b['wetted'] * 0.075 / (np.log10(Re) - 2) ** 2 * V * V

def table(rr, Fn):
    """The reference model's reading of a [[Fn, fraction], ...] table: linear between points, fourth power below the first."""
    f = np.array([q[0] for q in rr]); v = np.maximum(0.0, np.array([q[1] for q in rr]))
    return np.where(Fn <= f[0], v[0] * (Fn / f[0]) ** 4, np.interp(Fn, f, v))
