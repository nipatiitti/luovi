"""Real Delft series hulls from the 4TU IGES surfaces (DOI 10.4121/21501330), cut into section stacks."""
import numpy as np, openpyxl, functools
from iges import read_surfaces, evaluate
from paths import DL

@functools.lru_cache(None)
def hydro():
    wb = openpyxl.load_workbook(DL + 'hs_a.xlsx', read_only=True, data_only=True)
    rows = list(wb['Canoe body hydrostatics'].iter_rows(values_only=True))
    hd = [str(c) for c in rows[0]]
    return {str(r[0]): dict(zip(hd, r)) for r in rows[1:] if r[0] is not None}

@functools.lru_cache(None)
def surface(n, nu=260, nv=90):
    ss = read_surfaces(DL + 'geo/IGS/SYSSER%02d_surface.igs' % n)
    s = max(ss, key=lambda q: q['C'].shape[0] * q['C'].shape[1])
    X = evaluate(s, nu, nv) / 1000.0
    X[:, :, 1] = np.abs(X[:, :, 1])
    if np.ptp(X[:, 0, 0]) < np.ptp(X[0, :, 0]):      # make index 0 run lengthwise
        X = X.transpose(1, 0, 2)
    if X[0, X.shape[1] // 2, 0] > X[-1, X.shape[1] // 2, 0]: X = X[::-1]
    if X[X.shape[0] // 2, 0, 2] > X[X.shape[0] // 2, -1, 2]: X = X[:, ::-1]   # keel first
    return X

def placed(n, sink=0.0, trim_deg=0.0):
    """Surface grid in the sailing frame: x forward from midships of the static waterline,
    z up from the calm waterline.  sink > 0 is deeper, trim_deg > 0 is bow up."""
    h = hydro()[str(n)]
    X = surface(n).copy()
    X[:, :, 2] -= float(h['tc0'])
    # static waterline ends on the keel line (j = 0)
    kx, kz = X[:, 0, 0], X[:, 0, 2]
    wet = np.where(kz < 0)[0]
    def cross(i0, i1):
        return kx[i0] + (0 - kz[i0]) * (kx[i1] - kx[i0]) / (kz[i1] - kz[i0])
    xa = cross(wet[0] - 1, wet[0]) if wet[0] > 0 else kx[0]
    xf = cross(wet[-1], wet[-1] + 1) if wet[-1] < len(kx) - 1 else kx[-1]
    X[:, :, 0] -= 0.5 * (xa + xf)
    xg = float(h['lcb0'])
    a = np.radians(trim_deg)
    dx = X[:, :, 0] - xg; z = X[:, :, 2]
    X[:, :, 0], X[:, :, 2] = xg + dx * np.cos(a) - z * np.sin(a), z * np.cos(a) + dx * np.sin(a) - sink
    return X, xf - xa

def cut(X, xs):
    """Section polylines (y,z) keel to deck at stations xs, from the lengthwise grid lines."""
    out = []
    for x in xs:
        pts = []
        for j in range(X.shape[1]):
            xl = X[:, j, 0]; s = (xl[:-1] - x) * (xl[1:] - x) <= 0
            idx = np.where(s & (xl[1:] != xl[:-1]))[0]
            if len(idx) == 0: continue
            i = idx[0]; f = (x - xl[i]) / (xl[i + 1] - xl[i])
            pts.append(X[i, j, 1:] + f * (X[i + 1, j, 1:] - X[i, j, 1:]))
        out.append(np.array(pts) if len(pts) > 1 else np.zeros((0, 2)))
    return out

def underwater(p):
    """Clip a keel-to-deck polyline at z = 0; returns the wet part ending exactly on the waterline."""
    if len(p) == 0 or p[:, 1].min() >= 0: return np.zeros((0, 2))
    q = []
    for a, b in zip(p[:-1], p[1:]):
        if a[1] < 0: q.append(a)
        if (a[1] < 0) != (b[1] < 0):
            f = (0 - a[1]) / (b[1] - a[1]); q.append(a + f * (b - a))
    if p[-1, 1] < 0: q.append(p[-1])
    q = np.array(q)
    if q[0, 0] > 1e-9: q = np.vstack([[0.0, q[0, 1]], q])     # close to the centreline
    return q

def stack(n, sink=0.0, trim_deg=0.0, N=81, M=48):
    X, Lwl = placed(n, sink, trim_deg)
    scan = np.linspace(X[:, :, 0].min() + 1e-6, X[:, :, 0].max() - 1e-6, 500)
    wet = [len(underwater(p)) > 1 for p in cut(X, scan)]
    iw = np.where(wet)[0]
    x0 = scan[max(iw[0] - 1, 0)]; x1 = scan[min(iw[-1] + 1, len(scan) - 1)]
    xs = np.linspace(x0, x1, N)
    secs = [underwater(p) for p in cut(X, xs)]
    s = np.linspace(0, 1, M) ** 1.5
    z = np.zeros((N, M)); Y = np.zeros((N, M)); girth = np.zeros(N); area = np.zeros(N); flare = np.zeros(N)
    for i, q in enumerate(secs):
        if len(q) < 2: continue
        T = -q[:, 1].min(); zz = -T * s; z[i] = zz
        for k, zk in enumerate(zz):                 # widest crossing at each depth
            a, b = q[:-1], q[1:]
            m = ((a[:, 1] - zk) * (b[:, 1] - zk) <= 0) & (a[:, 1] != b[:, 1])
            if m.any():
                f = (zk - a[m, 1]) / (b[m, 1] - a[m, 1]); Y[i, k] = np.max(a[m, 0] + f * (b[m, 0] - a[m, 0]))
        Y[i, 0] = q[-1, 0]; Y[i, -1] = 0.0
        d = np.diff(q, axis=0); girth[i] = np.sum(np.hypot(d[:, 0], d[:, 1]))
        area[i] = 2 * abs(np.trapezoid(q[:, 0], q[:, 1]))
        flare[i] = d[-1, 0] / max(d[-1, 1], 1e-9)   # dY/dz at the waterline
    return dict(x=xs, z=z, Y=Y, b=Y[:, 0].copy(), area=area, girth=girth, flare=flare, secs=secs, Lwl=Lwl)
