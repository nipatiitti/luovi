"""extract_heeled.py: the heeled yawed blocks (10, 20, 30 deg) of the Delft measurements (DOI 10.4121/21501402, model scale),
which h1b's extract_delft.py left out.  python3 -I extract_heeled.py <measurements_modelscale.xlsx> <out.json>"""
import json, sys, openpyxl
num = lambda v: isinstance(v, (int, float))
wb = openpyxl.load_workbook(sys.argv[1], read_only=True, data_only=True); out = {}
for sn in wb.sheetnames:
    if not sn.startswith('Sys'): continue
    rs = list(wb[sn].iter_rows(values_only=True)); o = {}
    for i, r in enumerate(rs):
        if isinstance(r[0], str) and r[0].startswith('Yawed & heeled with appendages'):
            heel = next((h for h in (10, 20, 30) if ('%d°' % h) in r[0]), None)
            if heel is None: continue
            hdr = [str(h) if h else '' for h in rs[i + 1]]; col = lambda nm: next(k for k, h in enumerate(hdr) if h.startswith(nm))
            cV, cF, cA, cB, cH = col('V'), col('Ff'), col('Fa'), col('β'), col('FH')
            rows = []
            for x in rs[i + 2:]:
                if num(x[0]):
                    if all(num(x[c]) for c in (cV, cF, cA, cB)): rows.append(dict(V=x[cV], Ff=x[cF], Fa=x[cA], beta=x[cB], FHsin=x[cH]))
                elif x[0] is not None: break
            o[heel] = rows
    if o: out[int(sn.split()[1])] = o
json.dump(out, open(sys.argv[2], 'w'))
print(len(out), 'models', sum(len(v) for o in out.values() for v in o.values()), 'heeled runs')
