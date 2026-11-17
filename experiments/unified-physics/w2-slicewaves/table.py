"""Summary tables from out/w2.json (and out/w2c.json when present): model / tank, range (median), pass counts.
The last block splits model A into the three hulls run first while the waterline rule was being chosen and the rest."""
import json, os, numpy as np
from common import OUT
d = json.load(open(OUT + 'w2.json'))
c = json.load(open(OUT + 'w2c.json')) if os.path.exists(OUT + 'w2c.json') else {}
hs = [n for n in d if n not in ('wigley', 's60')]
print(len(hs), 'Delft hulls')
F = d[hs[0]]['Fn']
def tab(key, sel=hs, src=d):
    return np.array([[src[n][key][i] / d[n]['Rr'][i] for i in range(len(F))] for n in sel])
def line(r): return ' | '.join('%.2f-%.2f (%.2f)' % (r[:, i].min(), r[:, i].max(), np.median(r[:, i])) for i in range(len(F)))
def passes(r, lo, hi):
    k = [i for i, f in enumerate(F) if lo - 1e-9 <= f <= hi + 1e-9]
    return int(np.all((r[:, k] <= 1.5) & (r[:, k] >= 1 / 1.5), axis=1).sum())
print('Froude       ', ' | '.join('%.2f' % f for f in F))
rows = [(k, d) for k in ('michell', 'r1b', 'A', 'B', 'slice_exact')] + ([(k, c) for k in ('r3b', 'C')] if all(n in c for n in hs) else [])
for key, src in rows:
    r = tab(key, src=src)
    print('%-12s' % key, line(r))
    print('     ' + '  '.join('pass %.2f-%.2f: %d/%d' % (lo, hi, passes(r, lo, hi), len(hs)) for lo, hi in ((0.25, 0.5), (0.35, 0.5), (0.4, 0.5), (0.4, 0.6), (0.45, 0.6))))
r = tab('A'); Lv = np.array([d[n]['Lv'] for n in hs]); BT = np.array([d[n]['BT'] for n in hs])
for i, f in enumerate(F): print('Fn %.2f corr(log A/tank, L/vol^1/3) %.2f  corr with B/T %.2f | michell: %.2f' % (f, np.corrcoef(np.log(r[:, i]), Lv)[0, 1], np.corrcoef(np.log(r[:, i]), BT)[0, 1], np.corrcoef(np.log(tab('michell')[:, i]), Lv)[0, 1]))
heavy = [n for n in hs if d[n]['Lv'] < 5.2]; light = [n for n in hs if d[n]['Lv'] >= 5.2]
for nm, sel in (('heavy L/v<5.2 (%d)' % len(heavy), heavy), ('light (%d)' % len(light), light)):
    for key in ('michell', 'A'): print(nm, key, line(tab(key, sel)))
w = d['wigley']; print('wigley Fn', w['Fn'], 'ref', w['ref'], 'michell', np.round(w['michell'], 2), 'A', np.round(w['A'], 2), 'B', np.round(w['B'], 2))
s = d['s60']
for key in ('michell', 'r1b', 'A', 'B'): print('s60', key, ' '.join('%.2f' % (a / b) for a, b in zip(s[key], s['CR'])))
print('s60 Fn', s['Fn'])
print('above cut share max', max(max(np.array(d[n]['above_cut']) / np.array(d[n]['michell'])) for n in hs))
# honesty split: hulls 22, 31, 12 were run first (heaviest, lightest, middle) and were on screen when "conserve" was chosen
SEEN = ['22', '31', '12']; rest = [n for n in hs if n not in SEEN]
print('\nModel A split, model / tank, range (median), Froude', ' '.join('%.2f' % f for f in F))
for nm, sel in (('seen (%d)' % len(SEEN), SEEN), ('unseen (%d)' % len(rest), rest), ('unseen less hull 6 (%d)' % (len(rest) - 1), [n for n in rest if n != '6'])):
    for key in ('A', 'michell'):
        r = tab(key, sel); print('%-24s %-8s' % (nm, key), line(r), '| within 1.5: 0.25-0.5 %d, 0.4-0.6 %d of %d' % (passes(r, 0.25, 0.5), passes(r, 0.4, 0.6), len(sel)))
