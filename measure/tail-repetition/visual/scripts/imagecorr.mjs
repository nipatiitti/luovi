// The picture's own repetition: normalised self-correlation of the high-passed luminance of each straight-down
// screenshot, as a function of a shift along each image axis, and its value at the shift of one baseline cascade 0 tile.
// The straight-down view (pitch -89 degrees) images the plane at a nearly uniform scale of 2 h tan(25 deg) / 720 m per
// pixel, so a tile of L metres is L / scale pixels along either axis.
import { readFileSync, writeFileSync } from 'node:fs'
const base = '/private/tmp/claude-502/-Users-niilojaakkola-projects-luovi/13e248e8-19fc-4c78-8792-faa277084d9d/scratchpad/visual'
const { chromium } = await import('/Users/niilojaakkola/projects/luovi/.claude/worktrees/agent-a2339e346504c5316/packages/tool-scenario/node_modules/playwright/index.mjs')
const LAYOUTS = ['L0', 'L1', 'L2', 'L3', 'L4']
const SEAS = {
  bothnian: { h: 1120, tiles: { L0: 347.32, L1: 347.32, L2: 347.32, L3: 694.63, L4: 347.32 } },
  helsinki: { h: 90, tiles: { L0: 28.05, L1: 28.05, L2: 28.05, L3: 56.1, L4: 28.05 } },
  moderate: { h: 545, tiles: { L0: 168.87, L1: 168.87, L2: 168.87, L3: 337.73, L4: 168.87 } },
}
const scale = (h) => (2 * h * Math.tan((25 * Math.PI) / 180)) / 720
const browser = await chromium.launch({ channel: 'chrome' })
const page = await browser.newPage()
const results = {}
for (const [sea, { h, tiles }] of Object.entries(SEAS)) {
  for (const layout of LAYOUTS) {
    const png = readFileSync(`${base}/shots/${layout}/${sea}.top-wide.png`).toString('base64')
    const curves = await page.evaluate(async (data) => {
      const img = new Image()
      img.src = `data:image/png;base64,${data}`
      await img.decode()
      const w = img.width
      const hh = img.height
      const c = new OffscreenCanvas(w, hh)
      const g = c.getContext('2d')
      g.drawImage(img, 0, 0)
      const px = g.getImageData(0, 0, w, hh).data
      const lum = new Float64Array(w * hh)
      for (let i = 0; i < w * hh; i++) lum[i] = 0.2126 * px[4 * i] + 0.7152 * px[4 * i + 1] + 0.0722 * px[4 * i + 2]
      // High pass: minus a 41 px box mean, which takes out the Sun's glitter gradient and keeps the wave texture.
      const r = 20
      const sat = new Float64Array((w + 1) * (hh + 1))
      for (let y = 0; y < hh; y++) for (let x = 0; x < w; x++) sat[(y + 1) * (w + 1) + x + 1] = lum[y * w + x] + sat[y * (w + 1) + x + 1] + sat[(y + 1) * (w + 1) + x] - sat[y * (w + 1) + x]
      const a = new Float64Array(w * hh)
      for (let y = 0; y < hh; y++) for (let x = 0; x < w; x++) {
        const x0 = Math.max(0, x - r), x1 = Math.min(w, x + r + 1), y0 = Math.max(0, y - r), y1 = Math.min(hh, y + r + 1)
        const s = sat[y1 * (w + 1) + x1] - sat[y0 * (w + 1) + x1] - sat[y1 * (w + 1) + x0] + sat[y0 * (w + 1) + x0]
        a[y * w + x] = lum[y * w + x] - s / ((x1 - x0) * (y1 - y0))
      }
      const corr = (dx, dy) => {
        let sab = 0, saa = 0, sbb = 0
        for (let y = 0; y + dy < hh; y++) for (let x = 0; x + dx < w; x++) {
          const p = a[y * w + x], q = a[(y + dy) * w + x + dx]
          sab += p * q; saa += p * p; sbb += q * q
        }
        return sab / Math.sqrt(saa * sbb)
      }
      const along = (axis, max) => {
        const out = []
        for (let s = 4; s <= max; s += 2) out.push([s, axis === 'x' ? corr(s, 0) : corr(0, s)])
        return out
      }
      return { x: along('x', 900), y: along('y', 560), corr: null, w, hh }
    }, png)
    const m = scale(h)
    const t0 = tiles.L0 / m
    const at = (curve, s) => curve.reduce((best, p) => (Math.abs(p[0] - s) < Math.abs(best[0] - s) ? p : best))[1]
    // The background: the curve's spread away from the tile shifts, beyond 40 px.
    const away = [...curves.x, ...curves.y].filter(([s]) => s > 40 && Math.abs(s - t0) > 12 && Math.abs(s - 2 * t0) > 12 && Math.abs(s - 3 * t0) > 12)
    const rms = Math.sqrt(away.reduce((t, [, v]) => t + v * v, 0) / away.length)
    results[`${sea}.${layout}`] = {
      metresPerPixel: m,
      baselineTilePx: t0,
      atTile: { x: at(curves.x, t0), y: at(curves.y, t0), x2: at(curves.x, 2 * t0), y2: at(curves.y, 2 * t0) },
      ownTilePx: tiles[layout] / m,
      atOwnTile: { x: at(curves.x, tiles[layout] / m), y: tiles[layout] / m <= 560 ? at(curves.y, tiles[layout] / m) : null },
      backgroundRms: rms,
      maxBeyond40: Math.max(...away.map(([, v]) => v)),
      curves,
    }
    const R = results[`${sea}.${layout}`]
    console.log(sea, layout, `tile ${t0.toFixed(0)} px`, `r(tile) x ${R.atTile.x.toFixed(3)} y ${R.atTile.y.toFixed(3)}`, `r(2 tiles) x ${R.atTile.x2.toFixed(3)} y ${R.atTile.y2.toFixed(3)}`, `own tile ${R.ownTilePx.toFixed(0)} px x ${R.atOwnTile.x.toFixed(3)}`, `background rms ${rms.toFixed(3)} max ${R.maxBeyond40.toFixed(3)}`)
  }
}
writeFileSync(`${base}/imagecorr.json`, JSON.stringify(results))
await browser.close()
