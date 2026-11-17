import outdir  # run in out/
import sys
from conv import *
base=dict(niter=2,rinf=0.8,crimp=0.002,linesearch=True)
for tag,N,hz,kw in eval(sys.argv[1]):
    k=dict(base); k.update(kw); r,o=one(N,hz,**k); print(tag,r,flush=True)
