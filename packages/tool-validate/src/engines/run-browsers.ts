// The browser half of `pnpm validate --engines`: bundles page.ts with Vite, serves the bundle with Vite's preview
// server, and runs the engine benchmarks in Chromium, WebKit and Firefox through Playwright, one browser at a time.
// A browser that fails to launch or throws yields runs with an error, never a hang or a missing row, so the CLI
// reports it as a failed engine.

import { writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { type BrowserType, chromium, firefox, webkit } from 'playwright'
import { build, preview } from 'vite'
import type { Engine, Run } from '../harness/types.ts'

export type BrowserEngine = Exclude<Engine, 'node'>

export interface BrowserRuns {
  engine: BrowserEngine
  /** Keyed by benchmark id, one per id asked for. */
  runs: Map<string, Run>
}

const browsers: readonly { engine: BrowserEngine; type: BrowserType }[] = [
  { engine: 'chromium', type: chromium },
  { engine: 'webkit', type: webkit },
  { engine: 'firefox', type: firefox },
]

// A browser that cannot start (a missing install, a sandbox refusing it) fails within this rather than Playwright's
// three minutes; a healthy one starts in a few seconds.
const LAUNCH_TIMEOUT_MS = 60_000
const PAGE_READY_TIMEOUT_MS = 30_000
// A browser that starts and then stalls inside a benchmark fails that benchmark after this. The slowest engine
// benchmark takes under a minute in a healthy browser, so ten leave room for a slow CI machine.
const BENCHMARK_TIMEOUT_MS = 600_000

/** packages/tool-validate/.engines from both src/engines and dist/engines; gitignored. */
const outDir = fileURLToPath(new URL('../../.engines/', import.meta.url))
// The page entry beside this file: the TypeScript source when the CLI runs from src, the emitted module from dist.
const entry = fileURLToPath(new URL(import.meta.url.endsWith('.ts') ? './page.ts' : './page.js', import.meta.url))
const root = fileURLToPath(new URL('.', import.meta.url))

const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>luovi engines</title>
    <script type="module" src="./page.js"></script>
  </head>
  <body></body>
</html>
`

const bundle = async (): Promise<void> => {
  await build({
    configFile: false,
    root,
    base: './',
    logLevel: 'warn',
    build: {
      outDir,
      emptyOutDir: true,
      // The engines under test run current JavaScript; nothing is lowered, so the browsers execute what Node does.
      target: 'esnext',
      minify: false,
      // Every golden file is fetched by URL as in Node, never inlined into the bundle.
      assetsInlineLimit: 0,
      rolldownOptions: { input: entry, output: { entryFileNames: 'page.js' } },
    },
  })
  await writeFile(`${outDir}index.html`, html)
}

const message = (error: unknown): string => (error instanceof Error ? error.message : String(error))

/** Settles as `work` does, or rejects once `ms` pass; Playwright's evaluate has no timeout of its own. */
const withDeadline = async <T>(work: Promise<T>, ms: number): Promise<T> => {
  let timer: ReturnType<typeof setTimeout> | undefined
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error(`no result within ${String(ms / 1000)} s`))
    }, ms)
  })
  try {
    return await Promise.race([work, deadline])
  } finally {
    clearTimeout(timer)
  }
}

const failedRuns = (engine: BrowserEngine, ids: readonly string[], error: string): Map<string, Run> =>
  new Map(ids.map((id) => [id, { engine, values: {}, logs: {}, error }]))

const runIn = async (
  engine: BrowserEngine,
  type: BrowserType,
  url: string,
  ids: readonly string[],
): Promise<Map<string, Run>> => {
  const pageErrors: string[] = []
  try {
    const browser = await type.launch({ timeout: LAUNCH_TIMEOUT_MS })
    try {
      const page = await browser.newPage()
      page.on('pageerror', (error) => pageErrors.push(error.message))
      await page.goto(url)
      await page.waitForFunction(() => globalThis.luoviEngines !== undefined, null, {
        timeout: PAGE_READY_TIMEOUT_MS,
      })
      // One benchmark per evaluate, so each has its own deadline. A page stalled past it is still busy, so the
      // benchmarks after it fail with the same error rather than queue behind it.
      const runs = new Map<string, Run>()
      for (const [i, id] of ids.entries()) {
        try {
          const [run] = await withDeadline(
            page.evaluate(
              async ({ id, engine }) => {
                const enginesPage = globalThis.luoviEngines
                if (enginesPage === undefined) throw new Error('the engines page did not load')
                return enginesPage.run([id], engine)
              },
              { id, engine },
            ),
            BENCHMARK_TIMEOUT_MS,
          )
          runs.set(id, run ?? { engine, values: {}, logs: {}, error: 'the page returned no run' })
        } catch (error) {
          const detail = pageErrors.length > 0 ? `; page errors: ${pageErrors.join('; ')}` : ''
          for (const [failedId, run] of failedRuns(
            engine,
            ids.slice(i),
            `${engine} ${id}: ${message(error)}${detail}`,
          )) {
            runs.set(failedId, run)
          }
          break
        }
      }
      return runs
    } finally {
      await browser.close()
    }
  } catch (error) {
    const detail = pageErrors.length > 0 ? `; page errors: ${pageErrors.join('; ')}` : ''
    return failedRuns(engine, ids, `${engine}: ${message(error)}${detail}`)
  }
}

/** Runs the engine benchmarks with these ids in every browser in turn. */
export const runBrowsers = async (ids: readonly string[]): Promise<BrowserRuns[]> => {
  try {
    await bundle()
  } catch (error) {
    return browsers.map(({ engine }) => ({ engine, runs: failedRuns(engine, ids, `bundle: ${message(error)}`) }))
  }
  const server = await preview({
    configFile: false,
    root,
    base: './',
    logLevel: 'warn',
    build: { outDir },
    preview: { host: '127.0.0.1', port: 0, open: false },
  })
  try {
    const url = server.resolvedUrls?.local[0]
    if (url === undefined) throw new Error('the preview server reported no local URL')
    const results: BrowserRuns[] = []
    for (const { engine, type } of browsers) {
      results.push({ engine, runs: await runIn(engine, type, url, ids) })
    }
    return results
  } finally {
    await server.close()
  }
}
