import { abs } from '@luovi/core/math'
import { createHarness } from './harness.ts'
import type { Benchmark, Engine, Gate, GateResult, HarnessIo, Run } from './types.ts'

/** Runs one benchmark on a fresh harness; a throw becomes a run with an error and no values. */
export const runBenchmark = async (benchmark: Benchmark, io: HarnessIo, engine: Engine): Promise<Run> => {
  const harness = createHarness(io)
  try {
    if (benchmark.scenario !== null) harness.load(benchmark.scenario)
    const measurement = await benchmark.measure(harness)
    // Timing is logged for every benchmark and gated by none: it measures the machine as much as the code.
    const { ticks, stepMs, waterCalls, waterMs } = harness.timing
    const logs: Record<string, number | string> = {
      ...measurement.logs,
      'timing.ticks': ticks,
      'timing.stepMs': stepMs,
      'timing.waterCalls': waterCalls,
      'timing.waterMs': waterMs,
    }
    const values: Record<string, number | null> = {}
    for (const gate of benchmark.gates) {
      const value = measurement.values[gate.id]
      if (value === undefined) {
        values[gate.id] = null
        logs[`${gate.id}.missing`] = 'measure returned no value'
      } else if (!Number.isFinite(value)) {
        values[gate.id] = null
        logs[`${gate.id}.nonFinite`] = String(value)
      } else values[gate.id] = value
    }
    return measurement.details === undefined
      ? { engine, values, logs }
      : { engine, values, logs, details: measurement.details }
  } catch (error) {
    const values = Object.fromEntries(benchmark.gates.map((gate) => [gate.id, null]))
    return { engine, values, logs: {}, error: error instanceof Error ? error.message : String(error) }
  }
}

const passes = (gate: Gate, measured: number): boolean => {
  switch (gate.kind) {
    case 'relative':
      return abs(measured - gate.target) <= gate.tolerance * abs(gate.target)
    case 'band':
      return gate.min <= measured && measured <= gate.max
    case 'exact':
      return gate.target === undefined || Object.is(measured, gate.target)
  }
}

/**
 * Judges one gate over every engine's run. An exact gate without a target passes only when all
 * engines measured the same bits, so it is decided here rather than per run.
 */
export const judgeGate = (gate: Gate, runs: readonly Run[]): GateResult[] => {
  const measured = runs.map((run) => run.values[gate.id] ?? null)
  const first = measured[0] ?? null
  const agree = measured.every((m) => m !== null && first !== null && Object.is(m, first))
  return runs.map((run, i) => {
    const m = measured[i] ?? null
    const pass = m !== null && passes(gate, m) && (gate.kind !== 'exact' || gate.target !== undefined || agree)
    return { engine: run.engine, measured: m, pass }
  })
}
