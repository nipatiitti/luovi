"""The two demo boats, canoe body upright at static attitude: Michell, slice model A, hybrid C.
  out/boats.json                            both speed grids, newtons
  ../reference-model/data/wave-slice.json   model A at the Delft table's Froude points, as a fraction of canoe-body weight
No smoothing and no clipping: the table is the raw model output (a sum of squares, so never negative)."""
import json, os, time, numpy as np
from slice import drags
from hybrid import model_c
from common import OUT
import boats
FNS = [0.15, 0.20, 0.25, 0.30, 0.35, 0.40, 0.45, 0.50, 0.55, 0.60, 0.65, 0.70, 0.75]
KNOTS = np.round(np.arange(3.0, 8.001, 0.25), 2).tolist()
B = boats.load(); out = {}; ws = {}
for key, b in B.items():
    st = boats.stack(b); L = b['hydro']['LWL']; W = boats.RHO * boats.G * b['hydro']['volc']; t0 = time.time()
    d = dict(Fn=FNS, knots=KNOTS, weight=W)
    for tag, speeds in (('fn', [f * np.sqrt(boats.G * L) for f in FNS]), ('kn', [k * boats.KN for k in KNOTS])):
        r = [model_c(st, U, rho=boats.RHO) for U in speeds]
        for m in ('michell', 'A', 'C', 'r3b'): d[m + '_' + tag] = [float(q[m]) for q in r]
    chk = drags(st, 0.35 * np.sqrt(boats.G * L), rho=boats.RHO)['A']            # slice.py's own sum must agree with hybrid.py's
    assert abs(chk / d['A_fn'][4] - 1) < 1e-6, (chk, d['A_fn'][4])
    out[key] = d
    ws[key] = dict(source='Slice wave method, model A (experiments/unified-physics/w2-slicewaves, run_boats.py): ' + b['source']
                   + '. Upright, static attitude, no sinkage or trim, appendages left out. Fraction of canoe-body weight (rho g x %.3f m3) against Froude number on a waterline of %.3f m. Raw model output, no smoothing.' % (b['hydro']['volc'], L),
                   rr=[[f, round(v / W, 6)] for f, v in zip(FNS, d['A_fn'])])
    print(key, 'A/W', ' '.join('%.5f' % q[1] for q in ws[key]['rr']), '| Delft', ' '.join('%.5f' % q[1] for q in b['delftRr']), '%.0fs' % (time.time() - t0), flush=True)
    json.dump(out, open(OUT + 'boats.json', 'w'))
dst = os.path.join(boats.HERE, '..', 'reference-model', 'data'); os.makedirs(dst, exist_ok=True)
open(os.path.join(dst, 'wave-slice.json'), 'w').write(
    '{\n' + ',\n'.join('  %s: {"source": %s,\n    "rr": %s}' % (json.dumps(k), json.dumps(v['source']), json.dumps(v['rr'])) for k, v in ws.items()) + '\n}\n')
