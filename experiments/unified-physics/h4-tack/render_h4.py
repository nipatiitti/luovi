"""render_h4.py: draws the four GIFs of experiment H4 from out/frames.json (run_h4.mjs).

    python3 render_h4.py [tack|rates|puff|sternway]

Every view is from above with north (and the wind) at the top. The camera rides with the
boat; the faint 5 m grid and the wake dots stay put in the water.
"""
import json, math, os, sys
from draw import Canvas, Plot, write_gif, water, mix, INK, MUTED, GRID, BG, BLUE, ORANGE, GREEN, PURPLE, RED, ROOT

F = json.load(open(os.path.join(ROOT, 'frames.json')))
KN = 0.5144
SAILC, KEELC, RUDC = PURPLE, GREEN, RED
PMAX = 1.2          # sideways push [m^3/s per unit density] that reads as the darkest water
NPX = 0.09          # force arrows: pixels per newton
SEA = (244, 247, 249)

def interp(xs, ys, x):
    if x <= xs[0]: return ys[0]
    for i in range(1, len(xs)):
        if x <= xs[i]:
            f = (x - xs[i - 1]) / (xs[i] - xs[i - 1])
            return ys[i - 1] + (ys[i] - ys[i - 1]) * f
    return ys[-1]

def slide(f):
    """Angle between where the bow points and where the boat goes, positive to port."""
    return math.degrees(math.atan2(-f['v'], abs(f['u']) + 1e-6))

def shade(P):
    return water(math.sqrt(min(1.0, abs(P) / PMAX)))

def boat_panel(w, h, shape, fr, wake, scale, title, colour, readout=True, wind_label=True, heel_inset=False):
    """One top view, camera on the boat. Returns an image w x h."""
    c = Canvas(h, w, SEA)
    psi = math.radians(fr['psi']); sp, cp = math.sin(psi), math.cos(psi)
    cx, cy = w / 2, h / 2 + 6
    def world(X, Y): return (cx + (X - fr['X']) * scale, cy - (Y - fr['Y']) * scale)
    def body(xb, yb):  # xb aft of the bow, yb to starboard
        a = shape['xcg'] - xb
        return world(fr['X'] + a * sp + yb * cp, fr['Y'] + a * cp - yb * sp)
    # water grid, fixed in the water
    g = 5.0
    x_lo = fr['X'] - w / 2 / scale; y_lo = fr['Y'] - h / scale
    k = math.floor(x_lo / g)
    while k * g < fr['X'] + w / 2 / scale:
        X = world(k * g, 0)[0]; c.line([(X, 0), (X, h)], fill=(226, 232, 236), width=1); k += 1
    k = math.floor(y_lo / g)
    while k * g < fr['Y'] + h / scale:
        Y = world(0, k * g)[1]; c.line([(0, Y), (w, Y)], fill=(226, 232, 236), width=1); k += 1
    # wake: slices that have left the hull, where they were left, shaded by the push they kept
    for t, X, Y, P in wake:
        if t > fr['t']: break
        px, py = world(X, Y)
        if -10 < px < w + 10 and -10 < py < h + 10:
            c.dot(px, py, max(1.6, scale * 0.11), shade(P))
    # slices under the hull
    xs, T = shape['x'], shape['T']
    for xb, P in fr['m']:
        half = 0.25 + 0.75 * interp(xs, T, xb)
        c.line([body(xb, -half), body(xb, half)], fill=shade(P), width=max(1.5, scale * 0.085))
    # hull outline at the waterline
    port = [body(x, -b) for x, b in zip(xs, shape['b'])]
    stbd = [body(x, b) for x, b in zip(xs, shape['b'])]
    c.line(port + stbd[::-1] + [port[0]], fill=INK, width=2)
    # keel (dark) and rudder (red), drawn thicker than true so they can be seen
    k0, k1 = shape['keelX']; r0, r1 = shape['rudderX']
    hinge = r0 if r0 > k0 and r0 < k1 else None
    kend = (r0 + 0.45) if hinge else k1
    c.line([body(k0, 0), body(kend, 0)], fill=(60, 66, 74), width=max(3, scale * 0.16))
    piv = (r0 + 0.45) if hinge else r0
    tan = math.tan(math.radians(fr['rud']))
    c.line([body(piv, 0), body(r1, (r1 - piv) * tan)], fill=RUDC, width=max(3, scale * 0.13))
    c.dot(*body(piv, 0), 2.5, INK)
    # force arrows
    def arrow(xb, fx, fy, col):
        x0, y0 = body(xb, 0)
        dx = (fx * sp + fy * cp) * NPX * scale / 22; dy = -(fx * cp - fy * sp) * NPX * scale / 22
        c.arrow(x0, y0, x0 + dx, y0 + dy, col, 3)
    arrow(shape['xcg'] - fr['ka'] if abs(fr['ky']) > 1 else 0.5 * (k0 + k1), 0, fr['ky'], KEELC)
    arrow(0.5 * (piv + r1), 0, fr['ry'], RUDC)
    arrow(shape['ceX'], fr['sx'], fr['sy'], SAILC)
    # wind arrow and labels
    c.rect(0, 0, w, 22, fill=(255, 255, 255))
    c.text(8, 4, title, 13, colour, bold=True)
    if wind_label:
        c.arrow(w - 34, 30, w - 34, 30 + 6 + fr['wind'] * 5, INK, 3)
        c.text(w - 44, 34, f"wind {fr['wind'] / KN:.0f} kn", 12, INK, anchor='ra')
    if readout:
        sl = slide(fr); side = 'to port' if sl >= 0 else 'to starboard'
        hd = fr['psi'] % 360
        c.rect(6, h - 64, 168, h - 6, fill=(255, 255, 255), outline=GRID)
        c.text(12, h - 60, f"speed  {fr['u'] / KN:4.1f} kn", 13, INK, bold=True)
        c.text(12, h - 43, f"sliding {abs(sl):4.1f}° {side}", 12, INK)
        c.text(12, h - 26, f"heading {hd:3.0f}°   rudder {fr['rud']:+.0f}°", 12, INK)
    if heel_inset:
        # view from astern: hull and mast leaning
        bx, by = w - 62, h - 22
        a = math.radians(fr['heel'])
        c.rect(w - 120, h - 112, w - 6, h - 6, fill=(255, 255, 255), outline=GRID)
        c.line([(w - 116, by), (w - 10, by)], fill=(120, 170, 200), width=1.5)
        def rot(x, y): return (bx + x * math.cos(a) - y * math.sin(a), by - (x * math.sin(a) + y * math.cos(a)))
        c.line([rot(-16, 4), rot(-12, -6), rot(0, -9), rot(12, -6), rot(16, 4), rot(-16, 4)], fill=INK, width=2)
        c.line([rot(0, -9), rot(0, -24)], fill=(60, 66, 74), width=3)
        c.line([rot(0, 4), rot(0, 70)], fill=INK, width=2)
        c.text(w - 114, h - 110, f"heel {abs(fr['heel']):.0f}°", 12, INK, bold=True)
    c.rect(0, 0, w - 0.5, h - 0.5, outline=MUTED, width=1)
    return c.done()

def profile(c, x0, y0, w, shape, label):
    """Side view of the underwater shape: canoe body, blade, the part that turns in red."""
    s = w / shape['L']
    c.rect(x0 - 26, y0 - 20, x0 + w + 34, y0 + 1.42 * s + 5, fill=(255, 255, 255), outline=GRID)
    c.line([(x0 - 4, y0), (x0 + w + 4, y0)], fill=(120, 170, 200), width=1.5)
    xs = shape['x']
    hull = [(x0 + x * s, y0 + t * s) for x, t in zip(xs, shape['T'])]
    c.poly([(x0, y0)] + hull + [(x0 + w, y0)], fill=(205, 210, 216), outline=INK, width=1.5)
    for i in range(1, len(xs)):
        if shape['rud'][i] > 0 or shape['rud'][i - 1] > 0:
            f0, f1 = shape['rud'][i - 1], shape['rud'][i]
            c0, c1 = shape['canoe'][i - 1], shape['canoe'][i]; t0, t1 = shape['T'][i - 1], shape['T'][i]
            # the turning part is the lower-aft share of the blade
            p = [(x0 + xs[i - 1] * s, y0 + (t0 - f0 * (t0 - c0)) * s), (x0 + xs[i] * s, y0 + (t1 - f1 * (t1 - c1)) * s),
                 (x0 + xs[i] * s, y0 + t1 * s), (x0 + xs[i - 1] * s, y0 + t0 * s)]
            c.poly(p, fill=RUDC)
    c.text(x0, y0 - 5, label, 11, MUTED, anchor='ls')
    c.text(x0 - 3, y0 + 3, 'bow', 10, MUTED, anchor='ra'); c.text(x0 + w + 3, y0 + 3, 'stern', 10, MUTED, anchor='la')

def header(c, title, caption):
    c.text(12, 8, title, 17, INK, bold=True)
    c.text(12, 32, caption, 12, INK)

def force_legend(c, x, y):
    for i, (col, lab) in enumerate([(SAILC, 'sail force'), (KEELC, 'side force of hull and keel'), (RUDC, 'rudder force')]):
        c.arrow(x, y + 6, x + 22, y + 6, col, 3); c.text(x + 27, y, lab, 11, INK)
        x += 34 + len(lab) * 6.3
    for i in range(24):
        c.rect(x + i * 3, y + 1, x + i * 3 + 3, y + 12, fill=water(i / 23))
    c.text(x + 78, y, 'sideways push left in the water', 11, INK)

def traces(c, y0, y1, specs, series, tnow, t0, t1, tmark=None, legend=None):
    """specs: [(key, label, (lo, hi), ticks, fn)], series: [(frames, colour)]"""
    n = len(specs); gap = 52; left = 44
    pw = (900 - left - 14 - gap * (n - 1)) / n
    for i, (label, yr, ticks, fn) in enumerate(specs):
        x0 = left + i * (pw + gap)
        tt = [t for t in range(int(math.ceil(t0 / 5.0)) * 5, int(t1) + 1, 5)]
        p = Plot(c, x0, y0, x0 + pw, y1, (t0, t1), yr, 'seconds', label, tt, ticks)
        if tmark is not None:
            c.line([(p.px(tmark[0]), y0), (p.px(tmark[0]), y1)], fill=MUTED, width=1, dash=(4, 3))
            if i == 0: c.text(p.px(tmark[0]) + 3, y0 + 3, tmark[1], 10, MUTED)
        for frames, col in series:
            ts = [f['t'] for f in frames if t0 <= f['t'] <= tnow]
            ys = [fn(f) for f in frames if t0 <= f['t'] <= tnow]
            p.curve(ts, ys, col, 2)
            if ts: c.dot(p.px(ts[-1]), p.py(min(max(ys[-1], min(yr)), max(yr))), 3, col)
    if legend:
        x = left
        for lab, col in legend:
            c.line([(x, y1 + 42), (x + 22, y1 + 42)], fill=col, width=3); c.text(x + 27, y1 + 35, lab, 12, INK); x += 44 + len(lab) * 7.2

def window(frames, t0, t1): return [f for f in frames if t0 <= f['t'] <= t1 + 1e-6]

# ------------------------------------------------------------------------------------ tack
def tack():
    H = 730; t0, t1 = 1.5, 19.5
    a, b = F['tack']['fin'], F['tack']['long']
    fa, fb = window(a['frames'], t0, t1), window(b['frames'], t0, t1)
    out = []
    for i in range(min(len(fa), len(fb))):
        c = Canvas(H)
        header(c, 'Tacking in 12 knots: fin keel against long keel, same helm',
               'Same length, weight, sails and stiffness. Watch the long keel swing more water round, lose more speed and slide further afterwards.')
        force_legend(c, 12, 52)
        im = c.im
        for j, (key, d, fr, col) in enumerate([('fin', a, fa[i], BLUE), ('long', b, fb[i], ORANGE)]):
            p = boat_panel(444, 400, F['shapes'][key], fr, d['wake'], 30, F['shapes'][key]['name'], col)
            c2 = p.resize((p.width * 2, p.height * 2)); im.paste(c2, ((4 + j * 448) * 2, 72 * 2))
            profile(c, 4 + j * 448 + 274, 72 + 352, 132, F['shapes'][key], 'underwater, from the side')
        lead = a['lead']
        traces(c, 502, 640, [
            ('speed (knots)', (0, 6), [0, 2, 4, 6], lambda f: f['u'] / KN),
            ('sideways slide (deg, + = to port)', (-16, 16), [-15, -10, -5, 0, 5, 10, 15], slide),
            ('heading off the wind (deg)', (-60, 60), [-45, 0, 45], lambda f: f['psi']),
        ], [(fa, BLUE), (fb, ORANGE)], fa[i]['t'], t0, t1, (lead, 'helm over'),
            [('fin keel, separate rudder', BLUE), ('long keel, rudder on its aft edge', ORANGE)])
        ma, mb = a['m'], b['m']
        c.text(888, 688, f"through 90°, fin / long: {ma['t90']:.1f} s / {mb['t90']:.1f} s    speed lost: {ma['speedLostPct']:.0f}% / {mb['speedLostPct']:.0f}%    "
               f"lost to windward: {ma['lossWindwardM']:.1f} m / {mb['lossWindwardM']:.1f} m", 12, INK, anchor='ra')
        c.text(888, 708, 'placeholder sails; experiment H4, slice-momentum hull model', 10, MUTED, anchor='ra')
        out.append(c.done())
    write_gif('h4_tack_two_boats', out)

# ------------------------------------------------------------------------------------ rates
def rates():
    H = 690; t0, t1 = 1.5, 17.5
    names = [('gentle', GREEN, 'Gentle, 8°/s'), ('normal', BLUE, 'Normal, 25°/s'), ('slammed', RED, 'Slammed, 120°/s')]
    fr = {k: window(F['rates'][k]['frames'], t0, t1) for k, _, _ in names}
    n = min(len(v) for v in fr.values()); out = []
    for i in range(n):
        c = Canvas(H)
        header(c, 'Fin-keel boat: the same tack at three rudder speeds',
               'Watch the rudder (red) and its force arrow. Slamming it over barely changes the tack here: the model has no rudder stall drop.')
        force_legend(c, 12, 52)
        for j, (k, col, lab) in enumerate(names):
            p = boat_panel(294, 360, F['shapes']['fin'], fr[k][i], F['rates'][k]['wake'], 22, lab, col, wind_label=(j == 2))
            c.im.paste(p.resize((p.width * 2, p.height * 2)), ((5 + j * 298) * 2, 72 * 2))
        traces(c, 462, 600, [
            ('speed (knots)', (0, 6), [0, 2, 4, 6], lambda f: f['u'] / KN),
            ('rudder angle (deg)', (-35, 35), [-30, -15, 0, 15, 30], lambda f: f['rud']),
            ('heading off the wind (deg)', (-60, 80), [-45, 0, 45], lambda f: f['psi']),
        ], [(fr[k], col) for k, col, _ in names], fr['normal'][i]['t'], t0, t1, (F['rates']['normal']['lead'], 'helm over'),
            [(lab, col) for _, col, lab in names])
        m = F['rates']
        c.text(888, 650, 'gentle / normal / slammed    lost to windward: ' + ' / '.join(f"{m[k]['m']['lossWindwardM']:.1f} m" for k, _, _ in names)
               + '    speed lost: ' + ' / '.join(f"{m[k]['m']['speedLostPct']:.0f}%" for k, _, _ in names), 12, INK, anchor='ra')
        profile(c, 5 + 2 * 298 + 34, 72 + 50, 110, F['shapes']['fin'], 'underwater, from the side')
        out.append(c.done())
    write_gif('h4_rudder_rates_fin', out)

# ------------------------------------------------------------------------------------ puff
def puff():
    H = 652; t0, t1 = 2.0, 16.0
    a, b = F['puff']['fin'], F['puff']['long']
    fa, fb = window(a['frames'], t0, t1), window(b['frames'], t0, t1)
    out = []
    for i in range(min(len(fa), len(fb))):
        c = Canvas(H)
        header(c, 'A puff: wind steps from 10 to 15 knots, helmsman holds the course',
               'Watch the order: heel comes first, the rudder load (weather helm) with it, speed last.')
        force_legend(c, 12, 52)
        for j, (key, d, fr, col) in enumerate([('fin', a, fa[i], BLUE), ('long', b, fb[i], ORANGE)]):
            p = boat_panel(444, 320, F['shapes'][key], fr, d['wake'], 30, F['shapes'][key]['name'], col, heel_inset=True)
            c.im.paste(p.resize((p.width * 2, p.height * 2)), ((4 + j * 448) * 2, 72 * 2))
        traces(c, 424, 560, [
            ('heel (deg)', (0, 25), [0, 5, 10, 15, 20, 25], lambda f: abs(f['heel'])),
            ('rudder side load (N)', (0, 250), [0, 50, 100, 150, 200, 250], lambda f: f['ry']),
            ('speed (knots)', (4, 6), [4, 4.5, 5, 5.5, 6], lambda f: f['u'] / KN),
        ], [(fa, BLUE), (fb, ORANGE)], fa[i]['t'], t0, t1, (a['lead'], 'puff'),
            [('fin keel, separate rudder', BLUE), ('long keel, rudder on its aft edge', ORANGE)])
        ma, mb = a['m'], b['m']
        c.text(888, 612, f"time to half of the change, fin / long:  heel {ma['heel']['t50']:.1f} / {mb['heel']['t50']:.1f} s,  "
               f"rudder load {ma['helmLoad']['t50']:.1f} / {mb['helmLoad']['t50']:.1f} s,  speed {ma['speed']['t50']:.1f} / {mb['speed']['t50']:.1f} s", 12, INK, anchor='ra')
        out.append(c.done())
    write_gif('h4_puff', out)

# ------------------------------------------------------------------------------------ sternway
def sternway():
    H = 676; t0, t1 = 0.0, 17.9
    a, b = F['sternway']['fin'], F['sternway']['long']
    fa, fb = window(a['frames'], t0, t1), window(b['frames'], t0, t1)
    out = []
    for i in range(min(len(fa), len(fb))):
        c = Canvas(H)
        header(c, 'Sternway: head to wind, jib held aback, then rudder over',
               'Rudder goes to +20° (which turns the bow to starboard when sailing ahead). Going astern the bow swings to port: helm reversed.')
        force_legend(c, 12, 52)
        for j, (key, d, fr, col) in enumerate([('fin', a, fa[i], BLUE), ('long', b, fb[i], ORANGE)]):
            p = boat_panel(444, 360, F['shapes'][key], fr, d['wake'], 30, F['shapes'][key]['name'], col)
            c.im.paste(p.resize((p.width * 2, p.height * 2)), ((4 + j * 448) * 2, 72 * 2))
            profile(c, 4 + j * 448 + 274, 72 + 312, 132, F['shapes'][key], 'underwater, from the side')
        traces(c, 462, 600, [
            ('speed (knots, below 0 = astern)', (-4, 1), [-4, -3, -2, -1, 0, 1], lambda f: f['u'] / KN),
            ('rudder angle (deg)', (-5, 25), [0, 10, 20], lambda f: f['rud']),
            ('heading (deg, below 0 = bow to port)', (-100, 20), [-90, -60, -30, 0], lambda f: f['psi']),
        ], [(fa, BLUE), (fb, ORANGE)], fa[i]['t'], t0, t1, (a['m']['tOver'], 'rudder over'),
            [('fin keel, separate rudder', BLUE), ('long keel, rudder on its aft edge', ORANGE)])
        out.append(c.done())
    write_gif('h4_sternway', out)

if __name__ == '__main__':
    which = sys.argv[1:] or ['tack', 'rates', 'puff', 'sternway']
    for w in which: globals()[w]()
