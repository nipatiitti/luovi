import numpy as np, time
from wave import *
from hulls import *
L=1.0; S=0.1487
for N in (41,81,161):
    st=wigley(N=N)
    t0=time.time()
    row=[]
    for Fn in (0.05,0.08,0.1,0.12,0.16,0.2,0.25,0.3,0.316,0.35,0.4,0.5,0.6,0.9):
        U=Fn*np.sqrt(G*L); R=resistance(st,U); row.append(R/(0.5*1000*U*U*S)*1e3)
    print(N, ' '.join('%.3f'%r for r in row), '%.1fs'%(time.time()-t0))
st=wigley(N=81)
for lm in (8,14,30):
    print(lm, [round(resistance(st,Fn*np.sqrt(G),lam_max=lm)/(0.5*1000*Fn**2*G*S)*1e3,4) for Fn in (0.05,0.1,0.3,0.9)])
