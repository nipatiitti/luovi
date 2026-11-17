"""W2: wave drag from the waves each water-fixed transverse slice is left with.

A slice of water (fixed in the water, across the course) sees the hull section appear, swell and shrink.
Level (i)  thin, linear:  sources on the centreplane.  Mode k of the slice obeys  H'' + g k H = d2F/dt2,
           F(k,t) = int Y e^{kz} dz.  After the hull has gone the mode is left with amplitude
           A_th(k) = int dF/ds e^{i s sqrt(g k)/U} ds.   Energy left per metre sailed = drag.
Level (ii) body-exact:    2D boundary elements marched in time, exact section shape and waterline width at each
           instant, linearised free surface outside it.  Leaves amplitude A_ex(k).
Identity used throughout: Michell's Kochin function J(theta) IS A_th at k = k0 sec^2(theta) (same depth decay,
same frequency sqrt(gk) = U k0 sec(theta) seen from the water).  Michell and linear 2D+t differ only in the
measure: 2D+t counts modes with dk (all energy stays in the slice), Michell with cosh^2 t dt (waves also
run fore and aft).
Models:
 slice2d : (2 rho g/pi) int |A|^2 dk            pure 2D+t, thin or body-exact
 A       : Michell's measure with |A_ex(k0 sec^2)|^2 in place of |J|^2       (no constant)
 B       : J + [A_ex(ky) - A_th(ky)], ky = k0 sec*tan: body-exact only where the wave runs sideways (no constant)
Stations are ordered bow first; s = distance aft of the bow.
"""
import numpy as np
G = 9.81

def tgrid(k0, L, lam_max=14.0, dphi=0.25, nmin=1500):
    tmax = np.arccosh(lam_max); n = int(max(nmin, np.ceil(k0 * L * lam_max * tmax / dphi))); n += (n % 2 == 0)
    t = np.linspace(0, tmax, n); w = np.full(n, t[1] - t[0]); w[0] *= 0.5; w[-1] *= 0.5
    return t, w

def bowfirst(st):
    """(s, Y, z) with s = distance aft of the bow, increasing."""
    o = np.argsort(-st['x'])
    return st['x'].max() - st['x'][o], st['Y'][o], st['z'][o]

def section_F(Y, z, kappa):
    out = np.empty((len(kappa), z.shape[0]))
    dz = z[:, :-1] - z[:, 1:]
    m = np.where(dz > 1e-12, (Y[:, :-1] - Y[:, 1:]) / np.maximum(dz, 1e-12), 0.0)
    for a in range(0, len(kappa), 2000):
        k = kappa[a:a + 2000, None, None]; E = np.exp(k * z[None])
        out[a:a + 2000] = (Y[None, :, 0] * E[:, :, 0] - Y[None, :, -1] * E[:, :, -1]) / k[:, :, 0] \
            - np.sum(m[None] * (E[:, :, :-1] - E[:, :, 1:]), axis=2) / k[:, :, 0] ** 2
    return out

def A_thin(st, kap, nu):
    """int dF/ds(kap, s) e^{i nu s} ds, analytic per station segment."""
    s, Y, z = bowfirst(st)
    F = section_F(Y, z, kap)
    sl = np.diff(F, axis=1) / np.diff(s)[None]
    c = np.zeros_like(F); c[:, :-1] -= sl; c[:, 1:] += sl
    return np.sum(c * np.exp(1j * nu[:, None] * s[None]), axis=1) / (1j * nu)

# ---------------------------------------------------------------- 2D boundary elements
def infl(P, A, B):
    """Constant panels A->B, kernel ln r / 2pi.  Returns (G, H): int G dl and int dG/dn dl, n = (t_z, -t_y)."""
    t = B - A; l = np.hypot(t[:, 0], t[:, 1]); t = t / l[:, None]
    n = np.stack([t[:, 1], -t[:, 0]], axis=1)
    r = P[:, None, :] - A[None]
    xi = r[..., 0] * t[None, :, 0] + r[..., 1] * t[None, :, 1]
    d = r[..., 0] * n[None, :, 0] + r[..., 1] * n[None, :, 1]
    u1 = -xi; u2 = l[None] - xi
    small = np.abs(d) < 1e-12 * (1 + l[None])
    ds = np.where(small, 1.0, d)
    a1 = np.where(small, 0.0, np.arctan(u1 / ds)); a2 = np.where(small, 0.0, np.arctan(u2 / ds))
    with np.errstate(divide='ignore', invalid='ignore'):
        f = lambda u: np.where(np.abs(u) < 1e-300, 0.0, 0.5 * u * np.log(u * u + d * d)) - u
        Gm = (f(u2) - f(u1) + d * (a2 - a1)) / (2 * np.pi)
    Hm = -(a2 - a1) / (2 * np.pi)
    return Gm, Hm

def fsgrid(L, d0=0.004, y1=0.36, ymax=2.6, r=1.08):
    e = list(np.arange(0, y1 + 1e-9, d0)); d = d0
    while e[-1] < ymax: d *= r; e.append(e[-1] + d)
    return np.array(e) * L

def march(st, U, Nt=240, mb=22, grid=None, record=None, rho=1000.0, filt=0.004, born='conserve', nsp=3, extra=0.0):
    """Body-exact slice march.  Returns dict with the fixed free-surface panels (yc, wd), final eta, phi, time."""
    s, Y, z = bowfirst(st); L = s[-1]
    idx = np.unique(np.round(np.linspace(0, Y.shape[1] - 1, mb)).astype(int))
    Y = Y[:, idx]; z = z[:, idx]
    e = fsgrid(L) if grid is None else grid
    yc = 0.5 * (e[1:] + e[:-1]); wd = np.diff(e); nf = len(yc)
    eta = np.zeros(nf); phi = np.zeros(nf); covered = np.zeros(nf, bool); nuni = int(np.sum(wd < 1.01 * wd[0]))
    dt = L / U / Nt
    def nodes(sv):
        return np.stack([np.array([np.interp(sv, s, Y[:, j]) for j in range(Y.shape[1])]),
                         np.array([np.interp(sv, s, z[:, j]) for j in range(Y.shape[1])])], axis=1)
    # closure: the slice is a wide deep tank (wall at the outer edge, bottom at depth 2 L), both with no flow through
    D = 2.0 * L; nw = 10; nbt = 13
    zw = np.linspace(-D, 0, nw + 1); yb = np.linspace(0, e[-1], nbt + 1)
    Ac = np.vstack([np.stack([np.full(nw, e[-1]), zw[:-1]], 1), np.stack([yb[:-1], np.full(nbt, -D)], 1)])
    Bc = np.vstack([np.stack([np.full(nw, e[-1]), zw[1:]], 1), np.stack([yb[1:], np.full(nbt, -D)], 1)])
    ncl = len(Ac)
    X1 = nodes(0.0); phitop = 0.0; work = 0.0; phib_prev = None; i_prev = None
    Ntot = Nt + int(round(extra * Nt))
    for n in range(Ntot):
        X0 = X1; X1 = nodes(min((n + 1) * dt * U, L)); Xm = 0.5 * (X0 + X1); V = (X1 - X0) / dt
        b = Xm[0, 0]; T = -Xm[-1, 1]
        body = b > 1e-5 * L and T > 1e-6 * L
        if not body: b = 0.0
        # active free-surface panels: first panel is clipped at the waterline
        i0 = int(np.searchsorted(e, b, side='right')) - 1
        if e[i0 + 1] - b < 0.3 * wd[i0]: i0 += 1
        act = np.arange(i0, nf)
        newly = covered[act]
        if born == 'conserve':
            # contact-line closure: the water volume standing above (or missing below) the calm level where the
            # waterline sweeps is kept: pushed outward when the section widens, spread inward when it narrows
            ip = i_prev if i_prev is not None else i0
            if ip != i0:
                lo_, hi_ = min(ip, i0), min(max(ip, i0) + nsp, nf)
                was = ~covered[lo_:hi_]; vol = np.sum((eta[lo_:hi_] * wd[lo_:hi_])[was])
                now = np.arange(lo_, hi_) >= i0
                eta[lo_:hi_] = np.where(now, vol / np.sum(wd[lo_:hi_][now]), 0.0)
                if newly.any(): phi[act[newly]] = phitop
            i_prev = i0
        elif newly.any():                      # water uncovered by the narrowing section
            j = act[~newly][0]
            phi[act[newly]] = phitop; eta[act[newly]] = np.mean(eta[j:j + 3]) if born == 'contact' else 0.0
        covered[:] = True; covered[act] = False
        lo = e[act].copy(); lo[0] = b; hi = e[act + 1]
        Af = np.stack([hi, np.zeros(len(act))], axis=1); Bf = np.stack([lo, np.zeros(len(act))], axis=1)
        Pf = 0.5 * (Af + Bf)
        if body:
            Ab = Xm[:-1]; Bb = Xm[1:]; ok = np.hypot(*(Bb - Ab).T) > 1e-9 * L
            Ab = Ab[ok]; Bb = Bb[ok]; tb = (Bb - Ab); lb = np.hypot(tb[:, 0], tb[:, 1]); tb /= lb[:, None]
            nb = np.stack([tb[:, 1], -tb[:, 0]], axis=1)
            Vm = 0.5 * (V[:-1] + V[1:])[ok]
            qb = np.sum(Vm * nb, axis=1)
            A = np.vstack([Ac, Ab, Af]); B = np.vstack([Bc, Bb, Bf]); nbp = ncl + len(Ab)
            qb = np.concatenate([np.zeros(ncl), qb]); lb = np.concatenate([np.zeros(ncl), lb])
        else:
            A = np.vstack([Ac, Af]); B = np.vstack([Bc, Bf]); nbp = ncl; qb = np.zeros(ncl)
        P = 0.5 * (A + B)
        Gm, Hm = infl(P, A, B); Pm = P.copy(); Pm[:, 0] *= -1
        G2, H2 = infl(Pm, A, B); Gm += G2; Hm += H2
        Hm[np.arange(len(P)), np.arange(len(P))] -= 0.5
        Mx = np.hstack([Hm[:, :nbp], -Gm[:, nbp:]])
        rhs = Gm[:, :nbp] @ qb - Hm[:, nbp:] @ phi[act]
        sol = np.linalg.solve(Mx, rhs)
        qf = sol[nbp:]
        if body:
            phib = sol[:nbp]; phitop = phib[ncl]
            if phib_prev is not None and len(phib_prev) == nbp:      # work done on the water: -int p Vn dl, p = -rho dphi/dt
                work += 2 * rho * np.sum((phib - phib_prev) / dt * qb * lb) * dt
            phib_prev = phib
        eta[act] += dt * qf
        phi[act] -= dt * G * eta[act]
        if filt > 0:                          # 4th-order smoothing of grid-scale ripple on the uniform part of the surface
            a = act[0]; c = min(nuni, nf)
            if c - a > 6:
                for u in (eta, phi):
                    v = u[a:c]; v[2:-2] -= filt * (v[:-4] - 4 * v[1:-3] + 6 * v[2:-2] - 4 * v[3:-1] + v[4:])
        if record is not None: record(n, (n + 1) * dt, Xm if body else None, yc, eta.copy(), covered.copy(), b, work)
    te = Ntot * dt
    if covered.any():
        j = np.where(~covered)[0][0]; phi[covered] = phitop
        if born == 'conserve':
            c = covered.sum(); vol = np.sum(eta[c:c + nsp] * wd[c:c + nsp]); eta[:c + nsp] = vol / np.sum(wd[:c + nsp])
        else: eta[covered] = eta[j] if born == 'contact' else 0.0
    return dict(yc=yc, wd=wd, eta=eta, phi=phi, te=te, L=L, work=work)

def A_exact(m, k):
    """Complex amplitude each mode k is left with, same convention as A_thin."""
    yc, wd = m['yc'], m['wd']
    tap = np.clip((yc[-1] - yc) / (0.25 * yc[-1]), 0, 1); tap = np.sin(0.5 * np.pi * tap) ** 2
    # cosine transform of the piecewise-linear surface, integrated exactly (no aliasing on the stretched outer grid)
    ck = np.cos(k[:, None] * yc[None]); dc = (ck[:, 1:] - ck[:, :-1]) / (k[:, None] ** 2 * np.diff(yc)[None])
    tr = lambda f: dc @ np.diff(f * tap)
    om = np.sqrt(G * k)
    return (tr(m['eta']) + 1j * om / G * tr(m['phi'])) * np.exp(1j * om * m['te'])

def kgrid(L, kmin=0.5, kmax=200.0, n=900):
    return np.geomspace(kmin, kmax, n) / L

def drags(st, U, rho=1000.0, m=None, kcut=150.0, Nt=240):
    """All models for one hull and speed.  Returns dict of forces (N)."""
    s, _, _ = bowfirst(st); L = s[-1]; k0 = G / U ** 2
    if m is None: m = march(st, U, Nt=Nt, rho=rho)
    t, w = tgrid(k0, L); lam = np.cosh(t); kap = k0 * lam ** 2; nu = k0 * lam; ky = nu * np.sinh(t)
    Pm = 4 * rho * G ** 2 / (np.pi * U ** 2)
    J = A_thin(st, kap, nu)
    ok = kap * L <= kcut
    Aex = np.where(ok, A_exact(m, np.where(ok, kap, k0)), J)
    out = dict(michell=Pm * np.sum(w * lam ** 2 * np.abs(J) ** 2), A=Pm * np.sum(w * lam ** 2 * np.abs(Aex) ** 2),
               above_cut=Pm * np.sum((w * lam ** 2 * np.abs(J) ** 2)[~ok]))
    okb = (ky * L <= kcut) & (ky * L >= 1.0)
    kyy = np.where(okb, ky, k0)
    corr = np.where(okb, A_exact(m, kyy) - A_thin(st, kyy, np.sqrt(k0 * kyy)), 0.0)
    out['B'] = Pm * np.sum(w * lam ** 2 * np.abs(J + corr) ** 2)
    # transverse / divergent split of Michell at theta = 35.26 deg (sec = sqrt(3/2))
    tr = lam <= np.sqrt(1.5)
    out['michell_trans'] = Pm * np.sum((w * lam ** 2 * np.abs(J) ** 2)[tr])
    out['A_trans'] = Pm * np.sum((w * lam ** 2 * np.abs(Aex) ** 2)[tr])
    # pure 2D+t (all energy stays in the slice)
    k = kgrid(L, kmax=kcut); dk = np.gradient(k)
    Ath = A_thin(st, k, np.sqrt(k0 * k)); Ae = A_exact(m, k)
    out['slice_thin'] = 2 * rho * G / np.pi * np.sum(dk * np.abs(Ath) ** 2)
    out['slice_exact'] = 2 * rho * G / np.pi * np.sum(dk * np.abs(Ae) ** 2)
    out['work'] = m['work']
    out['spec'] = (k * L, np.abs(Ath), np.abs(Ae))
    return out
