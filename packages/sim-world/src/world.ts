import {
  ContractError,
  type EffectiveScenario,
  type EnvironmentQuery,
  layoutFor,
  parseScenario,
  type SeaDescription,
  STATE_HEADER,
  STATE_VERSION,
  type StateLayout,
} from '@luovi/core'
import { standardGravity } from '@luovi/data'
import { bandPhases, buildSea, createEnvironmentQuery } from '@luovi/sim-ocean'
import { effectiveScenario as withDefaults } from './effective.ts'

/** One loaded scenario: the integer tick, the state buffer and the environment the force modules will query. */
export interface World {
  readonly tick: number
  readonly layout: StateLayout
  /** Live; the header only in step 1 (state version, tick, ship count), and step() writes the tick into it. */
  readonly state: Float64Array
  /** Live; empty in step 1. */
  readonly derived: Float64Array
  /** A pure function of the effective environment, the tick and the points, so it does not depend on this world. */
  readonly environment: EnvironmentQuery
  /** null: flat water. */
  readonly sea: SeaDescription | null
  /** Live; the band phases at the current tick by the one convention of bandPhases, what a renderer uploads. */
  readonly phases: Float64Array
  readonly effectiveScenario: EffectiveScenario
  /** Advances one tick and forms the band phases for it. */
  step(): void
}

// A sea the schema accepts can still be one the build cannot make (a band variance that underflows); the build's
// RangeError is re-thrown as a contract error so the message names the block, as every other load error does.
const buildOrRefuse = (scenario: EffectiveScenario, gravity: number): SeaDescription | null => {
  const { sea, depth } = scenario.environment
  if (sea === undefined) return null
  try {
    return buildSea(sea, depth, gravity, scenario.seed)
  } catch (error) {
    if (error instanceof RangeError) throw new ContractError('scenario', 'environment.sea', error.message)
    throw error
  }
}

/**
 * Validates a scenario document, applies the data defaults, builds its sea and starts it at tick 0 with the phases
 * formed. Throws ContractError, whose message starts with the dotted path of the field at fault.
 */
export const loadWorld = (document: unknown): World => {
  const scenario = parseScenario(document)
  if (scenario.ships.length > 0) {
    throw new ContractError(
      'scenario',
      'ships',
      `Expected no ships: ships are simulated from step 2 of the build, got ${String(scenario.ships.length)}`,
    )
  }
  const effective = withDefaults(scenario)
  const gravity = standardGravity.value
  const sea = buildOrRefuse(effective, gravity)
  const environment = createEnvironmentQuery(effective.environment, sea, gravity)
  const layout = layoutFor([], effective.settings)

  const state = new Float64Array(layout.state.length)
  state[STATE_HEADER.version] = STATE_VERSION
  state[STATE_HEADER.shipCount] = 0
  const derived = new Float64Array(layout.derived.length)
  const phases = new Float64Array(sea?.components.count ?? 0)

  let tick = 0
  const enter = (next: number): void => {
    tick = next
    state[STATE_HEADER.tick] = tick
    if (sea !== null) bandPhases(sea, tick, phases)
  }
  enter(0)

  return {
    get tick() {
      return tick
    },
    layout,
    state,
    derived,
    environment,
    sea,
    phases,
    effectiveScenario: effective,
    step: () => {
      enter(tick + 1)
    },
  }
}
