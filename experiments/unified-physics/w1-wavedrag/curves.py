"""Fine speed curves (plain sum, R1b, R3b) for the GIFs -> out/curves.json.  Drag as % of boat weight."""
import json, numpy as np
from common import *
from repairs import *
from s60 import series60, TANK, S_OVER_L2
out = {}
def sweep(st, L, fns, nd_of_U, rho=1000.0):
    d = dict(Fn=list(map(float, fns)), base=[], r1b=[], r3b=[])
    for f in fns:
        U = f * np.sqrt(G * L); nd = nd_of_U(U)
        a = r_base_visc(st, U, rho=rho); c = r_march(st, U, rho=rho, gap_k0=1.0)
        d['base'].append(a[0] / nd); d['r1b'].append(a[2] / nd); d['r3b'].append(c[1] / nd)
    return d
fine = np.round(np.arange(0.18, 0.6001, 0.0125), 4)
for n in (6, 1, 26):
    t = tank(n); st = hull(n); w = t['rho'] * G * t['vol']
    d = sweep(st, t['L'], fine, lambda U: w / 100, rho=t['rho'])
    m = t['Fn'] > 0.17
    d.update(tFn=t['Fn'][m].tolist(), tR=(t['Rr'][m] / 10).tolist(), x=st['x'].tolist(), b=st['b'].tolist(), L=t['L'], Lv=t['Lv'], LB=t['LB'], BT=t['BT'])
    out[str(n)] = d; print(n, 'done', flush=True)
st, info = series60(); vol = float(np.trapezoid(st['area'], st['x']))
fs = np.round(np.arange(0.18, 0.3601, 0.0075), 4)
d = sweep(st, 1.0, fs, lambda U: 1000 * G * vol / 100)
k = 0.5 * TANK[:, 0] ** 2 * S_OVER_L2 / vol * 100 / 1e3          # coefficient x1000 -> % of weight
d.update(tFn=TANK[:, 0].tolist(), tR=(TANK[:, 1] * k).tolist(), tRw=(TANK[:, 2] * k).tolist(), x=st['x'].tolist(), b=st['b'].tolist(), L=1.0)
out['s60'] = d
json.dump(out, open(OUT + 'curves.json', 'w')); print('ok')
