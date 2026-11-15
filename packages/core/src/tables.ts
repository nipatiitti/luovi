import type { CitedValue } from './cited.ts'

// The shapes of the data tables the renderers read as well. Renderers may not import data, so the tool hands them data's
// tables, and the one shape lives here where both can name it.

/** One value per rendering channel, in the order of `wavelengths`: red, green, blue. */
export type Rgb = readonly [number, number, number]

export interface AtmosphereTable {
  /** nm, the wavelength each RGB channel is evaluated at. */
  readonly wavelengths: CitedValue<Rgb>
  /** W m^-2 nm^-1 at the top of the atmosphere. */
  readonly solarIrradiance: CitedValue<Rgb>
  /** rad, the Sun's apparent angular radius. */
  readonly sunAngularRadius: CitedValue
  /** m, the planet's radius: the bottom of the atmosphere. */
  readonly bottomRadius: CitedValue
  /** m, the radius of the top of the atmosphere. */
  readonly topRadius: CitedValue
  /** m^-1 at sea level; Rayleigh extinction equals scattering (no absorption by air molecules). */
  readonly rayleighScattering: CitedValue<Rgb>
  /** m, the exponential density profile's scale height for air molecules. */
  readonly rayleighScaleHeight: CitedValue
  /** m^-1 at sea level, wavelength independent (Angstrom exponent 0). */
  readonly mieScattering: CitedValue
  /** m^-1 at sea level, wavelength independent. */
  readonly mieExtinction: CitedValue
  /** m, the exponential density profile's scale height for aerosols. */
  readonly mieScaleHeight: CitedValue
  /** Asymmetry parameter of the Cornette-Shanks phase function, dimensionless. */
  readonly mieAsymmetry: CitedValue
  /** m^2 per molecule, the ozone absorption cross-section at each wavelength. */
  readonly ozoneCrossSection: CitedValue<Rgb>
  /** Dobson units, the total ozone column. */
  readonly ozoneColumn: CitedValue
  /** molecules m^-2 per Dobson unit. */
  readonly dobsonUnit: CitedValue
  /** m, the altitude of the tent profile's peak ozone density. */
  readonly ozonePeakAltitude: CitedValue
  /** m, the tent profile's half width: density falls linearly to zero this far above and below the peak. */
  readonly ozoneHalfWidth: CitedValue
  /** Lambertian albedo of the ground below the atmosphere, dimensionless, used for its multiple-scattering bounce. */
  readonly groundAlbedo: CitedValue<Rgb>
}

export interface WaterOpticsTable {
  /** Real refractive index of the water relative to air, dimensionless, at 550 nm. */
  readonly refractiveIndex: CitedValue
  /** nm, the wavelength of each RGB channel: the atmosphere table's, red, green, blue. */
  readonly wavelengths: CitedValue<Rgb>
  /** m^-1, absorption by pure water at `wavelengths`. */
  readonly pureWaterAbsorption: CitedValue<Rgb>
  /** nm, where the CDOM absorption below is stated. */
  readonly cdomReferenceWavelength: CitedValue
  /** m^-1, CDOM absorption at the reference wavelength: a_cdom(lambda) = a_ref exp(-S (lambda - lambda_ref)). */
  readonly cdomAbsorption: CitedValue
  /** nm^-1, the exponential spectral slope S of the CDOM absorption. */
  readonly cdomSlope: CitedValue
  /** m^-1, backscattering by water and particles, wavelength independent. */
  readonly backscattering: CitedValue
}

/** Total mean square slope = intercept + slope U, U in m/s at windHeight. */
export interface CoxMunkTable {
  readonly intercept: CitedValue
  readonly slope: CitedValue
  /** m above the mean sea level */
  readonly windHeight: CitedValue
}

/**
 * The whitecap model's constants: which waves entrain air, how steep a wave group must be for its crests to spill, how
 * far the roller reaches and how long the foam it leaves lasts. Phases are radians of the breaking wave, zero at its crest.
 */
export interface WhitecapTable {
  /** m, the wavelength below which a breaker entrains no air and leaves no foam. */
  readonly shortestWave: CitedValue
  /** m, the wavelength from which a breaker makes a full whitecap. */
  readonly fullWave: CitedValue
  /** The group steepness a k at which a crest starts to spill. */
  readonly onsetSteepness: CitedValue
  /** The group steepness a k at which the breaker is fully developed. */
  readonly fullSteepness: CitedValue
  /** How much steeper a point's envelope must be than a group's mean for the same share of the sea to break. */
  readonly pointOverGroup: CitedValue
  /** Wavelengths over which a wave group's steepness is averaged. */
  readonly groupWavelengths: CitedValue
  /** rad the roller covers ahead of the crest when fully developed. */
  readonly frontPhase: CitedValue
  /** rad the roller covers behind the crest. */
  readonly backPhase: CitedValue
  /** The density of the foam a full roller leaves on the water it passes, 1 being the roller's own. */
  readonly trailDensity: CitedValue
  /** Periods of the breaking wave over which the foam it leaves fades by e. */
  readonly decayPeriods: CitedValue
  /** s, the longest that fade takes. */
  readonly decayLimit: CitedValue
  /** The share of the water's own reflection that still shows on thin foam. */
  readonly thinSheen: CitedValue
  /** The share of the water's own reflection that still shows on a roller's thick foam. */
  readonly thickSheen: CitedValue
  /** How many times longer than the foam above it a bubble plume shows. */
  readonly plumePersistence: CitedValue
  /** 1/m, the backscattering a fresh bubble plume adds to the water. */
  readonly plumeBackscattering: CitedValue
  /** m, the cell of the foam's lace, the holes a decaying patch opens into. */
  readonly laceCell: CitedValue
}
