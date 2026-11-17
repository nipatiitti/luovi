"""S3 inside the sail: sheet held just past the luffing point so the boom swings and the sheet snatches."""
import outdir  # run in out/
import numpy as np, pickle, sys, time
from sail import *
def sched(t): return min(1.72, 0.55+max(0.0, t-2.0)*0.1)
def one(tag, **kw):
    t0=time.time(); s=Sim(**kw); o=run(s, sched, 24.0, rec_hz=240)
    t=o['t']; m=t>14.0
    if o['blown'] or m.sum()<100:
        print(tag,'BLEW UP at',round(o['t_end'],2),flush=True); res=dict(tag=tag,blown=True,t_end=o['t_end'])
    else:
        Tm=o['Tmax'][m]; n=len(Tm)//240; pk=np.array([Tm[i*240:(i+1)*240].max() for i in range(n)])
        res=dict(tag=tag,blown=False,max=float(Tm.max()),mean_1s_peak=float(pk.mean()),median_1s_peak=float(np.median(pk)),slack_frac=float((o['Ts'][m]<=0).mean()))
        print(tag,{k:(round(v,2) if isinstance(v,float) else v) for k,v in res.items()},'wall',round(time.time()-t0),flush=True)
    pickle.dump(dict(res=res,t=o['t'],Tmax=o['Tmax']),open(f'cs_{tag}.pkl','wb'))
if __name__=='__main__':
    for hz,ni,rinf in ((240,4,0.3),(480,4,0.3),(240,4,0.7),(480,4,0.7),(240,2,0.7),(480,2,0.7),(240,4,0.0),(480,4,0.0),(1920,6,0.3),(1920,6,0.7)):
        one(f'{hz}_{ni}_{rinf}',N=16,hz=hz,variant='c',niter=ni,rinf=rinf)
