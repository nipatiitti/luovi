"""Model C: body-exact water slices for the waves that spread sideways, w1's blocking march (R3b) for the waves that
follow astern.  Split at the Kelvin cusp direction sec(theta) = sqrt(3/2) (35.26 deg), not fitted."""
import inspect, numpy as np
from slice import *
import repairs
src = inspect.getsource(repairs.r_march).replace("def r_march(", "def r_march_J(")
a = src.index("    P = _pref(U, rho); lam2 = lam ** 2"); src = src[:a] + "    return t, w, lam, J0, J1, _pref(U, rho)\n"
exec(src, repairs.__dict__)
def model_c(st, U, rho=1000.0, kcut=150.0):
    s, _, _ = bowfirst(st); L = s[-1]; k0 = G / U ** 2
    t, w, lam, J0, J1, P = repairs.r_march_J(st, U, rho=rho, gap_k0=1.0)
    kap = k0 * lam ** 2; m = march(st, U, rho=rho)
    ok = kap * L <= kcut
    Aex = np.where(ok, A_exact(m, np.where(ok, kap, k0)), J0)
    tr = lam <= np.sqrt(1.5)
    I = w * lam ** 2
    return dict(C=P * np.sum(I * np.where(tr, np.abs(J0 + J1) ** 2, np.abs(Aex) ** 2)), A=P * np.sum(I * np.abs(Aex) ** 2),
                r3b=P * np.sum(I * np.abs(J0 + J1) ** 2), michell=P * np.sum(I * np.abs(J0) ** 2),
                A_tr=P * np.sum((I * np.abs(Aex) ** 2)[tr]), r3b_tr=P * np.sum((I * np.abs(J0 + J1) ** 2)[tr]), m_tr=P * np.sum((I * np.abs(J0) ** 2)[tr]))
