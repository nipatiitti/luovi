"""Three GIFs for w1.  Needs out/all.json, out/curves.json, out/s60.json."""
import json, sys, numpy as np
from PIL import Image, ImageDraw
from wave import G
from viz import *
from common import hull, tank, OUT
from repairs import profile
from wave import wave_field
from hulls import wigley
from s60 import series60
ALL = json.load(open(OUT + 'all.json')); WIG = ALL.pop('wigley'); CUR = json.load(open(OUT + 'curves.json')); S60 = json.load(open(OUT + 's60.json'))
which = sys.argv[1:] or ['A', 'B', 'C']
W, H = 900, 560; BG = (250, 250, 248); PURPLE = (150, 60, 160)
NF = 130; fns = np.linspace(0.18, 0.60, NF)
stS, _ = series60(N=41, M=24); stW = wigley(N=41, M=20); stW['b'] = stW['Y'][:, 0].copy()
ST = {'26': hull(26, N=41, M=24), '6': hull(6, N=41, M=24), 's60': stS, 'wig': stW}
LEN = {'26': 2.0, '6': 1.6, 's60': 1.0, 'wig': 1.0}

def wake(im, d, key, fn, x0, y0, fw, fh, scale=0.02):
    """hull from above with the plain sum's wave pattern (crest = warm colour), bow to the right."""
    st = ST[key]; L = LEN[key]; U = fn * np.sqrt(G * L)
    ppl = fw / 2.3; xl = -1.65
    nx, ny = fw // 2, fh // 4 + 1
    xs = (xl + (np.arange(nx) + 0.5) / nx * (fw / ppl)) * L; ys = (np.arange(ny) + 0.5) / ny * (fh / 2 / ppl) * L
    z = -wave_field(st, U, xs, ys) / L                       # sign corrected: a bow makes a crest
    z = np.concatenate([z[:, ::-1], z], axis=1)
    im.paste(field_img(z, scale, (fw, fh)), (x0, y0))
    tx = lambda x: x0 + (x / L - xl) * ppl; ty = lambda y: y0 + fh / 2 - y / L * ppl
    hull_poly(d, st['x'], st['b'], tx, ty)
    d.rectangle([x0, y0, x0 + fw, y0 + fh], outline=GREY)

def ratio_pts(key):
    """model / tank at the tank's own speeds, for the plain sum and two repairs."""
    if key == 'wig':
        ref = np.array([0.5 * (a + b) for a, b in WIG['ref']]); f = np.array(WIG['Fn'])
        return f, {m: np.array(WIG[m]) / ref for m in ('base', 'r1b', 'r3b')}
    if key == 's60':
        f = np.array(S60['Fn']); return f, {m: np.array(S60[m]) / np.array(S60['CR']) for m in ('base', 'r1b', 'r3b')}
    c = CUR[key]; f = np.array(c['tFn']); k = (f >= 0.2) & (f <= 0.6); f = f[k]; tr = np.array(c['tR'])[k]
    return f, {m: np.interp(f, c['Fn'], c[m]) / tr for m in ('base', 'r1b', 'r3b')}

def band(p, x0, x1):
    a, b = p.px(x0, 1.5); c, e = p.px(x1, 1 / 1.5); p.d.rectangle([a, b, c, e], fill=(205, 235, 215))

if 'A' in which:
    frames = []
    cols = [('26', 'Light, shallow yacht hull (Delft 26)'), ('6', 'Heavy yacht hull (Delft 6)'), ('s60', 'Ship form (Series 60)')]
    for fn in fns:
        im = Image.new('RGB', (W, H), BG); d = ImageDraw.Draw(im)
        d.text((12, 8), 'The plain wave sum on three kinds of hull', font=F_T, fill=INK)
        d.text((12, 38), 'Top: each hull from above with the waves the sum predicts. Below: its drag curve drawing against the tank.', font=F_C, fill=INK)
        d.text((12, 58), 'Watch: about right for the light hull and the ship at speed, four times too much for the heavy yacht hull.', font=F_C, fill=INK)
        for c, (key, name) in enumerate(cols):
            X0 = 12 + c * 296; fw = 280
            f_here = min(fn, 0.35) if key == 's60' else fn
            d.text((X0, 86), name, font=font(13, True), fill=INK)
            wake(im, d, key, f_here, X0, 106, fw, 150)
            d.text((X0 + 5, 110), 'Froude %.2f' % f_here, font=F_S, fill=INK)
            cu = CUR[key]; xr = (0.15, 0.40) if key == 's60' else (0.15, 0.65); yr = (0.02, 3) if key == 's60' else (0.02, 40)
            p = Plot(d, (X0 + 44, 300, X0 + fw, 486), xr, yr, logy=True)
            yt = [0.1, 1] if key == 's60' else [0.1, 1, 10]
            p.frame([0.2, 0.3, 0.4] if key == 's60' else [0.2, 0.3, 0.4, 0.5, 0.6], yt, 'speed, Froude number', 'wave drag, % of boat weight' if c == 0 else '')
            p.dots(cu['tFn'], cu['tR'], INK, r=4)
            if key == 's60': p.dots(cu['tFn'], cu['tRw'], GREY, r=3, fill=(255, 255, 255))
            F = np.array(cu['Fn']); mk = F <= f_here
            p.line(F[mk], np.array(cu['base'])[mk], BLUE)
            r = np.interp(f_here, cu['Fn'], cu['base']) / np.interp(f_here, cu['tFn'], cu['tR'])
            if f_here >= min(cu['tFn']): d.text((X0 + 44, 522), 'sum / tank at Froude %.2f:  %.1f' % (f_here, r), font=F_L, fill=INK)
            if key == 's60' and fn > 0.35: d.text((X0 + 44, 541), 'tank data for the ship stop at Froude 0.35', font=F_S, fill=GREY)
        d.ellipse([16, 542, 24, 550], fill=INK); d.text((30, 539), 'towing tank', font=F_S, fill=INK)
        d.line([110, 546, 124, 546], fill=BLUE, width=3); d.text((130, 539), 'plain thin-ship sum', font=F_S, fill=INK)
        d.ellipse([256, 542, 264, 550], outline=GREY, width=2); d.text((270, 539), 'ship: tank, wave part alone (from the wave pattern)', font=F_S, fill=INK)
        colour_key(d, 216, 270, w=120); d.text((396, 266), 'wave height, same colour scale for all three (2 % of length at the ends)', font=F_S, fill=INK)
        frames.append(im)
    frames += [frames[-1]] * 28
    save_gif(frames, OUT + 'w1_plain_sum_three_hulls.gif', 14)

if 'B' in which:
    frames = []
    cols = [('wig', 'Wigley test hull', 'very slender'), ('26', 'Light yacht hull', 'Delft 26'), ('6', 'Heavy yacht hull', 'Delft 6'), ('s60', 'Ship form', 'Series 60')]
    R = {k: ratio_pts(k) for k, _, _ in cols}
    MC = (('base', BLUE, 'before: plain sum'), ('r1b', GREEN, 'repair 1: stern waves damped by the boundary layer'), ('r3b', ORANGE, 'repair 3: hull further aft blocks the bow wave'))
    for fn in fns:
        im = Image.new('RGB', (W, H), BG); d = ImageDraw.Draw(im)
        d.text((12, 8), 'Repairs tried: does any colour stay in the green band on every hull?', font=F_T, fill=INK)
        d.text((12, 38), 'Top: waves of the plain sum. Below: model drag divided by tank drag. Green band = within 1.5 times of the tank.', font=F_C, fill=INK)
        d.text((12, 58), 'Watch: orange fixes the ship and keeps the test hull, but is 3 times out on the heavy yacht and breaks the light one.', font=F_C, fill=INK)
        for c, (key, name, sub) in enumerate(cols):
            X0 = 12 + c * 222; fw = 208
            fmax = R[key][0].max(); f_here = min(fn, fmax + 0.01)
            d.text((X0, 84), name, font=font(13, True), fill=INK); d.text((X0 + fw, 86), sub, font=F_S, fill=GREY, anchor='ra')
            wake(im, d, key, f_here, X0, 104, fw, 104)
            d.text((X0 + 5, 107), 'Froude %.2f' % f_here, font=F_S, fill=INK)
            p = Plot(d, (X0 + 34, 250, X0 + fw, 470), (0.18, 0.62), (0.2, 12), logy=True)
            p.frame([0.2, 0.3, 0.4, 0.5, 0.6], [0.2, 0.5, 1, 2, 5, 10], 'speed, Froude number', 'model / tank' if c == 0 else '')
            band(p, 0.18, 0.62)
            for t_ in (0.5, 1, 2, 5):
                _, Yt = p.px(0.2, t_); d.line([X0 + 34, Yt, X0 + fw, Yt], fill=LIGHT if t_ != 1 else GREY)
            F, rr = R[key]
            for m, col, _ in MC:
                k = F <= fn + 1e-9
                if k.sum() > 1: p.line(F[k], rr[m][k], col, w=3)
                p.dots(F[k], rr[m][k], col, r=3)
        for i, (m, col, lab) in enumerate(MC):
            d.line([16, 515 + i * 16, 34, 515 + i * 16], fill=col, width=4); d.text((42, 508 + i * 16), lab, font=F_L, fill=INK)
        d.text((470, 509), 'Also tried, not drawn: repair 2, the hull re-cut under its own', font=F_S, fill=INK)
        d.text((470, 524), 'wave (2 to 28 times too high); bow and stern waves made', font=F_S, fill=INK)
        d.text((470, 539), 'independent by viscosity (worse than before).', font=F_S, fill=INK)
        frames.append(im)
    frames += [frames[-1]] * 28
    save_gif(frames, OUT + 'w1_repairs_before_after.gif', 14)

if 'C' in which:
    frames = []
    FN = np.array([0.25, 0.30, 0.35, 0.40, 0.45, 0.50, 0.60]); keys = list(ALL)
    Lv = np.array([ALL[n]['Lv'] for n in keys]); five = np.array([n in ('1', '2', '3', '6', '7') for n in keys])
    lr = {m: np.log(np.array([np.array(ALL[n][m]) / np.array(ALL[n]['Rr']) for n in keys])) for m in ('base', 'r1b', 'r3b')}
    wf = np.array(WIG['Fn']); wref = np.array([0.5 * (a + b) for a, b in WIG['ref']]); sf = np.array(S60['Fn'])
    PAN = (('base', 'before: plain sum'), ('r1b', 'repair 1: stern damped'), ('r3b', 'repair 3: hull blocks bow wave'))
    for fn in np.linspace(0.25, 0.60, NF):
        im = Image.new('RGB', (W, H), BG); d = ImageDraw.Draw(im)
        d.text((12, 8), '36 yacht hulls at once: the miss follows weight, not beam', font=F_T, fill=INK)
        d.text((12, 38), 'Each dot is one Delft hull at the speed shown: heavy hulls on the left, light ones on the right.', font=F_C, fill=INK)
        d.text((12, 58), 'Watch: at low speed the dots sit far from the band, heavy hulls worst; no repair gathers them all before Froude 0.45.', font=F_C, fill=INK)
        d.text((W - 16, 84), 'speed: Froude %.2f' % fn, font=font(17, True), fill=INK, anchor='ra')
        for c, (m, name) in enumerate(PAN):
            X0 = 52 + c * 288
            p = Plot(d, (X0, 130, X0 + 248, 470), (4.0, 9.0), (0.15, 15), logy=True)
            p.frame([4, 5, 6, 7, 8, 9], [0.2, 0.5, 1, 2, 5, 10], 'length / cube root of volume', 'model / tank' if c == 0 else '')
            band(p, 4.0, 9.0)
            _, Y1 = p.px(4, 1); d.line([X0, Y1, X0 + 248, Y1], fill=GREY)
            d.text((X0 + 124, 110), name, font=font(13, True), fill=INK, anchor='ma')
            d.text((X0 + 4, 452), 'heavy', font=F_S, fill=GREY); d.text((X0 + 244, 452), 'light', font=F_S, fill=GREY, anchor='ra')
            r = np.exp(np.array([np.interp(fn, FN, row) for row in lr[m]]))
            p.dots(Lv[~five], r[~five], BLUE, r=4, fill=(255, 255, 255)); p.dots(Lv[five], r[five], BLUE, r=5)
            if fn <= 0.325: p.dots([7.11], [np.interp(fn, wf, np.array(WIG[m]) / wref)], ORANGE, r=6)
            if fn <= 0.355: p.dots([6.17], [np.interp(fn, sf, np.array(S60[m]) / np.array(S60['CR']))], PURPLE, r=6)
            inside = np.mean((r < 1.5) & (r > 1 / 1.5))
            d.text((X0 + 124, 134), '%d of 36 yacht hulls in the band' % round(inside * 36), font=F_L, fill=INK, anchor='ma')
        d.ellipse([56, 512, 66, 522], fill=BLUE); d.text((72, 509), 'the five hulls of the earlier experiments', font=F_S, fill=INK)
        d.ellipse([316, 512, 326, 522], outline=BLUE, width=2); d.text((332, 509), 'the other 31 Delft hulls', font=F_S, fill=INK)
        d.ellipse([486, 512, 496, 522], fill=ORANGE); d.text((502, 509), 'Wigley test hull (to Froude 0.32)', font=F_S, fill=INK)
        d.ellipse([706, 512, 716, 522], fill=PURPLE); d.text((722, 509), 'ship form (to 0.35)', font=F_S, fill=INK)
        d.text((56, 532), 'Green band: within 1.5 times of the towing tank. Tank: Delft series bare hulls (4TU data), friction removed the Delft way.', font=F_S, fill=INK)
        frames.append(im)
    frames += [frames[-1]] * 28
    save_gif(frames, OUT + 'w1_all_hulls_heavy_to_light.gif', 14)
