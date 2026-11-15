// What the ocean benchmarks share: the four reference seas, the loop that measures each in turn, and the query grid
// the spec samples them on.

import type { Measurement } from '../harness/types.ts'
import archipelago from './reference-seas/archipelago.json' with { type: 'json' }
import gulf from './reference-seas/gulf.json' with { type: 'json' }
import sailingDay from './reference-seas/sailing-day.json' with { type: 'json' }
import storm from './reference-seas/storm.json' with { type: 'json' }

// Four measured Baltic cases (ADR 0005, 2026-11-15 amendment), shortest waves first.
export const REFERENCE_SEA_NAMES = ['archipelago', 'sailingDay', 'gulf', 'storm'] as const
export type ReferenceSea = (typeof REFERENCE_SEA_NAMES)[number]
export const REFERENCE_SEAS: Readonly<Record<ReferenceSea, unknown>> = { archipelago, sailingDay, gulf, storm }

/** Measures every reference sea in turn into one measurement, each sea's ids already prefixed with its name. */
export const measureEachSea = (
  logs: Measurement['logs'],
  measureSea: (name: ReferenceSea, scenario: unknown) => Measurement,
): Measurement => {
  const measurement: Measurement = { values: {}, logs: { ...logs } }
  for (const name of REFERENCE_SEA_NAMES) {
    const sea = measureSea(name, REFERENCE_SEAS[name])
    Object.assign(measurement.values, sea.values)
    Object.assign(measurement.logs, sea.logs)
  }
  return measurement
}

// The spec's sample: 64 by 64 cell centres over a 2 km square, for one minute of ticks.
const GRID_SIDE = 64
const GRID_SPAN = 2000
export const GRID_TICKS = 3600

/** The grid's cell centres as query points (x, y, z), every one at height `z`. */
export const gridPoints = (z: number): Float64Array => {
  const points = new Float64Array(GRID_SIDE * GRID_SIDE * 3)
  const cell = GRID_SPAN / GRID_SIDE
  for (let iy = 0; iy < GRID_SIDE; iy += 1) {
    for (let ix = 0; ix < GRID_SIDE; ix += 1) {
      const p = 3 * (iy * GRID_SIDE + ix)
      points[p] = -GRID_SPAN / 2 + (ix + 0.5) * cell
      points[p + 1] = -GRID_SPAN / 2 + (iy + 0.5) * cell
      points[p + 2] = z
    }
  }
  return points
}
