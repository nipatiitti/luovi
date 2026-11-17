"""S3: a mass on a tension-only line driven through slack and taut. x>0 is stretch."""
import outdir  # run in out/
import numpy as np, pickle
from sail import genalpha
CASES = dict(
    light=dict(m=0.1, k=3.3e5, F0=10.0, F1=30.0, f=4.0),   # critic-1's case: raw thread, cloth-node mass
    heavy=dict(m=2.0, k=1.0e5, F0=20.0, F1=60.0, f=3.0),   # 8 mm polyester sheet 1.5 m long (EA 1.5e5 N), boom end + entrained air
)
def sim(case, hz, niter, rinf, T=10.0, keep=False):
    c = CASES[case]; m, k = c['m'], c['k']; h = 1.0/hz
    am, af, gam, bet = genalpha(rinf)
    F = lambda t: c['F0']+c['F1']*np.sin(2*np.pi*c['f']*t)
    x = 0.0; v = 0.0; a = F(0)/m; t = 0.0
    n = int(round(T*hz)); Ten = np.zeros(n); X = np.zeros(n)
    for i in range(n):
        a1 = a; fext = F(t+(1-af)*h)
        for it in range(niter):
            x1 = x+h*v+h*h*((0.5-bet)*a+bet*a1)
            xa = (1-af)*x1+af*x
            kk = k if xa > 0 else 0.0
            R = m*((1-am)*a1+am*a)+kk*xa-fext
            J = (1-am)*m+(1-af)*bet*h*h*kk
            a1 -= R/J
        x1 = x+h*v+h*h*((0.5-bet)*a+bet*a1); v = v+h*((1-gam)*a+gam*a1); x = x1; a = a1; t += h
        Ten[i] = k*max(0.0, x); X[i] = x
    return Ten, X
def stats(Ten, hz, f, T0=1.0):
    per = int(round(hz/f)); i0 = int(T0*hz); pk = [Ten[i:i+per].max() for i in range(i0, len(Ten)-per+1, per)]
    return max(pk), float(np.mean(pk))
if __name__ == '__main__':
    out = {}
    for case in CASES:
        f = CASES[case]['f']
        Tr, Xr = sim(case, 61440, 8, 1.0); mr, ar = stats(Tr, 61440, f)
        Tr2, _ = sim(case, 30720, 8, 1.0); mr2, ar2 = stats(Tr2, 30720, f)
        print(f"{case}: resolved (61440 Hz, 8 it, midpoint) max peak {mr:.0f} N, mean cycle peak {ar:.0f} N | at 30720 Hz: {mr2:.0f}, {ar2:.0f}")
        out[case] = dict(ref=(mr, ar), rows=[])
        for rinf, name in ((1.0, 'midpoint'), (0.7, 'gen-alpha 0.7'), (0.0, 'gen-alpha 0.0')):
            for hz in (240, 480):
                for ni in (1, 2, 4):
                    Tn, _ = sim(case, hz, ni, rinf); mx, av = stats(Tn, hz, f)
                    out[case]['rows'].append((name, hz, ni, mx, av))
                    print(f"  {name:14s} {hz} Hz {ni} it: max {mx:9.0f} ({100*(mx/mr-1):+6.0f}%)  mean cycle peak {av:9.0f} ({100*(av/ar-1):+6.0f}%)")
    pickle.dump(out, open('snatch_stats.pkl', 'wb'))
