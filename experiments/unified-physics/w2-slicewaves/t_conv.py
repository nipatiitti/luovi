"""Numerical sensitivity of model A: time steps, surface grid, body panels, waterline spreading width, smoothing."""
import time, numpy as np
from slice import *
from common import tank, hull
for n, f in ((6, 0.35), (31, 0.35), (6, 0.50)):
    t = tank(n); st = hull(n); L = t['L']; U = f * np.sqrt(G * L); nd = t['rho'] * G * t['vol'] / 1e3; Rr = np.interp(f, t['Fn'], t['Rr'])
    s, _, _ = bowfirst(st)
    for lab, kw in (('base', {}), ('Nt 480', dict(Nt=480)), ('grid 0.0025', dict(grid=fsgrid(s[-1], d0=0.0025))), ('body 34', dict(mb=34)), ('spread 2', dict(nsp=2)), ('spread 5', dict(nsp=5)), ('filter x0.25', dict(filt=0.001))):
        t0 = time.time(); m = march(st, U, rho=t['rho'], **kw); d = drags(st, U, rho=t['rho'], m=m)
        print('hull %d Fn %.2f %-13s A/tank %.2f  (2D energy %.1f, work %.1f)  %.1fs' % (n, f, lab, d['A'] / nd / Rr, d['slice_exact'] / nd, d['work'] / nd, time.time() - t0), flush=True)
