"""Read the bare-hull upright runs of the Delft series (4TU.ResearchData, DOI 10.4121/21501402,
model-scale workbook) and reduce total resistance to residuary resistance the Delft way:
ITTC-57 friction at a Reynolds number on 0.7 Lwl, no form factor."""
import sys, json, numpy as np, openpyxl
G = 9.81
# Series 1 form parameters (Gerritsma et al. 1981, as tabulated in the UCI yacht hydrodynamics set):
# LCB %, Cp, Lwl/vol^(1/3), Bwl/Tc, Lwl/Bwl
PARAMS = {1: (-2.3, 0.568, 4.78, 3.99, 3.17), 2: (-2.3, 0.569, 4.78, 3.04, 3.64),
          3: (-2.3, 0.565, 4.78, 5.35, 2.76), 4: (-2.3, 0.564, 5.10, 3.95, 3.53),
          5: (-2.4, 0.574, 4.36, 3.96, 2.76), 6: (-2.4, 0.568, 4.34, 2.98, 3.15),
          7: (-2.3, 0.562, 5.14, 4.95, 3.17)}
LMODEL = 1.6

def fresh(T):
    nu = ((0.585e-3 * (T - 12) - 0.03361) * (T - 12) + 1.2350) * 1e-6
    rho = 1000.1 + 0.0552 * T - 0.0077 * T * T + 0.00004 * T ** 3
    return rho, nu

def load(path, n):
    wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
    rows = list(wb['Sys %d' % n].iter_rows(values_only=True))
    for i, r in enumerate(rows):
        if r[0] == 'Bare hull upright':
            T = float(r[11]); out = []
            for q in rows[i + 2:]:
                if not isinstance(q[0], (int, float)): break
                out.append([float(q[0]), float(q[1]), float(q[2]), float(q[3])])
            return T, np.array(out)

def residuary(path, n, Sw, vol):
    T, d = load(path, n)
    rho, nu = fresh(T)
    V = d[:, 0]
    Re = V * 0.7 * LMODEL / nu
    Cf = 0.075 / (np.log10(Re) - 2) ** 2
    Rf = 0.5 * rho * V ** 2 * Sw * Cf
    Fn = V / np.sqrt(G * LMODEL)
    disp = rho * G * vol
    return dict(Fn=Fn, Rr=(d[:, 1] - Rf) / disp * 1e3, Rf=Rf / disp * 1e3, Rt=d[:, 1] / disp * 1e3,
                sink=d[:, 2] / 1000, trim=d[:, 3], rho=rho, T=T)
