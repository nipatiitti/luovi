"""render.py: draws the three GIFs from out/results.json (written by run_all.mjs).

    python3 render.py [h1|h2a|h2b]

Frames are drawn with Pillow at twice the final size, written as PNG to out/frames/<name>/ and
joined by ffmpeg with a generated palette.
"""
import json, math, os, subprocess, sys
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, 'out')  # git-ignored; the Node runner writes its JSON here too
os.makedirs(ROOT, exist_ok=True)
R = json.load(open(os.path.join(ROOT, 'results.json')))
S = 2  # supersampling
W = 900
FONT = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
FONTB = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
_fonts = {}
def font(size, bold=False):
    key = (size, bold)
    if key not in _fonts:
        _fonts[key] = ImageFont.truetype(FONTB if bold else FONT, size * S)
    return _fonts[key]

INK = (30, 34, 40); MUTED = (105, 112, 122); GRID = (222, 226, 230); BG = (252, 252, 250)
BLUE = (0, 114, 178); ORANGE = (213, 94, 0); GREEN = (0, 148, 108); PURPLE = (122, 79, 163); RED = (200, 40, 40)

class Canvas:
    def __init__(self, h):
        self.im = Image.new('RGB', (W * S, h * S), BG)
        self.d = ImageDraw.Draw(self.im)
        self.h = h
    def line(self, pts, fill=INK, width=1.5, dash=None):
        pts = [(x * S, y * S) for x, y in pts]
        if len(pts) < 2: return
        if dash is None:
            self.d.line(pts, fill=fill, width=max(1, round(width * S)), joint='curve')
            return
        on, off = dash; acc = 0.0; draw = True
        for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
            seg = math.hypot(x1 - x0, y1 - y0); pos = 0.0
            while pos < seg:
                lim = (on if draw else off) * S - acc
                step = min(lim, seg - pos)
                if draw:
                    a = pos / seg; b = (pos + step) / seg
                    self.d.line([(x0 + (x1 - x0) * a, y0 + (y1 - y0) * a), (x0 + (x1 - x0) * b, y0 + (y1 - y0) * b)], fill=fill, width=max(1, round(width * S)))
                pos += step; acc += step
                if acc >= (on if draw else off) * S - 1e-9: acc = 0.0; draw = not draw
    def poly(self, pts, fill=None, outline=None, width=1.5):
        p = [(x * S, y * S) for x, y in pts]
        if fill: self.d.polygon(p, fill=fill)
        if outline: self.d.line(p + [p[0]], fill=outline, width=max(1, round(width * S)), joint='curve')
    def rect(self, x0, y0, x1, y1, fill=None, outline=None, width=1):
        self.d.rectangle([x0 * S, y0 * S, x1 * S, y1 * S], fill=fill, outline=outline, width=max(1, round(width * S)) if outline else 0)
    def dot(self, x, y, r, fill, outline=None):
        self.d.ellipse([(x - r) * S, (y - r) * S, (x + r) * S, (y + r) * S], fill=fill, outline=outline, width=S)
    def square(self, x, y, r, fill, outline=None):
        self.d.rectangle([(x - r) * S, (y - r) * S, (x + r) * S, (y + r) * S], fill=fill, outline=outline, width=S)
    def text(self, x, y, s, size=13, fill=INK, bold=False, anchor='la'):
        self.d.text((x * S, y * S), s, font=font(size, bold), fill=fill, anchor=anchor)
    def arrow(self, x0, y0, x1, y1, fill, width=3):
        L = math.hypot(x1 - x0, y1 - y0)
        if L < 2: return
        ux, uy = (x1 - x0) / L, (y1 - y0) / L
        hd = min(10, L * 0.6)
        bx, by = x1 - ux * hd, y1 - uy * hd
        self.line([(x0, y0), (bx, by)], fill=fill, width=width)
        self.poly([(x1, y1), (bx - uy * hd * 0.55, by + ux * hd * 0.55), (bx + uy * hd * 0.55, by - ux * hd * 0.55)], fill=fill)
    def done(self):
        return self.im.resize((W, self.h), Image.LANCZOS)

class Plot:
    def __init__(self, c, x0, y0, x1, y1, xr, yr, xlabel, ylabel, xticks, yticks, logx=False, yfmt='{:g}', xfmt='{:g}'):
        self.c, self.box, self.xr, self.yr, self.logx = c, (x0, y0, x1, y1), xr, yr, logx
        c.rect(x0, y0, x1, y1, fill=(255, 255, 255))
        for t in xticks:
            X = self.px(t); c.line([(X, y0), (X, y1)], fill=GRID, width=1)
            c.text(X, y1 + 4, xfmt.format(t), 11, MUTED, anchor='ma')
        for t in yticks:
            Y = self.py(t); c.line([(x0, Y), (x1, Y)], fill=GRID, width=1)
            c.text(x0 - 5, Y, yfmt.format(t), 11, MUTED, anchor='rm')
        c.rect(x0, y0, x1, y1, outline=MUTED, width=1)
        c.text((x0 + x1) / 2, y1 + 19, xlabel, 12, INK, anchor='ma')
        c.text(x0, y0 - 6, ylabel, 12, INK, anchor='ls')
    def px(self, v):
        a, b = self.xr
        f = (math.log(v) - math.log(a)) / (math.log(b) - math.log(a)) if self.logx else (v - a) / (b - a)
        return self.box[0] + f * (self.box[2] - self.box[0])
    def py(self, v):
        a, b = self.yr
        return self.box[3] - (v - a) / (b - a) * (self.box[3] - self.box[1])
    def curve(self, xs, ys, fill, width=2, dash=None):
        lo, hi = min(self.yr), max(self.yr)
        pts = [(self.px(x), self.py(min(max(y, lo), hi))) for x, y in zip(xs, ys) if y is not None]
        self.c.line(pts, fill=fill, width=width, dash=dash)

def mix(a, b, t):
    t = max(0.0, min(1.0, t))
    return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))
def water(t):  # sequential ramp: still water (pale) to strongly pushed (deep blue-green)
    stops = [(238, 243, 246), (168, 211, 224), (62, 150, 190), (16, 78, 139), (10, 36, 84)]
    t = max(0.0, min(0.9999, t)) * (len(stops) - 1)
    i = int(t)
    return mix(stops[i], stops[i + 1], t - i)

def write_gif(name, frames, fps=15):
    d = os.path.join(ROOT, 'frames', name)
    os.makedirs(d, exist_ok=True)
    for f in os.listdir(d): os.remove(os.path.join(d, f))
    for i, im in enumerate(frames): im.save(os.path.join(d, f'{i:04d}.png'))
    out = os.path.join(ROOT, name + '.gif')
    vf = 'split[a][b];[a]palettegen=max_colors=128:stats_mode=diff[p];[b][p]paletteuse=dither=none:diff_mode=rectangle'
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-framerate', str(fps), '-i', os.path.join(d, '%04d.png'), '-vf', vf, out], check=True)
    print(name, len(frames), 'frames', round(os.path.getsize(out) / 1e6, 2), 'MB')

# ------------------------------------------------------------------------------------ H1
def h1():
    H = 664
    hulls = [('fin', BLUE, 'Fin keel and separate rudder (H-boat-like)'), ('long', ORANGE, 'Long keel, rudder on its aft edge (Folkboat-like)'),
             ('delft', GREEN, 'Delft Sysser 1 tank model (measured)'), ('tanker', PURPLE, 'Tanker, KVLCC2-like (measured)')]
    h1 = R['h1']
    kmax = {k: max(max(s['kept']) for s in h1[k]['sweep']) for k, _, _ in hulls}
    def frame(j):
        c = Canvas(H)
        c.text(14, 10, 'One round-bilge rule, four hulls: what each slice of water is left with', 17, bold=True)
        c.text(14, 34, 'Watch the water behind each hull turn dark (sideways push it kept) and the side-force arrow grow with leeway.', 12, MUTED)
        beta = h1['fin']['sweep'][j]['beta']
        for row, (key, col, label) in enumerate(hulls):
            hd = h1[key]; sw = hd['sweep'][j]; L = hd['L']
            y0 = 62 + row * 140; cy = y0 + 84; x0 = 150; sc = 250 / L
            c.text(14, y0, label, 12, col, bold=True)
            b = math.radians(beta); cb, sb = math.cos(b), math.sin(b)
            def P(x, y):  # hull frame (x aft from bow, y to windward) to screen; track is horizontal
                xr = x - 0.45 * L
                return (x0 + 0.45 * L * sc + (xr * cb + y * sb) * sc, cy + (xr * sb - y * cb) * sc)
            n = len(hd['x']); half = 0.19 * L
            # slices: one bar across the track per station, then the wake carried aft
            for i in range(1, n):
                t = (sw['kept'][i] / kmax[key]) ** 0.6 if sw['kept'][i] > 0 else 0
                xa, _ = P(hd['x'][i - 1], 0); xb, _ = P(hd['x'][i], 0)
                c.rect(xa, cy - half * sc, xb + 0.6, cy + half * sc, fill=water(t))
            xe, ye = P(L, 0); tend = (sw['kept'][n - 1] / kmax[key]) ** 0.6 if sw['kept'][n - 1] > 0 else 0
            c.rect(xe, cy - half * sc, xe + 0.42 * L * sc, cy + half * sc, fill=water(tend))
            c.line([(x0 - 30, cy), (x0 + 1.45 * L * sc, cy)], fill=(190, 196, 202), width=1, dash=(4, 4))
            port = [P(hd['x'][i], hd['halfBeam'][i]) for i in range(n)]
            stbd = [P(hd['x'][i], -hd['halfBeam'][i]) for i in range(n)]
            c.poly(port + stbd[::-1], fill=(246, 244, 238), outline=INK, width=1.3)
            seg = []
            for i in range(n):  # keel, skeg and rudder: where the section reaches below the canoe body
                if hd['T'][i] > hd['canoeDraft'][i] * 1.03 + 1e-4: seg.append(P(hd['x'][i], 0))
                elif seg: c.line(seg, fill=INK, width=3); seg = []
            if seg: c.line(seg, fill=INK, width=3)
            if sw['clr'] is not None and beta > 0:
                ax, ay = P(min(max(sw['clr'], -0.1), 1.1) * L, 0)
                c.arrow(ax, ay, ax, ay - sw['side'] * 190, col, 3.5)
                c.dot(ax, ay, 3, col)
            c.text(14, y0 + 22, f'leeway {beta:4.1f}°', 12)
            c.text(14, y0 + 40, f'side force {sw["side"]:.3f}', 12)
            if sw['clr'] is not None: c.text(14, y0 + 58, f'centre {100 * sw["clr"]:.0f}% L', 12)
            if row == 0:
                c.text(x0 - 6, cy + 4, 'bow', 10, MUTED, anchor='rm')
                c.text(14, y0 + 110, 'moving ←   arrow: side force', 10, MUTED)
        # colour key
        for k in range(60): c.rect(150 + k * 2, H - 16, 152 + k * 2, H - 8, fill=water(k / 59))
        c.text(144, H - 12, 'still water', 10, MUTED, anchor='rm'); c.text(276, H - 12, 'pushed hard sideways', 10, MUTED, anchor='lm')
        # plots
        p1 = Plot(c, 600, 84, 884, 318, (0, 30), (0, 0.36), 'leeway (degrees)', 'Side force / (½ ρ U² · length · draft)', [0, 10, 20, 30], [0, 0.1, 0.2, 0.3])
        p2 = Plot(c, 600, 390, 884, 572, (0, 30), (-20, 60), 'leeway (degrees)', 'Centre of side force (% of length from bow)', [0, 10, 20, 30], [-20, 0, 20, 40, 60])
        for key, col, _ in hulls:
            hd = h1[key]; fk = 'normal' if key == 'tanker' else 'side'
            xs = [s['beta'] for s in hd['sweep'][: j + 1]]
            p1.curve(xs, [s[fk] for s in hd['sweep'][: j + 1]], col, 2.4)
            p2.curve(xs[2:], [100 * s['clr'] if s['clr'] is not None else None for s in hd['sweep'][2: j + 1]], col, 2.4)
            if 'ref' in hd:
                p1.curve(xs, [s[fk] for s in hd['keepAll'][: j + 1]], col, 1.4, dash=(5, 4))
                p2.curve(xs[2:], [100 * s['clr'] for s in hd['keepAll'][2: j + 1]], col, 1.4, dash=(5, 4))
                for r in hd['ref']:
                    if r.get('V', 0) > 1: continue
                    mk = c.square if key == 'tanker' else c.dot
                    mk(p1.px(r['beta']), p1.py(r[fk]), 3.6, (255, 255, 255), col)
                    mk(p2.px(r['beta']), p2.py(100 * r['clr']), 3.6, (255, 255, 255), col)
        ly = 614
        c.line([(600, ly), (624, ly)], fill=INK, width=2.4); c.text(628, ly, 'model, rule as proposed', 11, anchor='lm')
        c.line([(600, ly + 16), (624, ly + 16)], fill=INK, width=1.4, dash=(5, 4)); c.text(628, ly + 16, 'model, every slice keeps all it was given', 11, anchor='lm')
        c.dot(606, ly + 32, 3.6, (255, 255, 255), INK); c.square(620, ly + 32, 3.6, (255, 255, 255), INK); c.text(628, ly + 32, 'tank measurements (Delft; tanker fit)', 11, anchor='lm')
        return c.done()
    n = len(h1['fin']['sweep'])
    seq = [0] * 12 + [j for j in range(n) for _ in range(3)] + [n - 1] * 40
    cache = {}
    frames = []
    for j in seq:
        if j not in cache: cache[j] = frame(j)
        frames.append(cache[j])
    write_gif('h1_drift_hulls', frames)

# ------------------------------------------------------------------------------------ H2a
def h2a():
    H = 520; pts = R['h2a']
    def frame(j, sub):
        c = Canvas(H)
        p = pts[j]; AR = p['AR']
        c.text(14, 10, 'From long keel to tall fin: one flat plate, stretched', 17, bold=True)
        c.text(14, 34, 'Watch the blue dots follow the grey textbook curve with no kink where "hull-like" turns into "fin-like".', 12, MUTED)
        # plate seen from the side, water moving left to right
        wl = 150; T = 150; chord = 2 * T / AR; sc = min(1.0, 330 / chord); T *= sc; chord *= sc
        xle = 40 + (330 - chord) / 2 if chord < 330 else 40
        c.text(14, 62, f'depth over length (aspect ratio) {AR:.2f}', 13, bold=True)
        nb = 70; x_end = 400
        for k in range(nb):
            xa = 20 + (x_end - 20) * k / nb; xb = 20 + (x_end - 20) * (k + 1) / nb; xm = (xa + xb) / 2
            if xm < xle: t = 0
            else:
                fill = 1 - math.exp(-min(xm - xle, chord) / (0.25 * 2 * T))
                t = fill
            c.rect(xa, wl, xb + 0.5, wl + T * 1.25, fill=water(t * 0.85))
        phase = (sub / 6.0)
        for k in range(-1, 12):  # slice edges drifting aft, to show the water passing
            X = 20 + (k + phase) * 38
            if 20 < X < x_end: c.line([(X, wl), (X, wl + T * 1.25)], fill=(255, 255, 255), width=1)
        c.line([(14, wl), (x_end + 6, wl)], fill=BLUE, width=1.5)
        c.text(x_end + 4, wl - 12, 'waterline', 10, BLUE, anchor='ra')
        c.rect(xle, wl, xle + chord, wl + T, fill=(246, 244, 238), outline=INK, width=1.5)
        c.poly([(xle, wl), (xle + chord, wl), (xle + chord, wl - T * 0.0)], outline=None)
        c.text(xle + chord / 2, wl + T / 2, 'plate' if chord < 150 else 'plate (keel) from the side', 11, MUTED, anchor='mm')
        c.text(22, wl + T * 1.25 + 26, 'water →', 11, MUTED)
        c.text(14, 432, 'Colour: how full of sideways push each slice of water is.', 11, MUTED)
        c.text(14, 448, 'A long plate fills every slice completely before letting it go.', 11, MUTED)
        c.text(14, 464, 'A short tall plate lets it go half filled. That is the whole rule.', 11, MUTED)
        fillTE = 1 - math.exp(-chord / (0.25 * 2 * T))
        c.text(14, 488, f'slice filled to {100 * fillTE:.0f}% at the trailing edge', 13, bold=True)
        pl = Plot(c, 480, 96, 880, 430, (0.2, 4), (0, 5), 'depth over length of the plate (aspect ratio, with its mirror image)', 'Side-force slope (lift coefficient per radian of leeway)', [0.2, 0.5, 1, 2, 4], [0, 1, 2, 3, 4, 5], logx=True)
        xs = [q['AR'] for q in pts]
        band = [(pl.px(q['AR']), pl.py(min(5, q['helmbold'] * 1.15))) for q in pts] + [(pl.px(q['AR']), pl.py(q['helmbold'] * 0.85)) for q in pts[::-1]]
        c.poly(band, fill=(232, 234, 236))
        pl.curve(xs, [q['helmbold'] for q in pts], (120, 126, 134), 3)
        pl.curve(xs, [q['jones'] for q in pts], ORANGE, 1.3, dash=(2, 4))
        pl.curve(xs, [q['liftingLine'] for q in pts], GREEN, 1.3, dash=(2, 4))
        pl.curve(xs, [q['hardSwitch'] for q in pts], RED, 1.8, dash=(7, 4))
        pl.curve(xs[: j + 1], [q['model'] for q in pts[: j + 1]], BLUE, 2.2)
        for q in pts[: j + 1]: c.dot(pl.px(q['AR']), pl.py(q['model']), 3.2, BLUE)
        c.dot(pl.px(AR), pl.py(p['model']), 5.5, BLUE, INK)
        lx, ly = 492, 108
        items = [((120, 126, 134), 3, None, 'textbook (Helmbold), band ±15%'), (BLUE, 2.2, None, 'this model: slice law, slices fill gradually'),
                 (RED, 1.8, (7, 4), 'switch rule: slice law below 1, fin strips above'), (ORANGE, 1.3, (2, 4), 'slice law alone (Jones)'), (GREEN, 1.3, (2, 4), 'fin strips alone (lifting line)')]
        for k, (col, wd, dash, lab) in enumerate(items):
            c.line([(lx, ly + 16 * k), (lx + 24, ly + 16 * k)], fill=col, width=wd, dash=dash); c.text(lx + 30, ly + 16 * k, lab, 11, anchor='lm')
        c.text(876, 420, f'model {p["model"]:.2f}   textbook {p["helmbold"]:.2f}   ({100 * (p["model"] / p["helmbold"] - 1):+.0f}%)', 12, INK, bold=True, anchor='rs')
        return c.done()
    frames = [frame(0, s % 6) for s in range(10)]
    for j in range(len(pts)):
        for s in range(6): frames.append(frame(j, s))
    frames += [frame(len(pts) - 1, s % 6) for s in range(36)]
    write_gif('h2a_plate_sweep', frames)

# ------------------------------------------------------------------------------------ H2b
def h2b():
    H = 600; M = R['h2b']
    def frame(j):
        c = Canvas(H)
        m = M[j]
        c.text(14, 10, 'Growing a fin keel into a long keel, ten steps', 17, bold=True)
        c.text(14, 34, 'Watch every curve move a little at each step: nothing jumps when the keel reaches the rudder.', 12, MUTED)
        # side profile
        x0, wl, sc = 34, 124, 62
        c.rect(14, wl, 440, wl + 96, fill=(236, 243, 247))
        c.line([(14, wl), (440, wl)], fill=BLUE, width=1.5)
        n = len(m['x'])
        canoe = [(x0 + m['x'][i] * sc, wl + m['canoeDraft'][i] * sc) for i in range(n)]
        whole = [(x0 + m['x'][i] * sc, wl + m['T'][i] * sc) for i in range(n)]
        c.poly([(x0, wl)] + whole + [(x0 + m['x'][-1] * sc, wl)], fill=(70, 78, 90))
        c.poly([(x0, wl)] + canoe + [(x0 + m['x'][-1] * sc, wl)], fill=(246, 244, 238), outline=INK, width=1.2)
        deck = [(x0 - 22, wl - 26), (x0 + 6.3 * sc + 34, wl - 22), (x0 + 6.3 * sc, wl), (x0, wl)]
        c.poly(deck, fill=(246, 244, 238), outline=INK, width=1.2)
        c.text(14, 62, f'step {j} of 10     keel depth over length {m["keelAR"]:.2f}', 13, bold=True)
        c.text(18, wl + 40, 'bow', 10, MUTED); c.text(436, wl + 92, 'side view, draft fixed at 1.30 m', 10, MUTED, anchor='rs')
        # side force against leeway
        pl = Plot(c, 56, 276, 440, 548, (0, 30), (0, 0.45), 'leeway (degrees)', 'Side force / (½ ρ U² · length · draft)', [0, 10, 20, 30], [0, 0.1, 0.2, 0.3, 0.4])
        for k in range(j):
            pl.curve(range(31), M[k]['curve'], mix(BLUE, ORANGE, k / 10), 1, None)
        pl.curve(range(31), m['curve'], mix(BLUE, ORANGE, j / 10), 3)
        c.text(66, 288, 'thin lines: earlier steps', 11, MUTED)
        c.text(66, 304, 'fin: bends over a little (lets go softly)', 11, BLUE); c.text(66, 320, 'long keel: keeps climbing (slides)', 11, ORANGE)
        specs = [('slope', 'Side-force slope (per radian of leeway)', (0.4, 0.7), [0.4, 0.5, 0.6, 0.7], 1),
                 ('clr5', 'Centre of side force at 5° leeway (% of length)', (40, 55), [40, 45, 50, 55], 100),
                 ('yawDamping', 'Yaw damping (turning resistance per turn rate)', (0.02, 0.06), [0.02, 0.04, 0.06], 1)]
        for r, (key, lab, yr, yt, mul) in enumerate(specs):
            y0 = 92 + r * 160
            p = Plot(c, 540, y0, 880, y0 + 104, (0, 10), yr, 'morph step (0 fin, 10 long keel)' if r == 2 else '', lab, list(range(0, 11, 2)), yt)
            p.curve(range(j + 1), [mul * M[k][key] for k in range(j + 1)], INK, 1.5)
            for k in range(j + 1): c.dot(p.px(k), p.py(mul * M[k][key]), 4 if k == j else 3, mix(BLUE, ORANGE, k / 10), INK if k == j else None)
        return c.done()
    frames = []
    for j in range(len(M)):
        frames += [frame(j)] * (18 if j else 24)
    frames += [frames[-1]] * 36
    write_gif('h2b_keel_morph', frames)

if __name__ == '__main__':
    which = sys.argv[1:] or ['h1', 'h2a', 'h2b']
    for w in which: {'h1': h1, 'h2a': h2a, 'h2b': h2b}[w]()
