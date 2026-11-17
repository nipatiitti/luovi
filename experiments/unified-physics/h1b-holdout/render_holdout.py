"""render_holdout.py: draws the hold-out GIFs from out/holdout.json and out/fin_tanker.json.

    python3 render_holdout.py [hulls|fin]

Frames are drawn with Pillow at twice the final size, written as PNG to out/frames/<name>/ and
joined by ffmpeg with a generated palette.
"""
import json, math, os, subprocess, sys
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, 'out')  # git-ignored; the Node runner writes its JSON here too
os.makedirs(ROOT, exist_ok=True)
HO = json.load(open(os.path.join(ROOT, 'holdout.json')))
FT = json.load(open(os.path.join(ROOT, 'fin_tanker.json')))
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


G = 9.81
def fn(h, r): return r['V'] / math.sqrt(G * h['L'])

def hulls():
    H = 640
    hold = [h for h in HO if h['sys'] != 1]
    kmax = max(max(s['kept']) for h in hold for s in h['sweep'])
    def frame(idx, sub):
        c = Canvas(H)
        h = hold[idx]
        c.text(14, 10, 'Frozen rule on 35 tank models it had never seen', 17, bold=True)
        c.text(14, 34, 'Each hull in turn: the line is the model with nothing changed, the dots are the Delft tank measurements.', 12, MUTED)
        c.text(14, 62, f'Delft Sysser {h["sys"]}', 15, GREEN, bold=True)
        c.text(14, 84, f'model {h["L"]:.2f} m, beam {h["bwl"]:.2f} m, hull draft {h["tc"] * 100:.1f} cm, with keel {h["Tmax"] * 100:.0f} cm', 11, MUTED)
        # hull from above at the leeway the animation is passing through
        j = min(len(h['sweep']) - 1, 4 + sub * 3); sw = h['sweep'][j]; beta = sw['beta']
        L = h['L']; x0 = 40; cy = 190; sc = 250 / L; half = 0.2 * L
        b = math.radians(beta); cb, sb = math.cos(b), math.sin(b)
        def P(x, y):
            xr = x - 0.45 * L
            return (x0 + 0.45 * L * sc + (xr * cb + y * sb) * sc, cy + (xr * sb - y * cb) * sc)
        n = len(h['x'])
        for i in range(1, n):
            t = (sw['kept'][i] / kmax) ** 0.6 if sw['kept'][i] > 0 else 0
            xa, _ = P(h['x'][i - 1], 0); xb, _ = P(h['x'][i], 0)
            c.rect(xa, cy - half * sc, xb + 0.6, cy + half * sc, fill=water(t))
        xe, _ = P(h['x'][-1], 0); te = (sw['kept'][-1] / kmax) ** 0.6
        c.rect(xe, cy - half * sc, xe + 0.5 * L * sc, cy + half * sc, fill=water(te))
        c.line([(20, cy), (470, cy)], fill=(190, 196, 202), width=1, dash=(4, 4))
        port = [P(h['x'][i], h['halfBeam'][i]) for i in range(n)]; stbd = [P(h['x'][i], -h['halfBeam'][i]) for i in range(n)]
        c.poly(port + stbd[::-1], fill=(246, 244, 238), outline=INK, width=1.3)
        seg = []
        for i in range(n):
            if h['T'][i] > h['canoeDraft'][i] * 1.03 + 1e-4: seg.append(P(h['x'][i], 0))
            elif seg: c.line(seg, fill=INK, width=3); seg = []
        if seg: c.line(seg, fill=INK, width=3)
        ax, ay = P(sw['clr'] * L, 0)
        c.arrow(ax, ay, ax, ay - sw['side'] * 420, GREEN, 3.5); c.dot(ax, ay, 3, GREEN)
        c.text(20, cy + half * sc + 8, f'leeway {beta:.1f}°, moving ←, arrow: side force, dark water: sideways push kept', 10, MUTED)
        # parity plot of every point of every hull shown so far
        pp = Plot(c, 60, 356, 330, 596, (0, 0.12), (0, 0.12), 'measured side force (coefficient)', 'Model against measured, all hulls so far', [0, 0.04, 0.08, 0.12], [0, 0.04, 0.08, 0.12])
        c.poly([(pp.px(0), pp.py(0)), (pp.px(0.12 / 1.15), pp.py(0.12)), (pp.px(0.12), pp.py(0.12)), (pp.px(0.12), pp.py(0.12 * 0.85))], fill=(232, 234, 236))
        pp.curve([0, 0.12], [0, 0.12], MUTED, 1.2)
        for k in range(idx + 1):
            hh = hold[k]
            for r in hh['rows']:
                col = GREEN if k == idx else (150, 190, 178)
                if fn(hh, r) >= 0.37: col = ORANGE if k == idx else (232, 190, 160)
                c.dot(pp.px(min(r['sideRef'], 0.12)), pp.py(min(r['side'], 0.12)), 2.6 if k == idx else 1.8, col)
        c.text(338, 372, 'grey band:', 11, MUTED); c.text(338, 388, 'within 15%', 11, MUTED)
        c.dot(344, 416, 3, GREEN); c.text(352, 416, 'normal speeds', 11, anchor='lm')
        c.dot(344, 434, 3, ORANGE); c.text(352, 434, 'fast runs', 11, anchor='lm'); c.text(352, 450, '(Froude 0.40+)', 11, MUTED, anchor='lm')
        c.text(338, 486, f'hull {idx + 1} of {len(hold)}', 12, bold=True)
        c.text(338, 506, f'side force {h["sideMeanPct"]:+.0f}%', 12)
        c.text(338, 524, f'centre worst', 12); c.text(338, 540, f'{100 * h["clrWorstErr"]:.0f}% of length', 12, RED if h['clrWorstErr'] > 0.1 else INK)
        # per-hull curves
        p1 = Plot(c, 540, 84, 884, 318, (0, 14), (0, 0.14), 'leeway (degrees)', 'Side force / (½ ρ U² · length · draft)', [0, 4, 8, 12], [0, 0.04, 0.08, 0.12])
        p2 = Plot(c, 540, 390, 884, 572, (0, 14), (10, 70), 'leeway (degrees)', 'Centre of side force (% of length from bow)', [0, 4, 8, 12], [10, 30, 50, 70])
        xs = [s['beta'] for s in h['sweep']]
        band = [(p2.px(s['beta']), p2.py(100 * s['clr'] + 10)) for s in h['sweep'][1:]] + [(p2.px(s['beta']), p2.py(100 * s['clr'] - 10)) for s in h['sweep'][:0:-1]]
        c.poly(band, fill=(232, 234, 236))
        p1.curve(xs, [s['side'] for s in h['sweep']], GREEN, 2.4)
        p2.curve(xs[1:], [100 * s['clr'] for s in h['sweep'][1:]], GREEN, 2.4)
        for r in h['rows']:
            col = ORANGE if fn(h, r) >= 0.37 else GREEN
            c.dot(p1.px(r['beta']), p1.py(min(r['sideRef'], 0.14)), 3.6, (255, 255, 255), col)
            c.dot(p2.px(r['beta']), p2.py(min(max(100 * r['clrRef'], 10), 70)), 3.6, (255, 255, 255), col)
        c.text(548, 96, 'line: frozen model   dots: tank', 11, MUTED)
        c.text(548, 402, 'grey band: within a tenth of the length', 11, MUTED)
        return c.done()
    frames = []
    for idx in range(len(hold)):
        for sub in range(8): frames.append(frame(idx, sub))
    frames += [frames[-1]] * 30
    write_gif('holdout_hulls', frames)

def fin():
    H = 560; fins = FT['fin'][::-1]  # aspect ratio 3, 2, 1
    def frame(j):
        c = Canvas(H)
        c.text(14, 10, 'How a fin lets go: three rudder-like fins turned up to 40°', 17, bold=True)
        c.text(14, 34, 'Watch for the drop after the peak. Tank rudders (grey) have it; the frozen rule (blue) never drops; one added number (orange) does.', 11.5, MUTED)
        for k, f in enumerate(fins):
            x0 = 40 + k * 292; p = f['curve'][j]; a = math.radians(p['beta'])
            c.text(x0, 62, f'depth over length {f["AR"]} (with mirror image)', 12, bold=True)
            # fin from above: chord line turned to the flow, wake coloured by the side force it makes
            cx, cy = x0 + 70, 124; ch = 70 if f['AR'] == 1 else (54 if f['AR'] == 2 else 40)
            t = min(1, p['drop'] / 1.4)
            c.rect(cx, cy - 34, x0 + 250, cy + 34, fill=water(t * 0.9))
            for q in range(5): c.line([(x0, cy - 28 + q * 14), (cx - ch * 0.6, cy - 28 + q * 14)], fill=(200, 206, 212), width=1)
            c.line([(cx - ch / 2 * math.cos(a), cy - ch / 2 * math.sin(a)), (cx + ch / 2 * math.cos(a), cy + ch / 2 * math.sin(a))], fill=INK, width=4)
            c.arrow(cx, cy, cx, cy - p['drop'] * 34, ORANGE, 3)
            c.text(x0, cy + 40, f'angle {p["beta"]}°   water →', 10, MUTED)
            pl = Plot(c, x0, 210, x0 + 250, 470, (0, 40), (0, 1.5), 'angle to the flow (degrees)', 'Side force (lift coefficient)' if k == 0 else '', [0, 10, 20, 30, 40], [0, 0.5, 1.0, 1.5])
            ref = [(q['beta'], q['ref']) for q in f['curve'] if q['ref'] is not None]
            pl.curve([r[0] for r in ref] + [f['stallRef']], [r[1] for r in ref] + [f['clmaxRef']], (120, 126, 134), 3.5)
            c.line([(pl.px(f['stallRef']), pl.py(f['clmaxRef'])), (pl.px(f['stallRef'] + 3), pl.py(f['clmaxRef'] * 0.72))], fill=(120, 126, 134), width=2, dash=(3, 3))
            c.dot(pl.px(f['stallRef']), pl.py(f['clmaxRef']), 5, (255, 255, 255), (90, 96, 104))
            if f['stallRef'] > 30: c.text(pl.px(f['stallRef']) - 8, pl.py(f['clmaxRef']) - 12, f'tank stall {f["stallRef"]:.0f}°', 10, MUTED, anchor='ra')
            else: c.text(pl.px(f['stallRef']) + 6, pl.py(f['clmaxRef']) - 12, f'tank stall {f["stallRef"]:.0f}°', 10, MUTED)
            xs = [q['beta'] for q in f['curve'][: j + 1]]
            pl.curve(xs, [q['frozen'] for q in f['curve'][: j + 1]], BLUE, 2.2)
            pl.curve(xs, [q['drop'] for q in f['curve'][: j + 1]], ORANGE, 2.2)
            c.dot(pl.px(p['beta']), pl.py(p['frozen']), 3.5, BLUE); c.dot(pl.px(p['beta']), pl.py(p['drop']), 3.5, ORANGE)
        ly = 512
        c.line([(40, ly), (64, ly)], fill=(120, 126, 134), width=3.5); c.text(70, ly, 'tank rudders (Whicker and Fehlner 1958): fitted curve to the stall point, then lift falls', 11, anchor='lm')
        c.line([(40, ly + 16), (64, ly + 16)], fill=BLUE, width=2.2); c.text(70, ly + 16, 'frozen rule: the held push levels off while cross-flow drag keeps growing, so no drop', 11, anchor='lm')
        c.line([(40, ly + 32), (64, ly + 32)], fill=ORANGE, width=2.2); c.text(70, ly + 32, 'with one attachment number per slice run: peak, drop, then drag takes over', 11, anchor='lm')
        return c.done()
    n = len(fins[0]['curve'])
    frames = [frame(0)] * 10
    for j in range(n): frames += [frame(j)] * 4
    frames += [frames[-1]] * 36
    write_gif('fin_stall', frames)

if __name__ == '__main__':
    which = sys.argv[1:] or ['hulls', 'fin']
    for w in which: {'hulls': hulls, 'fin': fin}[w]()
