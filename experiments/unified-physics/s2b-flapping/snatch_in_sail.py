import outdir  # run in out/
import numpy as np, sys, pickle
from man import *
def stat(o, t0=9.0):
    t=o['t']; m=t>=t0; Tm=o['Tmax'][m]; hz=int(round(1/(t[1]-t[0]))); n=len(Tm)//hz
    if n<3: return None
    pk=np.array([Tm[i*hz:(i+1)*hz].max() for i in range(n)])
    ch=o['X'][m][:,-1,:]; ang=np.degrees(np.arctan2(ch[:,1],ch[:,0]))-np.degrees(CL)
    y=ang-ang.mean(); F=np.abs(np.fft.rfft(y*np.hanning(len(y))))**2; f=np.fft.rfftfreq(len(y),1/hz); F[f<0.15]=0
    nsn=int(((o['Ts'][m][1:]>0)&(o['Ts'][m][:-1]<=0)).sum())
    return dict(snatches=nsn,peak_max=round(float(pk.max())),peak_mean=round(float(pk.mean())),peak_median=round(float(np.median(pk))),taut_frac=round(float((o['Ts'][m]>0).mean()),3),boom_swing_deg=round(float(ang.max()-ang.min()),1),boom_hz=round(float(f[np.argmax(F)]),2))
if __name__=='__main__':
    for tag,kw in eval(sys.argv[1]):
        k=dict(N=16,hz=480,variant='c',niter=2,rinf=0.8,crimp=0.002,linesearch=True); k.update(kw)
        r,o=go('snatch',frame_hz=20,**k); print(tag, r['ok'], r['t_end'], stat(o) if r['ok'] else None, 'wall', r['wall'], flush=True)
        pickle.dump(dict(t=o['t'],Tmax=o['Tmax'],Ts=o['Ts'],ok=r['ok'],frames=o['frames'],Ls=o['Ls']),open(f'sn_{tag}.pkl','wb'))
