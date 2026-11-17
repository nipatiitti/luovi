"""Shared loaders: any Delft hull (real CAD lines and tank residuary resistance) and where files live.
Downloads are read from dl/ and results written to out/, both beside this file and git-ignored (see NOTES.txt)."""
import numpy as np, pickle, os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
DL = os.path.join(HERE, 'dl', ''); OUT = os.path.join(HERE, 'out', '')
os.makedirs(OUT, exist_ok=True)
from wave import G
import delftdata as dd
from geom import hydro, stack
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

def usable():
    """Delft hulls with a bare-hull upright run, a readable CAD surface and a cut volume within 3 % of the published one
    (the rule w1 used; it gives 36 hulls)."""
    f = OUT + 'usable.txt'
    if os.path.exists(f): return open(f).read().split()
    ok = []
    for n in hydro():
        try: t = tank(int(n)); st = hull(int(n))
        except Exception as e: print(n, 'skip', str(e)[:60]); continue
        vol = np.trapezoid(st['area'], st['x'])
        if abs(vol / t['vol'] - 1) > 0.03: print(n, 'skip: volume off', vol / t['vol']); continue
        ok.append(str(n))
    open(f, 'w').write(' '.join(ok)); return ok
