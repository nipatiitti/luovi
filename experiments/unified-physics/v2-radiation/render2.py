# render2.py (v2-radiation): draws the two GIFs with Pillow from out/frames-*.json and out/rao.json, then ffmpeg (palette) -> out/*.gif
import json, math, os, subprocess, sys, shutil
from PIL import Image, ImageDraw, ImageFont
O = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'out')
def font(sz, bold=False):
    for p in ['/usr/share/fonts/truetype/dejavu/DejaVuSans%s.ttf' % ('-Bold' if bold else ''), '/usr/share/fonts/dejavu/DejaVuSans%s.ttf' % ('-Bold' if bold else '')]:
        if os.path.exists(p): return ImageFont.truetype(p, sz)
    return ImageFont.load_default(sz)
F12, F14, F16, F20 = font(12), font(14), font(16, True), font(20, True)
BG, INK, GRID, SEA, WET, HULL, RED, BLU = (250, 250, 247), (25, 30, 40), (205, 208, 212), (70, 130, 190), (120, 175, 225), (60, 60, 66), (200, 60, 40), (30, 90, 170)
H = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data', 'v3', 'hulls.json')))['hboat']; sd = H['sea']; ST = sd['stations']; xcg = H['xcg']
def gif(name, frames_dir, fps):
    pal = os.path.join(frames_dir, 'pal.png')
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-framerate', str(fps), '-i', os.path.join(frames_dir, 'f%04d.png'), '-vf', 'palettegen=max_colors=48', pal], check=True)
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-framerate', str(fps), '-i', os.path.join(frames_dir, 'f%04d.png'), '-i', pal, '-lavfi', 'paletteuse=dither=none', os.path.join(O, name)], check=True)
    shutil.rmtree(frames_dir); print(name, os.path.getsize(os.path.join(O, name)) // 1024, 'kB')
def fdir(n):
    d = os.path.join(O, 'tmp_' + n); shutil.rmtree(d, ignore_errors=True); os.makedirs(d); return d
def trace(d, box, series, t_now, t0, t1, lo, hi, label, unit):
    x0, y0, x1, y1 = box; d.rectangle(box, outline=GRID); zy = y0 + (y1 - y0) * hi / (hi - lo); d.line([x0, zy, x1, zy], fill=GRID)
    d.text((x0 + 4, y0 + 2), '%s  (%+g to %+g %s)' % (label, lo, hi, unit), font=F12, fill=INK)
    for col, pts in series:
        xy = [(x0 + (x1 - x0) * (t - t0) / (t1 - t0), max(y0, min(y1, y0 + (y1 - y0) * (hi - v) / (hi - lo)))) for t, v in pts if t <= t_now]
        if len(xy) > 1: d.line(xy, fill=col, width=2)
    d.text((x1 - 60, y1 - 16), 'time, s', font=F12, fill=INK)


GRN, ORA, GRY = (20, 130, 90), (225, 140, 20), (120, 120, 128)
def side():
    A = json.load(open(os.path.join(O, 'frames-closehauled-sea-mem.json'))); info = A['sea']
    W, Hh, sc, n = 900, 600, 100.0, 460; d0 = fdir('side'); oy = 300
    def panel(d, fr):
        th = math.radians(fr['th']); z = fr['z']; cx = 450 - (xcg - 2.9) * sc
        def P(s, y):
            arm = xcg - s; return (cx + (arm * math.cos(th) - y * math.sin(th)) * sc, oy - (z + arm * math.sin(th) + y * math.cos(th)) * sc)
        sea = [(cx + (xcg - q['s']) * math.cos(th) * sc, oy - fr['eta'][i] * sc) for i, q in enumerate(ST)]
        sea = [(W, sea[0][1])] + sea + [(0, sea[-1][1])]
        d.polygon(sea + [(0, oy + 150), (W, oy + 150)], fill=(222, 235, 246))
        d.line([0, oy, W, oy], fill=(190, 205, 220))
        for b in sd['blades']:
            pr = b['profile']; pts = [P(s, -dep) for s, dep in pr] + [P(pr[-1][0], -0.25), P(pr[0][0], -0.25)]; d.polygon(pts, fill=(90, 90, 100))
        top = [P(q['s'], q['sheerH']) for q in ST]; bot = [P(q['s'], q['keelH']) for q in ST]
        d.polygon(top + bot[::-1], fill=(236, 232, 222))
        for i in range(len(ST) - 1):
            a, b = ST[i], ST[i + 1]; wa = min(fr['imm'][i], a['sheerH']); wb = min(fr['imm'][i + 1], b['sheerH'])
            if wa > a['keelH'] or wb > b['keelH']:
                d.polygon([P(a['s'], a['keelH']), P(b['s'], b['keelH']), P(b['s'], max(wb, b['keelH'])), P(a['s'], max(wa, a['keelH']))], fill=WET)
        d.line(top + bot[::-1] + [top[0]], fill=HULL, width=2)
        d.line(sea, fill=SEA, width=3)
        m = P(H['rig']['mastX'], 0.6); m2 = P(H['rig']['mastX'], 1.75); d.line([m, m2], fill=HULL, width=5)
        d.text((14, 84), 'pitch %+5.1f deg    rise %+5.2f m    speed %4.1f kn    heel %2.0f deg    bow %4.2f g' % (fr['th'], fr['z'], fr['kn'], abs(fr['heel']), abs(fr['aB']) / 9.81), font=F14, fill=INK)
        d.line([780, oy + 128, 780 + sc, oy + 128], fill=INK, width=2); d.text((815, oy + 132), '1 m', font=F12, fill=INK)
        d.text((14, oy + 128), 'stern', font=F12, fill=INK) if False else None
    for k in range(n):
        im = Image.new('RGB', (W, Hh), BG); d = ImageDraw.Draw(im); fa = A['frames'][k + 200]
        d.text((14, 8), 'H-boat close-hauled in a Helsinki chop, with wave-making that remembers', font=F20, fill=INK)
        d.text((14, 38), 'Wind 7 m/s, waves %.2f m high, %.1f s, %.0f m long. Real-time speed, hull to scale, drawn upright (heel not shown).' % (info['Hs'], info['Tp'], info['Lp']), font=F12, fill=INK)
        d.text((14, 56), 'Mid blue = hull under water; thick line = sea surface along the hull. Compare the bow motion with your own video.', font=F12, fill=INK)
        panel(d, fa)
        t = fa['t']; tb = A['frames'][200]['t']; fs = A['frames'][200:k + 201]
        trace(d, (14, 470, 440, 590), [(BLU, [(f['t'] - tb, f['th']) for f in fs])], t - tb, 0, 23, -8, 8, 'Pitch, bow up +', 'deg')
        trace(d, (460, 470, 886, 590), [(BLU, [(f['t'] - tb, f['z']) for f in fs])], t - tb, 0, 23, -0.4, 0.4, 'Rise of the boat', 'm')
        im.save(os.path.join(d0, 'f%04d.png' % k))
    gif('side-closehauled-memory.gif', d0, 20)

def curves():
    R = json.load(open(os.path.join(O, 'rao2.json'))); W, Hh = 900, 660; d0 = fdir('rao'); nfr = 190
    plots = [(0, 'heave', 'Rise / wave height, at rest', 2.0), (0, 'pitch', 'Pitch / wave slope, at rest', 2.0), (5, 'heave', 'Rise / wave height, 5 knots into the waves', 2.0), (5, 'pitch', 'Pitch / wave slope, 5 knots into the waves', 2.0)]
    def dash(d, pts, col):
        for i in range(len(pts) - 1):
            (xa, ya), (xb, yb) = pts[i], pts[i + 1]; L = math.hypot(xb - xa, yb - ya); m = max(1, int(L / 8))
            for j in range(0, m, 2): d.line([xa + (xb - xa) * j / m, ya + (yb - ya) * j / m, xa + (xb - xa) * (j + 1) / m, ya + (yb - ya) * (j + 1) / m], fill=col, width=3)
    for k in range(nfr):
        im = Image.new('RGB', (W, Hh), BG); d = ImageDraw.Draw(im); prog = [min(1.0, max(0.0, (k - s0) / 40.0)) * 6.0 for s0 in (0, 40, 80)]
        d.text((14, 8), 'How much she rises and pitches in regular head waves, against wave length', font=F16, fill=INK)
        d.text((14, 30), '1 = she follows the wave exactly. The blue curve is given no frequency; it should land on the references.', font=F12, fill=INK)
        lx = 14
        for col, txt, dsh in ((INK, 'strip theory (v1 reference)', False), (GRY, 'same + matching added mass', True), (RED, 'old law, no damping', False), (ORA, 'frozen frequency', False), (BLU, 'NEW: memory, no frequency given', False)):
            (dash(d, [(lx, 58), (lx + 24, 58)], col) if dsh else d.line([lx, 58, lx + 22, 58], fill=col, width=4)); d.text((lx + 27, 51), txt, font=F12, fill=INK); lx += 33 + d.textlength(txt, font=F12)
        for pi, (U, key, title, ymax) in enumerate(plots):
            x0 = 60 + (pi % 2) * 440; y0 = 100 + (pi // 2) * 280; x1 = x0 + 370; y1 = y0 + 210
            d.rectangle((x0, y0, x1, y1), outline=INK); d.text((x0, y0 - 18), title, font=F14, fill=INK)
            X = lambda v: x0 + (x1 - x0) * (v - 0.5) / 5.5; Y = lambda v: y1 - (y1 - y0) * min(v, ymax) / ymax
            for g in (1, 2, 3, 4, 5, 6): d.line([X(g), y0, X(g), y1], fill=GRID); d.text((X(g) - 4, y1 + 3), str(g), font=F12, fill=INK)
            for g in (0, 0.5, 1, 1.5, 2): d.line([x0, Y(g), x1, Y(g)], fill=GRID if g != 1 else (150, 150, 150)); d.text((x0 - 26, Y(g) - 7), '%g' % g, font=F12, fill=INK)
            d.text((x0 + 100, y1 + 18), 'wave length / waterline length', font=F12, fill=INK)
            rows = [r for r in R if r['Ukn'] == U]
            for name, col, pr in (('law', RED, prog[0]), ('frz', ORA, prog[1])):
                pts = [(X(r['ll']), Y(r[name][key])) for r in rows if r['ll'] <= pr]
                if len(pts) > 1: d.line(pts, fill=col, width=2)
                for r in rows:
                    if r['ll'] <= pr and r[name][key] > ymax: d.text((X(r['ll']) - 8, y0 + 3), '%.1f' % r[name][key], font=F12, fill=col)
            d.line([(X(r['ll']), Y(r['ref'][key])) for r in rows], fill=INK, width=3)
            dash(d, [(X(r['ll']), Y(r['kk'][key])) for r in rows], GRY)
            pts = [(X(r['ll']), Y(r['mem'][key])) for r in rows if r['ll'] <= prog[2]]
            if len(pts) > 1: d.line(pts, fill=BLU, width=3)
            for p in pts: d.ellipse([p[0] - 3, p[1] - 3, p[0] + 3, p[1] + 3], fill=BLU)
        im.save(os.path.join(d0, 'f%04d.png' % k))
    gif('response-curves-memory.gif', d0, 15)
for a in sys.argv[1:]: {'side': side, 'curves': curves}[a]()
