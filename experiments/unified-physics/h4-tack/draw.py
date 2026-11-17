"""draw.py: small Pillow drawing helpers (canvas at twice the final size, plots, GIF writer).
Taken from the renderer of experiment H1/H2."""
import json, math, os, subprocess, sys
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, 'out')  # git-ignored; the Node runner writes its JSON here too
os.makedirs(ROOT, exist_ok=True)
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
    def __init__(self, h, w=W, bg=BG):
        self.im = Image.new('RGB', (w * S, h * S), bg)
        self.d = ImageDraw.Draw(self.im)
        self.h = h; self.w = w
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
        return self.im.resize((self.w, self.h), Image.LANCZOS)

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
