// Counts the pixels two PNGs differ in and the largest channel difference. node pixdiff.mjs <a.png> <b.png>
import { readFileSync } from 'node:fs'
const { chromium } = await import('/Users/niilojaakkola/projects/luovi/.claude/worktrees/agent-a2339e346504c5316/packages/tool-scenario/node_modules/playwright/index.mjs')
const [a, b] = process.argv.slice(2).map((p) => readFileSync(p).toString('base64'))
const browser = await chromium.launch({ headless: true, channel: 'chrome' })
const page = await browser.newPage()
console.log(await page.evaluate(async ([a, b]) => {
  const load = async (d) => {
    const img = new Image()
    img.src = `data:image/png;base64,${d}`
    await img.decode()
    const g = new OffscreenCanvas(img.width, img.height).getContext('2d')
    g.drawImage(img, 0, 0)
    return g.getImageData(0, 0, img.width, img.height).data
  }
  const p = await load(a), q = await load(b)
  let n = 0, max = 0
  for (let i = 0; i < p.length; i += 4) {
    const d = Math.max(Math.abs(p[i] - q[i]), Math.abs(p[i + 1] - q[i + 1]), Math.abs(p[i + 2] - q[i + 2]))
    if (d > 0) n++
    if (d > max) max = d
  }
  return `${n} of ${p.length / 4} pixels differ, largest channel difference ${max}`
}, [a, b]))
await browser.close()
