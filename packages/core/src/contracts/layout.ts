import type { Settings } from './scenario.ts'

/** Bumped whenever the state layout changes; a bump invalidates recorded buffers and needs no migration (ADR 0003). */
export const STATE_VERSION = 1

/** Placeholder for the ship definition contract, which arrives in step 2; until then only an empty list type-checks. */
export type ShipDefinition = never

/** Word indices into the state region that every layout shares; step 2 appends ship regions after them. */
export const STATE_HEADER = { version: 0, tick: 1, shipCount: 2 } as const
const HEADER_LENGTH = 3

export interface StateLayout {
  /** Complete integrator state, hashed and recorded. */
  readonly state: {
    readonly length: number
    readonly header: typeof STATE_HEADER
  }
  /** Computed from state each tick and never fed back, so never hashed. */
  readonly derived: { readonly length: number }
  /** One handoff slot (ADR 0003): the state region at offset 0, then the derived region. */
  readonly slot: { readonly length: number; readonly derivedOffset: number }
}

// Step 1 has no ship definition type, so the list is always empty and the settings have nothing to size yet; both are in
// the signature so step 2 adds the per-ship regions without a host change.
/** Pure function of the definitions and the resolved settings, never stored with a buffer (ADR 0003). */
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- read by step 2's ship regions, see above
export const layoutFor = (definitions: readonly ShipDefinition[], settings: Settings): StateLayout => {
  const state = HEADER_LENGTH
  const derived = 0
  return {
    state: { length: state, header: STATE_HEADER },
    derived: { length: derived },
    slot: { length: state + derived, derivedOffset: state },
  }
}
