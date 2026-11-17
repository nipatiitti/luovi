"""Checks on the Wigley hull: (1) thin slice spectrum, time-domain mode equation against the closed form; (2) body-exact
slice against the thin slice on a thin hull; (3) model drags against the tank band."""
import time, numpy as np
from hulls import wigley
from slice import *
st = wigley(M=28); S = 0.1487
U = 0.35 * np.sqrt(G); k0 = G / U ** 2
s, Y, z = bowfirst(st)
for kL in (8.0, 20.0, 60.0):
    k = np.array([kL]); om = np.sqrt(G * kL); n = 20000; tt = np.linspace(0, 1 / U, n + 1); dt = tt[1] - tt[0]
    Fs = section_F(Y, z, k)[0]; F = np.interp(tt * U, s, Fs)
    h = 0.0; hd = 0.0        # H = F + h,  h'' + om^2 h = -om^2 F
    for i in range(n):
        hd += dt * (-om * om * (h + F[i])); h += dt * hd
    amp = np.hypot(h, hd / om)
    print('kL %5.1f  mode equation amplitude %.5e   closed form |A_thin| %.5e' % (kL, amp, abs(A_thin(st, k, np.sqrt(k0 * k))[0])))
for f in (0.25, 0.267, 0.289, 0.316, 0.40, 0.50):
    U = f * np.sqrt(G); nd = 0.5 * 1000 * U * U * S / 1e3; t0 = time.time()
    d = drags(st, U); kL, a, b = d['spec']
    sel = [np.argmin(abs(kL - q)) for q in (10, 20, 40, 80, 150)]
    print('Fn %.3f Cw x1000: Michell %.3f  A %.3f  B %.3f | 2D+t thin %.3f exact %.3f work %.3f | above cut %.3f | |Aex|/|Ath| at kL 10,20,40,80,150: %s  %.1fs' % (
        f, d['michell'] / nd, d['A'] / nd, d['B'] / nd, d['slice_thin'] / nd, d['slice_exact'] / nd, d['work'] / nd, d['above_cut'] / nd,
        ' '.join('%.2f' % (b[i] / a[i]) for i in sel), time.time() - t0), flush=True)
