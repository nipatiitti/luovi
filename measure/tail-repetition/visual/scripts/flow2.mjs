// Do crests travel or fade? Motion-compensated block matching between frames 0.1 s apart: for each 32 px block of the
// high-passed luminance, the best normalised correlation over shifts of up to 10 px. Travelling crests match well;
// crests that fade out while others fade in through a blend zone match worse. Reports, per layout, the mean best match
// and its spread over blocks, and writes a per-block map of the mean residual (1 - best match) of each layout and of
// L5 minus L0, so a hex-shaped pattern of worse matches would show. node flow.mjs <view> <layout,...>
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
const base = '/private/tmp/claude-502/-Users-niilojaakkola-projects-luovi/13e248e8-19fc-4c78-8792-faa277084d9d/scratchpad/visual'
const { chromium } = await import('/Users/niilojaakkola/projects/luovi/.claude/worktrees/agent-a2339e346504c5316/packages/tool-scenario/node_modules/playwright/index.mjs')
const [view, layouts] = process.argv.slice(2)
const browser = await chromium.launch({ headless: true, channel: 'chrome' })
const page = await browser.newPage()
await page.route('http://frames.local/**', (route) => {
  const path = decodeURIComponent(new URL(route.request().url()).pathname)
  if (!path.endsWith('.png')) return route.fulfill({ body: '<!doctype html><body></body>', contentType: 'text/html' })
  return route.fulfill({ body: readFileSync(`${base}${path}`), contentType: 'image/png' })
})
await page.goto('http://frames.local/')
const maps = {}
for (const layout of layouts.split(',')) {
  const frames = readdirSync(`${base}/motion/${view}/${layout}`).filter((f) => f.endsWith('.png')).sort()
  const r = await page.evaluate(async ({ urls, STEP, SEARCH }) => {
    const W = 1280, H = 720, B = 32, S = SEARCH, TOP = 160
    const lumOf = async (u) => {
      const bmp = await createImageBitmap(await (await fetch(u)).blob())
      const g = new OffscreenCanvas(W, H).getContext('2d')
      g.drawImage(bmp, 0, 0)
      const px = g.getImageData(0, 0, W, H).data
      const lum = new Float32Array(W * H)
      for (let i = 0; i < W * H; i++) lum[i] = 0.2126 * px[4 * i] + 0.7152 * px[4 * i + 1] + 0.0722 * px[4 * i + 2]
      // High pass: minus a 17 px box mean.
      const r = 8, sat = new Float64Array((W + 1) * (H + 1))
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) sat[(y + 1) * (W + 1) + x + 1] = lum[y * W + x] + sat[y * (W + 1) + x + 1] + sat[(y + 1) * (W + 1) + x] - sat[y * (W + 1) + x]
      const a = new Float32Array(W * H)
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const x0 = Math.max(0, x - r), x1 = Math.min(W, x + r + 1), y0 = Math.max(0, y - r), y1 = Math.min(H, y + r + 1)
        a[y * W + x] = lum[y * W + x] - (sat[y1 * (W + 1) + x1] - sat[y0 * (W + 1) + x1] - sat[y1 * (W + 1) + x0] + sat[y0 * (W + 1) + x0]) / ((x1 - x0) * (y1 - y0))
      }
      return a
    }
    const bx = Math.floor((W - 2 * S) / B), by = Math.floor((H - TOP - S) / B)
    const sum = new Float64Array(bx * by)
    let pairs = 0
    let prev = await lumOf(urls[0])
    for (let f = STEP; f < urls.length; f += STEP) {
      const cur = await lumOf(urls[f])
      for (let j = 0; j < by; j++) for (let i = 0; i < bx; i++) {
        const ox = S + i * B, oy = TOP + j * B
        let best = -1
        for (let dy = -S; dy <= S; dy++) for (let dx = -S; dx <= S; dx++) {
          if (oy + dy + B > H || oy + dy < 0) continue
          let ab = 0, aa = 0, bb = 0
          for (let y = 0; y < B; y += 2) for (let x = 0; x < B; x += 2) {
            const p = prev[(oy + y) * W + ox + x], q = cur[(oy + y + dy) * W + ox + x + dx]
            ab += p * q; aa += p * p; bb += q * q
          }
          const v = aa > 0 && bb > 0 ? ab / Math.sqrt(aa * bb) : 0
          if (v > best) best = v
        }
        sum[j * bx + i] += best
      }
      pairs += 1
      prev = cur
    }
    const mean = Array.from(sum, (s) => s / pairs)
    const avg = mean.reduce((t, v) => t + v, 0) / mean.length
    const sd = Math.sqrt(mean.reduce((t, v) => t + (v - avg) ** 2, 0) / mean.length)
    const sorted = [...mean].sort((p, q) => p - q)
    return { bx, by, pairs, mean, avg, sd, p5: sorted[Math.floor(0.05 * sorted.length)] }
  }, { STEP: Number(process.env.STEP ?? 3), SEARCH: Number(process.env.SEARCH ?? 10), urls: frames.map((f) => `http://frames.local/motion/${view}/${layout}/${f}`) })
  maps[layout] = r
  console.log(`${view} ${layout}: ${r.pairs} pairs ${((process.env.STEP ?? 3) / 30).toFixed(1)} s apart, ${r.bx * r.by} blocks: best match mean ${r.avg.toFixed(3)}, block spread ${r.sd.toFixed(3)}, worst 5% of blocks ${r.p5.toFixed(3)}`)
}
writeFileSync(`${base}/motion/${view}.flow.${process.env.STEP ?? 3}.json`, JSON.stringify(maps))
await browser.close()
