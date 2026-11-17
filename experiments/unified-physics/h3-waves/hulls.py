import numpy as np

def sgrid(M=28):
    u = np.linspace(0, 1, M)
    return u ** 1.5          # denser near the waterline

def wigley(L=1.0, B=0.1, T=0.0625, N=81, M=28, lift=0.0):
    """Parabolic Wigley hull.  lift raises the hull by that many metres (flying a hull)."""
    x = np.linspace(-L / 2, L / 2, N)
    Tl = max(T - lift, 0.0)
    s = sgrid(M)
    z = -Tl * s[None] * np.ones((N, 1))
    Y = 0.5 * B * (1 - (2 * x[:, None] / L) ** 2) * (1 - ((z - lift) / T) ** 2)
    return dict(x=x, z=z, Y=np.maximum(Y, 0.0))

def _shape(xi, a, c):
    f = (4 * xi * (1 - xi)) ** a * np.exp(c * (xi - 0.5))
    return f

def _fit(target_area, target_centroid):
    """Find (a,c) so that f/max(f) has the given area coefficient and centroid (0..1 from stern)."""
    xi = np.linspace(0, 1, 4001)
    a, c = 1.5, 0.0
    def props(a, c):
        f = _shape(xi, a, c); f = f / f.max()
        A = np.trapezoid(f, xi); return A, np.trapezoid(f * xi, xi) / A
    for _ in range(60):
        A0, C0 = props(a, c)
        e = np.array([A0 - target_area, C0 - target_centroid])
        if np.abs(e).max() < 1e-7: break
        h = 1e-4
        A1, C1 = props(a + h, c); A2, C2 = props(a, c + h)
        Jm = np.array([[(A1 - A0) / h, (A2 - A0) / h], [(C1 - C0) / h, (C2 - C0) / h]])
        d = np.linalg.solve(Jm, -e); a += d[0]; c += d[1]
    return a, c

CWP = 0.69          # waterplane coefficient assumed for every series hull (typical of the series)
LCF_SHIFT = -0.015  # centre of flotation assumed 1.5 % of length aft of the centre of buoyancy

def delft(L, LB, BT, Lv, Cp, LCBpct, N=81, M=28, sink=0.0):
    """Section stack from the five published form parameters.
    Area curve matches Cp and LCB exactly; waterline matches beam, assumed Cwp;
    every section is the same family z = -T(1-(y/b)^m) with m from the midship coefficient,
    local depth from area/(beam*coefficient).  No overhangs, no keel, no transom."""
    B = L / LB; T = B / BT; V = (L / Lv) ** 3
    Cm = V / (Cp * L * B * T)
    xi = np.linspace(0, 1, N)
    a, c = _fit(Cp, 0.5 + LCBpct / 100)
    fS = _shape(xi, a, c); fS /= _shape(np.linspace(0, 1, 4001), a, c).max()
    p, q = _fit(CWP, 0.5 + LCBpct / 100 + LCF_SHIFT)
    fb = _shape(xi, p, q); fb /= _shape(np.linspace(0, 1, 4001), p, q).max()
    b = 0.5 * B * fb
    S = (V / (Cp * L)) * fS                      # section area, both sides
    with np.errstate(invalid='ignore', divide='ignore'):
        Tl = np.where(b > 0, S / (2 * b * Cm), 0.0)
    Tl[0] = Tl[-1] = 0.0
    m = Cm / (1 - Cm)
    s = sgrid(M)
    z = -Tl[:, None] * s[None]
    Y = b[:, None] * (1 - s[None]) ** (1 / m)
    x = (xi - 0.5) * L
    info = dict(L=L, B=B, T=T, V=V, Cm=Cm, Tmax=Tl.max(), a=a, m=m,
                Sw=(1.97 + 0.171 * BT) * (0.65 / Cm) ** (1 / 3) * np.sqrt(V * L))
    return dict(x=x, z=z, Y=Y, b=b, Tl=Tl, S=S, info=info)

def stack_volume(st):
    A = 2 * np.trapezoid(st['Y'][:, ::-1], st['z'][:, ::-1], axis=1)
    return np.trapezoid(A, st['x'])

def delft2(L, LB, BT, Lv, Cp, LCBpct, N=81, M=28, ef=1.3, xm=0.45, cwp=CWP, sac='poly'):
    """Second, more yacht-like family: straight-ish entrance (exponent ef), maximum beam at xm
    from the stern, waterline ending aft at a finite width chosen to give the waterplane
    coefficient; sections and area curve as in delft()."""
    B = L / LB; T = B / BT; V = (L / Lv) ** 3
    Cm = V / (Cp * L * B * T)
    xi = np.linspace(0, 1, N)
    a, c = _fit(Cp, 0.5 + LCBpct / 100)
    fS = _shape(xi, a, c); fS /= _shape(np.linspace(0, 1, 4001), a, c).max()
    fore = 1 - 1 / (ef + 1)
    w = (cwp - (1 - xm) * fore - xm * 2 / 3) / (xm / 3)
    u = np.clip((1 - xi) / (1 - xm), 0, 1); v = np.clip(xi / xm, 0, 1)
    fb = np.where(xi >= xm, 1 - (1 - u) ** ef, w + (1 - w) * (1 - (1 - v) ** 2))
    b = 0.5 * B * fb
    S = (V / (Cp * L)) * fS
    with np.errstate(invalid='ignore', divide='ignore'):
        Tl = np.where(b > 0, S / (2 * b * Cm), 0.0)
    Tl[-1] = 0.0
    m = Cm / (1 - Cm)
    s = sgrid(M)
    z = -Tl[:, None] * s[None]
    Y = b[:, None] * (1 - s[None]) ** (1 / m)
    x = (xi - 0.5) * L
    info = dict(L=L, B=B, T=T, V=V, Cm=Cm, Tmax=Tl.max(), a=a, m=m, w=w,
                entrance=np.degrees(np.arctan(ef * 0.5 * B / ((1 - xm) * L))),
                Sw=(1.97 + 0.171 * BT) * (0.65 / Cm) ** (1 / 3) * np.sqrt(V * L))
    return dict(x=x, z=z, Y=Y, b=b, Tl=Tl, S=S, info=info)
