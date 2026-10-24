import {
  type CitedValue,
  type Current,
  type EffectiveScenario,
  type EffectiveSeaBlock,
  type Input,
  parseScenario,
  type SeaBlock,
  type Wind,
} from '@luovi/core'
import { effectiveSeaBlock } from '@luovi/sim-world'
import { bearing, toDegrees, toRadians } from './angles.ts'
import moderate from './scenarios/reference-seas/moderate.json' with { type: 'json' }

// The live environment panel's model. The panel speaks knots and compass bearings, the contract east/north vectors in
// m/s; every conversion happens in this file, at the boundary, so the blocks the panel sends are plain contract blocks.

/** m/s per knot, exact: the international nautical mile is 1852 m. */
const KNOT = 1852 / 3600

const round = (value: number, places: number): number => Number(value.toFixed(places))

/** Speed and the compass bearing a vector points toward. */
const polar = ([east, north]: readonly [number, number]): { knots: number; toward: number } => ({
  knots: round(Math.hypot(east, north) / KNOT, 1),
  toward: round(bearing(toDegrees(Math.atan2(east, north))), 0),
})

const vector = (knots: number, toward: number): [number, number] => {
  const speed = knots * KNOT
  const angle = toRadians(toward)
  return [speed * Math.sin(angle), speed * Math.cos(angle)]
}

// Wind is named by where it blows from, a current by where it sets toward, as a sailor reads both.
const fromWind = (vector10m: readonly [number, number]): { knots: number; from: number } => {
  const { knots, toward } = polar(vector10m)
  return { knots, from: bearing(toward + 180) }
}
const windVector = (knots: number, from: number): [number, number] => vector(knots, from + 180)

// The form shows a loaded value rounded, so rebuilding it from the form would turn the first edit of any field in its
// block into a change of that value too (12 m/s comes back as 11.987). The loaded value is kept while the form still
// shows what `shown` makes of it, and the form's own is sent once any shown number differs.
const kept = <T>(
  loaded: T | undefined,
  shown: (value: T) => readonly number[],
  form: readonly number[],
  fromForm: () => T,
): T => {
  if (loaded === undefined) return fromForm()
  const rounded = shown(loaded)
  return rounded.every((value, i) => value === form[i]) ? loaded : fromForm()
}
const copy = ([east, north]: readonly [number, number]): [number, number] => [east, north]
const keptWind = (knots: number, from: number, loaded: readonly [number, number]): [number, number] =>
  copy(
    kept(
      loaded,
      (value) => {
        const shown = fromWind(value)
        return [shown.knots, shown.from]
      },
      [knots, from],
      () => windVector(knots, from),
    ),
  )
/** km to one decimal, as the form shows a fetch. */
const fetchShown = (metres: number): number => round(metres / 1000, 1)

export interface WindForm {
  knots: number
  /** Compass degrees the wind blows from. */
  from: number
  /** Roughness length in millimetres. */
  roughness: number
}

export interface SeaForm {
  /** Off: flat water, the sea block removed. */
  on: boolean
  knots: number
  from: number
  /** km. */
  fetch: number
  gamma: number
  cutRatio: number
  strips: number
  sectors: number
  choppiness: number
}

export interface CurrentForm {
  knots: number
  /** Compass degrees the current sets toward. */
  toward: number
}

export interface EnvironmentForm {
  wind: WindForm
  sea: SeaForm
  current: CurrentForm
  /** m; reload-only, since the sea and every later block read the scenario's one depth. */
  depth: number
  /** Reload-only: the scenario seed, from which the phases are drawn. */
  seed: number
}

/** What a sea toggled on starts from when the loaded scenario had none: the moderate reference sea, with its defaults. */
const seaWhenNone = (): EffectiveSeaBlock => {
  const { sea } = parseScenario(moderate).environment
  if (sea === undefined) throw new Error('The moderate reference sea has no sea block')
  return effectiveSeaBlock(sea)
}

/** The form a loaded effective scenario opens the panel with. */
export const formFor = (scenario: EffectiveScenario): EnvironmentForm => {
  const { wind, current, depth } = scenario.environment
  const sea = scenario.environment.sea ?? seaWhenNone()
  const set = polar(current?.vector ?? [0, 0])
  return {
    wind: { ...fromWind(wind.vector10m), roughness: round(wind.z0.value * 1000, 3) },
    sea: {
      on: scenario.environment.sea !== undefined,
      ...fromWind(sea.generatingWind),
      fetch: fetchShown(sea.fetch),
      gamma: sea.gamma,
      cutRatio: sea.cutRatio,
      strips: sea.strips,
      sectors: sea.sectors,
      choppiness: sea.choppiness,
    },
    current: { knots: set.knots, toward: set.toward },
    depth,
    seed: scenario.seed,
  }
}

/**
 * The wind block for the form, from the block in effect. The loaded roughness length keeps its citation while the form
 * leaves it alone; a value typed by hand is the person's estimate and says so.
 */
export const windBlock = (form: WindForm, loaded: { vector10m: readonly [number, number]; z0: CitedValue }): Wind => ({
  vector10m: keptWind(form.knots, form.from, loaded.vector10m),
  z0: kept(
    loaded.z0,
    (z0) => [round(z0.value * 1000, 3)],
    [form.roughness],
    () => ({ value: form.roughness / 1000, src: 'Estimate: set by hand in the scenario tool' }),
  ),
})

/** The sea block for the form, from the sea in effect, or the one a sea toggled on starts from when there is none. */
export const seaBlock = (form: SeaForm, inEffect: EffectiveSeaBlock | undefined): SeaBlock | null => {
  if (!form.on) return null
  const loaded = inEffect ?? seaWhenNone()
  return {
    generatingWind: keptWind(form.knots, form.from, loaded.generatingWind),
    fetch: kept(
      loaded.fetch,
      (metres) => [fetchShown(metres)],
      [form.fetch],
      () => form.fetch * 1000,
    ),
    gamma: form.gamma,
    cutRatio: form.cutRatio,
    strips: form.strips,
    sectors: form.sectors,
    choppiness: form.choppiness,
    // PROTOTYPE (band size, #43): the panel has no control for it; an edit keeps the form the loaded sea has.
    boundWaves: loaded.boundWaves,
  }
}

export const currentBlock = (form: CurrentForm, inEffect: Current | undefined): Current | null =>
  form.knots > 0
    ? {
        vector: copy(
          kept(
            inEffect?.vector,
            (value) => {
              const shown = polar(value)
              return [shown.knots, shown.toward]
            },
            [form.knots, form.toward],
            () => vector(form.knots, form.toward),
          ),
        ),
      }
    : null

type EnvironmentInput = Extract<Input, { kind: 'environment' }>
export type Block = EnvironmentInput['block']

/**
 * Collects the latest whole block per edited block and sends each at most once per frame, so a dragged slider becomes
 * one input a frame rather than one per pointer event.
 */
export interface BlockSender {
  edit(input: EnvironmentInput): void
  /** Sends what changed since the last flush; call once per animation frame. */
  flush(): void
  /** Drops unsent edits, as a reload does. */
  clear(): void
}

export const createBlockSender = (send: (input: Input) => void): BlockSender => {
  const latest = new Map<Block, EnvironmentInput>()
  return {
    edit: (input) => {
      latest.set(input.block, input)
    },
    flush: () => {
      for (const input of latest.values()) send(input)
      latest.clear()
    },
    clear: () => {
      latest.clear()
    },
  }
}

/** The effective scenario as a file: it validates against Scenario and loads in tool-validate unchanged. */
export const scenarioFile = (scenario: EffectiveScenario): Blob =>
  new Blob([`${JSON.stringify(scenario, null, 2)}\n`], { type: 'application/json' })
