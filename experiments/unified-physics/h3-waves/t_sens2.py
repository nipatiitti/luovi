import sys, numpy as np
import hulls
from wave import *; from hulls import *; from delftdata import *
path = sys.argv[1]
Fns = np.array([0.2,0.25,0.3,0.35,0.4,0.45,0.5,0.6])
n=1
lcb, cp, lv, bt, lb = PARAMS[n]
st0 = delft(LMODEL, lb, bt, lv, cp, lcb); inf=st0['info']
d = residuary(path, n, inf['Sw'], inf['V'])
print('measured', np.round(np.interp(Fns, d['Fn'], d['Rr']), 2))
def run(st,lab, damp=None):
    Rw = np.array([resistance(st, f * np.sqrt(G * LMODEL), damp=damp) for f in Fns]) / (1000 * G * inf['V']) * 1e3
    print('%-34s'%lab, np.round(Rw, 2))
for cwp in (0.62,0.66,0.69,0.73):
    for sh in (-0.015, -0.04):
        hulls.CWP=cwp; hulls.LCF_SHIFT=sh
        st = delft(LMODEL, lb, bt, lv, cp, lcb)
        b=st['b']; x=st['x']
        ent=np.degrees(np.arctan((b[-4]-b[-1])/(x[-1]-x[-4])))
        run(st,'cwp %.2f lcf %.3f ent %.0f Tm %.2f'%(cwp,sh,ent,st['info']['Tmax']/st['info']['T']))
hulls.CWP=0.69; hulls.LCF_SHIFT=-0.015
st = delft(LMODEL, lb, bt, lv, cp, lcb)
xm = 0.5*(st['x'][1:]+st['x'][:-1])
for beta in (0.75,0.5,0.25,0.0):
    run(st,'stern sources x %.2f'%beta, damp=np.where(xm<0,beta,1.0))
# slender-ship variant: all of each section's area rate at one depth (centroid)
