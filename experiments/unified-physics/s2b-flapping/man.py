"""Three manoeuvres for solver robustness: sheet ease, tack, head-to-wind flogging."""
import outdir  # run in out/
import numpy as np, time, sys, pickle
from sail2 import *
CL = np.arctan2(-1.2, 2.6)     # direction of the boat's centreline (luff to sheet lead) in the model frame
def ramp(t, t0, t1, a, b): return a+(b-a)*min(1.0, max(0.0, (t-t0)/(t1-t0)))
MAN = dict(
    ease=dict(T=19.0, sheet=lambda t: ramp(t, 2.0, 9.25, 0.55, 2.0), wdir=lambda t: 0.0),
    tack=dict(T=14.0, sheet=lambda t: 0.55, wdir=lambda t: ramp(t, 3.0, 7.0, 0.0, 2*CL)),
    snatch=dict(T=18.0, sheet=lambda t: ramp(t, 3.0, 6.0, 0.55, 0.9) if t < 9 else ramp(t, 9.0, 16.0, 0.9, 0.2), wdir=lambda t: ramp(t, 3.0, 6.0, 0.0, CL)),
    flog=dict(T=16.0, sheet=lambda t: ramp(t, 3.0, 6.0, 0.55, 0.9), wdir=lambda t: ramp(t, 3.0, 6.0, 0.0, CL)),
)
def go(name, frame_hz=None, rec_hz=240, **kw):
    m = MAN[name]; s = Sim(**kw); s.wdir = m['wdir']; t0 = time.time()
    o = run(s, m['sheet'], m['T'], rec_hz=rec_hz, frame_hz=frame_hz)
    r = dict(man=name, ok=not o['blown'], t_end=round(o['t_end'], 2), solves_per_s=round(s.nsolve/max(o['t_end'], 1e-9)))
    if len(o['t']) > 10:
        r['Ts_max'] = round(float(o['Tmax'].max())); r['Ts_end'] = round(float(o['Ts'][-240:].mean()), 1)
        ch = o['X'][:, -1, :]; r['boom_end_deg'] = round(float(np.degrees(np.arctan2(ch[-1, 1], ch[-1, 0]))), 1)
    r['wall'] = round(time.time()-t0, 1)
    return r, o
if __name__ == '__main__':
    sets = eval(sys.argv[1])
    for kw in sets:
        k = dict(N=16, hz=240, variant='c', niter=2, rinf=0.8, crimp=0.002, linesearch=True); k.update(kw)
        res = [go(n, **k)[0] for n in ('ease', 'tack', 'flog')]
        print(kw, 'ALL OK' if all(r['ok'] for r in res) else 'FAIL', flush=True)
        for r in res: print('   ', r, flush=True)
