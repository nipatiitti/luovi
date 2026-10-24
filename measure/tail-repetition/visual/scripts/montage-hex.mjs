// Composes, per sea and view, one side-by-side image of the five layouts at full capture resolution (three panels to a
// row, 1280 by 720 each), each panel labelled, through headless Chrome.
import { readFileSync, mkdirSync } from 'node:fs'
const base = '/private/tmp/claude-502/-Users-niilojaakkola-projects-luovi/13e248e8-19fc-4c78-8792-faa277084d9d/scratchpad/visual'
const { chromium } = await import('/Users/niilojaakkola/projects/luovi/.claude/worktrees/agent-a2339e346504c5316/packages/tool-scenario/node_modules/playwright/index.mjs')
const ALL = {
  L0: 'L0 baseline: ratio 10, 6 periods per tile',
  L1: 'L1 ratio 8 + φ (9.618), 6 periods per tile',
  L2: 'L2 ratio 10, cascades turned by c × 137.5°',
  L3: 'L3 ratio 10, 12 periods per tile',
  L4: 'L4 ratio 9.618 and the golden-angle turn',
  L5: 'L5 baseline with cascade 0 hex-tiled (hex cell one tile across)',
  L6: 'L6 cascade 0 hex-tiled and the golden-angle turn',
}
const SEAS = ['bothnian', 'helsinki']
const LAYOUTS = Object.fromEntries(['L0', 'L2', 'L5', 'L6'].map((k) => [k, ALL[k]]))
const VIEWS = ['top-wide', 'top', 'oblique', 'deck', 'oblique-foam']
const out = `${base}/compare-hex`
mkdirSync(out, { recursive: true })
const browser = await chromium.launch({ channel: 'chrome' })
const page = await browser.newPage({ viewport: { width: 2560, height: 1000 } })
for (const sea of SEAS) {
  for (const view of VIEWS) {
    const label = JSON.parse(readFileSync(`${base}/shots/L0/timings.json`, 'utf8')).views[`${sea}.${view}`].label
    const panels = Object.entries(LAYOUTS)
      .map(([key, text]) => {
        const png = readFileSync(`${base}/shots/${key}/${sea}.${view}.png`).toString('base64')
        return `<figure><figcaption>${text}</figcaption><img src="data:image/png;base64,${png}"></figure>`
      })
      .join('')
    await page.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>
body { margin: 0; background: #0b0e12; color: #e6e9ee; font: 28px/1.3 system-ui, sans-serif; }
h1 { font-size: 30px; margin: 0; padding: 12px 16px; font-weight: 600; }
main { display: grid; grid-template-columns: repeat(2, 1280px); width: 2560px; }
figure { margin: 0; }
figcaption { padding: 8px 16px; background: #1b2028; }
img { display: block; width: 1280px; height: 720px; }
</style></head><body><h1>${label}, tick 600</h1><main>${panels}</main></body></html>`)
    await page.screenshot({ path: `${out}/${sea}.${view}.png`, fullPage: true })
    console.log(`${out}/${sea}.${view}.png`)
  }
}
await browser.close()
