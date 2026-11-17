import numpy as np
from geom import *
for n in (1, 2, 3, 6, 7):
    h = hydro()[str(n)]; st = stack(n)
    x = st['x']; V = np.trapezoid(st['area'], x); S = 2 * np.trapezoid(st['girth'], x)
    lcb = np.trapezoid(st['area'] * x, x) / V
    i = st['b'].argmax(); nb = np.where(st['b'] > 0)[0]
    ent = np.degrees(np.arctan((st['b'][nb[-4]] - st['b'][nb[-1]]) / (x[nb[-1]] - x[nb[-4]])))
    print('Sys %d  Lwl %.3f (%.3f)  Bwl %.4f (%.4f)  vol %.5f (%.5f)  lcb %.4f (%.4f)  wetted %.3f (%.3f)  entrance half-angle %.0f deg, stern waterline half-width at aft end %.3f' % (
        n, st['Lwl'], h['lwl0'], 2 * st['b'].max(), h['bwl0'], V, h['volc0'], lcb, h['lcb0'], S, h['sc0'], ent, st['b'][nb[0]]))
