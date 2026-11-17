import outdir  # run in out/
import numpy as np, sys, time, pickle
from sail import *
def sched(t, L0=0.55, L1=2.0, t0=2.0, rate=0.1):
    return min(L1, L0+max(0.0, t-t0)*rate)
def analyse(o, win=0.5, c=3.0):
    """onset and frequency from recorded series (rec_hz 240)."""
    t=o['t']; X=o['X']; dt=t[1]-t[0]
    ch=X[:,-1,:]; cl=np.linalg.norm(ch,axis=1); nrm=np.stack([-ch[:,1],ch[:,0]],1)/cl[:,None]
    cam=np.einsum('tnj,tj->tn',X,nrm)            # deflection from the luff-clew line
    N=X.shape[1]-1
    k=int(win/dt); ker=np.ones(k)/k
    y=np.concatenate([cam, X[:,-1:,1]],1)         # node deflections + clew height
    ys=np.stack([np.convolve(y[:,j],ker,'same') for j in range(y.shape[1])],1)
    r=y-ys; r[:k]=0; r[-k:]=0
    amp=np.abs(r).max(1)
    return dict(t=t,cam=cam,res=r,amp=amp,aoa=np.degrees(np.arctan2(-ch[:,1],ch[:,0])))
def onset(o,a,thr=0.03):
    """first time the fast part of the motion exceeds thr metres and stays for 0.5 s"""
    t=a['t']; big=a['amp']>thr; dt=t[1]-t[0]; k=int(0.5/dt)
    run=np.convolve(big.astype(float),np.ones(k),'valid')
    idx=np.where(run>=0.5*k)[0]
    if not len(idx): return None
    i=idx[0]; j=max(0,i-int(0.5/dt))
    return dict(t=t[i],Ls=o['Ls'][i],Ts=o['Ts'][j:i].mean(),aoa=a['aoa'][j:i].mean())
def freq(o,a,t0,t1,node=None):
    t=a['t']; m=(t>=t0)&(t<t1); N=a['cam'].shape[1]-1
    y=a['cam'][m][:, N//2 if node is None else node]; y=y-y.mean(); dt=t[1]-t[0]
    if len(y)<16 or y.std()<1e-6: return 0.0, 0.0
    F=np.abs(np.fft.rfft(y*np.hanning(len(y))))**2; f=np.fft.rfftfreq(len(y),dt)
    F[f<0.3]=0
    return f[np.argmax(F)], (F*f).sum()/F.sum()
if __name__=='__main__':
    v=sys.argv[1]; N=int(sys.argv[2]); hz=int(sys.argv[3]); ni=int(sys.argv[4]); rinf=float(sys.argv[5]); T=float(sys.argv[6])
    kw={}
    for a in sys.argv[7:]:
        k_,v_=a.split('='); kw[k_]=float(v_) if '.' in v_ else int(v_)
    lag=bool(kw.pop('lagrem',0)); fe=kw.pop('flow_every',1)
    s=Sim(N=N,hz=hz,variant=v,niter=ni,rinf=rinf,lagrem=lag,flow_every=fe,**kw); t0=time.time()
    o=run(s,sched,T)
    if len(o['t'])<300: print(v,'blown at',o['t_end']); sys.exit()
    a=analyse(o); on=onset(o,a)
    print(v,N,hz,ni,rinf,kw,'blown',o['blown'],'t_end',round(o['t_end'],2),'wall',round(time.time()-t0,1))
    print(' onset',on)
    t=o['t']
    for tt in np.arange(2,T,1.0 if T<30 else 2.0):
        m=(t>=tt)&(t<tt+1)
        if m.sum()<10: break
        fp,fm=freq(o,a,tt,tt+1)
        print(f"  t {tt:5.1f} Ls {o['Ls'][m].mean():.3f} Ts mean {o['Ts'][m].mean():7.1f} max {o['Tmax'][m].max():8.1f} aoa {a['aoa'][m].mean():6.2f} amp {a['amp'][m].max():.3f} f {fp:.1f} cam% {np.round(100*a['cam'][m].mean(0)/3,1)[1::max(1,N//8)]}")
    pickle.dump({k:o[k] for k in ('t','Ts','T1','X','Ls','G1','Tmax','blown','t_end')},open(f'out_{v}_{N}_{hz}_{ni}_{rinf}.pkl','wb'))
