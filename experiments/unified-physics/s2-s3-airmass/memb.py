"""Flat membrane pinned at both ends, pretension T0, zero incidence: where does it go unstable?
Reference: Tiomkin & Raveh (as quoted by Mavroyiakoumou & Alben 2019): divergence below T = 1.73 rho U^2 L."""
import numpy as np, sys
from sail import *
def memb(T0, N=16, hz=240, variant='c', T=3.0, niter=2, rinf=0.7, **kw):
    s=Sim(N=N,hz=hz,variant=variant,niter=niter,rinf=rinf,sheet0=50.0,wind_ramp=0.0,**kw)
    s.pin_clew=True; c=3.0
    s.l0=(c/N)/(1+T0/s.c['EA_cloth'])
    s.X=np.outer(np.arange(N+1)*c/N,[1.,0.])
    xs=np.arange(N+1)*c/N
    s.V[:,1]=1e-4*(np.sin(np.pi*xs/c)+0.5*np.sin(2*np.pi*xs/c)+0.25*np.sin(5*np.pi*xs/c)); s.V[N]=0
    amp=[];ts=[]; shapes=[]
    while s.t<T and not s.blown:
        s.step(); amp.append(np.abs(s.X[:,1]).max()); ts.append(s.t)
        if amp[-1]>0.03: break
    amp=np.array(amp); ts=np.array(ts)
    # growth rate from last half
    k=len(amp)//2
    m=amp[k:]>0
    g=np.polyfit(ts[k:][m],np.log(amp[k:][m]),1)[0] if m.sum()>5 else float('nan')
    y=s.X[:,1]; saw=np.abs(np.diff(np.sign(np.diff(y)))).sum()/2
    return dict(end=round(s.t,2),amp=amp[-1],growth=round(g,2),turns=int(saw),blown=s.blown)
if __name__=='__main__':
    q=1.225*64*3
    for kw in (dict(variant='c',hz=240),dict(variant='c',hz=960),dict(variant='cu',hz=960),dict(variant='c',hz=960,N=32)):
        for r in (4.0,2.5,2.0,1.8,1.6,1.2):
            print(kw, 'T/(rho U2 L)',r, memb(r*q,**kw))
