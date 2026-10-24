import { type SeaDescription, TICKS_PER_SECOND } from '@luovi/core'
import { remainder, TWO_PI } from '@luovi/core/math'

/**
 * Fills phases[i] = remainder(phi_i - omega_i t, 2 pi) with t = tick / TICKS_PER_SECOND: the one phase convention, used
 * by the query and by the renderer, which then adds its own k . x. remainder (#8), not %, so the result is the symmetric
 * [-pi, pi] whatever the sign of phi - omega t, the range where a float32 upload and the trig reduction lose least.
 * Throws RangeError when phases.length is not the component count.
 */
export const bandPhases = (sea: SeaDescription, tick: number, phases: Float64Array): void => {
  const { count, omega, phase } = sea.components
  if (phases.length !== count) {
    throw new RangeError(`bandPhases needs ${String(count)} entries, got ${String(phases.length)}`)
  }
  const t = tick / TICKS_PER_SECOND
  for (let i = 0; i < count; i += 1) phases[i] = remainder((phase[i] ?? 0) - (omega[i] ?? 0) * t, TWO_PI)
}
