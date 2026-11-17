"""Three geometry-and-physics-only repairs of the thin-ship (Michell) sum, plus the baseline.
 base      : Michell, sources on the centreplane (wave.py)
 R1 visc   : bow/stern interference damped by turbulent viscosity (Gotman 2020 form, made dimensionless),
             k = exp(-C_VISC / Fn^5); one global constant.  Also R1b: Havelock-type stern factor BETA.
 R2 wetted : hull re-cut under its own thin-ship wave profile (one pass), so overhangs wet as the wave rises.
 R3 march  : self-diffraction.  The wave made by the forward sections has orbital velocities that the hull
             skin further aft must block; the blocking sources are found marching bow to stern (waves only
             trail aft, so the system is causal and one sweep solves it).  No constants.
"""
import numpy as np
from wave import G, tgrid, kochin, section_F, wave_field, LAM_MAX
C_VISC = 0.0095     # Gotman: nu_turb 0.05-0.08 at L 4.5-5.0 m -> 0.065/(sqrt(4.75)*sqrt(9.81)); used as one number
BETA = 0.6          # Havelock-type amplitude factor on the afterbody sources (boundary-layer displacement)

def _pref(U, rho): return 4 * rho * G ** 2 / (np.pi * U ** 2)

def split_masks(st):
    xm = 0.5 * (st['x'][1:] + st['x'][:-1])
    F0 = np.trapezoid(st['Y'], -st['z'], axis=1) if 'area' not in st else st['area']
    xmax = st['x'][np.argmax(F0)]
    return (xm > xmax).astype(float), (xm <= xmax).astype(float)

def r_base_visc(st, U, rho=1000.0):
    """returns (Michell, R1 Gotman-type interference damping, R1b stern x BETA, bow sources only)."""
    k0 = G / U ** 2; L = st['x'].max() - st['x'].min(); Fn = U / np.sqrt(G * L)
    t, w = tgrid(k0, L); lam2 = np.cosh(t) ** 2
    mb, ms = split_masks(st)
    Jb = kochin(st, k0, t, mb); Js = kochin(st, k0, t, ms)
    P = _pref(U, rho); S = lambda J: P * np.sum(w * lam2 * np.abs(J) ** 2)
    cross = P * np.sum(w * lam2 * 2 * np.real(Jb * np.conj(Js)))
    k = np.exp(-C_VISC / Fn ** 5)
    return S(Jb + Js), S(Jb) + S(Js) + k * cross, S(Jb + BETA * Js), S(Jb)

def panels(st, Mp=20):
    """Starboard skin as quads between stations: centroid, depth range, outward area vector."""
    M = st['z'].shape[1]
    idx = np.unique(np.round(np.linspace(0, M - 1, Mp)).astype(int))
    x = st['x']; Y = st['Y'][:, idx]; z = st['z'][:, idx]
    P = np.stack([np.broadcast_to(x[:, None], Y.shape), Y, z], axis=2)       # [N,Mp,3]
    a = P[1:, 1:] - P[:-1, :-1]; b = P[:-1, 1:] - P[1:, :-1]
    nS = 0.5 * np.cross(a, b)                                                # [N-1,Mp-1,3]
    if nS[..., 1].sum() < 0: nS = -nS
    c = 0.25 * (P[1:, 1:] + P[:-1, :-1] + P[:-1, 1:] + P[1:, :-1])
    zt = 0.5 * (z[1:, :-1] + z[:-1, :-1]); zb = 0.5 * (z[1:, 1:] + z[:-1, 1:])
    return c, zt, zb, nS

def r_march(st, U, rho=1000.0, Mp=20, lam_max=LAM_MAX, detail=False, gap_k0=0.0):
    """returns (Michell, R3 self-diffraction marching).
    gap_k0 = 0: R3 as first proposed.  gap_k0 = 1 (R3b): a section only feels the waves of sources more than
    U^2/g ahead of it (one radian of the transverse wave), because closer than that the single-integral
    'wave part' of a source is not yet a wave but part of its local flow, which the basic source already covers."""
    k0 = G / U ** 2; x = st['x']; L = x.max() - x.min()
    t, w = tgrid(k0, L, lam_max); lam = np.cosh(t); kap = k0 * lam ** 2; nu = k0 * lam; ky = nu * np.sinh(t)
    F = section_F(st, kap); s = np.diff(F, axis=1) / np.diff(x)[None]         # [nt,N-1]
    J0 = kochin(st, k0, t)
    I = s * (np.exp(-1j * nu[:, None] * x[None, :-1]) - np.exp(-1j * nu[:, None] * x[None, 1:])) / (1j * nu[:, None])
    c, zt, zb, nS = panels(st, Mp)
    B = 4 * k0 / np.pi * w * lam ** 2
    Cup = np.zeros(len(t), complex); Ccorr = np.zeros(len(t), complex); J1 = np.zeros(len(t), complex)
    qs = np.zeros(nS.shape[:2])
    gap = gap_k0 / k0
    xcs = 0.5 * (x[1:] + x[:-1])
    Iup = np.zeros((len(x), len(t)), complex)                           # Iup[j] = sum of segments j.. to the bow
    Iup[:-1] = np.cumsum(I[:, ::-1], axis=1)[:, ::-1].T
    Ccum = np.zeros((len(xcs) + 1, len(t)), complex)                    # blocking sources of columns j.. to the bow
    for i in range(len(x) - 2, -1, -1):
        xc = xcs[i]
        xg = xc + gap
        if xg >= x[-1]:
            C = np.zeros(len(t), complex)
        else:
            j = min(int(np.searchsorted(x, xg, side='right')) - 1, len(x) - 2)
            part = s[:, j] * (np.exp(-1j * nu * xg) - np.exp(-1j * nu * x[j + 1])) / (1j * nu)
            jc = int(np.searchsorted(xcs, xg, side='right'))            # first column wholly beyond the gap
            C = -(Iup[j + 1] + part) + (Ccum[jc] if jc < len(xcs) else 0.0)
        Wv = np.exp(1j * nu * xc) * C
        dz = np.maximum(zt[i] - zb[i], 1e-9)[None]
        E = (np.exp(kap[:, None] * zt[i][None]) - np.exp(kap[:, None] * zb[i][None])) / (kap[:, None] * dz)   # [nt,K]
        cy = np.cos(ky[:, None] * c[i, :, 1][None]); sy = np.sin(ky[:, None] * c[i, :, 1][None])
        g = (B * U / lam)[:, None] * E
        u = np.sum(g * (nu * Wv.real)[:, None] * cy, axis=0)
        v = -np.sum(g * (ky * Wv.imag)[:, None] * sy, axis=0)
        wz = np.sum(g * (kap * Wv.imag)[:, None] * cy, axis=0)
        q = nS[i, :, 0] * u + nS[i, :, 1] * v + nS[i, :, 2] * wz              # wave flux through each panel
        qs[i] = q
        a = (E * cy) @ (q / U)
        Ccum[i] = Ccum[i + 1] - a * np.exp(-1j * nu * xc)
        J1 = J1 + a * np.exp(1j * nu * xc)
    P = _pref(U, rho); lam2 = lam ** 2
    R0 = P * np.sum(w * lam2 * np.abs(J0) ** 2); R3 = P * np.sum(w * lam2 * np.abs(J0 + J1) ** 2)
    if detail: return R0, R3, dict(q=qs, c=c, nS=nS)
    return R0, R3

def profile(st, U, xs):
    """Thin-ship free-wave elevation on the centreline (crest positive).  NB wave.wave_field has the
    opposite sign (a source makes a crest, see result.md), corrected here."""
    return -wave_field(st, U, xs, np.array([0.0]))[:, 0]

def stack_wetted(n, zeta_of_x, N=81, M=48):
    """Delft hull n re-cut under a wavy surface: each section is clipped at the local wave height,
    depths are then measured from that local surface (so the overhangs wet where the wave stands up)."""
    import geom
    X, Lwl = geom.placed(n)
    scan = np.linspace(X[:, :, 0].min() + 1e-6, X[:, :, 0].max() - 1e-6, 500)
    def wetsec(xs):
        out = []
        for x, p in zip(xs, geom.cut(X, xs)):
            if len(p): p = p - np.array([0.0, zeta_of_x(x)])[None]
            out.append(geom.underwater(p))
        return out
    wet = [len(q) > 1 for q in wetsec(scan)]
    iw = np.where(wet)[0]
    x0 = scan[max(iw[0] - 1, 0)]; x1 = scan[min(iw[-1] + 1, len(scan) - 1)]
    xs = np.linspace(x0, x1, N)
    secs = wetsec(xs)
    s = np.linspace(0, 1, M) ** 1.5
    z = np.zeros((N, M)); Y = np.zeros((N, M)); area = np.zeros(N)
    for i, q in enumerate(secs):
        if len(q) < 2: continue
        T = -q[:, 1].min(); zz = -T * s; z[i] = zz
        for k, zk in enumerate(zz):
            a, b = q[:-1], q[1:]
            m = ((a[:, 1] - zk) * (b[:, 1] - zk) <= 0) & (a[:, 1] != b[:, 1])
            if m.any():
                f = (zk - a[m, 1]) / (b[m, 1] - a[m, 1]); Y[i, k] = np.max(a[m, 0] + f * (b[m, 0] - a[m, 0]))
        Y[i, 0] = q[-1, 0]; Y[i, -1] = 0.0
        area[i] = 2 * abs(np.trapezoid(q[:, 0], q[:, 1]))
    return dict(x=xs, z=z, Y=Y, b=Y[:, 0].copy(), area=area, Lwl=Lwl)

def r_wetted(n, st, U, rho=1000.0, passes=1):
    """R2: one pass of 'the hull sits in its own wave'.  Wave height from the thin-ship free-wave field of
    the static hull on the centreline, limited to the static stations' span and held flat beyond the ends."""
    from wave import resistance
    xs = np.linspace(st['x'].min(), st['x'].max(), 61)
    s2 = st
    for _ in range(passes):
        zc = profile(s2, U, xs)
        zeta = lambda x: float(np.interp(x, xs, zc))
        s2 = stack_wetted(n, zeta)
    return resistance(s2, U, rho=rho), s2, (xs, zc)
