import { writeFile } from 'node:fs/promises'
import type { Engine, Gate, GateResult, Run } from './harness/types.ts'

export interface Report {
  version: 1
  /** ISO time the run started; the only wall-clock value in the report. */
  startedAt: string
  options: { filter: string | null; full: boolean; engines: boolean }
  engines: Engine[]
  pass: boolean
  benchmarks: {
    id: string
    step: number
    tier: 'quick' | 'full'
    engines: boolean
    runs: Run[]
    gates: (Gate & { results: GateResult[]; pass: boolean })[]
  }[]
}

/** packages/tool-validate/report.json from both src/ and dist/; gitignored. */
export const reportUrl = new URL('../report.json', import.meta.url)

export const writeReport = async (report: Report): Promise<void> => {
  await writeFile(reportUrl, `${JSON.stringify(report, null, 2)}\n`)
}
