"""Thin-ship (Michell) wave resistance and far-field wave pattern from a section stack.

A stack is: x[N] station positions (m, bow at the largest x), z[N,M] depths (0 at the
waterline, decreasing), Y[N,M] half-breadths (m).  Everything the integral needs per
section is F_i(kappa) = integral of Y e^{kappa z} dz, done analytically on the
piecewise-linear section; the lengthwise phase integral is done analytically per station
segment (F linear between stations), so there is no station aliasing at low speed.

R = (4 rho g^2 / (pi U^2)) * int_0^inf cosh^2 t |J|^2 dt,   sec(theta) = cosh t
J(theta) = int dF/dx e^{i nu x} dx,  nu = k0 sec(theta),  kappa = k0 sec^2(theta), k0 = g/U^2
"""
import numpy as np
G = 9.81
LAM_MAX = 14.0

def section_F(stack, kappa):
    """F[K,N] = int Y e^{kappa z} dz, exact for piecewise-linear Y(z)."""
    z, Y = stack['z'], stack['Y']
    out = np.empty((len(kappa), z.shape[0]))
    dz = z[:, :-1] - z[:, 1:]
    m = np.where(dz > 1e-12, (Y[:, :-1] - Y[:, 1:]) / np.maximum(dz, 1e-12), 0.0)
    for a in range(0, len(kappa), 2000):
        k = kappa[a:a + 2000, None, None]
        E = np.exp(k * z[None])
        t1 = (Y[None, :, 0] * E[:, :, 0] - Y[None, :, -1] * E[:, :, -1]) / k[:, :, 0]
        t2 = np.sum(m[None] * (E[:, :, :-1] - E[:, :, 1:]), axis=2) / k[:, :, 0] ** 2
        out[a:a + 2000] = t1 - t2
    return out

def tgrid(k0, Lref, lam_max=LAM_MAX, dphi=0.25, nmin=1500):
    tmax = np.arccosh(lam_max)
    n = int(max(nmin, np.ceil(k0 * Lref * lam_max * tmax / dphi)))
    n += (n % 2 == 0)
    t = np.linspace(0, tmax, n)
    w = np.full(n, t[1] - t[0]); w[0] *= 0.5; w[-1] *= 0.5
    return t, w

def kochin(stack, k0, t, damp=None):
    """J[K] complex.  damp: optional per-segment factor on the source strength."""
    lam = np.cosh(t)
    F = section_F(stack, k0 * lam ** 2)
    x = stack['x']
    s = np.diff(F, axis=1) / np.diff(x)[None]          # slope per segment
    if damp is not None:
        s = s * damp[None]
    c = np.zeros_like(F)
    c[:, :-1] -= s
    c[:, 1:] += s
    nu = k0 * lam
    return np.sum(c * np.exp(1j * nu[:, None] * x[None]), axis=1) / (1j * nu)

def resistance(stack, U, rho=1000.0, damp=None, extra=None, lam_max=LAM_MAX):
    """Michell resistance (N).  extra(t, k0) may return a second Kochin function to add."""
    k0 = G / U ** 2
    L = stack['x'].max() - stack['x'].min()
    t, w = tgrid(k0, L, lam_max)
    J = kochin(stack, k0, t, damp)
    if extra is not None:
        J = J + extra(t, k0)
    return 4 * rho * G ** 2 / (np.pi * U ** 2) * np.sum(w * np.cosh(t) ** 2 * np.abs(J) ** 2)

def pair_resistance(st1, st2, sep, U, rho=1000.0):
    """Two hulls abreast, centrelines sep apart.  Returns (R_pair, R1 alone, R2 alone)."""
    k0 = G / U ** 2
    L = st1['x'].max() - st1['x'].min()
    t, w = tgrid(k0, max(L, sep))
    lam = np.cosh(t)
    J1 = kochin(st1, k0, t); J2 = kochin(st2, k0, t)
    c = 4 * rho * G ** 2 / (np.pi * U ** 2)
    R1 = c * np.sum(w * lam ** 2 * np.abs(J1) ** 2)
    R2 = c * np.sum(w * lam ** 2 * np.abs(J2) ** 2)
    X = c * np.sum(w * lam ** 2 * 2 * np.real(J1 * np.conj(J2)) * np.cos(k0 * lam * np.sinh(t) * sep))
    return R1 + R2 + X, R1, R2

def wave_field(stack, U, xs, ys, y0=0.0, lam_cut=None, nt=None):
    """Free-wave elevation (m) on the grid xs (columns) by ys, from the same Kochin sum.
    Only stations ahead of each x contribute (waves trail their source).  Short waves are
    tapered above sec(theta)=lam_cut for display."""
    k0 = G / U ** 2
    L = stack['x'].max() - stack['x'].min()
    Fn = U / np.sqrt(G * L)
    if lam_cut is None:
        lam_cut = min(6.0, max(1.6, 11.0 * Fn))
    tmax = np.arccosh(lam_cut * 1.5)
    ymax = np.abs(ys - y0).max()
    if nt is None:
        nt = int(np.clip(k0 * lam_cut * 1.5 * np.sinh(tmax) * ymax / 0.6, 600, 5000))
    t = np.linspace(0, tmax, nt); dt = t[1] - t[0]
    lam = np.cosh(t)
    F = section_F(stack, k0 * lam ** 2)
    x = stack['x']
    s = np.diff(F, axis=1) / np.diff(x)[None]            # [K, nseg]
    nu = k0 * lam
    P = np.zeros((len(xs), nt))
    for a in range(0, len(xs), 40):
        xc = xs[a:a + 40]
        lo = np.maximum(x[None, :-1], xc[:, None]); hi = np.maximum(x[None, 1:], xc[:, None])
        # sum_seg s * int_lo^hi cos(nu (xc - x')) dx' = s * [sin(nu(xc-lo)) - sin(nu(xc-hi))]/nu
        ph_lo = nu[None, :, None] * (xc[:, None, None] - lo[:, None, :])
        ph_hi = nu[None, :, None] * (xc[:, None, None] - hi[:, None, :])
        P[a:a + 40] = np.sum(s[None] * (np.sin(ph_lo) - np.sin(ph_hi)), axis=2) / nu[None]
    wgt = dt * lam ** 2 * np.exp(-(lam / lam_cut) ** 6)
    wgt[0] *= 0.5
    Q = np.cos(k0 * (lam * np.sinh(t))[:, None] * (ys - y0)[None])
    return 4 * k0 / np.pi * (P * wgt[None]) @ Q          # [nx, ny]
