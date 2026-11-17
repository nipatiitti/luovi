"""Collects the canoe-body sections of the two demo boats into boat_sections.json (committed, small).
  python3 make_boat_sections.py <hboat_sea.json> <hulls.json>
hboat_sea.json: the 83 real H-boat sections (class table of offsets, overhangs and topsides included) tabulated by the
reference model's class_hboat.mjs; only the part below the static sailing waterline is kept, as half breadth against
depth in 2 cm steps.  hulls.json: the reference model's baked hull table; the Folkboat's canoe body there is a stack of
half ellipses (waterline half breadth, depth) from published main dimensions and estimates, and that is what is kept.
Appendages (keel, deadwood, rudder) are left out on purpose: the Delft residuary regression is for the canoe body too.
The Delft regression curve, wetted area and hydrostatics the demo model used are copied along for the comparison."""
import sys, json, numpy as np
sea = json.load(open(sys.argv[1])); hulls = json.load(open(sys.argv[2]))
out = {}
h0, dh = sea['h0'], sea['dh']; lev = h0 + dh * np.arange(sea['nh'])
st = []
for q in sea['stations']:
    if q['keelH'] >= -1e-9: continue
    hb = 0.5 * np.array(q['B'])
    k = lev < -1e-9; k &= lev > q['keelH'] + 1e-9
    z = [0.0] + lev[k][::-1].tolist() + [q['keelH']]; y = [float(np.interp(0.0, lev, hb))] + hb[k][::-1].tolist() + [0.0]
    st.append(dict(s=q['s'], half=[[round(a, 4), round(b, 4)] for a, b in zip(z, y)]))
# the two ends of the static waterline: where the keel line crosses the water
S = sea['stations']
def cross(a, b): return a['s'] + (0 - a['keelH']) * (b['s'] - a['s']) / (b['keelH'] - a['keelH'])
i = next(i for i, q in enumerate(S) if q['keelH'] < -1e-9); j = max(i for i, q in enumerate(S) if q['keelH'] < -1e-9)
ends = [round(cross(S[i - 1], S[i]), 4), round(cross(S[j], S[j + 1]), 4)]
def common(h): return dict(name=h['name'], L=h['L'], hydro=h['hydro'], wetted=h['wetted'], delftRr=h['delftRr'])
out['hboat'] = dict(common(hulls['hboat']), kind='offsets', ends=ends, stations=st,
                    source='H-boat class table of offsets, 83 sections every 0.1 m (reference model class_hboat.mjs, hboat_sea.json); canoe body below the static sailing waterline')
f = hulls['ifboat']
out['ifboat'] = dict(common(f), kind='ellipse', dx=f['dx'], halfBeam=f['halfBeam'], canoeDepth=f['canoeDepth'],
                     source='International Folkboat demo data: half-ellipse sections from published main dimensions and estimates (reference model boats_def.mjs, hulls.json)')
json.dump(out, open('boat_sections.json', 'w'), separators=(',', ':'))
print({k: (v['ends'] if 'ends' in v else len(v['halfBeam'])) for k, v in out.items()})
