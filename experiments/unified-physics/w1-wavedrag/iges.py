"""Minimal IGES reader: rational B-spline surfaces (entity 128) evaluated on a grid."""
import numpy as np

def read_surfaces(path):
    D, P = [], {}
    with open(path, 'r', errors='replace') as f:
        for line in f:
            line = line.rstrip('\n').ljust(80)
            sec = line[72]
            if sec == 'D': D.append(line)
            elif sec == 'P':
                de = int(line[64:72]); P.setdefault(de, []).append(line[:64])
    out = []
    for i in range(0, len(D), 2):
        typ = int(D[i][0:8]); de = i + 1
        if typ != 128 or de not in P: continue
        txt = ''.join(P[de]).replace('D', 'E').replace(';', ',')
        v = [float(t) for t in txt.split(',') if t.strip() != ''][1:]
        K1, K2, M1, M2 = (int(a) for a in v[0:4])
        p = 9
        n1 = K1 + M1 + 2; n2 = K2 + M2 + 2; nc = (K1 + 1) * (K2 + 1)
        S = np.array(v[p:p + n1]); p += n1
        T = np.array(v[p:p + n2]); p += n2
        Wt = np.array(v[p:p + nc]).reshape(K2 + 1, K1 + 1); p += nc
        C = np.array(v[p:p + 3 * nc]).reshape(K2 + 1, K1 + 1, 3); p += 3 * nc
        u0, u1, v0, v1 = v[p:p + 4]
        out.append(dict(M1=M1, M2=M2, S=S, T=T, W=Wt, C=C, ur=(u0, u1), vr=(v0, v1)))
    return out

def basis(knots, deg, u):
    """B-spline basis matrix [len(u), nctrl] by Cox-de Boor."""
    n = len(knots) - deg - 1
    u = np.clip(u, knots[deg], knots[n] - 1e-12 * max(1.0, abs(knots[n])))
    B = np.zeros((len(u), len(knots) - 1))
    for j in range(len(knots) - 1):
        B[:, j] = (u >= knots[j]) & (u < knots[j + 1])
    for d in range(1, deg + 1):
        Bn = np.zeros((len(u), len(knots) - 1 - d))
        for j in range(len(knots) - 1 - d):
            a = knots[j + d] - knots[j]; b = knots[j + d + 1] - knots[j + 1]
            if a > 0: Bn[:, j] += (u - knots[j]) / a * B[:, j]
            if b > 0: Bn[:, j] += (knots[j + d + 1] - u) / b * B[:, j + 1]
        B = Bn
    return B

def evaluate(s, nu=160, nv=60):
    u = np.linspace(s['ur'][0], s['ur'][1], nu); v = np.linspace(s['vr'][0], s['vr'][1], nv)
    Bu = basis(s['S'], s['M1'], u); Bv = basis(s['T'], s['M2'], v)
    num = np.einsum('ui,vj,jik->uvk', Bu, Bv, s['C'] * s['W'][:, :, None])
    den = np.einsum('ui,vj,ji->uv', Bu, Bv, s['W'])
    return num / den[:, :, None]
