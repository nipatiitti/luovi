// pnpm validate [--filter <prefix>] [--full] [--engines]
// Runs the selected benchmarks in Node, and under --engines the engine benchmarks also in Chromium, WebKit and
// Firefox; prints one row per benchmark, gate and engine, writes report.json, and exits 0 when every gate passes,
// 1 when one fails or an engine could not run, 2 on a usage error.

import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { benchmarks } from './benchmarks/index.ts'
import { judgeGate, runBenchmark } from './harness/run.ts'
import type { Benchmark, Engine, Gate, HarnessIo, Run } from './harness/types.ts'
import { type Report, reportUrl, writeReport } from './report.ts'

const usage = 'usage: pnpm validate [--filter <prefix>] [--full] [--engines]'

type Options = Report['options']

const parseArgs = (args: readonly string[]): Options | string => {
  const options: Options = { filter: null, full: false, engines: false }
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (arg === '--full') options.full = true
    else if (arg === '--engines') options.engines = true
    else if (arg === '--filter') {
      const prefix = args[++i]
      if (prefix === undefined || prefix.startsWith('--')) return '--filter needs a prefix'
      options.filter = prefix
    } else if (arg?.startsWith('--filter=') === true) options.filter = arg.slice('--filter='.length)
    else return `unknown argument ${String(arg)}`
  }
  return options
}

const nodeIo: HarnessIo = {
  now: () => performance.now(),
  readBinary: async (url) => new Uint8Array(await readFile(fileURLToPath(url))).buffer,
}

const formatMeasured = (gate: Gate, value: number | null): string => {
  if (value === null) return 'none'
  if (gate.unit === 'u32') return `0x${(value >>> 0).toString(16).padStart(8, '0')}`
  return Number.isInteger(value) && Math.abs(value) < 1e6 ? String(value) : value.toPrecision(6)
}

const formatTarget = (gate: Gate): string => {
  switch (gate.kind) {
    case 'relative':
      return `${String(gate.target)} +/- ${String(gate.tolerance * 100)}%`
    case 'band':
      return `[${String(gate.min)}, ${String(gate.max)}]`
    case 'exact':
      return gate.target === undefined ? 'agree' : `= ${String(gate.target)}`
  }
}

const printTable = (rows: string[][]): void => {
  const header = ['benchmark', 'gate', 'engine', 'measured', 'target', 'unit', 'result']
  const all = [header, ...rows]
  const widths = header.map((_, c) => Math.max(...all.map((row) => (row[c] ?? '').length)))
  const line = (row: string[]): string =>
    row
      .map((cell, c) => cell.padEnd(widths[c] ?? 0))
      .join(' | ')
      .trimEnd()
  console.log(line(header))
  console.log(widths.map((w) => '-'.repeat(w)).join('-+-'))
  for (const row of rows) console.log(line(row))
}

const main = async (): Promise<number> => {
  const options = parseArgs(process.argv.slice(2))
  if (typeof options === 'string') {
    console.error(`${options}\n${usage}`)
    return 2
  }
  const selected = benchmarks.filter(
    (b) => (options.filter === null || b.id.startsWith(options.filter)) && (b.tier === 'quick' || options.full),
  )
  if (selected.length === 0) {
    console.error(`no benchmark matches ${options.filter ?? '(no filter)'}\n${usage}`)
    return 2
  }

  const startedAt = new Date().toISOString()
  const runsById = new Map<string, Run[]>()
  for (const benchmark of selected) {
    const started = performance.now()
    const run = await runBenchmark(benchmark, nodeIo, 'node')
    run.logs.wallMs = performance.now() - started
    runsById.set(benchmark.id, [run])
  }
  const engines: Engine[] = ['node']
  if (options.engines) {
    const inBrowsers = selected.filter((b) => b.engines === true).map((b) => b.id)
    if (inBrowsers.length === 0) console.log('--engines: no selected benchmark runs in the browser engines')
    else {
      // Loaded only here, so a Node-only run never starts Vite or Playwright.
      const { runBrowsers } = await import('./engines/run-browsers.ts')
      for (const { engine, runs } of await runBrowsers(inBrowsers)) {
        engines.push(engine)
        for (const [id, run] of runs) runsById.get(id)?.push(run)
      }
    }
  }

  const rows: string[][] = []
  const errors: string[] = []
  const notes: string[] = []
  const report: Report = { version: 1, startedAt, options, engines, pass: true, benchmarks: [] }
  const judge = (benchmark: Benchmark, runs: Run[]): Report['benchmarks'][number]['gates'] =>
    benchmark.gates.map((gate) => {
      const results = judgeGate(gate, runs)
      if (gate.kind === 'exact' && gate.target === undefined && runs.length === 1) {
        // Agreement with itself is all a single engine can show; say so rather than let the PASS read as a comparison.
        const note = `only ${results[0]?.engine ?? 'one engine'} ran it, so no engines were compared`
        for (const run of runs) run.logs[`${gate.id}.agreement`] = note
        notes.push(`${benchmark.id} ${gate.id}: ${note}`)
      }
      for (const r of results) {
        rows.push([
          benchmark.id,
          gate.id,
          r.engine,
          formatMeasured(gate, r.measured),
          formatTarget(gate),
          gate.unit,
          r.pass ? 'PASS' : 'FAIL',
        ])
      }
      return { ...gate, results, pass: results.every((r) => r.pass) }
    })
  for (const benchmark of selected) {
    const runs = runsById.get(benchmark.id) ?? []
    for (const run of runs) if (run.error !== undefined) errors.push(`${benchmark.id} on ${run.engine}: ${run.error}`)
    const gates = judge(benchmark, runs)
    // A run that threw has every gate null, which already fails; this also catches one that threw with no gates.
    report.pass &&= gates.every((g) => g.pass) && runs.every((run) => run.error === undefined)
    report.benchmarks.push({
      id: benchmark.id,
      step: benchmark.step,
      tier: benchmark.tier,
      engines: benchmark.engines ?? false,
      runs,
      gates,
    })
  }

  printTable(rows)
  for (const note of notes) console.log(`note: ${note}`)
  for (const error of errors) console.error(`error in ${error}`)
  await writeReport(report)
  console.log(`\n${report.pass ? 'PASS' : 'FAIL'}; report in ${fileURLToPath(reportUrl)}`)
  return report.pass ? 0 : 1
}

process.exitCode = await main()
