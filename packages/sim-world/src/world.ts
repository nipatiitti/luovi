import {
  type AppliedInput,
  ContractError,
  type EffectiveEnvironment,
  type EffectiveScenario,
  type EnvironmentQuery,
  type Input,
  layoutFor,
  parseInput,
  parseScenario,
  type SeaDescription,
  STATE_HEADER,
  STATE_VERSION,
  type StateLayout,
} from '@luovi/core'
import { standardGravity } from '@luovi/data'
import { bandPhases, buildSea, createEnvironmentQuery } from '@luovi/sim-ocean'
import {
  type BlockSource,
  effectiveScenario as withDefaults,
  effectiveSeaBlock,
  effectiveWind,
  INPUT_VALUE,
  SCENARIO_SEA,
} from './effective.ts'

/** One loaded scenario: the integer tick, the state buffer and the environment the force modules will query. */
export interface World {
  readonly tick: number
  readonly layout: StateLayout
  /** Live; the header only in step 1 (state version, tick, ship count), and step() writes the tick into it. */
  readonly state: Float64Array
  /** Live; empty in step 1. */
  readonly derived: Float64Array
  /** A pure function of the effective environment, the tick and the points; a new one after an environment input. */
  readonly environment: EnvironmentQuery
  /** null: flat water. A new object after a sea input, so a renderer can tell by identity that it must upload again. */
  readonly sea: SeaDescription | null
  /**
   * Live within one sea; the band phases at the current tick by the one convention of bandPhases, what a renderer
   * uploads. A sea input replaces the array, since its component count may differ.
   */
  readonly phases: Float64Array
  /** The authored scenario after every environment input applied so far, with the data defaults filled in. */
  readonly effectiveScenario: EffectiveScenario
  /** Every input applied so far, in the order applied, each with the tick it was applied at: a recording's inputs. */
  readonly inputs: readonly AppliedInput[]
  /**
   * Validates an input and schedules it for the later of the tick it names and the next tick; returns it stamped with
   * that tick. Throws ContractError for an input the world refuses, which leaves the world as it was.
   */
  applyInput(input: Input): AppliedInput
  /** Advances one tick, applies the inputs due at it, forms the band phases and returns the inputs it applied. */
  step(): readonly AppliedInput[]
}

// A sea the schema accepts can still be one the build cannot make (a band variance that underflows); the build's
// RangeError is re-thrown as a contract error so the message names the block, as every other load error does.
const buildOrRefuse = (
  environment: EffectiveEnvironment,
  gravity: number,
  seed: number,
  source: BlockSource,
): SeaDescription | null => {
  const { sea, depth } = environment
  if (sea === undefined) return null
  try {
    return buildSea(sea, depth, gravity, seed)
  } catch (error) {
    if (error instanceof RangeError) throw new ContractError(source.contract, source.path, error.message)
    throw error
  }
}

/** The effective environment with one block replaced whole; null removes an optional block. */
const replaceBlock = (environment: EffectiveEnvironment, input: Extract<Input, { kind: 'environment' }>) => {
  const { sea, current, ...rest } = environment
  switch (input.block) {
    case 'sea':
      return {
        ...rest,
        ...(current === undefined ? {} : { current }),
        ...(input.value === null ? {} : { sea: effectiveSeaBlock(input.value, INPUT_VALUE) }),
      }
    case 'wind':
      return { ...environment, wind: effectiveWind(input.value) }
    case 'current':
      return {
        ...rest,
        ...(sea === undefined ? {} : { sea }),
        ...(input.value === null ? {} : { current: input.value }),
      }
  }
}

/** An input accepted and waiting for its tick, with what it will replace already built so applying cannot fail. */
interface Scheduled {
  readonly input: AppliedInput & { readonly kind: 'environment' }
  readonly environment: (base: EffectiveEnvironment) => EffectiveEnvironment
  /** Present for a sea input: the sea it brings, built from the scenario's one seed and depth. */
  readonly sea?: SeaDescription | null
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
  const gravity = standardGravity.value
  let effective = withDefaults(scenario)
  let sea = buildOrRefuse(effective.environment, gravity, scenario.seed, SCENARIO_SEA)
  let environment = createEnvironmentQuery(effective.environment, sea, gravity)
  let phases = new Float64Array(sea?.components.count ?? 0)
  const layout = layoutFor([], effective.settings)

  const state = new Float64Array(layout.state.length)
  state[STATE_HEADER.version] = STATE_VERSION
  state[STATE_HEADER.shipCount] = 0
  const derived = new Float64Array(layout.derived.length)

  const applied: AppliedInput[] = []
  // In arrival order, which is the order inputs due at the same tick apply in; stamps need not rise along it, since a
  // future-tick input can arrive before an untimed one. The applied log is in applied order, so a replay reproduces it.
  let scheduled: Scheduled[] = []

  let tick = 0

  // A sea input is a hard replace (ADR 0003 amendment): the band is rebuilt and its phases redrawn from the seed, so the
  // surface jumps at the applied tick rather than blending, which keeps the state a function of scenario and inputs.
  const apply = (due: readonly Scheduled[]): void => {
    for (const entry of due) {
      effective = { ...effective, environment: entry.environment(effective.environment) }
      if (entry.sea !== undefined) {
        sea = entry.sea
        phases = new Float64Array(sea?.components.count ?? 0)
      }
      applied.push(entry.input)
    }
    if (due.length > 0) environment = createEnvironmentQuery(effective.environment, sea, gravity)
  }

  const enter = (next: number): readonly AppliedInput[] => {
    tick = next
    const due = scheduled.filter((entry) => entry.input.tick <= tick)
    scheduled = scheduled.filter((entry) => entry.input.tick > tick)
    apply(due)
    state[STATE_HEADER.tick] = tick
    if (sea !== null) bandPhases(sea, tick, phases)
    return due.map((entry) => entry.input)
  }
  enter(0)

  const schedule = (document: Input): AppliedInput => {
    const input = parseInput(document)
    const at = input.tick === undefined || input.tick <= tick ? tick + 1 : input.tick
    if (input.kind === 'control') {
      throw new ContractError(
        'input',
        'kind',
        `Control inputs are applied from step 2 of the build, when ships are simulated; got one for ${input.ship}.${input.control}`,
      )
    }
    const stamped = { ...input, tick: at }
    const replace = (base: EffectiveEnvironment): EffectiveEnvironment => replaceBlock(base, input)
    // Built now against the current environment so a refused sea is refused on arrival, not at its tick; the sea reads
    // only its own block, the scenario's depth and the seed, none of which another input can change.
    const entry: Scheduled =
      input.block === 'sea'
        ? {
            input: stamped,
            environment: replace,
            sea: buildOrRefuse(replace(effective.environment), gravity, effective.seed, INPUT_VALUE),
          }
        : { input: stamped, environment: replace }
    scheduled.push(entry)
    return stamped
  }

  return {
    get tick() {
      return tick
    },
    layout,
    state,
    derived,
    get environment() {
      return environment
    },
    get sea() {
      return sea
    },
    get phases() {
      return phases
    },
    get effectiveScenario() {
      return effective
    },
    inputs: applied,
    applyInput: schedule,
    step: () => enter(tick + 1),
  }
}
