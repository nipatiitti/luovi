// The picture's repetition in any direction: the high-passed luminance self-correlation of a straight-down screenshot
// at every shift of a given length, 0 to 180 degrees in 1 degree steps, the length swept over a ring of +-8 px. The
// best value on the ring is the repetition a lattice of that period shows in whatever direction its axes lie, which an
// axis-aligned scan misses once a cascade is turned. Each ring is compared with control rings at lengths no tile has.
// node polarcorr.mjs <view> <sea>:<px>,<px>... ; prints, per layout, the best correlation on each ring.
import { readFileSync } from 'node:fs'
const base = '/private/tmp/claude-502/-Users-niilojaakkola-projects-luovi/13e248e8-19fc-4c78-8792-faa277084d9d/scratchpad/visual'
const { chromium } = await import('/Users/niilojaakkola/projects/luovi/.claude/worktrees/agent-a2339e346504c5316/packages/tool-scenario/node_modules/playwright/index.mjs')
const [view, ...specs] = process.argv.slice(2)
const browser = await chromium.launch({ channel: 'chrome' })
const page = await browser.newPage()
for (const spec of specs) {
  const [sea, list] = spec.split(':')
  const radii = list.split(',').map(Number)
  for (const layout of ['L0', 'L1', 'L2', 'L3', 'L4']) {
    const png = readFileSync(`${base}/shots/${layout}/${sea}.${view}.png`).toString('base64')
    const best = await page.evaluate(async ([data, radii]) => {
      const img = new Image()
      img.src = `data:image/png;base64,${data}`
      await img.decode()
      const w = img.width, hh = img.height
      const g = new OffscreenCanvas(w, hh).getContext('2d')
      g.drawImage(img, 0, 0)
      const px = g.getImageData(0, 0, w, hh).data
      const lum = new Float64Array(w * hh)
      for (let i = 0; i < w * hh; i++) lum[i] = 0.2126 * px[4 * i] + 0.7152 * px[4 * i + 1] + 0.0722 * px[4 * i + 2]
      const r = 20
      const sat = new Float64Array((w + 1) * (hh + 1))
      for (let y = 0; y < hh; y++) for (let x = 0; x < w; x++) sat[(y + 1) * (w + 1) + x + 1] = lum[y * w + x] + sat[y * (w + 1) + x + 1] + sat[(y + 1) * (w + 1) + x] - sat[y * (w + 1) + x]
      const a = new Float64Array(w * hh)
      for (let y = 0; y < hh; y++) for (let x = 0; x < w; x++) {
        const x0 = Math.max(0, x - r), x1 = Math.min(w, x + r + 1), y0 = Math.max(0, y - r), y1 = Math.min(hh, y + r + 1)
        a[y * w + x] = lum[y * w + x] - (sat[y1 * (w + 1) + x1] - sat[y0 * (w + 1) + x1] - sat[y1 * (w + 1) + x0] + sat[y0 * (w + 1) + x0]) / ((x1 - x0) * (y1 - y0))
      }
      // Every other pixel in each direction, which keeps a full ring sweep to seconds and is plenty for a correlation.
      const corr = (dx, dy) => {
        let sab = 0, saa = 0, sbb = 0
        const ys = Math.max(0, -dy), ye = Math.min(hh, hh - dy), xs = Math.max(0, -dx), xe = Math.min(w, w - dx)
        for (let y = ys; y < ye; y += 2) for (let x = xs; x < xe; x += 2) {
          const p = a[y * w + x], q = a[(y + dy) * w + x + dx]
          sab += p * q; saa += p * p; sbb += q * q
        }
        return saa > 0 ? sab / Math.sqrt(saa * sbb) : 0
      }
      return radii.map((radius) => {
        let top = { v: -1, angle: 0, length: 0 }
        for (let length = radius - 8; length <= radius + 8; length += 2) {
          for (let deg = 0; deg < 180; deg += 1) {
            const t = (deg * Math.PI) / 180
            const dx = Math.round(length * Math.cos(t)), dy = Math.round(length * Math.sin(t))
            if (Math.abs(dy) >= hh - 60 || Math.abs(dx) >= w - 60) continue
            const v = corr(dx, dy)
            if (v > top.v) top = { v, angle: deg, length }
          }
        }
        return top
      })
    }, [png, radii])
    console.log(`${view} ${sea} ${layout} ` + best.map((b, i) => `ring ${radii[i]} px: ${b.v.toFixed(3)} at ${b.angle} deg ${b.length} px`).join('; '))
  }
}
await browser.close()
