"""Fine speed curves of Michell, R3b, A and C with the tank points, for the drag-curve GIF -> out/curves_w2.json.
Drag as % of boat weight."""
import json, numpy as np
from slice import *
from hybrid import model_c
from common import tank, hull, OUT
from s60 import series60, TANK, S_OVER_L2
out = {}
for key in ('6', '26', 's60'):
    if key == 's60':
        st, _ = series60(); L = 1.0; rho = 1000.0; vol = float(np.trapezoid(st['area'], st['x'])); w = rho * G * vol
        fn = np.round(np.arange(0.18, 0.3601, 0.015), 4).tolist()
        k = 0.5 * TANK[:, 0] ** 2 * S_OVER_L2 / vol * 100 / 1e3          # coefficient x1000 -> % of weight
        tk = dict(tFn=TANK[:, 0].tolist(), tR=(TANK[:, 1] * k).tolist())
    else:
        t = tank(int(key)); st = hull(int(key)); L = t['L']; rho = t['rho']; w = rho * G * t['vol']
        fn = np.round(np.arange(0.18, 0.6001, 0.025), 4).tolist(); m = t['Fn'] > 0.17
        tk = dict(tFn=t['Fn'][m].tolist(), tR=(t['Rr'][m] / 10).tolist())
    r = [model_c(st, f * np.sqrt(G * L), rho=rho) for f in fn]
    out[key] = dict(Fn=fn, A=[float(q['A'] / w * 100) for q in r], C=[float(q['C'] / w * 100) for q in r],
                    base=[float(q['michell'] / w * 100) for q in r], r3b=[float(q['r3b'] / w * 100) for q in r], **tk)
    print(key, np.round(out[key]['C'], 3), flush=True)
    json.dump(out, open(OUT + 'curves_w2.json', 'w'))
