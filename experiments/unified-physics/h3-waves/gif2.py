import json, numpy as np
import os; OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'out'); os.makedirs(OUT, exist_ok=True)  # git-ignored
from PIL import Image, ImageDraw
from wave import *; from hulls import *; from delftdata import *; from viz import *
D = json.load(open(os.path.join(OUT, 'delft.json')))
L = LMODEL
cases = [(2, 'narrow, deep (hull 2)', 'length/beam 3.6, beam/draft 3.0'),
         (3, 'beamy, shallow (hull 3)', 'length/beam 2.8, beam/draft 5.4'),
         (6, 'heavy (hull 6)', 'length/beam 3.2, 34 % more weight')]
W, H = 900, 550
CW = 300; FW, FH = 284, 140; ppl = 118.0
xr0 = -1.75
nx, nyh = FW // 2, FH // 4 + 1
xs = (xr0 + (np.arange(nx) + 0.5) / nx * (FW / ppl)) * L
ys = (np.arange(nyh) + 0.5) / nyh * (FH / 2 / ppl) * L
stacks = {n: delft(L, PARAMS[n][4], PARAMS[n][3], PARAMS[n][2], PARAMS[n][1], PARAMS[n][0], N=41, M=20) for n, _, _ in cases}
NF = 130
fns = np.linspace(0.15, 0.65, NF)
frames = []
for fn in fns:
    U = fn * np.sqrt(G * L)
    im = Image.new('RGB', (W, H), (250, 250, 248)); d = ImageDraw.Draw(im)
    d.text((12, 8), 'Three different Delft series hulls, same model, no per-hull tuning', font=F_T, fill=INK)
    d.text((12, 38), 'Watch: the model (orange) ranks the hulls correctly but sits 3 to 5 times above the tank (dots)', font=F_C, fill=INK)
    d.text((12, 58), 'from Froude 0.25 to 0.40 on every one of them, closing to within 1.3 times only above 0.55.', font=F_C, fill=INK)
    for c, (n, name, sub) in enumerate(cases):
        st = stacks[n]; X0 = 8 + c * CW; Y0 = 160
        d.text((X0 + FW / 2, 86), name, font=font(15, True), fill=INK, anchor='ma')
        d.text((X0 + FW / 2, 105), sub, font=F_S, fill=INK, anchor='ma')
        z = wave_field(st, U, xs, ys) / L
        z = np.concatenate([z[:, ::-1], z], axis=1)
        im.paste(field_img(z, 0.06, (FW, FH)), (X0, Y0))
        tx = lambda x: X0 + (x / L - xr0) * ppl
        ty = lambda y: Y0 + FH / 2 - y / L * ppl
        hull_poly(d, st['x'], st['b'], tx, ty)
        d.rectangle([X0, Y0, X0 + FW, Y0 + FH], outline=GREY)
        # midship section, to scale with the plan view
        i = int(np.argmax(st['b'])); b = st['b'][i]; T = st['Tl'][i]; m = D[str(n)]['mexp']
        yy = np.linspace(-b, b, 41); zz = -T * (1 - np.abs(yy / b) ** m)
        cx, cy = X0 + FW / 2 + 40, 126; SC = 2.2
        d.line([cx - 70, cy, cx + 70, cy], fill=BLUE, width=1)
        d.polygon([(cx + SC * y / L * ppl, cy - SC * q / L * ppl) for y, q in zip(yy, zz)], fill=(60, 64, 70))
        d.text((cx - 76, cy + 2), 'midship section:', font=F_S, fill=INK, anchor='ra')
        p = Plot(d, (X0 + 42, 336, X0 + FW - 2, 482), (0.1, 0.68), (0.01, 40), logy=True)
        p.frame([0.2, 0.3, 0.4, 0.5, 0.6], [0.01, 0.1, 1, 10], 'speed, Froude number', 'wave drag, % of boat weight' if c == 0 else '', ylab=['0.01', '0.1', '1', '10'])
        dd = D[str(n)]; fine = np.array(dd['fine']); Rw = np.array(dd['Rw']) / 10; Fm = np.array(dd['Fn']); Rr = np.array(dd['Rr']) / 10
        p.dots(Fm, np.maximum(Rr, 1e-9), INK, r=3)
        mk = fine <= fn
        p.line(fine[mk], Rw[mk], ORANGE)
        p.dots([fn], [np.interp(fn, fine, Rw)], ORANGE, r=4)
        rm = np.interp(fn, Fm, Rr)
        d.text((X0 + FW - 8, 462), 'model / tank = %.1f' % (np.interp(fn, fine, Rw) / max(rm, 1e-3)), font=F_L, fill=ORANGE, anchor='ra')
    d.ellipse([14, 530, 22, 538], fill=INK); d.text((28, 527), 'towing tank, bare hull upright (Delft, 4TU data)', font=F_S, fill=INK)
    d.line([330, 534, 344, 534], fill=ORANGE, width=3); d.text((350, 527), 'model: wave sum over the section stack', font=F_S, fill=INK)
    d.text((W - 12, 525), 'Froude %.2f = %.1f kn on a 10 m waterline' % (fn, fn * np.sqrt(G * 10) / 0.5144), font=F_L, fill=INK, anchor='ra')
    frames.append(im)
frames += [frames[-1]] * 22
save_gif(frames, os.path.join(OUT, 'h3_three_series_hulls.gif'), 15)
