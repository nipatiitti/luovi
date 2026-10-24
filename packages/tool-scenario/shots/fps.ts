// PROTOTYPE (band size, #43): throwaway, on the prototype/band-size branch only, never merged.
// node shots/fps.ts --out <file.json> [--views <name,...>] [--warmup <s>] [--seconds <s>] [--rounds <n>]
// Starts the scenario tool's dev server, opens headed Chrome with vsync and the frame-rate limit off, and runs each named
// view of src/lib/shots.ts live for the warm-up and then the measured seconds, writing every frame interval, the canvas
// size and the GPU pass timing reads to the output file. The page is 1280 by 720 CSS pixels at device scale 2, so the
// canvas is 2560 by 1440 device pixels.

import { writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import { createServer } from 'vite'

interface ShotResult {
  readonly tick: number | undefined
  readonly timings: Readonly<Record<string, number>> | null
}
// PROTOTYPE (band size, #43): a frame-rate run as the hook reports it; fps.ts reads it, and both scripts declare the hook alike.
interface FrameRun {
  readonly intervals: readonly number[]
  readonly width: number
  readonly height: number
  readonly timings: readonly Readonly<Record<string, number>>[] | null
}
declare global {
  var luoviShots:
    | {
        readonly views: readonly { readonly name: string; readonly label: string }[]
        show(name: string): Promise<void>
        measure(name: string, warmup: number, ms: number): Promise<FrameRun>
        read(): ShotResult
      }
    | undefined
}

const toolDir = fileURLToPath(new URL('..', import.meta.url))
const args = process.argv.slice(2)
const option = (name: string): string | undefined => {
  const at = args.indexOf(`--${name}`)
  return at === -1 ? undefined : args[at + 1]
}
const out = resolve(process.env.INIT_CWD ?? process.cwd(), option('out') ?? 'fps.json')
const warmup = Number(option('warmup') ?? 3) * 1000
const seconds = Number(option('seconds') ?? 12) * 1000
const rounds = Number(option('rounds') ?? 1)
const wanted = option('views')?.split(',')

const server = await createServer({
  root: toolDir,
  configFile: resolve(toolDir, 'vite.config.js'),
  logLevel: 'warn',
  server: { host: '127.0.0.1', port: 0, strictPort: true, open: false },
})
await server.listen()
const url = server.resolvedUrls?.local[0]
if (url === undefined) throw new Error('the dev server reported no local URL')
const browser = await chromium.launch({
  headless: false,
  channel: 'chrome',
  args: [
    '--enable-unsafe-webgpu',
    '--enable-features=Vulkan,WebGPU',
    '--ignore-gpu-blocklist',
    '--use-angle=metal',
    '--disable-gpu-vsync',
    '--disable-frame-rate-limit',
    // PROTOTYPE (tail repetition, #44): headed Chrome on a Retina screen draws at 2x whatever the context's scale says.
    `--force-device-scale-factor=${process.env.DSF ?? '1'}`,
    // A window another one covers would otherwise be throttled.
    '--disable-backgrounding-occluded-windows',
    '--disable-renderer-backgrounding',
    '--disable-background-timer-throttling',
  ],
})
const results: Record<string, unknown>[] = []
try {
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: Number(process.env.DSF ?? 1) })
  const page = await context.newPage()
  page.on('pageerror', (error) => {
    console.error(`page error: ${error.message}`)
  })
  await page.goto(`${url}?shots&layout=${process.env.LAYOUT ?? "L0"}`)
  await page.addStyleTag({ content: 'aside, .prototype-bar { display: none !important; }' })
  await page.waitForFunction(() => globalThis.luoviShots?.read().tick !== undefined, null, { timeout: 60_000 })
  const names = await page.evaluate(() => (globalThis.luoviShots?.views ?? []).map((view) => view.name))
  const selected = wanted === undefined ? names : names.filter((name) => wanted.includes(name))
  for (let round = 0; round < rounds; round += 1) {
    // Every other round runs the list backwards, so a machine that warms up over the run does not favour one variant.
    const order = round % 2 === 0 ? selected : [...selected].reverse()
    for (const name of order) {
      const run = await page.evaluate(async ([view, w, s]) => globalThis.luoviShots?.measure(view, w, s), [
        name,
        warmup,
        seconds,
      ] as const)
      if (run === undefined) throw new Error(`no hook for ${name}`)
      const sorted = [...run.intervals].sort((a, b) => a - b)
      const at = (q: number): number => sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))] ?? 0
      console.log(
        `${name} round ${String(round)}: ${String(run.width)}x${String(run.height)}, ${String(sorted.length)} frames, median ${(1000 / at(0.5)).toFixed(1)} fps, 5th percentile ${(1000 / at(0.95)).toFixed(1)} fps`,
      )
      results.push({ name, round, ...run })
      await writeFile(out, `${JSON.stringify({ warmup, seconds, results }, null, 1)}\n`)
    }
  }
} finally {
  await browser.close()
  await server.close()
}
