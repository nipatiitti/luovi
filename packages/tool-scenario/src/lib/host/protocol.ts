import type { EffectiveScenario, Input, SeaDescription, StateLayout } from '@luovi/core'
import type { ProbeGrid } from './probe.ts'
import type { SlotLayout } from './slots.ts'

// The messages between the page and the simulation Worker. Both ends are this tool, so they are a TypeScript union
// rather than schemas (ADR 0003); the scenario inside a load and an input are still parsed by core's contracts.

export type ToWorker =
  /** Replaces the running world; the scenario is any document, which the Worker validates. */
  | { readonly kind: 'load'; readonly scenario: unknown; readonly probe: ProbeGrid }
  | { readonly kind: 'play' }
  | { readonly kind: 'pause' }
  /** Pauses, then runs exactly one tick. */
  | { readonly kind: 'step' }
  /** Multiplier on real time, greater than zero. */
  | { readonly kind: 'speed'; readonly multiplier: number }
  /** One input as the contract defines it, applied at the later of its tick and the next tick. */
  | { readonly kind: 'input'; readonly input: Input }

export type FromWorker =
  | {
      readonly kind: 'loaded'
      readonly buffer: SharedArrayBuffer
      readonly layout: StateLayout
      readonly slot: SlotLayout
      readonly probe: ProbeGrid
      /** null: flat water. */
      readonly sea: SeaDescription | null
      readonly effectiveScenario: EffectiveScenario
      /** Definition hash per ship definition id; empty until ships load in step 2. */
      readonly definitionHashes: Readonly<Record<string, number>>
    }
  /** A load or an input the Worker refused; the previous world, if any, keeps running. */
  | { readonly kind: 'error'; readonly message: string }
  | {
      readonly kind: 'status'
      readonly running: boolean
      /** The published tick. */
      readonly tick: number
      /** Mean wall milliseconds per tick over the ticks of the last status period that ran any; undefined before the first. */
      readonly msPerTick: number | undefined
    }
