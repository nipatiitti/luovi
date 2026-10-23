// Cross-engine determinism of the environment query (ADR 0002): the moderate reference sea's water query over a grid,
// tick by tick, digested with core's state hash. There is no committed expected value; the gate passes when Node and
// every browser engine that ran it produced the same hash, so it proves agreement, not correctness.

import { hashState } from '@luovi/sim-world'
import type { Benchmark, Harness, Measurement } from '../harness/types.ts'
import { GRID_TICKS, gridPoints, REFERENCE_SEAS } from './reference-seas.ts'

// Below the mean level, so the orbital velocities carry the depth decay into the hash.
const DEPTH_BELOW_MEAN = 2

const measure = (harness: Harness): Measurement => {
  // The ocean.band-hs grid.
  const points = gridPoints(-DEPTH_BELOW_MEAN)
  const out = new Float64Array((points.length / 3) * 4)
  // Chained over every tick's outputs in order, so the value is a function of the query outputs alone.
  let hash: number | undefined
  for (let t = 0; t < GRID_TICKS; t += 1) {
    harness.step(1)
    harness.environment.water(harness.tick, points, out)
    hash = hashState(out, hash)
  }
  if (hash === undefined) throw new Error('no tick was hashed')
  return {
    values: { hash },
    logs: {
      gridPoints: points.length / 3,
      ticks: GRID_TICKS,
      finalTick: harness.tick,
      // The world's own state, logged so a disagreement can be told apart from one in the header.
      stateHash: harness.hash(),
    },
  }
}

export const benchmark: Benchmark = {
  id: 'engine.hash-environment',
  step: 1,
  tier: 'quick',
  engines: true,
  scenario: REFERENCE_SEAS.moderate,
  gates: [{ id: 'hash', unit: 'u32', kind: 'exact' }],
  // eslint-disable-next-line @typescript-eslint/require-await -- measure is async for modules that read files; this one only computes
  measure: async (harness) => measure(harness),
}
