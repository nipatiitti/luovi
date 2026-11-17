"""Series 60, CB = 0.60 parent (Todd's model 4210 lines) as a section stack, and the towing-tank numbers.
Source for both: Kim & Jenkins, 'Trim and sinkage effects on wave resistance with Series 60, CB = 0.60',
DTNSRDC/SPD-1013-01, 1981 (DTIC ADA105972), Table 2 (offsets) and Tables 6-8 (resistance), read through an
OCR summary.  Offsets are fractions of the midship half-breadth on the same waterline (columns: tangent at
the keel, then 0.075, 0.25, 0.50, 0.75, 1.00 of the draft; the 1.25 and 1.50 waterlines are above water).
The midship section is rebuilt from CM = 0.977: flat bottom, circular bilge, vertical side."""
import numpy as np
STA = [0, .5, 1, 1.5, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 18.5, 19, 19.5, 20]
OFF = np.array([
 [0.000, 0.000, 0.000, 0.000, 0.000, 0.000], [0.009, 0.032, 0.042, 0.041, 0.043, 0.051], [0.013, 0.064, 0.082, 0.087, 0.090, 0.102],
 [0.019, 0.095, 0.126, 0.141, 0.148, 0.160], [0.024, 0.127, 0.178, 0.204, 0.213, 0.228], [0.055, 0.196, 0.294, 0.346, 0.368, 0.391],
 [0.134, 0.314, 0.436, 0.502, 0.535, 0.562], [0.275, 0.466, 0.589, 0.660, 0.691, 0.718], [0.469, 0.630, 0.733, 0.802, 0.824, 0.841],
 [0.666, 0.779, 0.854, 0.906, 0.917, 0.926], [0.831, 0.898, 0.935, 0.971, 0.977, 0.979], [0.945, 0.964, 0.979, 0.996, 1.000, 1.000],
 [1.000, 1.000, 1.000, 1.000, 1.000, 1.000], [0.965, 0.982, 0.990, 1.000, 1.000, 1.000], [0.882, 0.922, 0.958, 0.994, 1.000, 1.000],
 [0.767, 0.826, 0.892, 0.962, 0.987, 0.994], [0.622, 0.701, 0.781, 0.884, 0.943, 0.975], [0.463, 0.560, 0.639, 0.754, 0.857, 0.937],
 [0.309, 0.413, 0.483, 0.592, 0.728, 0.857], [0.168, 0.267, 0.330, 0.413, 0.541, 0.725], [0.065, 0.152, 0.193, 0.236, 0.321, 0.536],
 [0.032, 0.102, 0.130, 0.156, 0.216, 0.425], [0.014, 0.058, 0.076, 0.085, 0.116, 0.308], [0.010, 0.020, 0.020, 0.022, 0.033, 0.193],
 [0.000, 0.000, 0.000, 0.000, 0.000, 0.082]])
AREA = np.array([0, .042, .085, .135, .192, .323, .475, .630, .771, .880, .955, .990, 1, .996, .977, .938, .863, .750, .609, .445, .268, .187, .109, .040, .004])
WLF = np.array([0.0, 0.075, 0.25, 0.50, 0.75, 1.00])
# towing tank, model free to sink and trim: Fn, CR x1000 (= CT - CF), CW x1000 (wave-pattern), on wetted area at rest
TANK = np.array([[0.22, 0.694, 0.170], [0.25, 0.798, 0.229], [0.27, 1.385, 0.749], [0.28, 1.673, 1.106], [0.29, 2.024, 1.343],
                 [0.30, 2.176, 1.491], [0.31, 2.203, 1.539], [0.32, 2.244, 1.495], [0.33, 2.278, 1.561], [0.34, 2.402, 1.551], [0.35, 2.817, 1.930]])
S_OVER_L2 = 2534.40 / 121.92 ** 2

def series60(L=1.0, N=81, M=40):
    B = L / 7.5; T = B / 2.5; CM = 0.977
    r = np.sqrt((1 - CM) * B * T / (2 * (1 - np.pi / 4)))
    def ymid(h):                       # midship half-breadth at height h above the keel
        return np.where(h >= r, B / 2, B / 2 - r + np.sqrt(np.maximum(r * r - (r - h) ** 2, 0)))
    xs_tab = L / 2 - np.array(STA) / 20 * L           # FP at +L/2
    x = np.linspace(-L / 2, L / 2, N)
    s = np.linspace(0, 1, M) ** 1.5; z = -T * s        # waterline first
    h = T + z
    frac_tab = np.empty((len(STA), M))
    for i in range(len(STA)):
        frac_tab[i] = np.interp(h / T, WLF, OFF[i])
    Y = np.empty((N, M))
    o = np.argsort(xs_tab)
    for k in range(M):
        Y[:, k] = np.interp(x, xs_tab[o], frac_tab[o, k]) * ymid(h[k])
    st = dict(x=x, z=np.broadcast_to(z, (N, M)).copy(), Y=Y, b=Y[:, 0].copy())
    st['area'] = 2 * np.trapezoid(Y[:, ::-1], st['z'][:, ::-1], axis=1)
    return st, dict(B=B, T=T, r=r)

if __name__ == '__main__':
    from repairs import *
    from common import OUT
    st, info = series60()
    vol = np.trapezoid(st['area'], st['x'])
    print('CB %.3f (0.600)  CP %.3f (0.614)  area fractions rms err %.3f' % (vol / (info['B'] * info['T']), vol / st['area'].max(),
          np.sqrt(np.mean((np.interp(0.5 - np.array(STA) / 20, st['x'], st['area'] / st['area'].max()) - AREA) ** 2))))
    import json; out = dict(Fn=[], CR=[], CW=[], base=[], r1=[], r1b=[], r3=[], r3b=[])
    for f, cr, cw in TANK:
        U = f * np.sqrt(G); nd = 0.5 * 1000 * U * U * S_OVER_L2 / 1e3
        a = r_base_visc(st, U); b = r_march(st, U); c = r_march(st, U, gap_k0=1.0)
        for k, v in zip(('Fn', 'CR', 'CW', 'base', 'r1', 'r1b', 'r3', 'r3b'), (f, cr, cw, a[0] / nd, a[1] / nd, a[2] / nd, b[1] / nd, c[1] / nd)): out[k].append(float(v))
        print('Fn %.2f  tank CR %.2f CW(pattern) %.2f | model x1000: Michell %.2f  R1 %.2f  R1b %.2f  R3 %.2f  R3b %.2f | /CR: Michell %.2f R1b %.2f R3b %.2f' % (f, cr, cw, a[0] / nd, a[1] / nd, a[2] / nd, b[1] / nd, c[1] / nd, a[0] / nd / cr, a[2] / nd / cr, c[1] / nd / cr))
    json.dump(out, open(OUT + 's60.json', 'w'))
