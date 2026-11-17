"""Three geometry-only wave resistance sums over the same section stack.
 michell : sources on the centreplane (thin ship)
 hogner  : the same sources at their true distance off the centreplane (factor cos(ky*Y))
 noblesse: hogner plus the waterline integral of Noblesse's zeroth-order slender-ship
           approximation, J_wl = -(U^2/g) * int Yx nx^2 cos(ky Ywl) e^{i nu x} dx
All use analytic phase integration between stations.  No constants."""
import numpy as np
from wave import G, tgrid, LAM_MAX

def _nodesum(Fv, x, nu):
    """int dF/dx e^{i nu x} dx for F piecewise linear in x; Fv[K,N]."""
    s = np.diff(Fv, axis=1) / np.diff(x)[None]
    c = np.zeros_like(Fv); c[:, :-1] -= s; c[:, 1:] += s
    return np.sum(c * np.exp(1j * nu[:, None] * x[None]), axis=1) / (1j * nu)

def kochin3(st, k0, t, method):
    lam = np.cosh(t); kap = k0 * lam ** 2; nu = k0 * lam; ky = k0 * lam * np.sinh(t)
    x, z, Y = st['x'], st['z'], st['Y']
    dz = z[:, :-1] - z[:, 1:]
    F = np.empty((len(t), len(x)))
    for a in range(0, len(t), 1500):
        k = kap[a:a + 1500, None, None]; q = ky[a:a + 1500, None, None]
        if method == 'michell':
            g = np.broadcast_to(Y[None], (k.shape[0],) + Y.shape)
        else:
            qq = np.maximum(q, 1e-9); g = np.sin(qq * Y[None]) / qq
        m = np.where(dz[None] > 1e-12, (g[:, :, :-1] - g[:, :, 1:]) / np.maximum(dz[None], 1e-12), 0.0)
        E = np.exp(k * z[None])
        F[a:a + 1500] = (g[:, :, 0] * E[:, :, 0] - g[:, :, -1] * E[:, :, -1]) / k[:, :, 0] \
            - np.sum(m * (E[:, :, :-1] - E[:, :, 1:]), axis=2) / k[:, :, 0] ** 2
    J = _nodesum(F, x, nu)
    if method == 'noblesse':
        b = st['b']; bx = np.gradient(b, x)
        nx2 = bx ** 2 / (1 + bx ** 2 + st['flare'] ** 2)
        w = bx * nx2                                           # Yx nx^2 at the waterline
        gw = w[None] * np.cos(ky[:, None] * b[None])           # [K,N]
        e = np.exp(1j * nu[:, None] * x[None])
        I = (gw[:, -1] * e[:, -1] - gw[:, 0] * e[:, 0]) / (1j * nu) - _nodesum(gw, x, nu) / (1j * nu)
        J = J - (1.0 / k0) * I
    return J

def resistance3(st, U, method, rho=1000.0, lam_max=LAM_MAX):
    k0 = G / U ** 2
    L = st['x'].max() - st['x'].min()
    t, w = tgrid(k0, L, lam_max)
    J = kochin3(st, k0, t, method)
    return 4 * rho * G ** 2 / (np.pi * U ** 2) * np.sum(w * np.cosh(t) ** 2 * np.abs(J) ** 2)
