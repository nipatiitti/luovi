"""Added-mass matrix of the flat lattice against rho*pi*c^2/4 and critic-1 modal values."""
import numpy as np, time, sys
from sail import *
# 1. added-mass matrix of a flat chain
for N in (8,16,32):
    s=Sim(N=N,variant='cu',sheet0=5.0); s.X=np.outer(np.arange(N+1)*s.l0,[1.,0.]); s.t=5
    F,Ma=s.aero(); Mp=s.Mp; Ms=(Mp+Mp.T)/2
    xm=(np.arange(N)+0.5)*s.l0
    print(N,'total',Mp.sum(),'theory',1.225*np.pi*9/4,'asym',np.linalg.norm(Mp-Mp.T)/np.linalg.norm(Mp),'mineig',np.linalg.eigvalsh(Ms).min(),
      'modal',[round(float(np.sin(n*np.pi*xm/3)@Mp@np.sin(n*np.pi*xm/3)/(np.sin(n*np.pi*xm/3)**2).sum()/s.l0),2) for n in (1,2,4,6)])
