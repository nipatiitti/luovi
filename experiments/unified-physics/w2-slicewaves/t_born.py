"""The three waterline rules (contact / calm / conserve) on a heavy and the lightest Delft hull."""
import time, numpy as np
from common import hull, tank
from slice import *
for n in (6, 31):
    st = hull(n); t = tank(n); nd = t['rho'] * G * t['vol'] / 1e3
    for f in (0.25, 0.35, 0.45):
        U = f * np.sqrt(G * t['L']); Rr = np.interp(f, t['Fn'], t['Rr']); t0 = time.time()
        for born, nsp in (('contact', 3), ('calm', 3), ('conserve', 3)):
            m = march(st, U, born=born, nsp=nsp, rho=t['rho']); d = drags(st, U, rho=t['rho'], m=m)
            print(n, f, born, nsp, 'mass %.1e' % (np.sum(m['eta'] * m['wd']) / t['L'] ** 2), 'Michell/tank %.2f A/tank %.2f B/tank %.2f | 2D: thin %.1f exact %.1f work %.1f | min eta/L %.3f  %.1fs' % (d['michell'] / nd / Rr, d['A'] / nd / Rr, d['B'] / nd / Rr, d['slice_thin'] / nd, d['slice_exact'] / nd, d['work'] / nd, m['eta'].min() / t['L'], time.time() - t0), flush=True)
