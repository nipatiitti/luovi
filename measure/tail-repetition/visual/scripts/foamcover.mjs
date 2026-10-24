// A whitecap proxy per layout: the share of sea pixels (below the horizon row) that the foam-on picture brightens by
// more than 20 luminance levels over the same layout's foam-off picture, and the mean brightening. One frame, one seed.
// node foamcover.mjs <sea> <layout,...>
import { readFileSync } from 'node:fs'
const base = '/private/tmp/claude-502/-Users-niilojaakkola-projects-luovi/13e248e8-19fc-4c78-8792-faa277084d9d/scratchpad/visual'
const { chromium } = await import('/Users/niilojaakkola/projects/luovi/.claude/worktrees/agent-a2339e346504c5316/packages/tool-scenario/node_modules/playwright/index.mjs')
const [sea, layouts] = process.argv.slice(2)
const browser = await chromium.launch({ headless: true, channel: 'chrome' })
const page = await browser.newPage()
for (const layout of layouts.split(',')) {
  const a = readFileSync(`${base}/shots/${layout}/${sea}.oblique.png`).toString('base64')
  const b = readFileSync(`${base}/shots/${layout}/${sea}.oblique-foam.png`).toString('base64')
  const r = await page.evaluate(async ([a, b]) => {
    const load = async (d) => {
      const img = new Image()
      img.src = `data:image/png;base64,${d}`
      await img.decode()
      const g = new OffscreenCanvas(img.width, img.height).getContext('2d')
      g.drawImage(img, 0, 0)
      return g.getImageData(0, 0, img.width, img.height)
    }
    const p = await load(a), q = await load(b)
    const L = (d, i) => 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]
    let n = 0, white = 0, sum = 0
    for (let y = 100; y < p.height; y++) for (let x = 0; x < p.width; x++) {
      const i = 4 * (y * p.width + x)
      const d = L(q.data, i) - L(p.data, i)
      n++; sum += d
      if (d > 20) white++
    }
    return { share: white / n, mean: sum / n }
  }, [a, b])
  console.log(`${sea} ${layout}: brightened by foam ${(100 * r.share).toFixed(2)}% of sea pixels, mean +${r.mean.toFixed(2)} levels`)
}
await browser.close()
