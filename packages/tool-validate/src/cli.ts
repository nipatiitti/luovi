// pnpm validate [--filter <prefix>] [--full] [--engines]
// Runs the selected benchmarks in Node, prints one row per benchmark, gate and engine, writes
// report.json, and exits 0 when every gate passes, 1 when one fails, 2 on a usage error.

import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { benchmarks } from './benchmarks/index.ts'
import { judgeGate, runBenchmark } from './harness/run.ts'
import type { Gate, HarnessIo } from './harness/types.ts'
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
  if (options.engines) return '--engines is not available until the browser runner lands (#31)'
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
  const rows: string[][] = []
  const errors: string[] = []
  const report: Report = { version: 1, startedAt, options, engines: ['node'], pass: true, benchmarks: [] }
  for (const benchmark of selected) {
    const started = performance.now()
    const run = await runBenchmark(benchmark, nodeIo, 'node')
    run.logs.wallMs = performance.now() - started
    if (run.error !== undefined) errors.push(`${benchmark.id}: ${run.error}`)
    const runs = [run]
    const gates = benchmark.gates.map((gate) => {
      const results = judgeGate(gate, runs)
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
    report.pass &&= gates.every((g) => g.pass)
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
  for (const error of errors) console.error(`error in ${error}`)
  await writeReport(report)
  console.log(`\n${report.pass ? 'PASS' : 'FAIL'}; report in ${fileURLToPath(reportUrl)}`)
  return report.pass ? 0 : 1
}

process.exitCode = await main()
