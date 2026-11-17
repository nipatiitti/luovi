"""Model A and Michell at the measured running sinkage and trim (tank values), eight hulls, Froude 0.35-0.60 -> out/w2trim.json"""
import json, numpy as np
from slice import *
from common import tank, OUT
from geom import stack
FNS = [0.35, 0.40, 0.45, 0.50, 0.60]; out = {}
for n in (6, 31, 22, 26, 12, 1, 38, 25):
    t = tank(n); nd = t['rho'] * G * t['vol'] / 1e3; d = dict(Fn=FNS, A=[], michell=[], Rr=[], sink=[], trim=[], Lv=t['Lv'])
    for f in FNS:
        sk = float(np.interp(f, t['Fn'], t['sink'])); tr = float(np.interp(f, t['Fn'], t['trim']))
        st = stack(n, sink=-sk, trim_deg=-tr); r = drags(st, f * np.sqrt(G * t['L']), rho=t['rho'])
        d['A'].append(float(r['A'] / nd)); d['michell'].append(float(r['michell'] / nd)); d['Rr'].append(float(np.interp(f, t['Fn'], t['Rr']))); d['sink'].append(sk); d['trim'].append(tr)
    out[str(n)] = d
    print('%3d L/v %.2f | A sunk+trimmed / tank %s | Michell sunk+trimmed / tank %s | sink mm %s trim deg %s' % (n, t['Lv'], ' '.join('%.2f' % (a / b) for a, b in zip(d['A'], d['Rr'])),
          ' '.join('%.2f' % (a / b) for a, b in zip(d['michell'], d['Rr'])), ' '.join('%.0f' % (1000 * s) for s in d['sink']), ' '.join('%.2f' % s for s in d['trim'])), flush=True)
    json.dump(out, open(OUT + 'w2trim.json', 'w'))
