# render.py: draws the three GIFs with Pillow from out/frames-*.json and out/rao.json, then ffmpeg (palette) -> out/*.gif
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

def side():
    A = json.load(open(os.path.join(O, 'frames-closehauled-sea-law.json'))); Bq = json.load(open(os.path.join(O, 'frames-closehauled-sea-rad.json'))); info = A['sea']
    W, Hh, sc, n = 900, 690, 85.0, 440; d0 = fdir('side')
    def panel(d, fr, oy, title, col):
        th = math.radians(fr['th']); z = fr['z']; cx = 450 - (xcg - 2.9) * sc
        def P(s, y):
            arm = xcg - s; return (cx + (arm * math.cos(th) - y * math.sin(th)) * sc, oy - (z + arm * math.sin(th) + y * math.cos(th)) * sc)
        # sea behind
        sea = [(cx + (xcg - q['s']) * math.cos(th) * sc, oy - fr['eta'][i] * sc) for i, q in enumerate(ST)]
        d.polygon(sea + [(sea[-1][0], oy + 125), (sea[0][0], oy + 125)], fill=(222, 235, 246))
        # keel, deadwood, rudder
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
        m = P(H['rig']['mastX'], 0.6); m2 = P(H['rig']['mastX'], 2.2); d.line([m, m2], fill=HULL, width=4)
        d.text((14, oy - 118), title, font=F16, fill=col)
        d.text((14, oy - 96), 'pitch %+5.1f deg   rise %+5.2f m   speed %4.1f kn   bow %4.1f g' % (fr['th'], fr['z'], fr['kn'], abs(fr['aB']) / 9.81), font=F14, fill=INK)
        d.line([800, oy + 100, 800 + sc, oy + 100], fill=INK, width=2); d.text((830, oy + 104), '1 m', font=F12, fill=INK)
    for k in range(n):
        im = Image.new('RGB', (W, Hh), BG); d = ImageDraw.Draw(im); fa, fb = A['frames'][k], Bq['frames'][k]
        d.text((14, 8), 'H-boat close-hauled in a Helsinki chop: wind 7 m/s, waves %.2f m high, %.1f s, %.0f m long' % (info['Hs'], info['Tp'], info['Lp']), font=F16, fill=INK)
        d.text((14, 32), 'Real time, to scale, drawn upright (heel not shown). Mid blue = hull under water. Watch the bow rise, fall and slam.', font=F12, fill=INK)
        panel(d, fa, 172, 'A. Slice law as proposed (no wave-making damping): hobby-horses far too much', RED)
        panel(d, fb, 427, 'B. Same law + wave-making damping on each section: compare this one with video', BLU)
        t = fa['t']; t0 = max(0, t - 20); 
        trace(d, (14, 566, 440, 682), [(RED, [(f['t'], f['th']) for f in A['frames'][:k + 1] if f['t'] >= t0]), (BLU, [(f['t'], f['th']) for f in Bq['frames'][:k + 1] if f['t'] >= t0])], t, t0, t0 + 20, -20, 20, 'Pitch, bow up +, red A, blue B', 'deg')
        trace(d, (460, 566, 886, 682), [(RED, [(f['t'], f['z']) for f in A['frames'][:k + 1] if f['t'] >= t0]), (BLU, [(f['t'], f['z']) for f in Bq['frames'][:k + 1] if f['t'] >= t0])], t, t0, t0 + 20, -0.8, 0.8, 'Rise of the boat, red A, blue B', 'm')
        im.save(os.path.join(d0, 'f%04d.png' % k))
    gif('seaway-side-closehauled.gif', d0, 20)

def astern():
    A = json.load(open(os.path.join(O, 'frames-closehauled-sea-law.json'))); Bq = json.load(open(os.path.join(O, 'frames-closehauled-sea-rad.json'))); info = A['sea']
    W, Hh, sc, n = 900, 640, 52.0, 300; d0 = fdir('astern'); i_mid = min(range(len(ST)), key=lambda i: abs(ST[i]['s'] - 3.3)); i_aft = min(range(len(ST)), key=lambda i: abs(ST[i]['s'] - 5.6))
    def panel(d, fr, ox, title, col):
        oy = 400; ph = math.radians(-fr['heel']); z = fr['z'] + (xcg - 3.3) * math.sin(math.radians(fr['th']))  # seen from astern: starboard to the right; she heels to port (lee side) on this tack
        def P(y, h): return (ox + (y * math.cos(ph) + h * math.sin(ph)) * sc, oy - (z + h * math.cos(ph) - y * math.sin(ph)) * sc)
        sl = math.tan(math.radians(fr['slope'])); e = fr['eta'][i_mid]
        d.polygon([(ox - 215, oy - (e - sl * 215 / sc) * sc), (ox + 215, oy - (e + sl * 215 / sc) * sc), (ox + 215, oy + 130), (ox - 215, oy + 130)], fill=(222, 235, 246))
        kd = 1.31; d.polygon([P(-0.07, -0.3), P(0.07, -0.3), P(0.05, -kd), P(-0.05, -kd)], fill=(90, 90, 100))
        for i, fillc in ((i_aft, (226, 222, 212)), (i_mid, (236, 232, 222))):
            o = ST[i]['outline']; pts = [P(y, h) for y, h in o] + [P(-y, h) for y, h in o[::-1]]; d.polygon(pts, fill=fillc, outline=HULL)
        d.line([P(0, 0.75), P(0, 6.2)], fill=HULL, width=4)
        d.line([(ox - 215, oy - (e - sl * 215 / sc) * sc), (ox + 215, oy - (e + sl * 215 / sc) * sc)], fill=SEA, width=3)
        d.text((ox - 210, 66), title, font=F14, fill=col); d.text((ox - 210, 86), 'heel %4.1f deg   rise %+5.2f m' % (abs(fr['heel']), fr['z']), font=F14, fill=INK)
    for k in range(n):
        im = Image.new('RGB', (W, Hh), BG); d = ImageDraw.Draw(im); fa, fb = A['frames'][k + 100], Bq['frames'][k + 100]
        d.text((14, 8), 'Same sail seen from astern: heel and roll in the chop (waves %.2f m, %.1f s)' % (info['Hs'], info['Tp']), font=F16, fill=INK)
        d.text((14, 32), 'Real-time speed. Midship and stern sections to scale, mast cut short. Watch the roll: the waves push the hull and tilt its waterline.', font=F12, fill=INK)
        panel(d, fa, 225, 'A. Slice law as proposed', RED); panel(d, fb, 675, 'B. + wave-making damping', BLU)
        t = fa['t']; t0 = A['frames'][100]['t']
        trace(d, (14, 540, 886, 630), [(RED, [(f['t'], abs(f['heel'])) for f in A['frames'][100:k + 101]]), (BLU, [(f['t'], abs(f['heel'])) for f in Bq['frames'][100:k + 101]])], t, t0, t0 + 15, 10, 40, 'Heel (red A, blue B)', 'deg')
        im.save(os.path.join(d0, 'f%04d.png' % k))
    gif('seaway-astern-closehauled.gif', d0, 20)

def curves():
    R = json.load(open(os.path.join(O, 'rao.json'))); W, Hh = 900, 620; d0 = fdir('rao'); nfr = 150
    plots = [(0, 'heave', 'Rise / wave height, at rest', 3.0), (0, 'pitch', 'Pitch / wave slope, at rest', 3.0), (5, 'heave', 'Rise / wave height, 5 knots into the waves', 4.5), (5, 'pitch', 'Pitch / wave slope, 5 knots into the waves', 4.5)]
    for k in range(nfr):
        im = Image.new('RGB', (W, Hh), BG); d = ImageDraw.Draw(im); prog = min(1.0, k / 90.0) * 6.0
        d.text((14, 8), 'How much she rises and pitches in regular head waves, against wave length', font=F16, fill=INK)
        d.text((14, 32), 'Black = classical strip theory (same sections + wave-making damping). Red = slice law as proposed. 1 = she follows the wave exactly.', font=F12, fill=INK)
        for pi, (U, key, title, ymax) in enumerate(plots):
            x0 = 60 + (pi % 2) * 440; y0 = 80 + (pi // 2) * 270; x1 = x0 + 370; y1 = y0 + 200
            d.rectangle((x0, y0, x1, y1), outline=INK); d.text((x0, y0 - 18), title, font=F14, fill=INK)
            X = lambda v: x0 + (x1 - x0) * (v - 0.5) / 5.5; Y = lambda v: y1 - (y1 - y0) * min(v, ymax) / ymax
            for g in (1, 2, 3, 4, 5, 6): d.line([X(g), y0, X(g), y1], fill=GRID); d.text((X(g) - 4, y1 + 3), str(g), font=F12, fill=INK)
            for g in range(0, int(ymax) + 1): d.line([x0, Y(g), x1, Y(g)], fill=GRID if g != 1 else (150, 150, 150)); d.text((x0 - 16, Y(g) - 7), str(g), font=F12, fill=INK)
            d.text((x0 + 120, y1 + 18), 'wave length / waterline length', font=F12, fill=INK)
            rows = [r for r in R if r['Ukn'] == U]
            ref = [(X(r['ll']), Y(r['ref'][key])) for r in rows]; d.line(ref, fill=INK, width=3)
            law = [(X(r['ll']), Y(r['law'][key])) for r in rows if r['ll'] <= prog]
            if len(law) > 1: d.line(law, fill=RED, width=3)
            for r in rows:
                if r['ll'] <= prog:
                    if r['law'][key] > ymax: d.text((X(r['ll']) - 8, y0 + 3), '%.1f' % r['law'][key], font=F12, fill=RED)
        im.save(os.path.join(d0, 'f%04d.png' % k))
    gif('response-curves.gif', d0, 15)
for a in sys.argv[1:]: {'side': side, 'astern': astern, 'curves': curves}[a]()
