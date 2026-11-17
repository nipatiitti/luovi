"""Three GIFs for w2.  python3 gifs_w2.py A B C.  GIF C needs out/curves_w2.json (curves_w2.py)."""
import sys, os, json, numpy as np
from PIL import Image, ImageDraw
from slice import *
from viz import *
from common import tank, hull, OUT
from s60 import series60
which = sys.argv[1:] or ['A', 'B', 'C']
W = 900; BG = (250, 250, 248); WATER = (198, 222, 240); DEEP = (40, 90, 150); RED = (200, 40, 40); PURPLE = (150, 60, 160)

if 'A' in which:
    n = 6; fn = 0.35; t = tank(n); st = hull(n); L = t['L']; U = fn * np.sqrt(G * L); wt = t['rho'] * G * t['vol']
    rec = []
    m = march(st, U, rho=t['rho'], extra=0.7, record=lambda *a: rec.append(a))
    d0 = drags(st, U, rho=t['rho']); tankv = np.interp(fn, t['Fn'], t['Rr']) / 10
    s_, Y_, z_ = bowfirst(st); bwl = Y_[:, 0]
    H = 540; frames = []
    cx, cy, sc = 300, 285, 370.0                     # section panel: centre, calm level, px per metre
    ymax_plot = 1.25 * max(d0['slice_thin'], d0['work']) / wt * 100
    hist_s = []; hist_w = []
    for i, (k, tt, Xm, yc, eta, cov, b, work) in enumerate(rec):
        s = tt * U; hist_s.append(s / L); hist_w.append(work / wt * 100)
        if i % 2: continue
        im = Image.new('RGB', (W, H), BG); d = ImageDraw.Draw(im)
        d.text((12, 8), 'One slice of water as the hull sails through it', font=F_T, fill=INK)
        d.text((12, 38), 'Heavy yacht hull (Delft 6, 1.6 m model) at Froude 0.35.  The slice stays put in the water; the hull passes.', font=F_C, fill=INK)
        d.text((12, 58), 'Watch: the section swells and shoves water aside, then shrinks. The ripples left behind are energy the boat paid for.', font=F_C, fill=INK)
        # plan view, bow to the right, hull moving right through the fixed slice
        px0 = 300; ppm = 140.0; py = 122
        tx = lambda x: px0 + s * ppm - x * ppm; ty = lambda y: py - y * ppm
        d.rectangle([20, 84, 580, 160], fill=WATER, outline=GREY)
        up = [(tx(a), ty(bb)) for a, bb in zip(s_, bwl)]; dn = [(tx(a), ty(-bb)) for a, bb in zip(s_[::-1], bwl[::-1])]
        pts = [(min(max(x, 21), 579), y) for x, y in up + dn]
        d.polygon(pts, fill=(60, 64, 70))
        d.line([px0, 84, px0, 160], fill=RED, width=3)
        d.text((px0 + 6, 86), 'this slice', font=F_S, fill=RED)
        d.text((24, 86), 'from above', font=F_S, fill=INK)
        d.text((575, 146), 'hull sails this way  →', font=F_S, fill=INK, anchor='ra')
        # cross-section
        box = (20, 172, 580, 470); d.rectangle(box, fill=(255, 255, 255), outline=GREY)
        act = ~cov; ya = yc[act]; ea = eta[act]
        if b > 0 and len(ya): ya = np.concatenate([[b], ya]); ea = np.concatenate([[ea[0]], ea])
        elif len(ya): ya = np.concatenate([[0.0], ya]); ea = np.concatenate([[ea[0]], ea])
        keep = ya < 0.75
        ya, ea = ya[keep], ea[keep]
        for sg in (1, -1):
            surf = [(cx + sg * y * sc, cy - e * sc) for y, e in zip(ya, ea)]
            poly = surf + [(cx + sg * ya[-1] * sc, box[3] - 1), (cx + sg * (b if b > 0 else 0) * sc, box[3] - 1)]
            d.polygon(poly, fill=WATER)
        if b <= 0: pass
        d.rectangle([cx - b * sc, cy, cx + b * sc, box[3] - 1], fill=WATER) if b > 0 else None
        d.line([box[0] + 1, cy, box[2] - 1, cy], fill=(150, 160, 170), width=1)
        for sg in (1, -1):
            d.line([(cx + sg * y * sc, cy - e * sc) for y, e in zip(ya, ea)], fill=DEEP, width=3)
        if Xm is not None:
            body = [(cx + y * sc, cy - zz * sc) for y, zz in Xm] + [(cx - y * sc, cy - zz * sc) for y, zz in Xm[::-1]]
            top = [(cx - b * sc, cy), (cx - b * sc * 1.04, cy - 0.075 * sc), (cx + b * sc * 1.04, cy - 0.075 * sc), (cx + b * sc, cy)]
            d.polygon(top, fill=(150, 154, 160)); d.polygon(body, fill=(60, 64, 70))
        d.rectangle(box, outline=GREY)
        d.rectangle([box[0] + 1, box[1] + 1, box[2] - 1, box[1] + 20], fill=(255, 255, 255))
        d.text((26, 175), 'the slice seen from astern, true scale', font=F_S, fill=INK)
        d.line([40, 455, 40 + 0.1 * sc, 455], fill=INK, width=3); d.text((40 + 0.1 * sc + 6, 449), '10 cm', font=F_S, fill=INK)
        d.text((574, 175), 'calm level = thin grey line', font=F_S, fill=GREY, anchor='ra')
        where = 'The slice is ahead of the bow' if s <= 0 else ('The slice is %.0f %% of the way from bow to stern' % (100 * s / L) if s < L else 'The hull has gone: slice is %.1f boat lengths astern' % (s / L - 1))
        d.text((20, 478), where, font=F_C, fill=INK)
        # energy plot
        p = Plot(d, (662, 196, 884, 440), (0, 1.7), (0, ymax_plot))
        p.frame([0, 0.5, 1.0, 1.5], np.round(np.linspace(0, ymax_plot, 5), 0)[:-1], 'slice position, boat lengths aft of bow', '')
        d.text((606, 160), 'energy handed to the slice, counted', font=F_L, fill=INK); d.text((606, 176), 'as drag in % of boat weight', font=F_L, fill=INK)
        a, _ = p.px(1.0, 0); d.line([a, 196, a, 440], fill=GREY); d.text((a + 3, 200), 'stern', font=F_S, fill=GREY)
        thin = d0['slice_thin'] / wt * 100; A = d0['A'] / wt * 100
        for val, col, lab in ((thin, GREY, 'thin-ship slice: %.1f' % thin), (A, GREEN, 'new model: %.1f' % A), (tankv, ORANGE, 'tank: %.1f' % tankv)):
            x0_, y0_ = p.px(0, val); d.line([662, y0_, 884, y0_], fill=col, width=2)
            d.text((880, y0_ - 13), lab, font=F_S, fill=col, anchor='ra')
        p.line(hist_s, hist_w, BLUE, 4)
        d.text((618, 478), 'blue: work done on this slice so far (%.1f)' % hist_w[-1], font=F_L, fill=BLUE)
        d.text((12, 500), 'All of the blue energy stays in the slice only if its waves run straight sideways. Counting each ripple as the slanted', font=F_L, fill=INK)
        d.text((12, 517), 'wave it really is (green) removes most of it. Still about twice the tank for this heavy hull at this speed.', font=F_L, fill=INK)
        frames.append(im)
    frames += [frames[-1]] * 20
    save_gif(frames, OUT + 'w2_one_slice_cross_section.gif', 15)

if 'B' in which:
    n = 6; t = tank(n); st = hull(n); L = t['L']; s_, Y_, z_ = bowfirst(st); bwl = Y_[:, 0]
    H = 640; ppl = 300.0; xb = 850; ph = 236; ext = 1.75; x_left = 14
    panels = []
    for fn in (0.30, 0.45):
        U = fn * np.sqrt(G * L); rec = []
        march(st, U, rho=t['rho'], extra=ext, record=lambda *a: rec.append((a[1] * U / L, a[3], a[4], a[5])))
        ny = ph // 4; yg = (np.arange(ny) + 0.5) / ny * (ph / 2 / ppl) * L
        sg = np.array([r[0] for r in rec]); Z = np.array([np.interp(yg, r[1], np.where(r[3], 0.0, r[2])) for r in rec]) / L
        nx = (xb - x_left) // 2; sx = (xb - (x_left + (np.arange(nx) + 0.5) * 2)) / ppl          # distance aft of bow for each column
        Zi = np.array([np.interp(sx, sg, Z[:, j], left=0.0, right=0.0) for j in range(ny)]).T       # [nx, ny]
        Zi = np.concatenate([Zi[:, ::-1], Zi], axis=1)
        panels.append((fn, field_img(Zi, 0.035, (nx * 2, ph)), sx))
    frames = []; NFR = 170
    for fi in range(NFR):
        sred = -0.15 + (2.75 + 0.15) * min(fi / 125.0, 1.0)          # the followed slice, boat lengths aft of the bow
        im = Image.new('RGB', (W, H), BG); d = ImageDraw.Draw(im)
        d.text((12, 8), 'The hull from above, built from the waves of its water slices', font=F_T, fill=INK)
        d.text((12, 38), 'Heavy yacht hull at a low and a high speed. The red line is one slice of water; the hull sails to the right past it.', font=F_C, fill=INK)
        d.text((12, 58), 'Watch: each slice only sends waves sideways, so the V of bow and stern waves appears but no waves follow astern.', font=F_C, fill=INK)
        for pi, (fn, img, sx) in enumerate(panels):
            y0 = 92 + pi * (ph + 30)
            im.paste(img, (x_left, y0))
            xr = xb - sred * ppl
            if xr > x_left: d.rectangle([x_left, y0, min(xr, xb + 36), y0 + ph - 1], fill=(246, 247, 248))    # water this slice has not reached yet
            d.rectangle([xb, y0, xb + 36, y0 + ph - 1], fill=(246, 247, 248))
            for q in np.arange(-3, 12) * 0.25:                       # other slices, drifting aft
                xs = xb - ((q + (fi / 125.0 * 2.9)) % 3.0 - 0.12) * ppl
                if x_left < xs < xb + 36: d.line([xs, y0, xs, y0 + ph - 1], fill=(200, 204, 210), width=1)
            tx = lambda x: xb - x / L * ppl; ty = lambda y: y0 + ph / 2 - y / L * ppl
            d.polygon([(tx(a), ty(bb)) for a, bb in zip(s_, bwl)] + [(tx(a), ty(-bb)) for a, bb in zip(s_[::-1], bwl[::-1])], fill=(60, 64, 70))
            if x_left < xr < xb + 36: d.line([xr, y0, xr, y0 + ph - 1], fill=RED, width=3)
            d.rectangle([x_left, y0, xb + 36, y0 + ph - 1], outline=GREY)
            d.rectangle([x_left + 2, y0 + 2, x_left + 150, y0 + 24], fill=(255, 255, 255)); d.rectangle([x_left + 4, y0 + ph - 26, x_left + 110 + ppl, y0 + ph - 4], fill=(255, 255, 255))
            d.text((x_left + 6, y0 + 5), 'Froude %.2f  (%s)' % (fn, 'slow' if fn < 0.4 else 'fast'), font=font(13, True), fill=INK)
            d.line([x_left + 10, y0 + ph - 14, x_left + 10 + ppl, y0 + ph - 14], fill=INK, width=3); d.text((x_left + 16 + ppl, y0 + ph - 21), 'one boat length', font=F_S, fill=INK)
        colour_key(d, 716, 622, w=120)
        d.text((12, 616), 'Between the bow and the red line: what that one slice has done so far.  Colours: water height.', font=F_L, fill=INK)
        frames.append(im)
    save_gif(frames, OUT + 'w2_hull_from_above_slice_waves.gif', 15)

if 'C' in which:
    CW = json.load(open(OUT + 'curves_w2.json')); CUR = CW
    stS, _ = series60(N=41, M=24)
    ST = {'26': hull(26, N=41, M=24), '6': hull(6, N=41, M=24), 's60': stS}
    cols = [('26', 'Light, shallow yacht hull (Delft 26)'), ('6', 'Heavy yacht hull (Delft 6)'), ('s60', 'Ship form (Series 60)')]
    H = 560; NF = 130; frames = []
    for fi in range(NF):
        fn = 0.18 + (0.60 - 0.18) * fi / (NF - 1)
        im = Image.new('RGB', (W, H), BG); d = ImageDraw.Draw(im)
        d.text((12, 8), 'Wave drag: old sum, last repair, and the two slice models', font=F_T, fill=INK)
        d.text((12, 38), 'Curves draw as speed rises; dots are towing-tank measurements; the green band is the tank within a factor 1.5.', font=F_C, fill=INK)
        d.text((12, 58), 'Watch: green and purple drop from the old sum (grey) towards the dots; purple strays at low speed, green on the light hull.', font=F_L, fill=INK)
        for c, (key, name) in enumerate(cols):
            X0 = 12 + c * 296; fw = 280; cu = CUR[key]; cw = CW[key]
            f_here = min(fn, 0.36) if key == 's60' else fn
            d.text((X0, 84), name, font=font(13, True), fill=INK)
            d.rectangle([X0, 104, X0 + fw, 176], fill=WATER, outline=GREY)
            stt = ST[key]; Lh = stt['x'].max() - stt['x'].min(); pp = 230 / Lh
            hull_poly(d, stt['x'], stt['b'], lambda x: X0 + fw / 2 + x * pp, lambda y: 140 - y * pp)
            d.text((X0 + 5, 107), 'Froude %.2f' % f_here, font=F_S, fill=INK)
            xr = (0.15, 0.40) if key == 's60' else (0.15, 0.65); yr = (0.02, 3) if key == 's60' else (0.02, 40)
            p = Plot(d, (X0 + 44, 216, X0 + fw, 440), xr, yr, logy=True)
            yt = [0.03, 0.1, 0.3, 1, 3] if key == 's60' else [0.03, 0.1, 0.3, 1, 3, 10, 30]
            p.frame(np.arange(0.2, xr[1] + 0.01, 0.05 if key == 's60' else 0.1), yt, 'Froude number (speed)', 'wave drag, % of boat weight')
            tf = np.array(cu['tFn']); tr = np.array(cu['tR']); o = np.argsort(tf); tf, tr = tf[o], tr[o]
            ok = (tr > 0) & (tf >= xr[0]) & (tf <= xr[1])
            X1, Y1 = p.px(tf[ok], tr[ok] * 1.5); X2, Y2 = p.px(tf[ok], tr[ok] / 1.5)
            poly = list(zip(X1, np.clip(Y1, 216, 440))) + list(zip(X2[::-1], np.clip(Y2[::-1], 216, 440)))
            if len(poly) > 2: d.polygon(poly, fill=(205, 235, 215))
            f = np.array(cu['Fn']); k = f <= f_here + 1e-9
            p.line(f[k], np.array(cu['base'])[k], GREY, 3); p.line(f[k], np.array(cu['r3b'])[k], BLUE, 2)
            f2 = np.array(cw['Fn']); k2 = f2 <= f_here + 1e-9
            p.line(f2[k2], np.array(cw['C'])[k2], PURPLE, 3)
            p.line(f2[k2], np.array(cw['A'])[k2], GREEN, 4)
            kt = tf <= f_here + 1e-9
            p.dots(tf[kt & ok], tr[kt & ok], ORANGE, r=4)
            tv = float(np.interp(f_here, tf[ok], tr[ok])); a = float(np.interp(f_here, f2, cw['A'])); b0 = float(np.interp(f_here, f, cu['base']))
            if tf[ok].min() <= f_here <= tf[ok].max():
                d.text((X0 + 44, 478), '÷ tank:  old %.1f   A %.2f   C %.2f' % (b0 / tv, a / tv, float(np.interp(f_here, f2, cw['C'])) / tv), font=font(13, True), fill=INK)
        lx = 14
        for col, lab in ((GREY, 'old thin-ship sum (Michell)'), (BLUE, 'earlier repair (w1 R3b)'), (GREEN, 'new A: water slices'), (PURPLE, 'new C: slices + blocked following waves'), (ORANGE, 'tank')):
            d.line([lx, 513, lx + 26, 513], fill=col, width=4); d.text((lx + 32, 505), lab, font=F_L, fill=INK); lx += 48 + int(d.textlength(lab, font=F_L))
        d.text((12, 532), 'No constants were fitted to these tank points. Ship panel stops at Froude 0.36, the top of its tank data.', font=F_L, fill=INK)
        frames.append(im)
    frames += [frames[-1]] * 24
    save_gif(frames, OUT + 'w2_drag_curves_old_new.gif', 13)
