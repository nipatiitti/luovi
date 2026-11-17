"""Baseline and the three repairs on every usable Delft hull and the Wigley hull -> out/all.json"""
import json, numpy as np
from common import *
from repairs import *
from hulls import wigley
FNS = [0.25, 0.30, 0.35, 0.40, 0.45, 0.50, 0.60]
R2SET = {'1', '3', '6', '27', '38', '39'}
out = {}
# Wigley: reference = 1983 cooperative experiment band (pressure-integrated), as used in h3
st = wigley(M=28); S = 0.1487
wf = [0.25, 0.267, 0.289, 0.316]; ref = [(0.88, 1.15), (0.83, 0.98), (1.22, 1.37), (1.79, 2.00)]
wfine = np.round(np.arange(0.15, 0.6001, 0.0125), 4).tolist()
w = dict(Fn=wf, ref=ref, base=[], r1=[], r1b=[], r3=[], r3b=[])
for f in wf:
    U = f * np.sqrt(G); nd = 0.5 * 1000 * U * U * S / 1e3
    a = r_base_visc(st, U); b = r_march(st, U)
    w['base'].append(a[0] / nd); w['r1'].append(a[1] / nd); w['r1b'].append(a[2] / nd); w['r3'].append(b[1] / nd); w['r3b'].append(r_march(st, U, gap_k0=1.0)[1] / nd)
w['fine'] = wfine; w['fine_base'] = []; w['fine_r3b'] = []; w['fine_r1b'] = []
for f in wfine:
    U = f * np.sqrt(G); nd = 0.5 * 1000 * U * U * S / 1e3
    b = r_march(st, U, gap_k0=1.0); w['fine_base'].append(b[0] / nd); w['fine_r3b'].append(b[1] / nd); w['fine_r1b'].append(r_base_visc(st, U)[2] / nd)
out['wigley'] = w; print(w, flush=True)
base = json.load(open(OUT + 'base.json'))
for n in base:
    t = tank(int(n)); st = hull(int(n)); nd = t['rho'] * G * t['vol'] / 1e3
    Rr = np.interp(FNS, t['Fn'], t['Rr'])
    d = dict(LB=t['LB'], BT=t['BT'], Lv=t['Lv'], cp=t['cp'], Fn=FNS, Rr=Rr.tolist(), base=[], r1=[], r1b=[], bow=[], r3=[], r3b=[], r2=[], trough=[])
    for f in FNS:
        U = f * np.sqrt(G * t['L'])
        a = r_base_visc(st, U, rho=t['rho']); b = r_march(st, U, rho=t['rho'])
        d['base'].append(a[0] / nd); d['r1'].append(a[1] / nd); d['r1b'].append(a[2] / nd); d['bow'].append(a[3] / nd); d['r3'].append(b[1] / nd); d['r3b'].append(r_march(st, U, rho=t['rho'], gap_k0=1.0)[1] / nd)
        zc = profile(st, U, np.linspace(st['x'].min(), st['x'].max(), 41))
        d['trough'].append(float(-zc.min() / st['z'].min() * -1))      # deepest thin-ship trough / hull draft
        if n in R2SET: d['r2'].append(r_wetted(int(n), st, U, rho=t['rho'])[0] / nd)
    out[n] = d
    q = lambda k: ' '.join('%5.2f' % (x / y) for x, y in zip(d[k], Rr))
    print('%3s L/B %.2f B/T %5.2f L/v %.2f | base %s | R1 %s | R1b %s | R3 %s | R3b %s' % (n, t['LB'], t['BT'], t['Lv'], q('base'), q('r1'), q('r1b'), q('r3'), q('r3b')) + (' | R2 ' + q('r2') if d['r2'] else ''), flush=True)
    json.dump(out, open(OUT + 'all.json', 'w'))
