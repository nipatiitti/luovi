from memb import *
q=1.225*64*3
for kw in (dict(variant='c',hz=240,N=16),dict(variant='c',hz=240,N=32)):
    for r in (0.95,0.9,0.86,0.82,0.78,0.7):
        o=memb(r*q,T=14.0,**kw); print(kw,r,o['end'],'%.2e'%o['amp'],o['growth'],o['turns'],flush=True)
