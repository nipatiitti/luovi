// pnpm shots [--views <name,...>] [--out <dir>] [--browser chrome|chromium] [--list]
// Starts the scenario tool's dev server on a free port, drives headless Chromium with WebGPU through the page's named
// views (src/lib/shots.ts), and writes one labelled contact sheet, sheet.png, and the GPU pass timings of every view,
// timings.json, to the output directory. The server and browser are stopped on every exit, a failure or Ctrl-C included.
// Exits 0 on a sheet, 1 when a view or the browser failed, 2 on a usage error.

import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { type Browser, chromium, type Page } from 'playwright'
import { createServer, type ViteDevServer } from 'vite'

// The page's hook as this script sees it. The hook's own types live in the page's tsconfig, which this Node project
// cannot include, so this is the part the script calls.
interface ShotResult {
  readonly tick: number | undefined
  readonly timings: Readonly<Record<string, number>> | null
}
declare global {
  var luoviShots:
    | {
        readonly views: readonly { readonly name: string; readonly label: string }[]
        show(name: string): Promise<void>
        read(): ShotResult
      }
    | undefined
}

const usage = 'usage: pnpm shots [--views <name,...>] [--out <dir>] [--browser chrome|chromium] [--list]'

const toolDir = fileURLToPath(new URL('..', import.meta.url))
const defaultOut = fileURLToPath(new URL('../.shots/', import.meta.url))

// One view at the sheet's full width; the sheet shows two to a row at half size.
const VIEWPORT = { width: 1280, height: 720 }
// A view loads its scenario, runs two seconds of frames and may pause; well inside this on a healthy machine, so a page
// that never draws (no WebGPU adapter, a Worker that refused the scenario) fails here rather than hanging.
const VIEW_TIMEOUT_MS = 60_000
// The dev server compiles the page on first request, which takes a few seconds cold.
const PAGE_READY_TIMEOUT_MS = 60_000
// The GPU timings are read this many times this far apart after a view settles, and each pass reports their median,
// which steadies the single-frame jitter of timestamp queries.
const TIMING_SAMPLES = 5
const TIMING_INTERVAL_MS = 200

interface Options {
  views: readonly string[] | null
  out: string
  browser: 'chrome' | 'chromium'
  list: boolean
}

const parseArgs = (args: readonly string[]): Options | string => {
  const options: Options = { views: null, out: defaultOut, browser: 'chrome', list: false }
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    const value = (): string | undefined => {
      const next = args[++i]
      return next === undefined || next.startsWith('--') ? undefined : next
    }
    if (arg === '--list') options.list = true
    else if (arg === '--views') {
      const names = value()
      if (names === undefined) return '--views needs a comma-separated list of view names'
      options.views = names.split(',').filter((name) => name !== '')
    } else if (arg === '--out') {
      const dir = value()
      if (dir === undefined) return '--out needs a directory'
      // pnpm runs the script from the package directory; INIT_CWD is where the command was typed.
      options.out = resolve(process.env.INIT_CWD ?? process.cwd(), dir)
    } else if (arg === '--browser') {
      const browser = value()
      if (browser !== 'chrome' && browser !== 'chromium') return '--browser is chrome or chromium'
      options.browser = browser
    } else return `unknown argument ${String(arg)}`
  }
  return options
}

const message = (error: unknown): string => (error instanceof Error ? error.message : String(error))

const sleep = async (ms: number): Promise<void> =>
  new Promise((done) => {
    setTimeout(done, ms)
  })

/** Settles as `work` does, or rejects once `ms` pass; Playwright's evaluate has no timeout of its own. */
const withDeadline = async <T>(work: Promise<T>, ms: number, what: string): Promise<T> => {
  let timer: ReturnType<typeof setTimeout> | undefined
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error(`${what}: nothing within ${String(ms / 1000)} s`))
    }, ms)
  })
  try {
    return await Promise.race([work, deadline])
  } finally {
    clearTimeout(timer)
  }
}

const median = (values: readonly number[]): number => {
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 1 ? (sorted[middle] ?? 0) : ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2
}

/** Each pass's median over a few reads, rounded to the microsecond; null when the adapter has no timestamp queries. */
const sampleTimings = async (page: Page): Promise<Record<string, number> | null> => {
  const samples: Readonly<Record<string, number>>[] = []
  for (let i = 0; i < TIMING_SAMPLES; i++) {
    const { timings } = await page.evaluate(() => globalThis.luoviShots?.read() ?? { tick: undefined, timings: null })
    if (timings !== null) samples.push(timings)
    await sleep(TIMING_INTERVAL_MS)
  }
  if (samples.length === 0) return null
  const passes = [...new Set(samples.flatMap((sample) => Object.keys(sample)))]
  return Object.fromEntries(
    passes.map((pass) => {
      const values = samples.flatMap((sample) => (pass in sample ? [sample[pass] ?? 0] : []))
      return [pass, Number(median(values).toFixed(3))]
    }),
  )
}

const escapeHtml = (text: string): string =>
  text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;')

interface Captured {
  readonly name: string
  readonly label: string
  readonly tick: number | undefined
  readonly timings: Record<string, number> | null
  readonly png: Buffer | null
  readonly error: string | null
}

/** The views as one page, two to a row with a caption under each, which the browser itself renders to a PNG. */
const sheetHtml = (shots: readonly Captured[]): string => {
  const figures = shots.map((shot) => {
    const caption = `${shot.name}: ${shot.label}${shot.tick === undefined ? '' : `, tick ${String(shot.tick)}`}`
    const body =
      shot.png === null
        ? `<div class="missing">${escapeHtml(shot.error ?? 'not captured')}</div>`
        : `<img src="data:image/png;base64,${shot.png.toString('base64')}" alt="">`
    return `<figure>${body}<figcaption>${escapeHtml(caption)}</figcaption></figure>`
  })
  return `<!doctype html><html><head><meta charset="utf-8"><style>
body { margin: 0; background: #0b0e12; color: #e6e9ee; font: 14px/1.3 system-ui, sans-serif; }
main { display: grid; grid-template-columns: repeat(2, ${String(VIEWPORT.width / 2)}px); gap: 0; width: ${String(VIEWPORT.width)}px; }
figure { margin: 0; }
img, .missing { display: block; width: ${String(VIEWPORT.width / 2)}px; height: ${String(VIEWPORT.height / 2)}px; }
.missing { display: grid; place-items: center; padding: 24px; box-sizing: border-box; color: #ff8a80; }
figcaption { padding: 4px 8px 8px; }
</style></head><body><main>${figures.join('')}</main></body></html>`
}

const launch = async (browser: Options['browser']): Promise<Browser> =>
  chromium.launch({
    headless: true,
    // System Chrome's headless mode exposes a WebGPU adapter on macOS; Playwright's own Chromium build may not.
    ...(browser === 'chrome' ? { channel: 'chrome' } : {}),
    args: ['--enable-unsafe-webgpu', '--enable-features=Vulkan,WebGPU', '--ignore-gpu-blocklist', '--use-angle=metal'],
    timeout: PAGE_READY_TIMEOUT_MS,
  })

const openTool = async (browser: Browser, url: string): Promise<{ page: Page; errors: string[] }> => {
  const page = await browser.newPage({ viewport: VIEWPORT })
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto(`${url}?shots`)
  // The panel would cover part of every view.
  await page.addStyleTag({ content: 'aside, .prototype-bar { display: none !important; }' })
  // Ready once the opening scenario has loaded and drawn, so the first view's load is not mistaken for the opening one.
  await page.waitForFunction(() => globalThis.luoviShots?.read().tick !== undefined, null, {
    timeout: PAGE_READY_TIMEOUT_MS,
  })
  return { page, errors }
}

const capture = async (page: Page, view: { name: string; label: string }, errors: string[]): Promise<Captured> => {
  try {
    await withDeadline(
      page.evaluate(async (name) => globalThis.luoviShots?.show(name), view.name),
      VIEW_TIMEOUT_MS,
      view.name,
    )
    const png = await page.screenshot({ type: 'png' })
    const { tick } = await page.evaluate(() => globalThis.luoviShots?.read() ?? { tick: undefined, timings: null })
    const timings = await sampleTimings(page)
    return { ...view, tick, timings, png, error: null }
  } catch (error) {
    const detail = errors.length > 0 ? `; page errors: ${errors.join('; ')}` : ''
    return { ...view, tick: undefined, timings: null, png: null, error: `${message(error)}${detail}` }
  }
}

const run = async (options: Options, started: { server?: ViteDevServer; browser?: Browser }): Promise<number> => {
  // Port 0 asks the system for a free port; resolvedUrls reports the one it gave.
  const server = await createServer({
    root: toolDir,
    configFile: resolve(toolDir, 'vite.config.js'),
    logLevel: 'warn',
    server: { host: '127.0.0.1', port: 0, strictPort: true, open: false },
  })
  started.server = server
  await server.listen()
  const url = server.resolvedUrls?.local[0]
  if (url === undefined) throw new Error('the dev server reported no local URL')

  const browser = await launch(options.browser)
  started.browser = browser
  const { page, errors } = await openTool(browser, url)
  const available = await page.evaluate(() =>
    (globalThis.luoviShots?.views ?? []).map(({ name, label }) => ({ name, label })),
  )
  if (options.list) {
    for (const view of available) console.log(`${view.name.padEnd(12)} ${view.label}`)
    return 0
  }
  const unknown = (options.views ?? []).filter((name) => !available.some((view) => view.name === name))
  if (unknown.length > 0) {
    console.error(`no view named ${unknown.join(', ')}; pnpm shots --list names them\n${usage}`)
    return 2
  }
  const selected =
    options.views === null ? available : available.filter((view) => options.views?.includes(view.name) === true)

  const shots: Captured[] = []
  for (const view of selected) {
    const shot = await capture(page, view, errors)
    console.log(shot.error === null ? `${view.name}: tick ${String(shot.tick)}` : `${view.name}: ${shot.error}`)
    shots.push(shot)
  }

  const sheet = await browser.newPage({ viewport: { width: VIEWPORT.width, height: VIEWPORT.height } })
  await sheet.setContent(sheetHtml(shots))
  await mkdir(options.out, { recursive: true })
  const sheetPath = resolve(options.out, 'sheet.png')
  const timingsPath = resolve(options.out, 'timings.json')
  await sheet.screenshot({ path: sheetPath, fullPage: true, type: 'png' })
  // PROTOTYPE (#41): every view's own picture beside the sheet, for the comparison page.
  for (const shot of shots) if (shot.png !== null) await writeFile(resolve(options.out, `${shot.name}.png`), shot.png)
  const report = {
    browser: options.browser,
    viewport: VIEWPORT,
    unit: 'ms',
    views: Object.fromEntries(
      shots.map((shot) => [
        shot.name,
        { label: shot.label, tick: shot.tick ?? null, error: shot.error, gpu: shot.timings },
      ]),
    ),
  }
  await writeFile(timingsPath, `${JSON.stringify(report, null, 2)}\n`)
  console.log(`sheet: ${sheetPath}\ntimings: ${timingsPath}`)
  return shots.every((shot) => shot.error === null) ? 0 : 1
}

const main = async (): Promise<number> => {
  const options = parseArgs(process.argv.slice(2))
  if (typeof options === 'string') {
    console.error(`${options}\n${usage}`)
    return 2
  }
  const started: { server?: ViteDevServer; browser?: Browser } = {}
  const stop = async (): Promise<void> => {
    await started.browser?.close()
    await started.server?.close()
  }
  // Ctrl-C or a kill still closes the browser and frees the port before the process goes.
  const onSignal = (): void => {
    void (async () => {
      await stop()
      process.exit(130)
    })()
  }
  process.once('SIGINT', onSignal)
  process.once('SIGTERM', onSignal)
  try {
    return await run(options, started)
  } catch (error) {
    console.error(`shots: ${message(error)}`)
    return 1
  } finally {
    await stop()
  }
}

process.exitCode = await main()
