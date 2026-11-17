import numpy as np
from PIL import Image, ImageDraw, ImageFont
FD = '/usr/share/fonts/truetype/dejavu/'
def font(sz, bold=False):
    return ImageFont.truetype(FD + ('DejaVuSans-Bold.ttf' if bold else 'DejaVuSans.ttf'), sz)
F_T, F_C, F_L, F_S = font(21, True), font(15), font(13), font(11)
INK = (30, 34, 40); GREY = (120, 126, 134); LIGHT = (222, 225, 229)
ORANGE = (214, 96, 20); BLUE = (28, 100, 170); GREEN = (30, 130, 90)
# diverging bands: trough (blue) .. flat (near white) .. crest (red-brown)
_T = np.array([[20, 60, 120], [50, 110, 170], [110, 160, 205], [170, 205, 230], [215, 232, 243],
               [246, 247, 248],
               [250, 228, 205], [245, 195, 150], [232, 150, 100], [205, 100, 60], [160, 55, 35]], dtype=np.uint8)
def field_img(zeta, scale, size):
    """zeta[nx,ny] -> banded image (width nx, height ny) resized to size."""
    v = np.clip(zeta.T / scale, -1, 1)
    v = np.sign(v) * np.abs(v) ** 0.6
    idx = np.clip(np.round(v * 5).astype(int) + 5, 0, 10)
    im = Image.fromarray(_T[idx], 'RGB')
    return im.resize(size, Image.NEAREST)
def colour_key(d, x, y, w=150):
    for i in range(11):
        d.rectangle([x + i * w // 11, y, x + (i + 1) * w // 11, y + 9], fill=tuple(int(c) for c in _T[i]))
    d.text((x - 4, y - 2), 'trough', font=F_S, fill=INK, anchor='ra')
    d.text((x + w + 6, y - 2), 'crest', font=F_S, fill=INK, anchor='la')

class Plot:
    def __init__(self, d, box, xr, yr, logy=False):
        self.d, self.box, self.xr, self.yr, self.logy = d, box, xr, yr, logy
    def px(self, x, y):
        x0, y0, x1, y1 = self.box
        fx = (np.asarray(x, float) - self.xr[0]) / (self.xr[1] - self.xr[0])
        if self.logy:
            fy = (np.log10(np.maximum(y, 1e-12)) - np.log10(self.yr[0])) / (np.log10(self.yr[1]) - np.log10(self.yr[0]))
        else:
            fy = (np.asarray(y, float) - self.yr[0]) / (self.yr[1] - self.yr[0])
        return x0 + fx * (x1 - x0), y1 - fy * (y1 - y0)
    def frame(self, xt, yt, xl, yl, xfmt='%g', ylab=None):
        d = self.d; x0, y0, x1, y1 = self.box
        d.rectangle(self.box, fill=(255, 255, 255), outline=GREY)
        for t in xt:
            X, _ = self.px(t, self.yr[0]); d.line([X, y0, X, y1], fill=LIGHT)
            d.text((X, y1 + 4), xfmt % t, font=F_S, fill=INK, anchor='ma')
        for i, t in enumerate(yt):
            _, Y = self.px(self.xr[0], t); d.line([x0, Y, x1, Y], fill=LIGHT)
            d.text((x0 - 5, Y), (ylab[i] if ylab else '%g' % t), font=F_S, fill=INK, anchor='rm')
        d.rectangle(self.box, outline=GREY)
        d.text(((x0 + x1) / 2, y1 + 19), xl, font=F_L, fill=INK, anchor='ma')
        d.text((x0 - 44, y0 - 20), yl, font=F_L, fill=INK, anchor='la')
    def line(self, x, y, col, w=3):
        X, Y = self.px(x, y); x0, y0, x1, y1 = self.box
        Y = np.clip(Y, y0, y1)
        pts = list(zip(X.tolist(), Y.tolist()))
        if len(pts) > 1: self.d.line(pts, fill=col, width=w, joint='curve')
    def dots(self, x, y, col, r=4, fill=None):
        X, Y = self.px(x, y); x0, y0, x1, y1 = self.box
        for a, b in zip(np.atleast_1d(X), np.atleast_1d(Y)):
            if y0 <= b <= y1 and x0 <= a <= x1:
                self.d.ellipse([a - r, b - r, a + r, b + r], fill=fill or col, outline=col, width=2)

def hull_poly(d, xs, bs, tx, ty, fill=(60, 64, 70)):
    """xs, bs in metres; tx, ty map metres to pixels."""
    up = [(tx(x), ty(b)) for x, b in zip(xs, bs)]
    dn = [(tx(x), ty(-b)) for x, b in zip(xs[::-1], bs[::-1])]
    d.polygon(up + dn, fill=fill, outline=(0, 0, 0))

def save_gif(frames, path, fps):
    import subprocess, tempfile, os
    tmp = tempfile.mkdtemp(dir=os.path.dirname(path))
    for i, f in enumerate(frames):
        f.save('%s/f%04d.png' % (tmp, i))
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-framerate', str(fps), '-i', tmp + '/f%04d.png', '-vf',
                    'split[a][b];[a]palettegen=max_colors=128:stats_mode=diff[p];[b][p]paletteuse=dither=none:diff_mode=rectangle',
                    path], check=True)
    frames[len(frames) // 2].save(path.replace('.gif', '_mid.png')); frames[-1].save(path.replace('.gif', '_last.png'))
    subprocess.run(['rm', '-r', tmp])
    print(path, os.path.getsize(path) / 1e6, 'MB', len(frames), 'frames')
