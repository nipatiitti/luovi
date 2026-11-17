"""Table from out/boats.json: wave drag in newtons against boat speed for Michell, slice A, hybrid C and the Delft
regression the demo used; and the speed each gives for the drive that makes 5.4 knots under the Delft curve
(skin friction as in the reference model: ITTC-57 line, whole wetted area)."""
import json, numpy as np
from common import OUT
import boats
B = boats.load(); R = json.load(open(OUT + 'boats.json'))
ws = json.load(open(boats.HERE + '/../reference-model/data/wave-slice.json'))
for key, b in B.items():
    d = R[key]; L = b['hydro']['LWL']; W = d['weight']; kn = np.array(d['knots']); V = kn * boats.KN; Fn = V / np.sqrt(boats.G * L)
    cur = dict(Michell=np.array(d['michell_kn']), A=np.array(d['A_kn']), C=np.array(d['C_kn']), Delft=W * boats.table(b['delftRr'], Fn),
               A_table=W * boats.table(ws[key]['rr'], Fn))            # A as the model will read it: 13 points, straight lines between
    Rf = boats.friction(b, V)
    print('\n%s  (waterline %.3f m, canoe-body weight %.0f N)' % (b['name'], L, W))
    print('knots Froude | friction | Michell | slice A | hybrid C | Delft | A / Delft')
    for i, k in enumerate(kn):
        if abs(k - round(k)) < 1e-9: print('%5.1f  %.3f | %5.0f | %5.0f | %5.0f | %5.0f | %5.0f | %.2f' % (k, Fn[i], Rf[i], cur['Michell'][i], cur['A'][i], cur['C'][i], cur['Delft'][i], cur['A'][i] / cur['Delft'][i]))
    f = np.array(d['Fn']); print('A / Delft at the table Froude points:', ' '.join('%.2f:%.2f' % (a, x / W / max(q[1], 1e-9)) for a, x, q in zip(f, d['A_fn'], b['delftRr'])))
    fine = np.linspace(3.0, 8.0, 5001); tot = lambda c: np.interp(fine, kn, Rf + c)
    drive = float(np.interp(5.4, fine, tot(cur['Delft'])))
    print('drive for 5.4 knots under Delft: %.0f N (friction %.0f, waves %.0f)' % (drive, np.interp(5.4, kn, Rf), drive - np.interp(5.4, kn, Rf)))
    for m in ('Michell', 'A', 'A_table', 'C', 'Delft'):
        t = tot(cur[m]); i = np.argmax(t >= drive); print('   %-8s %.2f knots%s' % (m, fine[i], '' if np.all(np.diff(t) > 0) else '  (total drag not monotonic)'))
