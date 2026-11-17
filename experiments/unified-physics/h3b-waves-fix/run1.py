import sys, json, time, numpy as np
import os; OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'out'); os.makedirs(OUT, exist_ok=True)  # git-ignored
from wave import *; from hulls import *; from delftdata import *; from geom import *; from methods import *
path = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(OUT), 'dl', 'DSYHS_all_measurements_modelscale.xlsx')  # DOI 10.4121/21501402
# Wigley check of the three sums
st = wigley(); st['b'] = st['Y'][:, 0].copy(); st['flare'] = np.zeros(len(st['x']))
for m in ('michell', 'hogner', 'noblesse'):
    print('Wigley %-9s' % m, [round(resistance3(st, f * np.sqrt(G), m) / (0.5 * 1000 * f * f * G * 0.1487) * 1e3, 3) for f in (0.25, 0.267, 0.289, 0.316, 0.35, 0.4, 0.5)])
res = {}
for n in (1, 2, 3, 6, 7):
    h = hydro()[str(n)]
    d = residuary(path, n, float(h['sc0']), float(h['volc0']))
    nd = d['rho'] * G * float(h['volc0']) / 1e3
    st = stack(n)
    sel = d['Fn'] > 0.19
    Fn = d['Fn'][sel]; Rr = d['Rr'][sel]
    out = dict(Fn=Fn.tolist(), Rr=Rr.tolist())
    print('Sys %d   Fn        ' % n, ' '.join('%6.2f' % f for f in Fn)); print('        tank Rr    ', ' '.join('%6.2f' % f for f in Rr))
    for m in ('michell', 'hogner', 'noblesse'):
        t0 = time.time()
        R = np.array([resistance3(st, f * np.sqrt(G * LMODEL), m, rho=d['rho']) for f in Fn]) / nd
        out[m] = R.tolist()
        print('        %-9s/tank' % m, ' '.join('%6.2f' % f for f in R / Rr), ' (%.1f s per speed)' % ((time.time() - t0) / len(Fn)))
    for m in ('michell', 'noblesse'):
        R = []
        for f, sk, tr in zip(Fn, d['sink'][sel], d['trim'][sel]):
            s2 = stack(n, sink=-sk, trim_deg=-tr)
            R.append(resistance3(s2, f * np.sqrt(G * LMODEL), m, rho=d['rho']) / nd)
        out[m + '_st'] = R
        print('        %-9s sunk+trimmed/tank' % m, ' '.join('%6.2f' % f for f in np.array(R) / Rr))
    res[n] = out
json.dump(res, open(os.path.join(OUT, 'run1.json'), 'w'))
