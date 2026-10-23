import * as v from 'valibot'
import { parseContract } from './parse.ts'
import { CurrentSchema, SCENARIO_VERSION, ScenarioSchema, SeaBlockSchema, WindSchema } from './scenario.ts'

// Inputs and recordings share the scenario's version: a replay is the scenario plus the input stream re-simulated, so the
// two cannot drift apart (ADR 0003).

const tickSchema = v.pipe(v.number(), v.integer(), v.minValue(0))

// A live input may omit its tick ("next tick"); a recorded one always carries the tick it was applied at, so both come
// from one builder and differ only there.
const inputSchemaWithTick = <TTick extends v.GenericSchema<unknown, number | undefined>>(tick: TTick) =>
  v.variant('kind', [
    v.strictObject({
      tick,
      kind: v.literal('control'),
      ship: v.pipe(v.string(), v.nonEmpty()),
      control: v.pipe(v.string(), v.nonEmpty()),
      target: v.pipe(v.number(), v.finite()),
    }),
    // Whole-block replacement, never a deep patch; null removes an optional block.
    v.variant('block', [
      v.strictObject({
        tick,
        kind: v.literal('environment'),
        block: v.literal('sea'),
        value: v.nullable(SeaBlockSchema),
      }),
      v.strictObject({ tick, kind: v.literal('environment'), block: v.literal('wind'), value: WindSchema }),
      v.strictObject({
        tick,
        kind: v.literal('environment'),
        block: v.literal('current'),
        value: v.nullable(CurrentSchema),
      }),
    ]),
  ])

export const InputSchema = inputSchemaWithTick(v.optional(tickSchema))
export const AppliedInputSchema = inputSchemaWithTick(tickSchema)

export const RecordingSchema = v.strictObject({
  version: v.literal(SCENARIO_VERSION),
  /** The authored scenario, not the effective one: the inputs re-create every edit. */
  scenario: ScenarioSchema,
  inputs: v.array(AppliedInputSchema),
})

export type Input = v.InferOutput<typeof InputSchema>
/** An input with the tick it was applied at; what a recording stores and what the world returns on apply. */
export type AppliedInput = v.InferOutput<typeof AppliedInputSchema>
export type Recording = v.InferOutput<typeof RecordingSchema>

export const parseInput = (input: unknown): Input => parseContract(InputSchema, 'input', input)
export const parseRecording = (input: unknown): Recording => parseContract(RecordingSchema, 'recording', input)
