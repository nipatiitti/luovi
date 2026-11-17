import numpy as np, time
from panel import *
from t_panel import wig
for N, M, dx, ny in ((41, 6, 1/28, 16), (61, 8, 1/40, 18), (81, 8, 1/55, 20)):
    xs, secs = wig(N)
    for Fn in (0.316, 0.40):
        t0 = time.time(); s = solve(xs, secs, Fn, M=M, dx=dx, ny=ny, verbose=True)
        print('N %d M %d dx %.3f: Fn %.3f Cw e3 = %.3f  (%.1f s)' % (N, M, dx, Fn, s['R'] / (0.5 * 0.1487) * 1e3, time.time() - t0))
