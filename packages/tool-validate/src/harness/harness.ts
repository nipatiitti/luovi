import { type EnvironmentQuery, hashState, loadWorld, type World } from '@luovi/sim-world'
import type { Harness, HarnessIo } from './types.ts'

/** The only Harness implementation, over sim-world's public surface. */
export const createHarness = (io: HarnessIo): Harness => {
  let world: World | null = null
  let ticks = 0
  let stepMs = 0
  let waterCalls = 0
  let waterMs = 0

  const loaded = (): World => {
    if (world === null) throw new Error('The harness has no world: call load(scenario) first')
    return world
  }

  // Delegates to whichever world is loaded, so a benchmark may hold this one object across loads.
  const environment: EnvironmentQuery = {
    water: (tick, points, out) => {
      const query = loaded().environment
      const started = io.now()
      query.water(tick, points, out)
      waterMs += io.now() - started
      waterCalls += 1
    },
    wind: (tick, points, out) => {
      loaded().environment.wind(tick, points, out)
    },
    depth: (points, out) => {
      loaded().environment.depth(points, out)
    },
    get constants() {
      return loaded().environment.constants
    },
  }

  return {
    load: (scenario) => {
      world = loadWorld(scenario)
    },
    step: (count) => {
      if (!(Number.isInteger(count) && count >= 0)) {
        throw new RangeError(`step needs a non-negative integer tick count, got ${String(count)}`)
      }
      const current = loaded()
      const started = io.now()
      for (let i = 0; i < count; i += 1) current.step()
      stepMs += io.now() - started
      ticks += count
    },
    get tick() {
      return loaded().tick
    },
    environment,
    get sea() {
      return loaded().sea
    },
    get state() {
      return loaded().state
    },
    get derived() {
      return loaded().derived
    },
    get layout() {
      return loaded().layout
    },
    get effectiveScenario() {
      return loaded().effectiveScenario
    },
    hash: () => hashState(loaded().state),
    readBinary: io.readBinary,
    get timing() {
      return { ticks, stepMs, waterCalls, waterMs }
    },
  }
}
