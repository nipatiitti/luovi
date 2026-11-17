"""Baseline thin-ship sum on every Delft hull with a bare-hull upright run and readable CAD surface."""
import json, time, numpy as np
from common import *
from wave import resistance
FNS = [0.25, 0.30, 0.35, 0.40, 0.45, 0.50, 0.60]
out = {}
for n in hydro():
    try:
        t = tank(int(n)); st = hull(int(n))
    except Exception as e:
        print(n, 'skip', str(e)[:50]); continue
    vol = np.trapezoid(st['area'], st['x'])
    if abs(vol / t['vol'] - 1) > 0.03: print(n, 'skip: volume off', vol / t['vol']); continue
    nd = t['rho'] * G * t['vol'] / 1e3
    R = np.array([resistance(st, f * np.sqrt(G * t['L']), rho=t['rho']) for f in FNS]) / nd
    Rr = np.interp(FNS, t['Fn'], t['Rr'])
    out[n] = dict(LB=t['LB'], BT=t['BT'], Lv=t['Lv'], cp=t['cp'], michell=R.tolist(), Rr=Rr.tolist())
    print('%3s L/B %.2f B/T %5.2f L/v %.2f' % (n, t['LB'], t['BT'], t['Lv']), ' '.join('%5.2f' % r for r in R / Rr), flush=True)
json.dump(out, open(OUT + 'base.json', 'w'))
