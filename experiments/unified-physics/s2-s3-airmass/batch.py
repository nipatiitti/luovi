import outdir  # run in out/
import numpy as np, pickle, sys, time
from sail import *
from ease import analyse, onset, freq
def sched(t):   # fill 2 s, ease 0.1 m/s to 2.0 m, hold to 27 s, sheet in at 0.25 m/s
    if t < 27: return min(2.0, 0.55+max(0.0, t-2.0)*0.1)
    return max(0.62, 2.0-(t-27)*0.25)
def one(tag, T=27.0, **kw):
    t0=time.time(); s=Sim(**kw); o=run(s, sched, T, frame_hz=10)
    res=dict(tag=tag, blown=o['blown'], t_end=round(o['t_end'],2))
    if len(o['t'])>400:
        a=analyse(o); on=onset(o,a); t=o['t']
        res['onset']=None if on is None else {k:round(float(v),2) for k,v in on.items()}
        m=(t>1.5)&(t<2.0); res['fill_Ts']=round(float(o['Ts'][m].mean()),1); res['fill_cam%']=round(float(100*a['cam'][m].mean(0).max()/3),1)
        # luff-first: time first-quarter camber goes negative vs time aft-half camber goes negative
        N=o['X'].shape[1]-1; cf=a['cam'][:,1:N//4+1].min(1); ca=a['cam'][:,N//2:N].min(1)
        i1=np.argmax((cf<-0.005)&(t>2)); i2=np.argmax((ca<-0.005)&(t>2))
        res['luff_neg_t']=round(float(t[i1]),2) if cf[i1]<-0.005 else None; res['aft_neg_t']=round(float(t[i2]),2) if ca[i2]<-0.005 else None
        for (ta,tb) in ((17,22),(22,27)):
            m=(t>=ta)&(t<tb)
            if m.sum()>100:
                fp,fm=freq(o,a,ta,tb,node=3*N//4)
                res[f'f_{ta}_{tb}']=round(float(fp),2); res[f'amp_{ta}_{tb}']=round(float(np.abs(a['cam'][m]).max()),3); res[f'Tmax_{ta}_{tb}']=round(float(o['Tmax'][m].max()),1)
    res['wall']=round(time.time()-t0,1)
    print(res, flush=True)
    pickle.dump(dict(res=res, frames=o['frames'], t=o['t'], Ts=o['Ts'], Tmax=o['Tmax'], Ls=o['Ls']), open(f'run_{tag}.pkl','wb'))
if __name__=='__main__':
    which=sys.argv[1]
    if which=='main':
        for v in 'abcd':
            one(f'{v}_240_4_07', N=16, hz=240, variant=v, niter=4, rinf=0.7)
        for v in 'abcd':
            one(f'{v}_240_4_03', N=16, hz=240, variant=v, niter=4, rinf=0.3)
        for v in 'bcd':
            one(f'{v}_240_2_07', N=16, hz=240, variant=v, niter=2, rinf=0.7)
        one('c_240_2_03', N=16, hz=240, variant='c', niter=2, rinf=0.3)
        one('c_480_4_03', N=16, hz=480, variant='c', niter=4, rinf=0.3)
        one('c8_240_4_03', N=8, hz=240, variant='c', niter=4, rinf=0.3)
        one('c24_240_4_03', N=24, hz=240, variant='c', niter=4, rinf=0.3)
    if which=='ref':
        one('ref16_1920_03', N=16, hz=1920, variant='cu', niter=6, rinf=0.3)
        one('ref32_1920_03', N=32, hz=1920, variant='cu', niter=6, rinf=0.3)
    if which=='gif2':
        one('gif2', T=34.0, N=16, hz=240, variant='c', niter=4, rinf=0.3)
