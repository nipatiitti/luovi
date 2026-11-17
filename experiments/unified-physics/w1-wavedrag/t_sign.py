"""Both signs of the waterline term in h3b's zeroth-order Noblesse sum (methods.py), Wigley and Delft hull 1."""
import os, numpy as np
from common import *
from hulls import wigley
from paths import HERE
src = open(os.path.join(HERE, 'methods.py')).read().replace("J = J - (1.0 / k0) * I", "J = J + SGN * (1.0 / k0) * I")
ns = {'SGN': -1.0}; exec(src, ns)
st = wigley(); st['b'] = st['Y'][:, 0].copy(); st['flare'] = np.zeros(len(st['x']))
t = tank(1); s1 = hull(1); nd = t['rho'] * G * t['vol'] / 1e3
for sg in (-1.0, 1.0):
    ns['SGN'] = sg
    print('sign %+d  Wigley / Hogner' % sg, [round(ns['resistance3'](st, f * np.sqrt(G), 'noblesse') / ns['resistance3'](st, f * np.sqrt(G), 'hogner'), 2) for f in (0.25, 0.316, 0.4)],
          ' Delft 1 model / tank', [round(ns['resistance3'](s1, f * np.sqrt(G * t['L']), 'noblesse', rho=t['rho']) / nd / np.interp(f, t['Fn'], t['Rr']), 1) for f in (0.25, 0.35, 0.45, 0.6)])
