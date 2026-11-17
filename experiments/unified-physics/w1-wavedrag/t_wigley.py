import numpy as np, time
from hulls import wigley
from repairs import *
st = wigley(M=28)
S = 0.1487
for f in (0.25, 0.267, 0.289, 0.316, 0.35, 0.40, 0.50):
    U = f * np.sqrt(G); nd = 0.5 * 1000 * U * U * S / 1e3
    t0 = time.time()
    a = r_base_visc(st, U); b = r_march(st, U)
    print('Fn %.3f  Cw x1000: Michell %.3f  R1 visc %.3f  R1b stern*0.6 %.3f  bow only %.3f  R3 march %.3f (base %.3f)  %.1fs' % (f, a[0] / nd, a[1] / nd, a[2] / nd, a[3] / nd, b[1] / nd, b[0] / nd, time.time() - t0))
