import json, sys, numpy as np
import os; OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'out'); os.makedirs(OUT, exist_ok=True)  # git-ignored
from PIL import Image, ImageDraw
from wave import *; from hulls import *; from delftdata import *; from viz import *
D = json.load(open(os.path.join(OUT, 'delft.json')))['1']
lcb, cp, lv, bt, lb = PARAMS[1]
L = LMODEL
st = delft(L, lb, bt, lv, cp, lcb, N=41, M=20)
W, H = 900, 520
FX0, FY0, FW, FH = 14, 92, 520, 384
ppl = 130.0                                   # pixels per hull length
xr = (-3.15, 0.85)                            # hull lengths, bow to the right
nx, nyh = FW // 2, FH // 4 + 1
xs = (xr[0] + (np.arange(nx) + 0.5) / nx * (xr[1] - xr[0])) * L
ys = (np.arange(nyh) + 0.5) / nyh * (FH / 2 / ppl) * L
NF = 150
fns = np.linspace(0.15, 0.70, NF)
fine = np.array(D['fine']); Rw = np.array(D['Rw']) / 10; Fm = np.array(D['Fn']); Rr = np.array(D['Rr']) / 10
frames = []
for k, fn in enumerate(fns):
    U = fn * np.sqrt(G * L)
    z = wave_field(st, U, xs, ys) / L
    z = np.concatenate([z[:, ::-1], z], axis=1)
    im = Image.new('RGB', (W, H), (250, 250, 248)); d = ImageDraw.Draw(im)
    d.text((14, 8), 'Waves the hull makes: section-stack sum against the towing tank', font=F_T, fill=INK)
    d.text((14, 38), 'Delft series hull 1 (beam 1/3.2 of length), speeding up. Watch the wake stretch and narrow,', font=F_C, fill=INK)
    d.text((14, 58), 'and the orange model curve run about 4 times above the tank points until high speed.', font=F_C, fill=INK)
    im.paste(field_img(z, 0.06, (FW, FH)), (FX0, FY0))
    tx = lambda x: FX0 + (x / L - xr[0]) * ppl
    ty = lambda y: FY0 + FH / 2 - y / L * ppl
    for sgn in (1, -1):                        # Kelvin wedge 19.5 degrees from the bow
        d.line([tx(L / 2), ty(0), tx(L / 2 - 3.6 * L), ty(sgn * 3.6 * L * np.tan(np.radians(19.47)))], fill=(90, 90, 90), width=1)
    hull_poly(d, st['x'], st['b'], tx, ty)
    d.rectangle([FX0, FY0, FX0 + FW, FY0 + FH], outline=GREY)
    d.text((FX0 + 8, FY0 + 6), 'seen from above, hull held still, water moving right to left', font=F_S, fill=INK)
    d.text((FX0 + 8, FY0 + 22), 'thin lines: the classic 19.5 degree wake wedge', font=F_S, fill=INK)
    d.line([tx(-2.9 * L), FY0 + FH - 12, tx(-1.9 * L), FY0 + FH - 12], fill=INK, width=2)
    d.text((tx(-2.4 * L), FY0 + FH - 27), 'one hull length', font=F_S, fill=INK, anchor='ma')
    colour_key(d, FX0 + 380, FY0 + FH + 10, w=100)
    d.text((FX0, FY0 + FH + 6), 'model wave height (far-field part, ripples filtered)', font=F_S, fill=INK)
    p = Plot(d, (612, 118, 884, 396), (0.1, 0.72), (0.01, 40), logy=True)
    p.frame([0.2, 0.3, 0.4, 0.5, 0.6, 0.7], [0.01, 0.1, 1, 10], 'speed (Froude number; 0.35 is 6.7 kn on a 10 m waterline)'[:0] + 'speed, Froude number', 'wave drag, % of boat weight',
            ylab=['0.01', '0.1', '1', '10'])
    p.dots(Fm, np.maximum(Rr, 1e-9), INK, r=4)
    m = fine <= fn
    p.line(fine[m], Rw[m], ORANGE)
    p.dots([fn], [np.interp(fn, fine, Rw)], ORANGE, r=5)
    d.ellipse([616, 446, 624, 454], fill=INK); d.text((630, 443), 'towing tank, bare hull (Delft, 4TU data)', font=F_S, fill=INK)
    d.line([614, 468, 626, 468], fill=ORANGE, width=3); d.text((630, 461), 'model: wave sum over the sections', font=F_S, fill=INK)
    kn = fn * np.sqrt(G * 10) / 0.5144
    d.text((610, 482), 'Froude %.2f = %.1f kn on a 10 m waterline' % (fn, kn), font=F_L, fill=INK)
    rm = np.interp(fn, Fm, Rr)
    d.text((610, 500), 'model %.2f %%   tank %.2f %%   ratio %.1f' % (np.interp(fn, fine, Rw), rm, np.interp(fn, fine, Rw) / max(rm, 1e-3)), font=F_L, fill=ORANGE)
    frames.append(im)
frames += [frames[-1]] * 22
save_gif(frames, os.path.join(OUT, 'h3_wake_and_drag_curve.gif'), 15)
