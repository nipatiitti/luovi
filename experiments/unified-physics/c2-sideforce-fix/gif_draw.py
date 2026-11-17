"""gif_draw.py: draws out/gif_frames.json (gif_sim.mjs) as PNG frames; ffmpeg makes the GIF (see NOTES.txt).
python3 gif_draw.py <frames.json> <outdir>"""
import json, os, sys
from PIL import Image, ImageDraw, ImageFont
D = json.load(open(sys.argv[1])); outdir = sys.argv[2]; os.makedirs(outdir, exist_ok=True)
FB = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'; FR = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
f = lambda p, s: ImageFont.truetype(p, s)
W, H = 900, 640; L = D['L']; S = 560 / L; X0 = 24
INK, GREY, OLD, NEW, TANK = (25, 30, 40), (120, 125, 135), (200, 90, 30), (20, 110, 190), (0, 0, 0)
nf = min(len(D['runs']['old']), len(D['runs']['new'])); tank = D['tank']
fmax = 1.25 * max(tank['sideN'], max(fr['side'] for fr in D['runs']['old']))
def arrow(d, x0, y0, x1, y1, col, w=3, head=9):
    d.line([x0, y0, x1, y1], fill=col, width=w)
    import math
    a = math.atan2(y1 - y0, x1 - x0)
    d.polygon([(x1, y1), (x1 - head * math.cos(a - 0.45), y1 - head * math.sin(a - 0.45)), (x1 - head * math.cos(a + 0.45), y1 - head * math.sin(a + 0.45))], fill=col)
def panel(d, key, col, yc, i, title):
    import math
    ucos = D['U'] * math.cos(math.radians(D['beta']))
    fr = D['runs'][key][i]; hb = D['halfBeam']; dx = D['dx']; n = len(hb)
    d.text((X0, yc - 128), title, font=f(FB, 17), fill=col)
    # slices of water: shaded by how fast the water is already moving sideways when the next section meets it
    for x, wash, kept in fr['m']:
        px = X0 + x * S; a = max(0.0, min(1.0, wash)) ** 2.5  # steep scale: the difference between 0.85 and 0.95 is the result
        c = (int(245 - 175 * a), int(248 - 110 * a), int(252 - 30 * a))
        d.rectangle([px - 0.05 * S / 2, yc - 78, px + 0.05 * S / 2 - 0.6, yc + 78], fill=c)
        if round((x - ucos * fr['t']) / 0.05) % 9 == 0: d.line([px, yc - 78, px, yc + 78], fill=(255, 255, 255), width=1)  # every ninth slice marked, so the water is seen passing aft
    # hull at the waterline, keel and rudder
    top = [(X0 + j * dx * S, yc - hb[j] * S) for j in range(n)]; bot = [(X0 + j * dx * S, yc + hb[j] * S) for j in range(n - 1, -1, -1)]
    d.line(top + bot + [top[0]], fill=INK, width=2)
    for j in range(n - 1):
        if D['keel'][j]: d.line([X0 + j * dx * S, yc, X0 + (j + 1) * dx * S, yc], fill=INK, width=7)
        if D['rud'][j]: d.line([X0 + j * dx * S, yc, X0 + (j + 1) * dx * S, yc], fill=(150, 30, 30), width=7)
    # wash arrows: sideways speed of the water each slice meets, as a share of the boat's own sideways speed (40 px = all of it)
    for k, (x, wash, kept) in enumerate(fr['m']):
        if k % 7 == 3 and wash > 0.04: arrow(d, X0 + x * S, yc + 22, X0 + x * S, yc + 22 + 46 * min(wash, 1.2), (30, 70, 150), 2, 6)
    # side force arrows at their centres: model and tank
    if fr['clr'] is not None:
        xm = X0 + fr['clr'] * L * S; arrow(d, xm, yc - 4, xm, yc - 4 - 88 * fr['side'] / fmax, col, 5, 12)
    xt = X0 + tank['clr'] * L * S; arrow(d, xt, yc - 4, xt, yc - 4 - 88 * tank['sideN'] / fmax, TANK, 2, 9)
    pct = 100 * (fr['side'] / tank['sideN'] - 1)
    d.text((X0, yc + 84), 'side force %5d N  (tank %d N: %+.0f%%)' % (fr['side'], tank['sideN'], pct), font=f(FB, 15), fill=col)
    xr = X0 + (max(j for j in range(n) if D['rud'][j]) + min(j for j in range(n) if D['rud'][j])) / 2 * dx * S
    if fr['rud'] > 20: arrow(d, xr, yc - 4, xr, yc - 4 - 88 * fr['rud'] / fmax, (150, 30, 30), 4, 8)
    d.text((X0, yc + 104), 'centre %s of length from bow (tank %.2f)      rudder carries %d N' % ('%.2f' % fr['clr'] if fr['clr'] is not None else ' -- ', tank['clr'], fr['rud']), font=f(FR, 14), fill=INK)
    # live plot
    px0, py0, pw, ph = 640, yc - 78, 236, 150
    d.rectangle([px0, py0, px0 + pw, py0 + ph], outline=GREY)
    ty = py0 + ph - ph * tank['sideN'] / fmax
    for xx in range(px0, px0 + pw, 10): d.line([xx, ty, xx + 5, ty], fill=TANK, width=2)
    d.text((px0 + pw - 34, ty - 16), 'tank', font=f(FR, 12), fill=TANK)
    pts = [(px0 + pw * D['runs'][key][j]['t'] / D['runs'][key][nf - 1]['t'], py0 + ph - ph * max(0, D['runs'][key][j]['side']) / fmax) for j in range(i + 1)]
    if len(pts) > 1: d.line(pts, fill=col, width=3)
    d.text((px0, py0 - 17), 'side force, N, against time', font=f(FR, 12), fill=INK)
    d.text((px0 - 2, py0 + ph + 2), '0 s', font=f(FR, 11), fill=GREY); d.text((px0 + pw - 30, py0 + ph + 2), '%.0f s' % D['runs'][key][nf - 1]['t'], font=f(FR, 11), fill=GREY)
    d.text((px0 + 3, py0 + 2), '%d' % (fmax), font=f(FR, 11), fill=GREY)
for i in range(nf):
    im = Image.new('RGB', (W, H), (252, 252, 250)); d = ImageDraw.Draw(im)
    d.text((X0, 10), 'Towed at %.0f° leeway, seen from above: old wash rule against the repaired one' % D['beta'], font=f(FB, 19), fill=INK)
    d.text((X0, 36), 'Watch the rudder (red): blue slices are water the keel has already set moving sideways, arrows show how fast.', font=f(FR, 13), fill=INK)
    d.text((X0, 54), 'Delft model %d at full size (%.1f m waterline, beam %.0f times canoe draft), %.1f knots. Bow to the left; boat slides down the page.' % (D['sys'], L, D['bt'], D['U'] / 0.5144), font=f(FR, 12), fill=GREY)
    panel(d, 'old', OLD, 210, i, 'OLD (v3): wash builds up with distance behind the keel')
    panel(d, 'new', NEW, 474, i, 'NEW (C2): wash at its far-wake value at once, as in the validated steady law')
    yl = H - 30
    d.rectangle([X0, yl, X0 + 14, yl + 12], fill=(70, 138, 222)); d.text((X0 + 20, yl - 2), 'water moving sideways with the keel', font=f(FR, 12), fill=INK)
    arrow(d, X0 + 270, yl - 2, X0 + 270, yl + 14, (30, 70, 150), 2, 6); d.text((X0 + 280, yl - 2), 'wash speed (long = as fast as the boat slides)', font=f(FR, 12), fill=INK)
    arrow(d, X0 + 590, yl + 14, X0 + 590, yl - 2, TANK, 2, 7); d.text((X0 + 600, yl - 2), 'tank', font=f(FR, 12), fill=INK)
    arrow(d, X0 + 650, yl + 14, X0 + 650, yl - 2, OLD, 4, 9); arrow(d, X0 + 666, yl + 14, X0 + 666, yl - 2, NEW, 4, 9); d.text((X0 + 678, yl - 2), 'model, at its centre (red: rudder)', font=f(FR, 12), fill=INK)
    im.save(os.path.join(outdir, 'f%04d.png' % i))
print(nf, 'frames')
