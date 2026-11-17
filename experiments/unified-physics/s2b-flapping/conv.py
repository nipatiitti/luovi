import outdir  # run in out/
import numpy as np, time, sys, pickle
from sail2 import *
def sched(t): return min(2.0, 1.5+max(0.0, t-2.0)*0.25)
def measure(o, t0=5.0, c=3.0):
    t=o['t']; X=o['X']; N=X.shape[1]-1
    ch=X[:,-1,:]; cl=np.linalg.norm(ch,axis=1); nrm=np.stack([-ch[:,1],ch[:,0]],1)/cl[:,None]
    cam=np.einsum('tnj,tj->tn',X,nrm); m=t>=t0
    if m.sum()<200: return None
    dt=t[1]-t[0]; out={}
    y=cam[m][:,3*N//4]; y=y-y.mean()
    F=np.abs(np.fft.rfft(y*np.hanning(len(y))))**2; f=np.fft.rfftfreq(len(y),dt); F[f<0.4]=0
    out['f_peak']=round(float(f[np.argmax(F)]),2); out['f_mean']=round(float((F*f).sum()/F.sum()),2)
    out['rms_cm']=round(float(100*y.std()),2); out['amp_cm']=round(float(100*np.abs(cam[m]).max()),1)
    # zero crossings along the chord (wave count), time-averaged
    sg=np.sign(cam[m][:,1:N]); out['waves']=round(float((sg[:,1:]!=sg[:,:-1]).sum(1).mean()),1)
    out['boom_deg_rms']=round(float(np.degrees(np.arctan2(ch[m][:,1],ch[m][:,0])).std()),2)
    return out
def one(N,hz,T=10.0,rec=480,**kw):
    t0=time.time(); s=Sim(N=N,hz=hz,sheet0=1.5,**kw); o=run(s,sched,T,rec_hz=min(rec,hz))
    r=dict(N=N,hz=hz,blown=o['blown'],t_end=round(o['t_end'],2)); m=measure(o)
    if m and not o['blown']: r.update(m)
    r['wall']=round(time.time()-t0); return r,o
if __name__=='__main__':
    base=dict(variant='c',niter=2,rinf=0.8,crimp=0.002)
    EI=float(sys.argv[1]); cases=eval(sys.argv[2]); extra=eval(sys.argv[3]) if len(sys.argv)>3 else {}
    for N,hz in cases:
        kw=dict(base); kw.update(extra); r,o=one(N,hz,EI=EI,**kw); print('EI',EI,extra,r,flush=True)
