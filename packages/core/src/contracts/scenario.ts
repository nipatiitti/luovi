import * as v from 'valibot'
import { type CitedValue, CitedValueSchema } from '../cited.ts'
import { parseContract } from './parse.ts'

// Scenario contract version 1 (ADR 0010, #11). Core checks shape and the structural defaults that are design choices;
// empirical defaults and ranges (gamma, the Baltic water and air, the open-sea z0) come from data and are applied and
// checked by sim-world, so no measured number lives here.

/** The contract version; inputs and recordings carry the same one (input.ts says why). */
export const SCENARIO_VERSION = 1
/** The band is summed per query point every tick, so its component count is a CPU cost, not a free choice. */
export const MAX_BAND_COMPONENTS = 48

const finite = v.pipe(v.number(), v.finite())
const positive = v.pipe(v.number(), v.finite(), v.gtValue(0))
const integerAtLeast = (min: number) => v.pipe(v.number(), v.integer(), v.minValue(min))

/** [east, north], SI. */
export const Vec2Schema = v.strictTuple([finite, finite])
/** [x, y, z] in the frame the field names, SI. */
export const Vec3Schema = v.strictTuple([finite, finite, finite])
export type Vec2 = v.InferOutput<typeof Vec2Schema>
export type Vec3 = v.InferOutput<typeof Vec3Schema>

const PositiveCitedSchema = v.pipe(
  CitedValueSchema,
  v.forward(
    v.check((cited) => cited.value > 0, 'Expected a value greater than 0'),
    ['value'],
  ),
)

export const WindSchema = v.strictObject({
  /** m/s at 10 m. */
  vector10m: Vec2Schema,
  /** Roughness length of the log profile, m. */
  z0: v.optional(PositiveCitedSchema),
})

/** The sea block decided on #8; the band and the tail are built from these and the scenario seed and depth. */
export const SeaBlockSchema = v.pipe(
  v.strictObject({
    /** m/s at 10 m, the wind that generated the waves, independent of environment.wind. */
    generatingWind: v.pipe(
      Vec2Schema,
      v.check(([east, north]) => east * east + north * north > 0, 'Expected a non-zero generating wind'),
    ),
    /** m. */
    fetch: positive,
    /** JONSWAP peak enhancement; its default and range are empirical, so sim-world applies them from data. */
    gamma: v.optional(finite),
    /** k_s / k_p, where the band hands over to the tail. */
    cutRatio: v.optional(v.pipe(v.number(), v.finite(), v.gtValue(1)), 3),
    strips: v.optional(integerAtLeast(1), 8),
    sectors: v.optional(integerAtLeast(1), 4),
    /** Lambda before the contraction clamp; sim-world records the effective value. */
    choppiness: v.optional(v.pipe(v.number(), v.finite(), v.minValue(0)), 1),
  }),
  v.forward(
    v.check(
      (sea) => sea.strips * sea.sectors <= MAX_BAND_COMPONENTS,
      `Expected strips * sectors to be at most ${String(MAX_BAND_COMPONENTS)}`,
    ),
    ['strips'],
  ),
)

export const CurrentSchema = v.strictObject({
  /** m/s, uniform. An object so it can grow a field without a version bump. */
  vector: Vec2Schema,
})

export const EnvironmentSchema = v.strictObject({
  wind: WindSchema,
  /** m, uniform; the sea's TMA factor reads it. */
  depth: positive,
  /** Absent: flat water. */
  sea: v.optional(SeaBlockSchema),
  /** Absent: no current. */
  current: v.optional(CurrentSchema),
  water: v.optional(
    v.strictObject({
      /** kg/m^3. */
      density: PositiveCitedSchema,
      /** m^2/s. */
      kinematicViscosity: PositiveCitedSchema,
    }),
  ),
  /** kg/m^3. */
  air: v.optional(v.strictObject({ density: PositiveCitedSchema })),
})

const ClothGridSchema = v.strictObject({ rows: integerAtLeast(2), cols: integerAtLeast(2) })

export const SettingsSchema = v.strictObject({
  clothGrid: v.optional(ClothGridSchema, { rows: 6, cols: 6 }),
  rigSubsteps: v.optional(integerAtLeast(1), 16),
  vlm: v.optional(v.strictObject({ verifyBasis: v.optional(v.boolean(), false) }), {}),
})

const id = v.pipe(v.string(), v.nonEmpty())

/** Schema only in step 1 (#11). Body frame x forward, y port, z up. */
export const ShipInstanceSchema = v.strictObject({
  definition: id,
  /** Defaults to the definition id. */
  instance: v.optional(id),
  loadCondition: id,
  tuning: id,
  /** m, m, and rad about world z from east, counter-clockwise. */
  pose: v.strictObject({ x: finite, y: finite, yaw: finite }),
  /** Body frame, m/s and rad/s; absent is at rest. */
  velocity: v.optional(v.strictObject({ linear: Vec3Schema, angular: Vec3Schema })),
  /** Control id to absolute target; unnamed controls start at the definition's rest value. */
  controls: v.optional(v.record(id, finite)),
  clothGrid: v.optional(ClothGridSchema),
  /** m, rad, rad; only for benchmarks that start away from the solved static equilibrium. */
  attitude: v.optional(v.strictObject({ z: finite, heel: finite, trim: finite })),
})

export const ScenarioSchema = v.strictObject({
  version: v.literal(SCENARIO_VERSION),
  seed: v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(0xffffffff)),
  environment: EnvironmentSchema,
  settings: v.optional(SettingsSchema, {}),
  ships: v.array(ShipInstanceSchema),
})

export type Wind = v.InferOutput<typeof WindSchema>
export type SeaBlock = v.InferOutput<typeof SeaBlockSchema>
export type Current = v.InferOutput<typeof CurrentSchema>
export type Environment = v.InferOutput<typeof EnvironmentSchema>
export type Settings = v.InferOutput<typeof SettingsSchema>
export type ShipInstance = v.InferOutput<typeof ShipInstanceSchema>
export type Scenario = v.InferOutput<typeof ScenarioSchema>
/** The authored form, with every defaulted field optional. */
export type ScenarioInput = v.InferInput<typeof ScenarioSchema>

/** What sim-world holds and exports: the cited constants and gamma filled in, so the file says what it simulated. */
export type EffectiveScenario = Omit<Scenario, 'environment'> & {
  environment: EffectiveEnvironment
}
export type EffectiveEnvironment = Omit<Environment, 'wind' | 'sea' | 'water' | 'air'> & {
  wind: Omit<Wind, 'z0'> & { z0: CitedValue }
  sea?: EffectiveSeaBlock
  water: { density: CitedValue; kinematicViscosity: CitedValue }
  air: { density: CitedValue }
}
export type EffectiveSeaBlock = SeaBlock & { gamma: number }

export const parseScenario = (input: unknown): Scenario => parseContract(ScenarioSchema, 'scenario', input)
