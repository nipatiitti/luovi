import type { CitedValue } from '@luovi/core'
import type { SeaDescription } from '@luovi/sim-world'

// The CPU half of the sea's filtered shading (#36): the slope covariances the band contributes, whole and per ring, the
// Cox and Munk target the floor fills up to, and the water's absorption per channel. Symmetric 2 by 2 slope covariances
// travel as (xx, yy, xy), x east, y north.

type Rgb = readonly [number, number, number]

/**
 * The optical constants the shading reads. Renderers cannot import `data`, so the tool passes its tables here:
 * `coxMunk`, `openSeaRoughnessLength` and `balticOptics` match these shapes field for field.
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
 * Per ring, the slope covariance of the band displacement the ring does not carry, (xx, yy, xy, 0) per ring. A component
 * drawn at weight w keeps w^2 of its slope variance in the mesh, so 1 - w^2 of it joins the ring's roughness and the
 * ring's whole is the band's exact covariance at every weight. `weights` is `bandWeights`' output for the same rings.
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
  const z0 = optics.roughnessLength.value
  const wind = (sea.spectrum.windSpeed * Math.log(coxMunk.windHeight.value / z0)) / Math.log(10 / z0)
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
