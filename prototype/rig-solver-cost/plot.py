"""PROTOTYPE, THROWAWAY. Draws the rig prototype's dump.json as SVG figures (stdlib only)."""
import json, math, sys, os

d = json.load(open(sys.argv[1]))
OUT = os.path.dirname(os.path.abspath(sys.argv[1]))

FONT = "font-family='Helvetica, Arial, sans-serif'"
COL = ["#1f5fbf", "#d9480f", "#2b8a3e", "#862e9c", "#0b7285", "#e67700"]


class Svg:
    def __init__(self, w, h):
        self.w, self.h = w, h
        self.parts = [f"<svg xmlns='http://www.w3.org/2000/svg' width='{w}' height='{h}' viewBox='0 0 {w} {h}' {FONT}>",
                      f"<rect width='{w}' height='{h}' fill='white'/>"]

    def add(self, s): self.parts.append(s)

    def text(self, x, y, s, size=13, anchor="start", color="#222", weight="normal", rotate=None):
        tr = f" transform='rotate({rotate} {x} {y})'" if rotate is not None else ""
        self.add(f"<text x='{x:.1f}' y='{y:.1f}' font-size='{size}' text-anchor='{anchor}' fill='{color}' font-weight='{weight}'{tr}>{s}</text>")

    def line(self, x1, y1, x2, y2, color="#333", width=1, dash=None, opacity=1):
        ds = f" stroke-dasharray='{dash}'" if dash else ""
        self.add(f"<line x1='{x1:.1f}' y1='{y1:.1f}' x2='{x2:.1f}' y2='{y2:.1f}' stroke='{color}' stroke-width='{width}'{ds} opacity='{opacity}'/>")

    def poly(self, pts, color="#333", width=1, fill="none", opacity=1, dash=None):
        ds = f" stroke-dasharray='{dash}'" if dash else ""
        p = " ".join(f"{x:.1f},{y:.1f}" for x, y in pts)
        self.add(f"<polyline points='{p}' fill='{fill}' stroke='{color}' stroke-width='{width}' opacity='{opacity}'{ds} stroke-linejoin='round'/>")

    def polygon(self, pts, fill, stroke="none", opacity=1):
        p = " ".join(f"{x:.1f},{y:.1f}" for x, y in pts)
        self.add(f"<polygon points='{p}' fill='{fill}' stroke='{stroke}' opacity='{opacity}'/>")

    def circle(self, x, y, r, fill):
        self.add(f"<circle cx='{x:.1f}' cy='{y:.1f}' r='{r}' fill='{fill}'/>")

    def rect(self, x, y, w, h, fill, opacity=1, stroke="none"):
        self.add(f"<rect x='{x:.1f}' y='{y:.1f}' width='{w:.1f}' height='{h:.1f}' fill='{fill}' opacity='{opacity}' stroke='{stroke}'/>")

    def save(self, name):
        self.add("</svg>")
        open(os.path.join(OUT, name), "w").write("\n".join(self.parts))
        print("wrote", name)


class Axes:
    """Linear or log axes mapping data to a pixel box."""
    def __init__(self, svg, x0, y0, w, h, xr, yr, xlog=False, ylog=False, title="", xl="", yl=""):
        self.s, self.x0, self.y0, self.w, self.h = svg, x0, y0, w, h
        self.xr, self.yr, self.xlog, self.ylog = xr, yr, xlog, ylog
        svg.rect(x0, y0, w, h, "#fafafa", stroke="#999")
        if title: svg.text(x0 + w / 2, y0 - 10, title, 15, "middle", weight="bold")
        if xl: svg.text(x0 + w / 2, y0 + h + 38, xl, 13, "middle")
        if yl: svg.text(x0 - 48, y0 + h / 2, yl, 13, "middle", rotate=-90)

    def X(self, x):
        a, b = self.xr
        t = (math.log(x) - math.log(a)) / (math.log(b) - math.log(a)) if self.xlog else (x - a) / (b - a)
        return self.x0 + t * self.w

    def Y(self, y):
        a, b = self.yr
        t = (math.log(y) - math.log(a)) / (math.log(b) - math.log(a)) if self.ylog else (y - a) / (b - a)
        return self.y0 + self.h - t * self.h

    def xticks(self, vals, fmt=lambda v: f"{v:g}"):
        for v in vals:
            x = self.X(v)
            self.s.line(x, self.y0, x, self.y0 + self.h, "#ddd")
            self.s.text(x, self.y0 + self.h + 16, fmt(v), 12, "middle")

    def yticks(self, vals, fmt=lambda v: f"{v:g}"):
        for v in vals:
            y = self.Y(v)
            self.s.line(self.x0, y, self.x0 + self.w, y, "#ddd")
            self.s.text(self.x0 - 6, y + 4, fmt(v), 12, "end")

    def plot(self, xs, ys, color, width=2, dash=None, marker=True):
        pts = [(self.X(x), self.Y(y)) for x, y in zip(xs, ys)]
        self.s.poly(pts, color, width, dash=dash)
        if marker:
            for x, y in pts: self.s.circle(x, y, 3.5, color)

    def hline(self, y, color, dash="6,4", label=None, width=1.5):
        self.s.line(self.x0, self.Y(y), self.x0 + self.w, self.Y(y), color, width, dash)
        if label: self.s.text(self.x0 + self.w - 6, self.Y(y) - 5, label, 12, "end", color)

    def band(self, y1, y2, color, opacity=0.15):
        self.s.rect(self.x0, self.Y(y2), self.w, self.Y(y1) - self.Y(y2), color, opacity)

    def legend(self, items, x=None, y=None):
        x = self.x0 + 12 if x is None else x
        y = self.y0 + 18 if y is None else y
        for i, (label, color) in enumerate(items):
            self.s.line(x, y + i * 18, x + 24, y + i * 18, color, 3)
            self.s.text(x + 30, y + i * 18 + 4, label, 12)


# ---------------------------------------------------------------- rig layouts

def draw_rig(svg, g, box, proj, title, show_t0=True):
    x0, y0, w, h = box
    pos = g["settled"]; t0 = g["t0"]
    P = lambda s, i: proj(s["x"][i], s["y"][i], s["z"][i])
    xs = [P(pos, i)[0] for i in range(len(pos["x"]))] + [P(t0, i)[0] for i in range(len(pos["x"]))]
    ys = [P(pos, i)[1] for i in range(len(pos["x"]))] + [P(t0, i)[1] for i in range(len(pos["x"]))]
    mnx, mxx, mny, mxy = min(xs), max(xs), min(ys), max(ys)
    sc = min(w / (mxx - mnx + 1e-9), h / (mxy - mny + 1e-9)) * 0.92
    cx, cy = (mnx + mxx) / 2, (mny + mxy) / 2
    M = lambda p: (x0 + w / 2 + (p[0] - cx) * sc, y0 + h / 2 - (p[1] - cy) * sc)
    svg.text(x0 + w / 2, y0 - 8, title, 15, "middle", weight="bold")
    svg.line(x0, y0 + h / 2 - (0 - cy) * sc, x0 + w, y0 + h / 2 - (0 - cy) * sc, "#bbb", 1, "4,4")
    if show_t0:
        for a, b, c in g["tris"]:
            svg.polygon([M(P(t0, a)), M(P(t0, b)), M(P(t0, c))], "none", "#bbb", 0.5)
    for a, b, c in g["tris"]:
        svg.polygon([M(P(pos, a)), M(P(pos, b)), M(P(pos, c))], "#cfe3ff", "#6b9bd8", 0.9)
    for a, b, kind in g["edges"]:
        if kind == "cloth": continue
        col, wd = {"spar": ("#333", 3), "attach": ("#6b9bd8", 0.8)}.get(kind, ("#999", 1))
        svg.line(*M(P(pos, a)), *M(P(pos, b)), col, wd)
    for a, b in g["cosserat"]:
        svg.line(*M(P(pos, a)), *M(P(pos, b)), "#222", 4)
    for nodes in g["ropes"]:
        pts = [M(P(pos, i)) for i in nodes]
        if len(nodes) == 2: svg.poly(pts, "#888", 1.2, dash="3,3")
        else: svg.poly(pts, "#d9480f", 1.4)
    for i, pinned in enumerate(g["pinned"]):
        if pinned:
            x, y = M(P(pos, i)); svg.rect(x - 2, y - 2, 4, 4, "#222")
    # scale bar 5 m
    sx, sy = x0 + 10, y0 + h - 12
    svg.line(sx, sy, sx + 5 * sc, sy, "#222", 2); svg.text(sx + 5 * sc / 2, sy - 5, "5 m", 11, "middle")


def fig_rigs():
    svg = Svg(1500, 1200)
    svg.text(20, 30, "Prototype rigs after 20 s in a 7.6 m/s beam wind (16 substeps). Grey outline: initial shape.", 16, weight="bold")
    svg.text(20, 52, "Blue: coarse cloth triangles. Black: Cosserat spars and rigid spar links. Orange: running lines (one constraint through their blocks). Dashed grey: standing rigging. Squares: hull pins.", 13, color="#444")
    hb = d["geometry"]["hboat"]; jo = d["geometry"]["joutsen"]
    draw_rig(svg, hb, (40, 100, 420, 480), lambda x, y, z: (x, z), "H-boat 6x6, side view (x east, z up)")
    draw_rig(svg, hb, (500, 100, 300, 480), lambda x, y, z: (y, z), "H-boat 6x6, from astern (y port, z up)")
    draw_rig(svg, hb, (840, 100, 620, 480), lambda x, y, z: (x, y), "H-boat 6x6, plan view (x east, y port), wind from -y side", show_t0=False)
    draw_rig(svg, jo, (40, 660, 1420, 500), lambda x, y, z: (x, z), "Suomen Joutsen stand-in: 30 sails of 6x6, 192 Cosserat yard and topmast segments, 216 lines, side view")
    svg.save("fig-rigs.svg")


# ---------------------------------------------------------------- cloth statics

def fig_cloth():
    svg = Svg(1500, 620)
    svg.text(20, 30, "Cloth statics: can one Gauss-Seidel sweep per substep carry a static load across a stiff sheet?", 16, weight="bold")
    svg.text(20, 52, "Sheet 3 m wide by 8 m high hung from its top row, 1 kN on the bottom row. Stretch after 6 s settle, as a percentage of the converged XPBD answer (200 iterations per substep).", 13, color="#444")
    # left: sheet picture with displacement x40
    ax = (60, 110, 300, 440)
    x0, y0, w, h = ax
    svg.text(x0 + w / 2, y0 - 10, "6x6 Dacron at 8 substeps, stretch x40", 14, "middle", weight="bold")
    shape = [c for c in d["cloth"] if c["shape"]][0]["shape"]
    grid = shape["grid"]; rows, cols = len(grid), len(grid[0])
    sc = h / 8.8 / 1.4
    def M(x, z, amp=40):
        # undeformed z is -r*1.6; amplify the deviation
        return (x0 + 40 + x * sc, y0 + 20 - z * sc)
    for r in range(rows):
        for c in range(cols):
            i = grid[r][c]
            zu = -r * (8 / (rows - 1)); xu = c * (3 / (cols - 1))
            za = zu + (shape["z"][i] - zu) * 40; xa = xu + (shape["x"][i] - xu) * 40
            zr = zu + (shape["ref"]["z"][i] - zu) * 40; xr = xu + (shape["ref"]["x"][i] - xu) * 40
            if c + 1 < cols:
                j = grid[r][c + 1]
                zu2 = zu; xu2 = (c + 1) * (3 / (cols - 1))
                svg.line(*M(xu, zu), *M(xu2, zu2), "#ccc", 1)
                svg.line(*M(xa, za), *M(xu2 + (shape["x"][j] - xu2) * 40, zu2 + (shape["z"][j] - zu2) * 40), COL[1], 1.5)
                svg.line(*M(xr, zr), *M(xu2 + (shape["ref"]["x"][j] - xu2) * 40, zu2 + (shape["ref"]["z"][j] - zu2) * 40), COL[0], 1.5)
            if r + 1 < rows:
                j = grid[r + 1][c]
                zu2 = -(r + 1) * (8 / (rows - 1)); xu2 = xu
                svg.line(*M(xu, zu), *M(xu2, zu2), "#ccc", 1)
                svg.line(*M(xa, za), *M(xu2 + (shape["x"][j] - xu2) * 40, zu2 + (shape["z"][j] - zu2) * 40), COL[1], 1.5)
                svg.line(*M(xr, zr), *M(xu2 + (shape["ref"]["x"][j] - xu2) * 40, zu2 + (shape["ref"]["z"][j] - zu2) * 40), COL[0], 1.5)
    svg.line(x0 + 10, y0 + h + 10, x0 + 34, y0 + h + 10, "#ccc", 2); svg.text(x0 + 40, y0 + h + 14, "unloaded", 12)
    svg.line(x0 + 110, y0 + h + 10, x0 + 134, y0 + h + 10, COL[0], 2); svg.text(x0 + 140, y0 + h + 14, "converged", 12)
    svg.line(x0 + 220, y0 + h + 10, x0 + 244, y0 + h + 10, COL[1], 2); svg.text(x0 + 250, y0 + h + 14, "8 substeps", 12)
    # right: convergence chart
    A = Axes(svg, 480, 110, 950, 420, (1, 64), (90, 10000), xlog=True, ylog=True,
             title="Stretch relative to converged, one sweep per substep", xl="substeps per 60 Hz tick (substep rate 60 to 3840 Hz)", yl="stretch, % of converged")
    A.xticks([1, 2, 4, 8, 16, 32, 64], lambda v: f"{v}")
    A.yticks([100, 200, 500, 1000, 2000, 5000], lambda v: f"{v}%")
    A.band(95, 105, COL[2], 0.25)
    A.hline(100, COL[2], label="converged (5% band shaded)")
    A.band(200, 10000, "#d9480f", 0.06)
    svg.text(A.X(1.05), A.Y(6000), "True Wind's report: 2 to 100 times too stretchy", 12, color="#d9480f")
    items = []
    for i, c in enumerate(d["cloth"]):
        xs = [p["nsub"] for p in c["series"]]; ys = [100 * p["mm"] / c["ref"] for p in c["series"]]
        A.plot(xs, ys, COL[i])
        items.append((f"{c['name']} (converged {c['ref']:.1f} mm)", COL[i]))
    A.legend(items, A.x0 + 420, A.y0 + 30)
    svg.save("fig-cloth.svg")


# ---------------------------------------------------------------- rope and mast

def fig_rope_mast():
    svg = Svg(1500, 560)
    svg.text(20, 30, "Rope and spar statics against analytic answers", 16, weight="bold")
    A = Axes(svg, 70, 90, 560, 380, (1, 64), (0, 140), xlog=True,
             title="Rope through two blocks, 100 kg hung on the end", xl="substeps per tick", yl="stretch, % of analytic F L / EA")
    A.xticks([1, 2, 4, 8, 16, 32, 64], lambda v: f"{v}"); A.yticks([0, 50, 100, 150])
    A.hline(100, COL[2], label="analytic")
    items = []
    for i, r in enumerate(d["rope"]):
        A.plot([p["nsub"] for p in r["series"]], [100 * p["mm"] / r["analytic"] for p in r["series"]], COL[i], dash="8,4" if i else None)
        items.append((f"{r['name']}: analytic {r['analytic']:.1f} mm", COL[i]))
    A.legend(items, A.x0 + 20, A.y0 + 300)
    svg.text(A.x0 + 10, A.y0 + 60, "A whole line is one constraint, and one constraint", 12, color="#444")
    svg.text(A.x0 + 10, A.y0 + 76, "solves exactly in a single XPBD step at any substep count.", 12, color="#444")
    B = Axes(svg, 760, 90, 660, 380, (1, 64), (0, 1.5), xlog=True,
             title="Cosserat mast, 11 m cantilever, 200 N tip load", xl="substeps per tick", yl="tip deflection, m")
    B.xticks([1, 2, 4, 8, 16, 32, 64], lambda v: f"{v}"); B.yticks([0, 0.25, 0.5, 0.75, 1.0, 1.25, 1.5])
    B.hline(d["mast"]["analytic"], COL[2], label=f"Euler-Bernoulli {d['mast']['analytic']:.3f} m")
    items = []
    for i, c in enumerate(d["mast"]["cases"]):
        B.plot([p["nsub"] for p in c["series"]], [min(p["m"], 1.5) for p in c["series"]], COL[i])
        B.hline(c["converged"], COL[i], dash="2,3", width=1)
        items.append((f"{c['segs']} segments, one sweep (dotted: converged {c['converged']:.3f} m)", COL[i]))
    B.legend(items, B.x0 + 230, B.y0 + 30)
    svg.text(B.x0 + 10, B.y0 + 330, "Dotted lines are the converged discrete answer; the gap to analytic is", 12, color="#444")
    svg.text(B.x0 + 10, B.y0 + 346, "discretisation (7 hinges at 8 segments). Finer rods need more substeps.", 12, color="#444")
    svg.save("fig-rope-mast.svg")


# ---------------------------------------------------------------- cost

def fig_cost():
    svg = Svg(1500, 620)
    svg.text(20, 30, "Cost per 60 Hz tick in Node 26 on this machine, one sweep per substep, aero per substep, median of 300 ticks", 16, weight="bold")
    A = Axes(svg, 80, 90, 900, 440, (1, 64), (0.01, 30), xlog=True, ylog=True,
             title="milliseconds per tick against substeps", xl="substeps per tick (60 to 3840 Hz)", yl="ms per tick (log)")
    A.xticks([1, 2, 4, 8, 16, 32, 64], lambda v: f"{v}")
    A.yticks([0.01, 0.03, 0.1, 0.3, 1, 2, 3, 10, 30], lambda v: f"{v:g}")
    A.band(0.01, 1, COL[2], 0.08)
    A.hline(1, COL[2], label="hero boat 1 ms budget")
    A.hline(2, "#d9480f", label="full-rigged ship rig and sails 2 ms budget")
    items = []
    for i, c in enumerate(d["cost"]):
        xs = [p["nsub"] for p in c["series"]]
        A.plot(xs, [p["median"] for p in c["series"]], COL[i])
        A.plot(xs, [p["p95"] for p in c["series"]], COL[i], width=1, dash="3,3", marker=False)
        items.append((f"{c['name']}: {c['particles']} particles, {c['distance']} distance, {c['ropes']} lines, {c['cosserat']} Cosserat, {c['triangles']} triangles", COL[i]))
    A.legend(items, A.x0 + 16, A.y0 + 30)
    svg.text(A.x0 + 16, A.y0 + 110, "solid: median, dotted: p95", 12, color="#444")
    # table on the right
    tx, ty = 1010, 100
    svg.text(tx, ty, "median ms per tick", 14, weight="bold")
    svg.text(tx, ty + 22, "substeps", 12, weight="bold")
    for j, c in enumerate(d["cost"]):
        svg.text(tx + 90 + j * 95, ty + 22, c["name"], 12, "middle", weight="bold")
    for i, p in enumerate(d["cost"][0]["series"]):
        y = ty + 44 + i * 20
        svg.text(tx, y, f"{p['nsub']} ({p['nsub'] * 60} Hz)", 12)
        for j, c in enumerate(d["cost"]):
            v = c["series"][i]["median"]
            col = "#2b8a3e" if v < 1 else ("#e67700" if v < 2 else "#c92a2a")
            svg.text(tx + 90 + j * 95, y, f"{v:.2f}", 12, "middle", col)
    svg.save("fig-cost.svg")


# ---------------------------------------------------------------- billow

def fig_billow():
    svg = Svg(1500, 520)
    svg.text(20, 30, "H-boat 6x6 in a 7.6 m/s beam wind, then a 15 m/s gust at 20 s: windward cap shroud tension per tick", 16, weight="bold")
    svg.text(20, 52, "A settled rig should hold a steady tension; jitter between ticks would show as a thick band. Peak particle speed over the run is listed per substep count.", 13, color="#444")
    tmax = len(d["billow"][0]["forestay"]) / 60
    vmax = max(max(b["forestay"]) for b in d["billow"]) * 1.1
    A = Axes(svg, 80, 90, 1340, 360, (0, tmax), (0, vmax), title="", xl="time, s", yl="tension, N")
    A.xticks([0, 5, 10, 15, 20, 25]); A.yticks([0, 2000, 4000, 6000, 8000, 10000, 12000, 15000, 20000][: int(vmax // 2000) + 1] if vmax > 2000 else [0, 500, 1000])
    A.hline(0, "#999", dash=None)
    svg.line(A.X(20), A.y0, A.X(20), A.y0 + A.h, "#d9480f", 1, "6,4"); svg.text(A.X(20) + 4, A.y0 + 14, "gust", 12, color="#d9480f")
    items = []
    for i, b in enumerate(d["billow"]):
        ys = b["forestay"]; xs = [k / 60 for k in range(len(ys))]
        A.plot(xs, ys, COL[i], width=1.2, marker=False)
        items.append((f"{b['nsub']} substeps, peak particle speed {b['peak']:.1f} m/s", COL[i]))
    A.legend(items, A.x0 + 16, A.y0 + 30)
    svg.save("fig-billow.svg")


fig_rigs(); fig_cloth(); fig_rope_mast(); fig_cost(); fig_billow()
