// Headless frame sequences: the scenario tool's 40 m oblique view from tick 600, 120 frames two ticks apart (4 s at
// 30 fps), per layout. node motion.mjs <view> <layout,...> ; frames land in visual/motion/<view>/<layout>/NNN.png.
import { mkdirSync, writeFileSync } from 'node:fs'
const tool = '/Users/niilojaakkola/projects/luovi/.claude/worktrees/agent-a2339e346504c5316/packages/tool-scenario'
const out = '/private/tmp/claude-502/-Users-niilojaakkola-projects-luovi/13e248e8-19fc-4c78-8792-faa277084d9d/scratchpad/visual/motion'
const { chromium } = await import(`${tool}/node_modules/playwright/index.mjs`)
const { createServer } = await import(`${tool}/node_modules/vite/dist/node/index.js`)
const [view, layouts] = process.argv.slice(2)
const FRAMES = 120
const server = await createServer({ root: tool, configFile: `${tool}/vite.config.js`, logLevel: 'warn', server: { host: '127.0.0.1', port: 0, strictPort: true, open: false } })
await server.listen()
const url = server.resolvedUrls.local[0]
const browser = await chromium.launch({ headless: true, channel: 'chrome', args: ['--enable-unsafe-webgpu', '--enable-features=Vulkan,WebGPU', '--ignore-gpu-blocklist', '--use-angle=metal'] })
try {
  for (const layout of layouts.split(',')) {
    const dir = `${out}/${view}/${layout}`
    mkdirSync(dir, { recursive: true })
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
    page.on('pageerror', (e) => console.error(`page error: ${e.message}`))
    await page.goto(`${url}?shots&layout=${layout}`)
    await page.addStyleTag({ content: 'aside, .prototype-bar { display: none !important; }' })
    await page.waitForFunction(() => globalThis.luoviShots?.read().tick !== undefined, null, { timeout: 60000 })
    await page.evaluate(async (name) => globalThis.luoviShots.show(name), view)
    for (let i = 0; i < FRAMES; i++) {
      if (i > 0) await page.evaluate(async (tick) => globalThis.luoviShots.advance(tick), 600 + 2 * i)
      const png = await page.screenshot({ type: 'png' })
      writeFileSync(`${dir}/${String(i).padStart(3, '0')}.png`, png)
    }
    const { tick } = await page.evaluate(() => globalThis.luoviShots.read())
    console.log(`${view} ${layout}: ${FRAMES} frames, last tick ${tick}`)
    await page.close()
  }
} finally {
  await browser.close()
  await server.close()
}
