"""All hulls: Wigley, Series 60, 36 Delft hulls.  Models: Michell, A, B, pure 2D+t (thin and body-exact), and w1's
stern-factor repair R1b for comparison -> out/w2.json.  Needs the Delft downloads in dl/ (NOTES.txt).  About 6 minutes."""
import json, time, numpy as np
from slice import *
from hulls import wigley
from common import tank, hull, usable, OUT
from repairs import r_base_visc
from s60 import series60, TANK, S_OVER_L2
KEYS = ('michell', 'A', 'B', 'slice_thin', 'slice_exact', 'work', 'michell_trans', 'A_trans', 'above_cut')
out = {}
def run(st, fns, L, nd_of_U, rho=1000.0):
    d = {k: [] for k in KEYS}; d['r1b'] = []
    for f in fns:
        U = f * np.sqrt(G * L); r = drags(st, U, rho=rho)
        for k in KEYS: d[k].append(float(r[k] / nd_of_U(U)))
        d['r1b'].append(float(r_base_visc(st, U, rho=rho)[2] / nd_of_U(U)))
    return d
# Wigley: reference = 1983 cooperative experiment band (pressure-integrated), as used in h3
st = wigley(M=28); S = 0.1487; wf = [0.25, 0.267, 0.289, 0.316]
d = run(st, wf, 1.0, lambda U: 0.5 * 1000 * U * U * S / 1e3); d.update(Fn=wf, ref=[(0.88, 1.15), (0.83, 0.98), (1.22, 1.37), (1.79, 2.00)])
out['wigley'] = d; print('wigley', {k: np.round(d[k], 3).tolist() for k in ('michell', 'A', 'B')}, flush=True)
st, info = series60(); fs = [float(f) for f in TANK[:, 0]]
d = run(st, fs, 1.0, lambda U: 0.5 * 1000 * U * U * S_OVER_L2 / 1e3); d.update(Fn=fs, CR=TANK[:, 1].tolist(), CW=TANK[:, 2].tolist())
out['s60'] = d; print('s60 A', ' '.join('%.2f' % (a / b) for a, b in zip(d['A'], d['CR'])), '| B', ' '.join('%.2f' % (a / b) for a, b in zip(d['B'], d['CR'])), flush=True)
FNS = [0.25, 0.30, 0.35, 0.40, 0.45, 0.50, 0.60]
order = sorted(usable(), key=lambda n: tank(int(n))['Lv'])
pick = [order[0], order[-1], order[len(order) // 2]] + order[1:-1]         # heaviest, lightest, middle first
seen = set()
for n in pick:
    if n in seen: continue
    seen.add(n); t0 = time.time()
    t = tank(int(n)); st = hull(int(n)); nd = t['rho'] * G * t['vol'] / 1e3
    d = run(st, FNS, t['L'], lambda U: nd, rho=t['rho'])
    Rr = np.interp(FNS, t['Fn'], t['Rr'])
    d.update(Fn=FNS, Rr=Rr.tolist(), Lv=t['Lv'], LB=t['LB'], BT=t['BT'])
    out[n] = d
    q = lambda k: ' '.join('%5.2f' % (x / y) for x, y in zip(d[k], Rr))
    print('%3s L/v %.2f L/B %.2f B/T %5.2f | Michell %s | A %s | B %s | 2D+t exact %s | %.0fs' % (n, t['Lv'], t['LB'], t['BT'], q('michell'), q('A'), q('B'), q('slice_exact'), time.time() - t0), flush=True)
    json.dump(out, open(OUT + 'w2.json', 'w'))
