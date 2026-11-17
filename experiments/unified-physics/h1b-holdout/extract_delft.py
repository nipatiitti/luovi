"""extract_delft.py: reads the two open Delft spreadsheets (measurements DOI 10.4121/21501402,
hydrostatics 10.4121/21501375) and writes out/delft_cases.json: for every Sysser model with a
keel position and upright yawed tests, its main particulars at model scale and every test row.
Run with:  python3 -I extract_delft.py <measurements_modelscale.xlsx> <measurements_fullscale.xlsx> <hydrostatics_fullscale.xlsx>
"""
import json, os, sys
import openpyxl
meas, full, hydro = sys.argv[1:4]
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'out')
os.makedirs(OUT, exist_ok=True)
num = lambda v: isinstance(v, (int, float))
hs = {}
for r in list(openpyxl.load_workbook(hydro, read_only=True, data_only=True)['Canoe body hydrostatics'].iter_rows(values_only=True))[1:]:
    if num(r[0]) and r[2] == 1:  # original overhang
        hs[int(r[0])] = dict(series=r[1], lwl=r[3], bwl=r[4], tc=r[5], lcb=r[7], cp=r[14], cm=r[13])
wb = openpyxl.load_workbook(meas, read_only=True, data_only=True)
wf = openpyxl.load_workbook(full, read_only=True, data_only=True)
out = []
for sn in wb.sheetnames:
    if not sn.startswith('Sys'): continue
    n = int(sn.split()[1]); rs = list(wb[sn].iter_rows(values_only=True)); rf = list(wf[sn].iter_rows(values_only=True))
    info = {}
    for r in rs[:11]:
        if isinstance(r[0], str) and len(r) > 4 and num(r[4]): info[r[2] or r[0][:15]] = r[4]
    # scale from the first bare-hull speed in both files
    vm = next(r[0] for r in rs[12:] if num(r[0])); vf = next(r[0] for r in rf[12:] if num(r[0]))
    scale = (vf / vm) ** 2
    def block(title_test):
        for i, r in enumerate(rs):
            if isinstance(r[0], str) and title_test(r[0]):
                hdr = [str(h) if h else '' for h in rs[i + 1]]; rows = []
                for x in rs[i + 2:]:
                    if num(x[0]): rows.append(x)
                    elif x[0] is not None: break
                return r, hdr, rows
        return None, None, []
    t, hdr, rows = block(lambda s: 'awed' in s and '0° heel' in s and not any(k in s for k in ('10°', '20°', '30°')))
    _, _, up = block(lambda s: s.startswith('Upright with appendages'))
    if not rows or 'LEK' not in info or n not in hs: continue
    col = lambda name: next(i for i, h in enumerate(hdr) if h.startswith(name))
    cV, cR, cF, cA, cB = col('V'), col('Rt'), col('Ff'), col('Fa'), col('β')
    tests = [dict(V=x[cV], Rt=x[cR], Ff=x[cF], Fa=x[cA], beta=x[cB]) for x in rows if all(num(x[c]) for c in (cV, cR, cF, cA, cB))]
    h = hs[n]
    out.append(dict(sys=n, series=h['series'], scale=round(scale, 3), keelIdStated='Keel ID' in [c for c in t if c],
                    L=h['lwl'] / scale, bwl=h['bwl'] / scale, tc=h['tc'] / scale, cp=h['cp'], lcb=h['lcb'] / scale,
                    LEK=info['LEK'] / 1000, LER=info.get('LER', 0) / 1000,
                    dFore=info['Distance Ff to '], dAft=info['Distance Fa to '],
                    upright=[[x[0], x[1]] for x in up if num(x[1])], tests=tests))
json.dump(out, open(os.path.join(OUT, 'delft_cases.json'), 'w'))
for c in out: print(c['sys'], 'series', c['series'], 'scale', c['scale'], 'L', round(c['L'], 3), 'LEK', c['LEK'], 'LER', c['LER'], 'keelId', c['keelIdStated'], 'tests', len(c['tests']), 'beta max', round(max(abs(t['beta']) for t in c['tests']), 1), 'V', sorted(set(round(t['V'], 1) for t in c['tests'])), 'upright', len(c['upright']))
