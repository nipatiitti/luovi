# Writes index.html (the comparison page) and fps-summary.json from the fps runs, the picture correlation runs and the
# compare/ images.
import json, glob, os, re, statistics, html

BASE = '/private/tmp/claude-502/-Users-niilojaakkola-projects-luovi/13e248e8-19fc-4c78-8792-faa277084d9d/scratchpad/visual'
LAYOUTS = ['L0', 'L1', 'L2', 'L3', 'L4']
LABEL = {
    'L0': 'L0 baseline: ratio 10, 6 periods per tile, no turn',
    'L1': 'L1 ratio 8 + φ = 9.618, 6 periods per tile',
    'L2': 'L2 ratio 10, cascade c turned by c × 137.508°',
    'L3': 'L3 ratio 10, 12 periods per tile',
    'L4': 'L4 ratio 9.618 and the golden-angle turn',
}
TILES = {
    'bothnian': {'L0': '347.3 / 34.73 / 3.47', 'L1': '347.3 / 36.11 / 3.75', 'L2': '347.3 / 34.73 / 3.47 (turned 0, 137.5, 275.0°)',
                 'L3': '694.6 / 69.46 / 6.95', 'L4': '347.3 / 36.11 / 3.75 (turned 0, 137.5, 275.0°)'},
    'helsinki': {'L0': '28.05 / 5.99 / 1.28', 'L1': '28.05 / 5.99 / 1.28 (same as L0: the floor forces the fallback ratio 4.68)',
                 'L2': '28.05 / 5.99 / 1.28 (turned)', 'L3': '56.10 / 8.47 / 1.28 (fallback ratio 6.62)',
                 'L4': '28.05 / 5.99 / 1.28 (turned; same as L2)'},
    'moderate': {'L0': '168.9 / 16.89 / 1.69', 'L1': '168.9 / 17.56 / 1.83', 'L2': '168.9 / 16.89 / 1.69 (turned)',
                 'L3': '337.7 / 33.77 / 3.38', 'L4': '168.9 / 17.56 / 1.83 (turned)'},
}
SEA_NAME = {'bothnian': 'Bothnian Sea storm, 27 m/s over 194 km (cut wavelength 57.9 m, peak about 174 m)',
            'helsinki': 'Helsinki archipelago, 8 m/s over 15 km (cut wavelength 4.67 m)',
            'moderate': 'Old moderate reference sea, 12 m/s over 150 km (cut wavelength 28.1 m)'}
VIEWS = [('oblique', '(a) 40 m eye, 20° below the horizon, foam off'),
         ('deck', '(b) 2.5 m eye looking across the wind, foam off'),
         ('top', '(c) 80 m eye, 80° down, foam off'),
         ('top-wide', 'Extra: straight down from about three baseline cascade 0 tiles up (1120 m, 90 m, 545 m), foam off'),
         ('oblique-foam', 'Extra: view (a) with foam on')]


def load_runs(pattern):
    runs = {}
    for path in sorted(glob.glob(f'{BASE}/fps/{pattern}')):
        layout = os.path.basename(path).split('.')[0]
        for r in json.load(open(path))['results']:
            runs.setdefault((layout, r['name']), []).append(r)
    return runs


def summarise(runs):
    out = {}
    for (layout, view), rs in runs.items():
        intervals = [x for r in rs for x in r['intervals'] if x > 0]
        s = sorted(intervals)
        per_round = [1000 * len(r['intervals']) / sum(r['intervals']) for r in rs]
        reads = [t for r in rs for t in (r['timings'] or [])]
        passes = sorted({p for t in reads for p in t})
        gpu = {p: statistics.median([t[p] for t in reads if p in t]) for p in passes}
        out[f'{layout}|{view}'] = {
            'layout': layout, 'view': view, 'size': f"{rs[0]['width']}x{rs[0]['height']}", 'rounds': len(rs),
            'frames': len(intervals), 'meanFps': 1000 * len(intervals) / sum(intervals),
            'p5Fps': 1000 / s[int(0.95 * len(s))], 'medianFps': 1000 / s[len(s) // 2],
            'roundMeans': per_round, 'gpu': gpu,
        }
    return out


main = summarise(load_runs('L?.r?.json'))
hi = summarise(load_runs('L?.hi.r?.json'))
json.dump({'720p': main, '1440p': hi}, open(f'{BASE}/fps-summary.json', 'w'), indent=1)


def noise(summary, view):
    # Run-to-run noise: the spread of one layout's round means, averaged over layouts (pooled standard deviation).
    devs = [statistics.stdev(v['roundMeans']) for v in summary.values() if v['view'] == view and len(v['roundMeans']) > 1]
    ranges = [max(v['roundMeans']) - min(v['roundMeans']) for v in summary.values() if v['view'] == view]
    return (statistics.mean(devs) if devs else 0, max(ranges) if ranges else 0)


def fps_table(summary, views):
    rows = []
    for view in views:
        sd, rng = noise(summary, view)
        for layout in LAYOUTS:
            v = summary.get(f'{layout}|{view}')
            if v is None:
                continue
            g = v['gpu']
            gpu = ', '.join(f'{p} {g[p]:.2f}' for p in ['ocean FFT', 'ocean surface', 'ocean foam', 'scene', 'tonemap'] if p in g)
            rows.append(f"<tr><td>{html.escape(view)}</td><td>{layout}</td><td>{v['size']}</td><td>{v['meanFps']:.1f}</td>"
                        f"<td>{v['p5Fps']:.1f}</td><td>{' / '.join(f'{x:.1f}' for x in v['roundMeans'])}</td><td>{gpu}</td></tr>")
        rows.append(f'<tr class="noise"><td colspan="7">{html.escape(view)}: run-to-run noise, the standard deviation of one layout\'s round means, '
                    f'{sd:.1f} fps on average; the widest spread of any layout\'s rounds {rng:.1f} fps.</td></tr>')
    return ('<table><thead><tr><th>View</th><th>Layout</th><th>Canvas</th><th>Mean fps</th><th>5th percentile fps</th>'
            '<th>Mean fps per round</th><th>GPU ms per pass (median of reads every 200 ms)</th></tr></thead><tbody>'
            + ''.join(rows) + '</tbody></table>')


def polar(path):
    rows = {}
    for line in open(path):
        m = re.match(r'(\S+) (\S+) (L\d) (.*)', line.strip())
        if not m:
            continue
        rings = re.findall(r'ring (\d+) px: (-?[\d.]+) at (\d+) deg (\d+) px', m.group(4))
        rows[(m.group(2), m.group(3))] = rings
    return rows


wide = polar(f'{BASE}/polar-topwide.txt')
top = polar(f'{BASE}/polar-top.txt')


def corr_table(data, seas, ring_names):
    head = ''.join(f'<th>{html.escape(n)}</th>' for n in ring_names)
    body = []
    for sea in seas:
        for layout in LAYOUTS:
            rings = data.get((sea, layout), [])
            cells = ''.join(f'<td>{float(v):.2f}</td>' for (_, v, _, _) in rings)
            body.append(f'<tr><td>{sea}</td><td>{layout}</td>{cells}</tr>')
    return f'<table><thead><tr><th>Sea</th><th>Layout</th>{head}</tr></thead><tbody>{"".join(body)}</tbody></table>'


css = '''
:root { --bg: #ffffff; --fg: #1d232b; --muted: #5b6573; --line: #d9dee5; --head: #f2f4f7; }
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { --bg: #0f1318; --fg: #e6e9ee; --muted: #9aa4b2; --line: #2a313b; --head: #171c23; } }
:root[data-theme="dark"] { --bg: #0f1318; --fg: #e6e9ee; --muted: #9aa4b2; --line: #2a313b; --head: #171c23; }
body { margin: 0; background: var(--bg); color: var(--fg); font: 15px/1.5 system-ui, sans-serif; }
main { max-width: 1400px; margin: 0 auto; padding: 16px; }
h1 { font-size: 24px; } h2 { margin-top: 40px; font-size: 20px; } h3 { font-size: 16px; margin: 24px 0 8px; }
p, li { max-width: 80ch; } .muted { color: var(--muted); }
table { border-collapse: collapse; margin: 8px 0 16px; font-size: 13px; display: block; overflow-x: auto; }
th, td { border: 1px solid var(--line); padding: 4px 8px; text-align: left; vertical-align: top; }
th { background: var(--head); } tr.noise td { color: var(--muted); font-style: italic; }
img { width: 100%; height: auto; display: block; border: 1px solid var(--line); }
a { color: inherit; }
'''

parts = [f'<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">'
         f'<title>Tail Layout Comparison</title><style>{css}</style></head><body><main>',
         '<h1>Tail repetition (#44): five cascade layouts side by side</h1>',
         '<p class="muted">Prototype in a throwaway worktree on top of prototype/band-size (128-component band with bound waves, the decided band). '
         'Every picture is the same seed, tick 600 (10 s into the run, paused), the same eye and Sun; only the cascade layout changes. '
         'Machine: Apple M1 Pro (14-core GPU, Metal 4), Chrome 154.0.8037.58, WebGPU on the hardware adapter.</p>',
         '<h2>Layouts</h2><table><thead><tr><th>Layout</th><th>Bothnian Sea storm tiles, m</th><th>Helsinki archipelago tiles, m</th><th>Old moderate sea tiles, m</th></tr></thead><tbody>']
for layout in LAYOUTS:
    parts.append(f'<tr><td>{html.escape(LABEL[layout])}</td>' + ''.join(f'<td>{html.escape(TILES[s][layout])}</td>' for s in ['bothnian', 'helsinki', 'moderate']) + '</tr>')
parts.append('</tbody></table>')
parts.append('<p>Every layout keeps the same annuli on these seas (L3 halves dk but cascade c still owns the same wavelengths), so the spectrum drawn is the same and only the lattice it is sampled on changes. The golden-angle turn is c × 137.508°, so cascade 0 is never turned; L2 and L4 change cascades 1 and 2 only. L1 changes the tiles of cascades 1 and 2 only.</p>')

parts.append(open(f'{BASE}/hex.html').read())
parts.append('<h3>L0, L2, L5 and L6 side by side</h3><p class="muted">Four 1280 by 720 captures per image at full resolution, two to a row: L0 and L2 above, L5 and L6 below.</p>')
for sea in ['bothnian', 'helsinki']:
    for view, title in [('top-wide', 'straight down, about three tiles up'), ('top', '80 m eye, 80° down'), ('oblique', '40 m eye, 20° below the horizon'), ('deck', '2.5 m eye'), ('oblique-foam', '40 m eye with foam on')]:
        parts.append(f'<h3>{html.escape(SEA_NAME[sea])}: {html.escape(title)}</h3><a href="compare-hex/{sea}.{view}.png"><img loading="lazy" src="compare-hex/{sea}.{view}.png" alt="{sea} {view}, layouts L0, L2, L5, L6"></a>')

parts.append('<h2>Frame rate of L0 to L4 (headed Chrome, measured before the no-window rule)</h2>')
parts.append('<p class="muted">These runs opened a visible Chrome window and were stopped when the owner ruled windows out; they are reported as measured and were not repeated. L5 and L6 have only the headless timing estimate above. Method, as the band-size session measured: the scenario tool in headed Chrome (headless Chrome paces frames differently), vsync and the frame-rate limit off, background throttling off, '
             'the page 1280 by 720 at device scale 1 (forced with --force-device-scale-factor, since headed Chrome on the Retina screen otherwise draws at 2x), the simulation running. '
             'Each layout on its own fresh page; per view 3 s warm-up then 12 s recorded; three rounds, the middle one in reverse layout order. Mean fps is frames over time pooled over the rounds; '
             'the 5th percentile is the rate of the slowest frame in twenty. GPU timings are WebGPU timestamp queries read every 200 ms during the recording.</p>')
parts.append(fps_table(main, ['bothnian.oblique-foam', 'helsinki.oblique-foam', 'bothnian.oblique']))
if hi:
    parts.append('<h3>Cross-check at 2560 by 1440 (device scale 2), two rounds</h3>')
    parts.append(fps_table(hi, ['bothnian.oblique-foam']))

parts.append('<h2>How much the picture repeats</h2>')
parts.append('<p>Measured on the screenshots themselves: the self-correlation of the high-passed luminance (minus a 41 px box mean, which removes the glitter gradient) at a shift of the given length, '
             'the best over every direction 0 to 180° and lengths within 8 px of it, so a turned lattice is found whatever its axes. 1 is an exact repeat; the control ring at a length no tile has shows the background.</p>')
parts.append('<h3>Straight-down wide view: one and two baseline cascade 0 tiles</h3>')
parts.append(corr_table(wide, ['bothnian', 'helsinki', 'moderate'], ['one cascade 0 tile (about 240 px)', 'control, 170 px', 'two tiles, or one L3 tile (about 480 px)']))
parts.append('<h3>80 m view: cascade 1 tiles (storm and moderate) and cascade 0 tiles (Helsinki)</h3>')
parts.append('<p class="muted">Bothnian rings: 349 px = 34.7 m (cascade 1 of L0 and L2), 363 px = 36.1 m (cascade 1 of L1 and L4), 250 px control. Moderate rings: 170 px = 16.9 m, 176 px = 17.6 m, 339 px = 33.8 m (cascade 1 of L3), 250 px control (which, for a turned cascade 1, also lands on the lattice diagonal of 23.9 m). Helsinki rings: 282 px = 28.05 m, 564 px = 56.1 m, 200 px control.</p>')
for sea, names in [('bothnian', ['349 px', '363 px', '250 px']), ('moderate', ['170 px', '176 px', '339 px', '250 px']), ('helsinki', ['282 px', '564 px', '200 px'])]:
    parts.append(corr_table(top, [sea], names))

OBS = open(f'{BASE}/observations.html').read() if os.path.exists(f'{BASE}/observations.html') else ''
parts.append('<h2>What the pictures show</h2>' + OBS)

parts.append('<h2>Pictures</h2><p class="muted">Each image is five 1280 by 720 captures at full resolution, three to a row. Open one in its own tab to see it at 1:1.</p>')
for sea in ['bothnian', 'helsinki', 'moderate']:
    parts.append(f'<h2>{html.escape(SEA_NAME[sea])}</h2>')
    for view, title in VIEWS:
        parts.append(f'<h3>{html.escape(title)}</h3><a href="compare/{sea}.{view}.png"><img loading="lazy" src="compare/{sea}.{view}.png" alt="{sea} {view}, layouts L0 to L4"></a>')
parts.append('</main></body></html>')
open(f'{BASE}/index.html', 'w').write('\n'.join(parts))
print(f'{BASE}/index.html')
for k, v in {**main}.items():
    print('720p', k, f"mean {v['meanFps']:.1f} p5 {v['p5Fps']:.1f} rounds {[round(x, 1) for x in v['roundMeans']]} gpu {({p: round(x, 2) for p, x in v['gpu'].items()})}")
for k, v in hi.items():
    print('1440p', k, f"mean {v['meanFps']:.1f} p5 {v['p5Fps']:.1f} rounds {[round(x, 1) for x in v['roundMeans']]} gpu {({p: round(x, 2) for p, x in v['gpu'].items()})}")
