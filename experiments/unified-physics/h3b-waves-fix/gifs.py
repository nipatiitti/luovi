import json, numpy as np
import os; OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'out'); os.makedirs(OUT, exist_ok=True)  # git-ignored
from PIL import Image, ImageDraw
from wave import *; from hulls import *; from delftdata import *; from viz import *; from geom import *; from methods import *
R1 = json.load(open(os.path.join(OUT, 'run1.json')))
L = LMODEL
h = hydro()['1']; nd = 1000 * G * float(h['volc0']) / 1e3
lcb, cp, lv, bt, lb = PARAMS[1]
gen = delft(L, lb, bt, lv, cp, lcb, N=41, M=20)
real = stack(1, N=41, M=24)
realf = stack(1)
Xs, _ = placed(1)
deck = (Xs[:, -1, 0], Xs[:, :, 1].max(axis=1))
fine = np.round(np.arange(0.15, 0.7001, 0.0125), 4)
cur = {'gen': np.array([resistance(gen, f * np.sqrt(G * L)) for f in fine]) / nd / 10}
for m in ('michell', 'hogner', 'noblesse'):
    cur[m] = np.array([resistance3(realf, f * np.sqrt(G * L), m) for f in fine]) / nd / 10
Fm = np.array(R1['1']['Fn']); Rr = np.array(R1['1']['Rr']) / 10
NF = 120; fns = np.linspace(0.18, 0.68, NF)
# ---------- GIF A: generated against real lines
W, H = 900, 560; FX0, FW, FH = 12, 500, 196; ppl = 125.0; xr0 = -3.1
nx, nyh = FW // 2, FH // 4 + 1
xs = (xr0 + (np.arange(nx) + 0.5) / nx * (FW / ppl)) * L
ys = (np.arange(nyh) + 0.5) / nyh * (FH / 2 / ppl) * L
frA, frB = [], []
ratios = {m: {n: (np.array(d['Fn']), np.array(d[m]) / np.array(d['Rr'])) for n, d in R1.items()} for m in ('michell', 'hogner', 'noblesse')}
HC = {'1': INK, '2': BLUE, '3': ORANGE, '6': GREEN, '7': (150, 60, 160)}
for fn in fns:
    U = fn * np.sqrt(G * L)
    zg = wave_field(gen, U, xs, ys) / L; zr = wave_field(real, U, xs, ys) / L
    im = Image.new('RGB', (W, H), (250, 250, 248)); d = ImageDraw.Draw(im)
    d.text((12, 8), 'Was it my made-up hull shape? No: the real lines give the same miss', font=F_T, fill=INK)
    d.text((12, 38), 'Top: hull 1 generated from five form numbers. Bottom: hull 1 cut from the Delft CAD surface.', font=F_C, fill=INK)
    d.text((12, 58), 'Watch the two model curves run together, both 3 to 4 times above the tank up to Froude 0.4.', font=F_C, fill=INK)
    for row, (z, st, lab, col) in enumerate(((zg, gen, 'generated lines (first experiment)', BLUE), (zr, real, 'real lines; grey outline is the deck with its overhangs', ORANGE))):
        Y0 = 106 + row * (FH + 26)
        z2 = np.concatenate([z[:, ::-1], z], axis=1)
        im.paste(field_img(z2, 0.06, (FW, FH)), (FX0, Y0))
        tx = lambda x: FX0 + (x / L - xr0) * ppl
        ty = lambda y: Y0 + FH / 2 - y / L * ppl
        if row == 1: hull_poly(d, deck[0], deck[1], tx, ty, fill=(185, 188, 192))
        hull_poly(d, st['x'], st['b'], tx, ty)
        d.rectangle([FX0, Y0, FX0 + FW, Y0 + FH], outline=GREY)
        d.rectangle([FX0, Y0 - 20, FX0 + 12, Y0 - 8], fill=col); d.text((FX0 + 18, Y0 - 21), lab, font=F_L, fill=INK)
    colour_key(d, FX0 + 60, 544); d.text((FX0 + 250, 540), 'model wave height (far-field part)', font=F_S, fill=INK)
    p = Plot(d, (588, 128, 884, 404), (0.15, 0.7), (0.01, 40), logy=True)
    p.frame([0.2, 0.3, 0.4, 0.5, 0.6, 0.7], [0.01, 0.1, 1, 10], 'speed, Froude number', 'wave drag, % of boat weight', ylab=['0.01', '0.1', '1', '10'])
    p.dots(Fm, Rr, INK, r=4)
    mk = fine <= fn
    p.line(fine[mk], cur['gen'][mk], BLUE); p.line(fine[mk], cur['michell'][mk], ORANGE)
    d.ellipse([592, 448, 600, 456], fill=INK); d.text((606, 445), 'towing tank, bare hull (Delft, 4TU data)', font=F_S, fill=INK)
    d.line([590, 470, 602, 470], fill=BLUE, width=3); d.text((606, 463), 'thin-ship sum, generated lines', font=F_S, fill=INK)
    d.line([590, 488, 602, 488], fill=ORANGE, width=3); d.text((606, 481), 'thin-ship sum, real lines', font=F_S, fill=INK)
    rm = np.interp(fn, Fm, Rr)
    d.text((588, 506), 'Froude %.2f: model / tank = %.1f (generated), %.1f (real)' % (fn, np.interp(fn, fine, cur['gen']) / rm, np.interp(fn, fine, cur['michell']) / rm), font=F_S, fill=INK)
    frA.append(im)
    # ---------- GIF B: three sums, five hulls
    im = Image.new('RGB', (W, H), (250, 250, 248)); d = ImageDraw.Draw(im)
    d.text((12, 8), 'Three ways to sum the waves from the real hull lines, five hulls', font=F_T, fill=INK)
    d.text((12, 38), 'A model that works would keep every line inside the green band (within 1.5 times of the tank).', font=F_C, fill=INK)
    d.text((12, 58), 'Watch: none does below Froude 0.45, and the two "better" sums are worse at low speed.', font=F_C, fill=INK)
    # body plan of the real hull
    bx, by, sc = 150, 150, 420
    d.text((12, 90), 'real sections of hull 1 (stern half left, bow half right)', font=F_S, fill=INK)
    d.line([bx - 135, by, bx + 135, by], fill=BLUE, width=1)
    for i in range(0, len(realf['secs']), 4):
        q = realf['secs'][i]
        if len(q) < 2: continue
        sg = 1 if realf['x'][i] > realf['x'][realf['b'].argmax()] else -1
        d.line([(bx + sg * a * sc, by - b_ * sc) for a, b_ in q], fill=INK, width=1)
    FY = 226; fw, fh = 300, 300; pp = 100.0; x0 = -2.2
    nx2, ny2 = fw // 2, fh // 4 + 1
    xs2 = (x0 + (np.arange(nx2) + 0.5) / nx2 * (fw / pp)) * L; ys2 = (np.arange(ny2) + 0.5) / ny2 * (fh / 2 / pp) * L
    z = wave_field(real, U, xs2, ys2) / L; z = np.concatenate([z[:, ::-1], z], axis=1)
    im.paste(field_img(z, 0.06, (fw, fh)), (12, FY))
    tx = lambda x: 12 + (x / L - x0) * pp; ty = lambda y: FY + fh / 2 - y / L * pp
    hull_poly(d, deck[0], deck[1], tx, ty, fill=(185, 188, 192)); hull_poly(d, real['x'], real['b'], tx, ty)
    d.rectangle([12, FY, 12 + fw, FY + fh], outline=GREY)
    d.text((18, FY + 5), 'thin-ship wake of hull 1, Froude %.2f' % fn, font=F_S, fill=INK)
    for c, (m, name) in enumerate((('michell', 'thin ship (Michell)'), ('hogner', 'sources on the real skin'), ('noblesse', '+ waterline term'))):
        X0 = 376 + c * 178
        p = Plot(d, (X0, 124, X0 + 146, 470), (0.2, 0.68), (0.3, 30), logy=True)
        x0p, y0p = p.px(0.2, 1.5); x1p, y1p = p.px(0.68, 1 / 1.5)
        p.frame([0.3, 0.4, 0.5, 0.6], [0.5, 1, 2, 5, 10, 20], 'Froude number', '')
        d.rectangle([x0p, y0p, x1p, y1p], fill=(205, 235, 215))
        for t_ in (0.5, 1, 2, 5, 10, 20):
            _, Yt = p.px(0.2, t_); d.line([X0, Yt, X0 + 146, Yt], fill=LIGHT if t_ != 1 else GREY)
        d.text((X0 + 73, 104), name, font=font(12, True), fill=INK, anchor='ma')
        if c == 0: d.text((330, 84), 'model / tank', font=F_L, fill=INK)
        for n, (F_, r_) in ratios[m].items():
            ff = np.linspace(0.2, min(fn, F_.max()), 60)
            p.line(ff, np.interp(ff, F_, r_), HC[n], w=2)
    for k, (n, lab) in enumerate((('1', 'hull 1 parent'), ('2', 'hull 2 narrow'), ('3', 'hull 3 beamy'), ('6', 'hull 6 heavy'), ('7', 'hull 7 light'))):
        d.line([362 + k * 108, 522, 376 + k * 108, 522], fill=HC[n], width=3); d.text((380 + k * 108, 515), lab, font=F_S, fill=INK)
    d.text((362, 538), 'green band: within 1.5 times of the towing tank (Delft, 4TU data)', font=F_S, fill=INK)
    frB.append(im)
frA += [frA[-1]] * 25; frB += [frB[-1]] * 25
save_gif(frA, os.path.join(OUT, 'h3b_generated_vs_real_lines.gif'), 14)
save_gif(frB, os.path.join(OUT, 'h3b_three_sums_five_hulls.gif'), 14)
