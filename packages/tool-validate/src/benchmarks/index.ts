// The explicit list of benchmark modules; a module not listed here never runs.

import type { Benchmark } from '../harness/types.ts'
import { benchmark as goldenVectors } from './engine.golden-vectors.ts'
import { benchmark as hashEnvironment } from './engine.hash-environment.ts'
import { benchmark as bandHs } from './ocean.band-hs.ts'

export const benchmarks: readonly Benchmark[] = [goldenVectors, hashEnvironment, bandHs]
