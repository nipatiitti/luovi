import os, sys, numpy as np
from iges import *
for n in sys.argv[1:]:
    ss = read_surfaces(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'dl', 'geo', 'IGS', 'SYSSER%s_surface.igs' % n))
    print('SYSSER', n, len(ss), 'surfaces')
    for s in ss:
        X = evaluate(s, 40, 20)
        print('   deg', s['M1'], s['M2'], 'ctrl', s['C'].shape[:2], 'bbox', np.round(X.reshape(-1, 3).min(0)), np.round(X.reshape(-1, 3).max(0)))
