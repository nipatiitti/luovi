import numpy as np, time
from panel import *
# Wigley check: Cw = R/(0.5 rho U^2 S), S = 0.1487 L^2
def wig(N=41):
    xs = np.linspace(-0.5, 0.5, N); T = 0.0625; B = 0.1
    secs = []
    for x in xs:
        zz = np.linspace(-T, 0, 30); y = 0.5 * B * (1 - 4 * x * x) * (1 - (zz / T) ** 2)
        secs.append(np.c_[y, zz] if abs(x) < 0.4999 else np.zeros((0, 2)))
    return xs, secs
xs, secs = wig()
for Fn in (0.25, 0.289, 0.316, 0.35, 0.40, 0.5):
    t0 = time.time(); s = solve(xs, secs, Fn, M=6, verbose=True)
    print('Wigley Fn %.3f Cw e3 = %.3f  (%.1f s)' % (Fn, s['R'] / (0.5 * 0.1487) * 1e3, time.time() - t0))
