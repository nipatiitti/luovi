import json, numpy as np
import os; OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'out'); os.makedirs(OUT, exist_ok=True)  # git-ignored
from PIL import Image, ImageDraw
from wave import *; from hulls import *; from viz import *
L = 1.0; B = 0.1; T = B / 1.6
FN = 0.45; U = FN * np.sqrt(G * L)
dm = wigley(L, B, T, N=41, M=20)
R0 = resistance(dm, U)
W, H = 900, 540
FX0, FY0, FW, FH = 12, 96, 540, 400
ppl = 150.0; xr0 = -2.9
nx, ny = FW // 2, FH // 2
xs = (xr0 + (np.arange(nx) + 0.5) / nx * (FW / ppl)) * L
ys = ((np.arange(ny) + 0.5) / ny - 0.5) * (FH / ppl) * L
seps = np.linspace(0.2, 0.6, 41)
tau_s = np.array([pair_resistance(dm, dm, s * L, U)[0] / (2 * R0) for s in seps])
lifts = np.linspace(0, 1, 41); SL2 = 0.3
drag_l = []
for h in lifts:
    d2 = wigley(L, B, T, N=41, M=20, lift=h * T)
    drag_l.append(pair_resistance(dm, d2, SL2 * L, U)[0] / R0)
drag_l = np.array(drag_l)
print('tau vs sep', np.round(tau_s[::5], 2), 'drag vs lift', np.round(drag_l[::5], 2))
script = [('sep', s) for s in np.linspace(0.2, 0.6, 80)] + [('sep', 0.6)] * 8 + [('lift', h) for h in np.linspace(0, 1, 70)] + [('lift', 1.0)] * 22
frames = []
xw = np.linspace(-L / 2, L / 2, 41); bw = 0.5 * B * (1 - (2 * xw / L) ** 2)
for mode, val in script:
    s = val if mode == 'sep' else SL2
    h = 0.0 if mode == 'sep' else val
    z = wave_field(dm, U, xs, ys, y0=+s * L / 2) / L
    if h < 0.999:
        d2 = wigley(L, B, T, N=41, M=20, lift=h * T)
        z = z + wave_field(d2, U, xs, ys, y0=-s * L / 2) / L
    im = Image.new('RGB', (W, H), (250, 250, 248)); d = ImageDraw.Draw(im)
    d.text((12, 8), 'Catamaran: two wave systems from two section stacks', font=F_T, fill=INK)
    d.text((12, 38), 'First the hulls move apart, then one hull lifts out. Watch the two wakes cross behind the boat', font=F_C, fill=INK)
    d.text((12, 58), 'and the wave drag fall smoothly to that of a single hull as the windward hull flies.', font=F_C, fill=INK)
    im.paste(field_img(z[:, ::-1], 0.02, (FW, FH)), (FX0, FY0))
    tx = lambda x: FX0 + (x / L - xr0) * ppl
    ty = lambda y: FY0 + FH / 2 - y / L * ppl
    hull_poly(d, xw, bw, tx, lambda y: ty(y + s * L / 2))
    f2 = max(1 - h, 0.0)
    g = int(60 + 150 * h)
    hull_poly(d, xw, bw * np.sqrt(f2) if f2 > 0 else bw, tx, lambda y: ty(y - s * L / 2), fill=(g, g, g + 4))
    if h > 0.02:
        d.text((tx(0), ty(-s * L / 2) + 14), 'windward hull %d %% lifted' % round(100 * h), font=F_S, fill=INK, anchor='ma')
    d.rectangle([FX0, FY0, FX0 + FW, FY0 + FH], outline=GREY)
    d.text((FX0 + 8, FY0 + 6), 'seen from above, Froude number 0.45, slender hulls (length 10 x beam)', font=F_S, fill=INK)
    colour_key(d, FX0 + 60, FY0 + FH + 12); d.text((FX0 + 270, FY0 + FH + 8), 'model wave height (far-field part)', font=F_S, fill=INK)
    p = Plot(d, (630, 122, 884, 268), (0.2, 0.6), (0.8, 1.8))
    p.frame([0.2, 0.3, 0.4, 0.5, 0.6], [1.0, 1.2, 1.4, 1.6, 1.8], 'hull spacing / hull length', 'pair drag / two hulls far apart')
    p.line(seps, tau_s, ORANGE if mode == 'sep' else (170, 174, 180))
    p.line([0.2, 0.6], [1, 1], GREY, w=1)
    if mode == 'sep': p.dots([s], [np.interp(s, seps, tau_s)], ORANGE, r=5)
    p2 = Plot(d, (630, 326, 884, 458), (0, 100), (0.8, 2.8))
    p2.frame([0, 25, 50, 75, 100], [1.0, 1.5, 2.0, 2.5], 'windward hull lifted, % of its draft', 'wave drag / one hull alone')
    p2.line(lifts * 100, drag_l, ORANGE if mode == 'lift' else (170, 174, 180))
    p2.line([0, 100], [1, 1], GREY, w=1)
    if mode == 'lift': p2.dots([h * 100], [np.interp(h, lifts, drag_l)], ORANGE, r=5)
    d.text((600, 502), 'Tank (Insel & Molland): hulls close together cost', font=F_S, fill=INK); d.text((600, 518), 'most near Froude 0.5 and help near 0.33.', font=F_S, fill=INK)
    frames.append(im)
save_gif(frames, os.path.join(OUT, 'h3_catamaran_interference.gif'), 15)
