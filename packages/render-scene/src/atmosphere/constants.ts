import type { CitedValue } from '@luovi/core'

type Rgb = readonly [number, number, number]

/**
 * The atmosphere the precomputation is built from, SI units, RGB channels at three wavelengths. Renderers cannot
 * import `data`, so the tool passes `brunetonAtmosphere` from `@luovi/data` here; it matches this shape field for
 * field, and only what the model reads is declared.
 */
export interface AtmosphereConstants {
  readonly solarIrradiance: CitedValue<Rgb>
  readonly sunAngularRadius: CitedValue
  readonly bottomRadius: CitedValue
  readonly topRadius: CitedValue
  readonly rayleighScattering: CitedValue<Rgb>
  readonly rayleighScaleHeight: CitedValue
  readonly mieScattering: CitedValue
  readonly mieExtinction: CitedValue
  readonly mieScaleHeight: CitedValue
  readonly mieAsymmetry: CitedValue
  readonly ozoneCrossSection: CitedValue<Rgb>
  readonly ozoneColumn: CitedValue
  readonly dobsonUnit: CitedValue
  readonly ozonePeakAltitude: CitedValue
  readonly ozoneHalfWidth: CitedValue
  readonly groundAlbedo: CitedValue<Rgb>
}

// The shaders work in kilometres, as Bruneton's do: the scattering density is a product of radiance and a
// coefficient, and in per-metre units it falls below half precision's normal range in the rgba16float tables.
const METRES_PER_KM = 1000

/**
 * The lowest Sun the tables cover, as a cosine of the zenith angle: 102 degrees, the value Bruneton's demo pairs with
 * half-precision tables (atmosphere/demo/demo.cc, max_sun_zenith_angle). Below it the sky is night.
 */
const MU_S_MIN = Math.cos((102 * Math.PI) / 180)

export const ATMOSPHERE_UNIFORM_FLOATS = 32

/**
 * Floats of the WGSL `Atmosphere` struct. Slot 28 to 30 is the sun direction, a render setting written separately.
 * The ozone tent integrates to its half width, so the peak number density is the column over the half width.
 */
export const packAtmosphere = (c: AtmosphereConstants): Float32Array<ArrayBuffer> => {
  const perKm = (rgb: Rgb): Rgb => [rgb[0] * METRES_PER_KM, rgb[1] * METRES_PER_KM, rgb[2] * METRES_PER_KM]
  const ozonePeakDensity = (c.ozoneColumn.value * c.dobsonUnit.value) / c.ozoneHalfWidth.value
  const [o0, o1, o2] = c.ozoneCrossSection.value
  const absorption = perKm([o0 * ozonePeakDensity, o1 * ozonePeakDensity, o2 * ozonePeakDensity])
  const mieScattering = c.mieScattering.value * METRES_PER_KM
  const mieExtinction = c.mieExtinction.value * METRES_PER_KM
  const out = new Float32Array(ATMOSPHERE_UNIFORM_FLOATS)
  out.set([...c.solarIrradiance.value, c.sunAngularRadius.value], 0)
  out.set([...perKm(c.rayleighScattering.value), c.bottomRadius.value / METRES_PER_KM], 4)
  out.set([mieScattering, mieScattering, mieScattering, c.topRadius.value / METRES_PER_KM], 8)
  out.set([mieExtinction, mieExtinction, mieExtinction, c.mieAsymmetry.value], 12)
  out.set([...absorption, MU_S_MIN], 16)
  out.set([...c.groundAlbedo.value, c.rayleighScaleHeight.value / METRES_PER_KM], 20)
  out.set(
    [
      c.mieScaleHeight.value / METRES_PER_KM,
      c.ozonePeakAltitude.value / METRES_PER_KM,
      c.ozoneHalfWidth.value / METRES_PER_KM,
      0,
    ],
    24,
  )
  return out
}

export const SUN_DIRECTION_OFFSET = 28
