"""Runs for the resolution GIF: same sail, same ease, four resolutions."""
import outdir  # run in out/
import pickle, numpy as np
from conv import *
base=dict(variant='c',niter=2,rinf=0.8,crimp=0.002,linesearch=True)
for tag,N,hz,kw in (('n16',16,480,{}),('n32',32,960,{}),('n64',64,960,{}),('n16stiff',16,480,dict(EI=0.05))):
    k=dict(base); k.update(kw); s=Sim(N=N,hz=hz,sheet0=1.5,**k); o=run(s,sched,10.0,rec_hz=480,frame_hz=60)
    t=o['t']; X=o['X']; ch=X[:,-1,:]; cl=np.linalg.norm(ch,axis=1); nrm=np.stack([-ch[:,1],ch[:,0]],1)/cl[:,None]
    y=np.einsum('tj,tj->t',X[:,3*N//4,:],nrm)
    pickle.dump(dict(frames=[dict(t=f['t'],X=f['X'],Ts=f['Ts'],wP=f['wP'][::max(1,hz//240)],wG=f['wG'][::max(1,hz//240)]) for f in o['frames']],t=t,y=y,m=measure(o),blown=o['blown']),open(f'gA_{tag}.pkl','wb'))
    print(tag,measure(o),flush=True)
