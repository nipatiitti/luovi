// The browser page of `pnpm validate --engines`: the same benchmark index and harness the CLI runs in Node, bundled
// by Vite and driven by Playwright on the page's main thread (ADR 0010). Runner code, outside the simulation lint
// set, so it supplies the clock and file access the harness asks for.

import { benchmarks } from '../benchmarks/index.ts'
import { runBenchmark } from '../harness/run.ts'
import type { Engine, HarnessIo, Run } from '../harness/types.ts'

export interface EnginesPage {
  /** Runs the listed engine benchmarks one after another; an id that is not one gets a run with an error. */
  run: (ids: readonly string[], engine: Engine) => Promise<Run[]>
}

declare global {
  var luoviEngines: EnginesPage | undefined
}

const pageIo: HarnessIo = {
  now: () => performance.now(),
  readBinary: async (url) => {
    const response = await fetch(url)
    if (!response.ok) throw new Error(`${url.href}: HTTP ${String(response.status)}`)
    return response.arrayBuffer()
  },
}

const run = async (ids: readonly string[], engine: Engine): Promise<Run[]> => {
  const runs: Run[] = []
  for (const id of ids) {
    const benchmark = benchmarks.find((b) => b.id === id && b.engines === true)
    if (benchmark === undefined) {
      runs.push({ engine, values: {}, logs: {}, error: `${id} is not an engine benchmark in the bundled index` })
      continue
    }
    const started = performance.now()
    const result = await runBenchmark(benchmark, pageIo, engine)
    result.logs.wallMs = performance.now() - started
    runs.push(result)
  }
  return runs
}

globalThis.luoviEngines = { run }
