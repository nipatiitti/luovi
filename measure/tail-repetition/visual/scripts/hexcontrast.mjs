// Does the hex blend leave a contrast pattern? In the straight-down wide view each 16 px block's local contrast (the
// standard deviation of the high-passed luminance), divided by the contrast smoothed over about 200 px so the glitter
// gradient drops out, is binned by where the block sits in the hex lattice: the normalised weights' sum, 1 at a lattice
// vertex (one tap) up to sqrt 3 at a triangle's centre (three equal taps). A blend that changed contrast would make the
// bins differ under L5; L0, which has no blend, is the control. The view looks straight down (pitch -89 degrees) with
// east up and south to the right, from h m over the world origin, at 2 h tan(25 deg) / 720 m per pixel.
// node hexcontrast.mjs <view> <sea> <h> <tile> <layout,...>
import { readFileSync } from 'node:fs'
const base = '/private/tmp/claude-502/-Users-niilojaakkola-projects-luovi/13e248e8-19fc-4c78-8792-faa277084d9d/scratchpad/visual'
const { chromium } = await import('/Users/niilojaakkola/projects/luovi/.claude/worktrees/agent-a2339e346504c5316/packages/tool-scenario/node_modules/playwright/index.mjs')
const [view, sea, h, tile, layouts] = process.argv.slice(2)
const browser = await chromium.launch({ headless: true, channel: 'chrome' })
const page = await browser.newPage()
for (const layout of layouts.split(',')) {
  const png = readFileSync(`${base}/shots/${layout}/${sea}.${view}.png`).toString('base64')
  const bins = await page.evaluate(async ([data, h, tile]) => {
    const img = new Image()
    img.src = `data:image/png;base64,${data}`
    await img.decode()
    const W = img.width, H = img.height
    const g = new OffscreenCanvas(W, H).getContext('2d')
    g.drawImage(img, 0, 0)
    const px = g.getImageData(0, 0, W, H).data
    const lum = new Float64Array(W * H)
    for (let i = 0; i < W * H; i++) lum[i] = 0.2126 * px[4 * i] + 0.7152 * px[4 * i + 1] + 0.0722 * px[4 * i + 2]
    const boxMean = (src, r) => {
      const sat = new Float64Array((W + 1) * (H + 1))
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) sat[(y + 1) * (W + 1) + x + 1] = src[y * W + x] + sat[y * (W + 1) + x + 1] + sat[(y + 1) * (W + 1) + x] - sat[y * (W + 1) + x]
      const out = new Float64Array(W * H)
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const x0 = Math.max(0, x - r), x1 = Math.min(W, x + r + 1), y0 = Math.max(0, y - r), y1 = Math.min(H, y + r + 1)
        out[y * W + x] = (sat[y1 * (W + 1) + x1] - sat[y0 * (W + 1) + x1] - sat[y1 * (W + 1) + x0] + sat[y0 * (W + 1) + x0]) / ((x1 - x0) * (y1 - y0))
      }
      return out
    }
    const low = boxMean(lum, 20)
    const sq = new Float64Array(W * H)
    for (let i = 0; i < W * H; i++) sq[i] = (lum[i] - low[i]) ** 2
    const local = boxMean(sq, 8)
    const broad = boxMean(sq, 100)
    const m = (2 * h * Math.tan((25 * Math.PI) / 180)) / 720
    const centre = [h * Math.tan(Math.PI / 180), 0]
    const sums = new Float64Array(5), counts = new Float64Array(5)
    for (let y = 8; y < H - 8; y += 16) for (let x = 8; x < W - 8; x += 16) {
      // Image up is east (+x), image right is south (-y).
      const wx = centre[0] + (H / 2 - y) * m, wy = centre[1] - (x - W / 2) * m
      const p = [wx / tile, wy / tile]
      const q = [p[0] - p[1] / Math.sqrt(3), (2 * p[1]) / Math.sqrt(3)]
      const f = [q[0] - Math.floor(q[0]), q[1] - Math.floor(q[1])]
      const z = 1 - f[0] - f[1]
      const w = z > 0 ? [z, f[1], f[0]] : [-z, 1 - f[1], 1 - f[0]]
      const u = (w[0] + w[1] + w[2]) / Math.hypot(...w)
      const bin = Math.min(4, Math.floor(((u - 1) / (Math.sqrt(3) - 1)) * 5))
      sums[bin] += Math.sqrt(local[y * W + x] / broad[y * W + x])
      counts[bin] += 1
    }
    // Seams: per pixel, the high-passed luminance's square binned by the smallest barycentric weight, so a line along
    // the triangle edges (smallest weight near 0) would raise the first bins.
    const edges = [0.01, 0.03, 0.1, 0.2, 1]
    const es = new Float64Array(edges.length), en = new Float64Array(edges.length)
    for (let y = 30; y < H - 30; y++) for (let x = 30; x < W - 30; x++) {
      const wx = centre[0] + (H / 2 - y) * m, wy = centre[1] - (x - W / 2) * m
      const p = [wx / tile, wy / tile]
      const q = [p[0] - p[1] / Math.sqrt(3), (2 * p[1]) / Math.sqrt(3)]
      const f = [q[0] - Math.floor(q[0]), q[1] - Math.floor(q[1])]
      const z = 1 - f[0] - f[1]
      const w = z > 0 ? [z, f[1], f[0]] : [-z, 1 - f[1], 1 - f[0]]
      const least = Math.min(...w)
      const bin = edges.findIndex((e) => least < e)
      es[bin] += sq[y * W + x] / broad[y * W + x]
      en[bin] += 1
    }
    globalThis.seams = Array.from(es, (s, i) => s / en[i])
    return [...Array.from(sums, (s, i) => [s / counts[i], counts[i]]), ['seams', Array.from(es, (s, i) => (s / en[i]).toFixed(3)).join(' / ')]]
  }, [png, Number(h), Number(tile)])
  console.log(`${view} ${sea} ${layout}: normalised contrast by blend bin (one tap -> three equal taps): ` + bins.map(([v, n]) => (v === "seams" ? `; edge energy by smallest weight <0.01, <0.03, <0.1, <0.2, rest: ${n}` : `${v.toFixed(3)} (${n})`)).join(', '))
}
await browser.close()
