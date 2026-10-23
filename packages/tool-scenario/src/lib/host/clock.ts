import { TICKS_PER_SECOND } from '@luovi/core'

// The Worker's pacing (ADR 0003): a fixed-step accumulator of wall time, scaled by the speed multiplier. After a stall
// (a throttled background tab, a debugger pause) it runs at most this many ticks in one wake and then drops the rest,
// so simulated time falls behind real time instead of bursting.
export const MAX_TICKS_PER_WAKE = 4

export const TICK_MILLISECONDS = 1000 / TICKS_PER_SECOND

export interface Pacing {
  /** Ticks to run in this wake. */
  readonly ticks: number
  /** Scaled milliseconds carried to the next wake, less than one tick. */
  readonly accumulator: number
}

/** The ticks due after `elapsed` wall milliseconds at `speed` times real time, given what the last wake carried. */
export const pace = (accumulator: number, elapsed: number, speed: number): Pacing => {
  const total = accumulator + elapsed * speed
  const due = Math.floor(total / TICK_MILLISECONDS)
  if (due > MAX_TICKS_PER_WAKE) return { ticks: MAX_TICKS_PER_WAKE, accumulator: 0 }
  return { ticks: due, accumulator: total - due * TICK_MILLISECONDS }
}

/** Wall milliseconds until the accumulator reaches the next tick. */
export const untilNextTick = (accumulator: number, speed: number): number =>
  Math.max(0, (TICK_MILLISECONDS - accumulator) / speed)
