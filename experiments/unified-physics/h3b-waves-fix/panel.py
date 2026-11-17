"""Bake-time candidate: linearised free-surface panel solve (Kelvin condition on z=0, exact hull
boundary condition on the real wetted surface).  Desingularised Rankine point sources: hull sources
set a little inside the hull, free-surface sources raised above the water and shifted one grid step
downstream of their collocation points (Jensen's way of enforcing the radiation condition).
Units: hull length 1, speed 1, gravity 1/Fn^2.  Ship moves toward +x; stream is -x.
Numerical settings (not physics): hull source inset 0.6*sqrt(panel area); free-surface source height
one grid step."""
import numpy as np

def hull_mesh(xs, secs, M=8):
    """xs ascending stations, secs: wet polylines (y,z) keel->waterline (may be empty at the ends).
    Returns centroids c, outward normals n, areas a, and waterline polyline wl[(x,y)]."""
    P = np.zeros((len(xs), M + 1, 3))
    for i, (x, q) in enumerate(zip(xs, secs)):
        P[i, :, 0] = x
        if len(q) < 2: continue
        d = np.r_[0, np.cumsum(np.hypot(*np.diff(q, axis=0).T))]
        s = np.linspace(0, d[-1], M + 1)
        P[i, :, 1] = np.interp(s, d, q[:, 0]); P[i, :, 2] = np.interp(s, d, q[:, 1])
    A, B, C, D = P[:-1, :-1], P[1:, :-1], P[1:, 1:], P[:-1, 1:]
    nrm = 0.5 * np.cross(C - A, D - B)                # for y>0 side, points outward (+y) when x asc, girth keel->wl
    c = 0.25 * (A + B + C + D)
    a = np.linalg.norm(nrm, axis=2)
    ok = a > 1e-10
    c, nrm, a = c[ok], nrm[ok], a[ok]
    n = nrm / a[:, None]
    if np.sum(n[:, 1] * a) < 0: n = -n
    return c, n, a, P[:, -1, :2]

def _G(p, q):
    """Derivatives at field points p[n,3] of 1/r sources at q[m,3] plus their mirror images in y."""
    out = [0, 0, 0, 0]
    for sgn in (1, -1):
        d = p[:, None, :] - (q * np.array([1, sgn, 1]))[None]
        r2 = np.sum(d * d, axis=2); r3 = r2 ** 1.5
        out[0] = out[0] - d[:, :, 0] / r3; out[1] = out[1] - d[:, :, 1] / r3; out[2] = out[2] - d[:, :, 2] / r3
        out[3] = out[3] + (3 * d[:, :, 0] ** 2 - r2) / (r3 * r2)
    return out                                         # Gx, Gy, Gz, Gxx

def solve(xs, secs, Fn, M=8, ny=16, dx=None, verbose=False):
    g = 1.0 / Fn ** 2
    c, n, a, wl = hull_mesh(xs, secs, M)
    inset = np.minimum(0.6 * np.sqrt(a), 0.6 * c[:, 1] / np.maximum(np.abs(n[:, 1]), 0.05))
    qh = c - n * inset[:, None]
    lam0 = 2 * np.pi * Fn ** 2
    if dx is None: dx = min(1 / 28, max(lam0 / 14, 1 / 50))
    xa, xf = xs[0], xs[-1]
    xg = np.arange(xf + max(0.6, 0.6 * lam0), xa - max(1.2, 1.6 * lam0), -dx)
    ywl = np.interp(xg, wl[:, 0], wl[:, 1], left=0, right=0)
    eta = dx * 0.5 + dx * 0.9 * (1.13 ** np.arange(ny) - 1) / 0.13
    pf = np.stack([np.repeat(xg, ny), (ywl[:, None] + eta[None]).ravel(), np.zeros(len(xg) * ny)], axis=1)
    qf = pf + np.array([-dx, 0, dx])
    q = np.vstack([qh, qf]); nh = len(qh)
    Gx, Gy, Gz, Gxx = _G(c, q)
    A1 = Gx * n[:, 0:1] + Gy * n[:, 1:2] + Gz * n[:, 2:3]
    Gx2, Gy2, Gz2, Gxx2 = _G(pf, q)
    A2 = Gxx2 + g * Gz2
    A = np.vstack([A1, A2]); rhs = np.r_[n[:, 0], np.zeros(len(pf))]
    sig = np.linalg.solve(A, rhs)
    u = np.stack([Gx @ sig, Gy @ sig, Gz @ sig], axis=1)        # perturbation velocity on the hull
    p1 = u[:, 0]; p2 = -0.5 * np.sum(u * u, axis=1)             # pressure / (rho U^2): U phi_x - |grad phi|^2/2
    R1 = 2 * np.sum(p1 * n[:, 0] * a); R2 = 2 * np.sum(p2 * n[:, 0] * a)
    # waterline term: + (g/2) * closed-line integral of zeta^2 nx dl, zeta = phi_x / g (linear), both sides
    wm = 0.5 * (wl[1:] + wl[:-1]); dy = wl[1:, 1] - wl[:-1, 1]  # nx dl = dy along +x ... outward normal x-comp * dl = -dY
    pw = np.c_[wm, np.zeros(len(wm))]; pw[:, 1] += 1e-4
    zx = _G(pw, q)[0] @ sig
    zeta = zx / g
    R3 = 2 * 0.5 * g * np.sum(zeta ** 2 * (-dy))
    if verbose:
        print('   Fn %.3f panels hull %d fs %d dx %.3f  R1 %.5f R2 %.5f R3 %.5f' % (Fn, nh, len(pf), dx, R1, R2, R3))
    return dict(R=R1 + R2 + R3, R1=R1, R2=R2, R3=R3, zeta=zeta, wlx=wm[:, 0], nh=nh, nf=len(pf),
                sig=sig, q=q, g=g)

def elevation(sol, P):
    """Linear wave elevation / L at points P[n,2] on z=0."""
    p = np.c_[P, np.zeros(len(P))]
    out = np.zeros(len(p))
    for a in range(0, len(p), 2000):
        out[a:a + 2000] = _G(p[a:a + 2000], sol['q'])[0] @ sol['sig'] / sol['g']
    return out
