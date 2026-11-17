import sys, json, numpy as np
import os; OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'out'); os.makedirs(OUT, exist_ok=True)  # git-ignored
from wave import *; from hulls import *; from delftdata import *
path = sys.argv[1]
res = {}
fine = np.round(np.arange(0.05, 0.9001, 0.0125), 4)
ratios = {}
for n in (1, 2, 3, 6, 7):
    lcb, cp, lv, bt, lb = PARAMS[n]
    st = delft(LMODEL, lb, bt, lv, cp, lcb)
    inf = st['info']
    d = residuary(path, n, inf['Sw'], inf['V'])
    nd = d['rho'] * G * inf['V'] / 1e3
    xm = 0.5 * (st['x'][1:] + st['x'][:-1])
    Rw = np.array([resistance(st, f * np.sqrt(G * LMODEL), rho=d['rho']) for f in d['Fn']]) / nd
    Rw0 = np.array([resistance(st, f * np.sqrt(G * LMODEL), rho=d['rho'], damp=np.where(xm < 0, 0.0, 1.0)) for f in d['Fn']]) / nd
    Rw5 = np.array([resistance(st, f * np.sqrt(G * LMODEL), rho=d['rho'], damp=np.where(xm < 0, 0.5, 1.0)) for f in d['Fn']]) / nd
    Rfine = np.array([resistance(st, f * np.sqrt(G * LMODEL), rho=d['rho']) for f in fine]) / nd
    cwm = d['Rr'] / d['Fn'] ** 2; cwt = Rfine / fine ** 2
    sel = d['Fn'] > 0.3
    print('Sys %d L/B %.2f B/T %.2f L/vol^1/3 %.2f | hump (drag/speed^2): measured Fn %.2f, model Fn %.2f' % (
        n, lb, bt, lv, d['Fn'][sel][cwm[sel].argmax()], fine[cwt.argmax()]))
    for lab, a in (('Fn', d['Fn']), ('Rr meas', d['Rr']), ('Michell', Rw), ('ratio', Rw / d['Rr']), ('stern x0.5', Rw5 / d['Rr']), ('stern x0', Rw0 / d['Rr'])):
        print('  %-10s' % lab, ' '.join('%6.2f' % f for f in a))
    ratios[n] = (d['Fn'], Rw / d['Rr'])
    res[n] = dict(LB=lb, BT=bt, Lv=lv, Cp=cp, Fn=d['Fn'].tolist(), Rr=d['Rr'].tolist(), fine=fine.tolist(), Rw=Rfine.tolist(),
                  x=st['x'].tolist(), b=st['b'].tolist(), Tl=st['Tl'].tolist(), mexp=inf['m'], B=inf['B'], T=inf['T'])
# transfer test: speed-dependent factor learned on Sys 1, applied to the others
g = np.array([0.25, 0.30, 0.35, 0.40, 0.45, 0.50, 0.55, 0.60])
c1 = np.interp(g, *ratios[1])
print('factor learned on Sys 1 at Fn', g, ':', np.round(c1, 2))
for n in (2, 3, 6, 7):
    r = np.interp(g, *ratios[n]) / c1
    print('  Sys %d corrected model / measured:' % n, np.round(r, 2))
print('low speed, Sys 1 Michell Rw/weight x1000 at Fn', fine[:8], np.round(res[1]['Rw'][:8], 4))
json.dump(res, open(os.path.join(OUT, 'delft.json'), 'w'))
