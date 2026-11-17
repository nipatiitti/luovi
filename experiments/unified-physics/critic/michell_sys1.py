# Run inside a copy of h3-waves/code: Michell drag of generated Delft hulls 1 and 3 in newtons,
# to compare with the measured TOTAL resistance of the appended model (6.95 N at 1.387 m/s, h1 run_all.mjs).
import numpy as np
from wave import *; from hulls import *; from delftdata import *
for n in (1,3):
    lcb, cp, lv, bt, lb = PARAMS[n]
    st = delft(LMODEL, lb, bt, lv, cp, lcb); inf=st['info']
    for Fn in (0.25,0.30,0.35,0.40,0.5,0.6):
        U=Fn*np.sqrt(G*LMODEL); R=resistance(st,U,rho=999.0)
        print(n,Fn,'U',round(U,3),'Michell Rw N',round(R,2),'Rw/weight x1000',round(R/(999*G*inf['V'])*1e3,2))
