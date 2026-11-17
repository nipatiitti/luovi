import sys, numpy as np
from wave import *; from hulls import *; from delftdata import *
path = sys.argv[1]
Fns = np.array([0.2,0.25,0.3,0.35,0.4,0.45,0.5,0.6])
for n in (1, 3):
    lcb, cp, lv, bt, lb = PARAMS[n]
    variants = {'A power wl': delft(LMODEL, lb, bt, lv, cp, lcb)}
    for ef in (1.15, 1.4, 1.7):
        for cwp in (0.67, 0.71):
            st = delft2(LMODEL, lb, bt, lv, cp, lcb, ef=ef, cwp=cwp)
            variants['B ef%.2f cwp%.2f ent%.0f w%.2f Tm%.2f' % (ef, cwp, st['info']['entrance'], st['info']['w'], st['info']['Tmax']/st['info']['T'])] = st
    inf = variants['A power wl']['info']
    d = residuary(path, n, inf['Sw'], inf['V'])
    print('Sys', n, 'measured Rr', np.round(np.interp(Fns, d['Fn'], d['Rr']), 2))
    for k, st in variants.items():
        Rw = np.array([resistance(st, f * np.sqrt(G * LMODEL)) for f in Fns]) / (1000 * G * inf['V']) * 1e3
        print('  %-40s' % k, np.round(Rw, 2))
