import { abs, max, sqrt, tanh } from '@luovi/core/math'

// The finite-depth linear dispersion relation omega^2 = g k tanh(k d), the one relation band, tail and query share.

/** omega(k), rad/s, for k >= 0 in rad/m. */
export const dispersionFrequency = (k: number, depth: number, gravity: number): number =>
  sqrt(gravity * k * tanh(k * depth))

/** d omega / d k = g (tanh(k d) + k d sech^2(k d)) / (2 omega), m/s; the shallow-water speed sqrt(g d) at k = 0. */
export const groupVelocity = (k: number, depth: number, gravity: number): number => {
  if (k <= 0) return sqrt(gravity * depth)
  const t = tanh(k * depth)
  return (gravity * (t + k * depth * (1 - t * t))) / (2 * sqrt(gravity * k * t))
}

// Newton stops when a step changes k by less than this fraction of it: convergence is quadratic, so the k after that step
// is already exact to rounding, and the bound sits above the few-ulp noise of the residual so it is always reached. The
// cap only guards a non-finite input; from the lower bound below it converges in well under ten.
const NEWTON_TOLERANCE = 1e-14
const NEWTON_ITERATIONS = 64

/** k(omega), rad/m, by Newton on g k tanh(k d) - omega^2. Throws RangeError if it does not converge. */
export const dispersionWavenumber = (omega: number, depth: number, gravity: number): number => {
  if (omega === 0) return 0
  const omega2 = omega * omega
  // tanh(k d) <= 1 and tanh(k d) <= k d make both the deep and the shallow wavenumber lower bounds, so the larger of the
  // two starts Newton on the root's side where it cannot jump to k <= 0.
  let k = max(omega2 / gravity, omega / sqrt(gravity * depth))
  for (let iteration = 0; iteration < NEWTON_ITERATIONS; iteration += 1) {
    const t = tanh(k * depth)
    const step = (gravity * k * t - omega2) / (gravity * (t + k * depth * (1 - t * t)))
    k -= step
    if (abs(step) <= NEWTON_TOLERANCE * k) return k
  }
  throw new RangeError(`The dispersion relation did not converge for omega = ${String(omega)} rad/s`)
}
