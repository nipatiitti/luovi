"""Shared loaders for w1: any Delft hull (real CAD lines + tank residuary resistance), Wigley."""
import numpy as np, functools, pickle, os
from wave import G
import delftdata as dd
from geom import hydro, stack
from paths import OUT, DL
XLSX = DL + 'DSYHS_all_measurements_modelscale.xlsx'

def tank(n):
    """Residuary resistance per unit weight (x1000), Delft reduction: ITTC-57 at 0.7 Lwl, no form factor."""
    h = hydro()[str(n)]; L = float(h['lwl0']); Sw = float(h['sc0']); vol = float(h['volc0'])
    T, d = dd.load(XLSX, n)
    rho, nu = dd.fresh(T)
    V = d[:, 0]; Re = V * 0.7 * L / nu
    Rf = 0.5 * rho * V ** 2 * Sw * 0.075 / (np.log10(Re) - 2) ** 2
    Fn = V / np.sqrt(G * L)
    return dict(Fn=Fn, Rr=(d[:, 1] - Rf) / (rho * G * vol) * 1e3, sink=d[:, 2] / 1000, trim=d[:, 3], rho=rho, L=L, vol=vol,
                LB=L / float(h['bwl0']), BT=float(h['bwl0']) / float(h['tc0']), Lv=L / vol ** (1 / 3), cp=float(h['cp0']))

def hull(n, N=81, M=48):
    f = OUT + 'stack_%s_%d_%d.pkl' % (n, N, M)
    if os.path.exists(f): return pickle.load(open(f, 'rb'))
    st = stack(n, N=N, M=M); pickle.dump(st, open(f, 'wb')); return st
