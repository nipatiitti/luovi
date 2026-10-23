import type { EffectiveEnvironment, EnvironmentQuery, SeaDescription } from '@luovi/core'
import { exp, expm1, log, max, min, sincos } from '@luovi/core/math'
import { bandPhases } from './phases.ts'

// The CPU environment query (#8, docs/intention/05). Every per-component factor that does not depend on the point is
// formed here once, so a call allocates nothing and its inner loops are multiply-adds around one sincos.

/** The height vector10m is given at, m: the scenario contract's definition of the wind field, not a measured value. */
const WIND_REFERENCE_HEIGHT = 10

/**
 * The log profile as a factor on the 10 m wind: U(z) = U10 ln(z / z0) / ln(10 / z0), zero at or below z0 where the
 * profile has no meaning. The query and anything else that carries U10 to another height read this one law.
 */
export const windProfile = (z0: number): ((z: number) => number) => {
  const referenceLog = log(WIND_REFERENCE_HEIGHT / z0)
  return (z) => (z > z0 ? log(z / z0) / referenceLog : 0)
}

/**
 * Fixed-point iterations of x <- X - D(x) for the height at a world point (ADR 0005). Cold, from x = X every call, so a
 * result never depends on call history; with K <= 0.8 two of them bring the storm sea's worst height error to about 1 cm
 * (#4 resolution section 4).
 */
const INVERSE_ITERATIONS = 2

const checkStride = (method: string, points: Float64Array, out: Float64Array, stride: number): number => {
  if (points.length % 3 !== 0) {
    throw new RangeError(`${method}: points.length must be a multiple of 3, got ${String(points.length)}`)
  }
  const count = points.length / 3
  if (out.length !== count * stride) {
    throw new RangeError(
      `${method}: out.length must be ${String(count * stride)} for ${String(count)} points, got ${String(out.length)}`,
    )
  }
  return count
}

/**
 * The query over one effective environment and its built sea (null: flat water, zero height and orbital velocity). A
 * pure function of those, the tick and the points, so sim-world and a renderer's probe can each hold one.
 */
export const createEnvironmentQuery = (
  environment: EffectiveEnvironment,
  sea: SeaDescription | null,
  gravity: number,
): EnvironmentQuery => {
  const { depth } = environment
  if (sea !== null && sea.depth !== depth) {
    throw new RangeError(`The sea was built for depth ${String(sea.depth)} m, the environment has ${String(depth)} m`)
  }
  const [currentEast, currentNorth] = environment.current?.vector ?? [0, 0]
  const [windEast, windNorth] = environment.wind.vector10m
  const profile = windProfile(environment.wind.z0.value)

  const count = sea?.components.count ?? 0
  const kx = sea?.components.kx ?? new Float64Array(0)
  const ky = sea?.components.ky ?? new Float64Array(0)
  const k = sea?.components.k ?? new Float64Array(0)
  const amplitude = sea?.components.amplitude ?? new Float64Array(0)
  const lambda = sea?.choppiness ?? 0
  // D = Re sum +i lambda k_hat A e^(i theta) = -lambda k_hat A sin(theta), the Gerstner sign (3.8 convention).
  const displaceX = new Float64Array(count)
  const displaceY = new Float64Array(count)
  // Linear-theory orbital velocity amplitudes at the surface before depth decay: k_hat A omega and A omega.
  const velocityX = new Float64Array(count)
  const velocityY = new Float64Array(count)
  const velocityZ = new Float64Array(count)
  // 1 - exp(-2 k d), the sinh(k d) denominator scaled by exp(-k d) so deep components neither overflow nor cancel.
  const decayDenominator = new Float64Array(count)
  for (let i = 0; i < count; i += 1) {
    const kI = k[i] ?? 0
    const aI = amplitude[i] ?? 0
    const aOmega = aI * (sea?.components.omega[i] ?? 0)
    displaceX[i] = (-lambda * aI * (kx[i] ?? 0)) / kI
    displaceY[i] = (-lambda * aI * (ky[i] ?? 0)) / kI
    velocityX[i] = (aOmega * (kx[i] ?? 0)) / kI
    velocityY[i] = (aOmega * (ky[i] ?? 0)) / kI
    velocityZ[i] = aOmega
    decayDenominator[i] = -expm1(-2 * kI * depth)
  }
  // cosh(k (z + d)) / sinh(k d) and sinh(k (z + d)) / sinh(k d) at the depth last filled, so the common case of many
  // points at one depth (the surface) pays the exponentials once.
  const horizontalDecay = new Float64Array(count)
  const verticalDecay = new Float64Array(count)
  let decayDepth = Number.NaN
  const fillDecay = (z: number): void => {
    for (let i = 0; i < count; i += 1) {
      const kI = k[i] ?? 0
      const rising = exp(kI * z)
      const falling = exp(-kI * (z + 2 * depth))
      const denominator = decayDenominator[i] ?? 1
      horizontalDecay[i] = (rising + falling) / denominator
      verticalDecay[i] = (rising - falling) / denominator
    }
    decayDepth = z
  }

  const phases = new Float64Array(count)
  let phaseTick = Number.NaN
  const trig = new Float64Array(2)

  /** Writes D at reference point (x, y) to displacement[0] (east) and displacement[1] (north). */
  const displacement = new Float64Array(2)
  const displace = (x: number, y: number): void => {
    let dx = 0
    let dy = 0
    for (let i = 0; i < count; i += 1) {
      sincos((kx[i] ?? 0) * x + (ky[i] ?? 0) * y + (phases[i] ?? 0), trig, 0)
      const s = trig[0] ?? 0
      dx += (displaceX[i] ?? 0) * s
      dy += (displaceY[i] ?? 0) * s
    }
    displacement[0] = dx
    displacement[1] = dy
  }

  return {
    // Design cost from the #4 research, for the ocean.band-hs report to compare against: about 8 ns per component per
    // point per pass, so 200 points with N = 32 and two inverse iterations (three passes) took 147 us per tick in Node 26
    // on an M1 Pro, surface points only.
    water: (tick, points, out) => {
      const pointCount = checkStride('water', points, out, 4)
      if (sea !== null && tick !== phaseTick) {
        bandPhases(sea, tick, phases)
        phaseTick = tick
      }
      for (let p = 0; p < pointCount; p += 1) {
        const worldX = points[3 * p] ?? 0
        const worldY = points[3 * p + 1] ?? 0
        let x = worldX
        let y = worldY
        for (let iteration = 0; iteration < INVERSE_ITERATIONS; iteration += 1) {
          displace(x, y)
          x = worldX - (displacement[0] ?? 0)
          y = worldY - (displacement[1] ?? 0)
        }
        // Linear theory is evaluated up to the mean level and at most at the bed, as the contract states.
        const z = min(0, max(-depth, points[3 * p + 2] ?? 0))
        if (z !== decayDepth) fillDecay(z)
        // Height and velocity are read at the reference point x0 whose displaced position is the query point, so the
        // velocity is that of the water particle drawn there.
        let height = 0
        let east = 0
        let north = 0
        let up = 0
        for (let i = 0; i < count; i += 1) {
          sincos((kx[i] ?? 0) * x + (ky[i] ?? 0) * y + (phases[i] ?? 0), trig, 0)
          const s = trig[0] ?? 0
          const c = trig[1] ?? 0
          const horizontal = (horizontalDecay[i] ?? 0) * c
          height += (amplitude[i] ?? 0) * c
          east += (velocityX[i] ?? 0) * horizontal
          north += (velocityY[i] ?? 0) * horizontal
          up += (velocityZ[i] ?? 0) * (verticalDecay[i] ?? 0) * s
        }
        out[4 * p] = height
        out[4 * p + 1] = east + currentEast
        out[4 * p + 2] = north + currentNorth
        out[4 * p + 3] = up
      }
    },
    wind: (_tick, points, out) => {
      const pointCount = checkStride('wind', points, out, 3)
      for (let p = 0; p < pointCount; p += 1) {
        const z = points[3 * p + 2] ?? 0
        const factor = profile(z)
        out[3 * p] = windEast * factor
        out[3 * p + 1] = windNorth * factor
        out[3 * p + 2] = 0
      }
    },
    depth: (points, out) => {
      const pointCount = checkStride('depth', points, out, 1)
      out.fill(depth, 0, pointCount)
    },
    constants: {
      waterDensity: environment.water.density.value,
      waterKinematicViscosity: environment.water.kinematicViscosity.value,
      airDensity: environment.air.density.value,
      gravity,
    },
  }
}
