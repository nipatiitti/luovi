// The explicit list of benchmark modules; a module not listed here never runs.

import type { Benchmark } from '../harness/types.ts'
import { benchmark as goldenVectors } from './engine.golden-vectors.ts'

export const benchmarks: readonly Benchmark[] = [goldenVectors]
