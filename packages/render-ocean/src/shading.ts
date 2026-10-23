import type { CitedValue } from '@luovi/core'
import { type SeaDescription, windProfile } from '@luovi/sim-world'

// The CPU half of the sea's filtered shading (#36): the slope covariances the band contributes, whole and per ring, the
// Cox and Munk target the floor fills up to, and the water's absorption per channel. Symmetric 2 by 2 slope covariances
// travel as (xx, yy, xy), x east, y north.

type Rgb = readonly [number, number, number]

/**
 * The optical and foam constants the shading reads. Renderers cannot import `data`, so the tool passes its tables here:
 * `coxMunk`, `openSeaRoughnessLength`, `balticOptics`, `foamReflectance` and `foamDecayTime` match these shapes field
 * for field.
 */
export interface OceanOptics {
  readonly coxMunk: {
    readonly upwindIntercept: CitedValue
    readonly upwindSlope: CitedValue
    readonly crosswindIntercept: CitedValue
    readonly crosswindSlope: CitedValue
    /** m, where the fits' wind was measured. */
    readonly windHeight: CitedValue
  }
  /** m, the log profile's z0 that carries the sea's U10 to the Cox and Munk anemometer height. */
  readonly roughnessLength: CitedValue
  readonly water: {
    readonly refractiveIndex: CitedValue
    /** nm per channel, red, green, blue: the atmosphere's, so sky light and water share channels. */
    readonly wavelengths: CitedValue<Rgb>
    readonly pureWaterAbsorption: CitedValue<Rgb>
    readonly cdomReferenceWavelength: CitedValue
    readonly cdomAbsorption: CitedValue
    readonly cdomSlope: CitedValue
    readonly backscattering: CitedValue
  }
  /** Lambertian reflectances of foam: fresh at injection, thin as it fades, and the lifetime average for far coverage. */
  readonly foamReflectance: {
    readonly fresh: CitedValue
    readonly thin: CitedValue
    readonly lifetime: CitedValue
  }
  /** s, the e-folding time of foam density. */
  readonly foamDecayTime: CitedValue
}

export type Covariance = readonly [number, number, number]

/** The slope covariance one band component adds, scaled by `share`: slope -A k sin(theta) has mean square A^2 k k^T / 2. */
const componentCovariance = (
  sea: SeaDescription,
  i: number,
  share: number,
  out: Float32Array | Float64Array,
  at: number,
): void => {
  const { kx, ky, amplitude } = sea.components
  const x = kx[i] ?? 0
  const y = ky[i] ?? 0
  const a = amplitude[i] ?? 0
  const half = 0.5 * share * a * a
  out[at] = (out[at] ?? 0) + half * x * x
  out[at + 1] = (out[at + 1] ?? 0) + half * y * y
  out[at + 2] = (out[at + 2] ?? 0) + half * x * y
}

/** The band's exact slope covariance, every component at full amplitude; zero for flat water. */
export const bandSlopeCovariance = (sea: SeaDescription | null): Covariance => {
  if (sea === null) return [0, 0, 0]
  const sum = new Float64Array(3)
  for (let i = 0; i < sea.components.count; i += 1) componentCovariance(sea, i, 1, sum, 0)
  return [sum[0] ?? 0, sum[1] ?? 0, sum[2] ?? 0]
}

/**
 * Per ring, the slope covariance of the band displacement the ring does not carry and the variance of its divergence,
 * (xx, yy, xy, div) per ring. A component drawn at weight w keeps w^2 of its variance in the mesh, so 1 - w^2 of it joins
 * the ring's roughness and the far foam's Jacobian variance, and the ring's whole is the band's exact value at every
 * weight. `weights` is `bandWeights`' output for the same rings.
 */
export const unresolvedBandCovariance = (
  sea: SeaDescription | null,
  weights: Float32Array,
  rings: number,
  out: Float32Array,
): void => {
  out.fill(0)
  if (sea === null) return
  const { count } = sea.components
  for (let slot = 0; slot < rings; slot += 1) {
    for (let i = 0; i < count; i += 1) {
      const w = weights[slot * count + i] ?? 0
      componentCovariance(sea, i, 1 - w * w, out, slot * 4)
      // The divergence -lambda A k cos(theta) has mean square (lambda A k)^2 / 2.
      const divergence = sea.choppiness * (sea.components.amplitude[i] ?? 0) * (sea.components.k[i] ?? 0)
      out[slot * 4 + 3] = (out[slot * 4 + 3] ?? 0) + 0.5 * (1 - w * w) * divergence * divergence
    }
  }
}

/**
 * The Cox and Munk 1954 clean-surface slope covariance at the sea's generating wind: upwind along the waves' mean
 * direction and crosswind across it, the wind carried from 10 m to the fits' anemometer height by the log profile.
 */
export const coxMunkCovariance = (sea: SeaDescription | null, optics: OceanOptics): Covariance => {
  if (sea === null) return [0, 0, 0]
  const { coxMunk } = optics
  const wind = sea.spectrum.windSpeed * windProfile(optics.roughnessLength.value)(coxMunk.windHeight.value)
  const upwind = coxMunk.upwindIntercept.value + coxMunk.upwindSlope.value * wind
  const crosswind = coxMunk.crosswindIntercept.value + coxMunk.crosswindSlope.value * wind
  const c = Math.cos(sea.spectrum.meanDirection)
  const s = Math.sin(sea.spectrum.meanDirection)
  return [upwind * c * c + crosswind * s * s, upwind * s * s + crosswind * c * c, (upwind - crosswind) * c * s]
}

/** m^-1 per channel: pure water plus CDOM, a_ref exp(-S (lambda - lambda_ref)). */
export const waterAbsorption = (optics: OceanOptics): Rgb => {
  const { water } = optics
  const at = (channel: 0 | 1 | 2): number =>
    water.pureWaterAbsorption.value[channel] +
    water.cdomAbsorption.value *
      Math.exp(-water.cdomSlope.value * (water.wavelengths.value[channel] - water.cdomReferenceWavelength.value))
  return [at(0), at(1), at(2)]
}
