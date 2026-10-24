// Approximate GPU cost per layout from WebGPU timestamp queries in headless Chrome (no window): per round and layout a
// fresh page, the view shown and paused at tick 600 (every pass still runs each frame), then 40 reads of the passes'
// GPU times 100 ms apart. Rounds alternate the layout order. node timing.mjs <view,...> <layout,...> <rounds>
import { writeFileSync } from 'node:fs'
const tool = '/Users/niilojaakkola/projects/luovi/.claude/worktrees/agent-a2339e346504c5316/packages/tool-scenario'
const base = '/private/tmp/claude-502/-Users-niilojaakkola-projects-luovi/13e248e8-19fc-4c78-8792-faa277084d9d/scratchpad/visual'
const { chromium } = await import(`${tool}/node_modules/playwright/index.mjs`)
const { createServer } = await import(`${tool}/node_modules/vite/dist/node/index.js`)
const [views, layouts, rounds] = process.argv.slice(2)
const server = await createServer({ root: tool, configFile: `${tool}/vite.config.js`, logLevel: 'warn', server: { host: '127.0.0.1', port: 0, strictPort: true, open: false } })
await server.listen()
const url = server.resolvedUrls.local[0]
const browser = await chromium.launch({ headless: true, channel: 'chrome', args: ['--enable-unsafe-webgpu', '--enable-features=Vulkan,WebGPU', '--ignore-gpu-blocklist', '--use-angle=metal'] })
const results = []
try {
  const adapter = await (async () => {
    const page = await browser.newPage()
    await page.goto(`${url}?shots`)
    const info = await page.evaluate(async () => {
      const a = await navigator.gpu.requestAdapter()
      return { vendor: a.info.vendor, architecture: a.info.architecture, description: a.info.description, fallback: a.info.isFallbackAdapter, timestamps: a.features.has('timestamp-query'), userAgent: navigator.userAgent }
    })
    await page.close()
    return info
  })()
  console.log(JSON.stringify(adapter))
  const list = layouts.split(',')
  for (let r = 0; r < Number(rounds); r++) {
    const order = r % 2 === 0 ? list : [...list].reverse()
    for (const layout of order) {
      const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
      page.on('pageerror', (e) => console.error(`page error: ${e.message}`))
      await page.goto(`${url}?shots&layout=${layout}`)
      await page.addStyleTag({ content: 'aside, .prototype-bar { display: none !important; }' })
      await page.waitForFunction(() => globalThis.luoviShots?.read().tick !== undefined, null, { timeout: 60000 })
      for (const view of views.split(',')) {
        await page.evaluate(async (name) => globalThis.luoviShots.show(name), view)
        const reads = []
        for (let i = 0; i < 40; i++) {
          await new Promise((done) => setTimeout(done, 100))
          const { timings } = await page.evaluate(() => globalThis.luoviShots.read())
          if (timings) reads.push(timings)
        }
        const passes = [...new Set(reads.flatMap((t) => Object.keys(t)))]
        const median = (xs) => { const s = [...xs].sort((a, b) => a - b); return s[Math.floor(s.length / 2)] }
        const gpu = Object.fromEntries(passes.map((p) => [p, median(reads.map((t) => t[p]).filter((x) => x !== undefined))]))
        results.push({ round: r, layout, view, gpu })
        console.log(`r${r} ${layout} ${view} ` + Object.entries(gpu).map(([p, v]) => `${p} ${v.toFixed(3)}`).join(', '))
      }
      await page.close()
    }
  }
  writeFileSync(`${base}/timing-hex.json`, JSON.stringify({ adapter, results }, null, 1))
} finally {
  await browser.close()
  await server.close()
}
