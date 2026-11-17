"""Model C: slices for the waves that spread sideways, w1's blocking march (R3b) for the waves that follow astern.
Split at the Kelvin cusp direction sec(theta) = sqrt(3/2) (35.26 deg), not fitted.  Needs out/w2.json -> out/w2c.json"""
import json, numpy as np
from slice import *
from hulls import wigley
from common import tank, hull, OUT
from s60 import series60, TANK, S_OVER_L2
from hybrid import model_c
KEYS = ('C', 'A', 'r3b', 'michell', 'A_tr', 'r3b_tr', 'm_tr'); out = {}
def run(st, fns, L, nd_of_U, rho=1000.0):
    d = {k: [] for k in KEYS}
    for f in fns:
        U = f * np.sqrt(G * L); r = model_c(st, U, rho=rho)
        for k in KEYS: d[k].append(float(r[k] / nd_of_U(U)))
    return d
st = wigley(M=28); S = 0.1487; wf = [0.25, 0.267, 0.289, 0.316]
d = run(st, wf, 1.0, lambda U: 0.5 * 1000 * U * U * S / 1e3); d['Fn'] = wf; out['wigley'] = d; print('wigley C', np.round(d['C'], 2), 'A', np.round(d['A'], 2), flush=True)
st, info = series60(); fs = [float(f) for f in TANK[:, 0]]
d = run(st, fs, 1.0, lambda U: 0.5 * 1000 * U * U * S_OVER_L2 / 1e3); d.update(Fn=fs, CR=TANK[:, 1].tolist()); out['s60'] = d
print('s60 C', ' '.join('%.2f' % (a / b) for a, b in zip(d['C'], d['CR'])), flush=True)
FNS = [0.25, 0.30, 0.35, 0.40, 0.45, 0.50, 0.60]
w2 = json.load(open(OUT + 'w2.json'))
for n in [k for k in w2 if k not in ('wigley', 's60')]:
    t = tank(int(n)); st = hull(int(n)); nd = t['rho'] * G * t['vol'] / 1e3
    d = run(st, FNS, t['L'], lambda U: nd, rho=t['rho']); Rr = np.interp(FNS, t['Fn'], t['Rr']); d.update(Fn=FNS, Rr=Rr.tolist(), Lv=t['Lv'])
    out[n] = d
    q = lambda k: ' '.join('%5.2f' % (x / y) for x, y in zip(d[k], Rr))
    print('%3s L/v %.2f | C %s | A %s | R3b %s | transverse part/tank: A %s  R3b %s  Michell %s' % (n, t['Lv'], q('C'), q('A'), q('r3b'), q('A_tr'), q('r3b_tr'), q('m_tr')), flush=True)
    json.dump(out, open(OUT + 'w2c.json', 'w'))
