import type { AppliedInput, Input } from '@luovi/core'

// The contract applies an input at the later of the tick it names and the next tick, and records the tick it was
// applied at (ADR 0003), so every input is stamped on arrival and the stamp is what a later export replays.

export const stampInput = (input: Input, nextTick: number): AppliedInput => ({
  ...input,
  tick: Math.max(input.tick ?? nextTick, nextTick),
})

/** Stamped inputs waiting for their tick, and the log of those applied, in the order they arrived. */
export interface InputQueue {
  push(input: Input, nextTick: number): void
  /** Removes and returns the inputs stamped for this tick, appending them to the applied log. */
  take(tick: number): readonly AppliedInput[]
  readonly applied: readonly AppliedInput[]
}

export const createInputQueue = (): InputQueue => {
  let pending: AppliedInput[] = []
  const applied: AppliedInput[] = []
  return {
    push: (input, nextTick) => {
      pending.push(stampInput(input, nextTick))
    },
    take: (tick) => {
      const due = pending.filter((input) => input.tick === tick)
      pending = pending.filter((input) => input.tick !== tick)
      applied.push(...due)
      return due
    },
    applied,
  }
}
