// Earth's clear-sky atmosphere as Bruneton's 2017 reference implementation of precomputed atmospheric scattering
// defines it (github.com/ebruneton/precomputed_atmospheric_scattering, atmosphere/demo/demo.cc, Demo::InitModel),
// sampled at the three wavelengths its Model uses for RGB rendering (kLambdaR, kLambdaG, kLambdaB in model.cc).
// Spectral tables are binned in 10 nm steps there, so a wavelength's value is its bin's entry, not an interpolation.
// The 2008 paper (Bruneton and Neyret, Comput. Graph. Forum 27(4), EGSR 2008) was not read for this table. The
// implementation says the original used a constant solar spectrum (kConstantSolarIrradiance) and adds an ozone layer
// the original lacked (use_ozone_), so those values and the Mie values, which it derives from an Angstrom turbidity
// fit, are marked as estimates of the paper's atmosphere until its full text is checked.
import type { CitedValue } from '@luovi/core'

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

const demo = 'Bruneton 2017, precomputed_atmospheric_scattering, atmosphere/demo/demo.cc, Demo::InitModel'
const lambdas = 'at 680, 550 and 440 nm (Model::kLambdaR, kLambdaG, kLambdaB in atmosphere/model.cc)'

export const brunetonAtmosphere: AtmosphereTable = {
  wavelengths: {
    value: [680, 550, 440],
    src: 'Bruneton 2017, precomputed_atmospheric_scattering, atmosphere/model.cc, Model::kLambdaR, kLambdaG, kLambdaB',
  },
  solarIrradiance: {
    value: [1.474, 1.8504, 1.91198],
    src: `Estimate: ${demo}, kSolarIrradiance (the original used a constant 1.5), ASTM G-173 extraterrestrial column averaged over 10 nm bins, ${lambdas}`,
  },
  sunAngularRadius: { value: 0.004675, src: `${demo}: kSunAngularRadius = 0.00935 / 2` },
  bottomRadius: { value: 6360000, src: `${demo}: kBottomRadius` },
  topRadius: { value: 6420000, src: `${demo}: kTopRadius` },
  rayleighScattering: {
    value: [5.80234e-6, 1.35578e-5, 3.31e-5],
    src: `${demo}: kRayleigh 1.24062e-6 lambda^-4, lambda in micrometres, ${lambdas}`,
  },
  rayleighScaleHeight: { value: 8000, src: `${demo}: kRayleighScaleHeight` },
  mieScattering: {
    value: 3.996e-6,
    src: `Estimate: ${demo}, kMieAngstromBeta 5.328e-3 / kMieScaleHeight times kMieSingleScatteringAlbedo 0.9; the implementation's Angstrom turbidity fit, not the paper's Mie coefficient`,
  },
  mieExtinction: {
    value: 4.44e-6,
    src: `Estimate: ${demo}, kMieAngstromBeta 5.328e-3 / kMieScaleHeight, Angstrom alpha 0; the implementation's Angstrom turbidity fit, not the paper's Mie coefficient`,
  },
  mieScaleHeight: { value: 1200, src: `${demo}: kMieScaleHeight` },
  mieAsymmetry: {
    value: 0.8,
    src: `Estimate: ${demo}, kMiePhaseFunctionG; the paper's own asymmetry was not checked against its full text`,
  },
  ozoneCrossSection: {
    value: [1.209e-25, 3.5e-25, 1.582e-26],
    src: `${demo}: kOzoneCrossSection, IUP Bremen 2011 reference spectra at 233 K averaged over 10 nm bins, ${lambdas}`,
  },
  ozoneColumn: {
    value: 300,
    src: `Estimate: ${demo}, 300 Dobson units in kMaxOzoneNumberDensity; ozone is the implementation's addition to the 2008 model`,
  },
  dobsonUnit: { value: 2.687e20, src: `${demo}: kDobsonUnit, molecules m^-2` },
  ozonePeakAltitude: {
    value: 25000,
    src: `Estimate: ${demo}, ozone density rising linearly from 10 to 25 km and falling to 0 at 40 km, an approximate profile the implementation takes from a teaching note`,
  },
  ozoneHalfWidth: {
    value: 15000,
    src: `Estimate: ${demo}, ozone density rising linearly from 10 to 25 km and falling to 0 at 40 km, an approximate profile the implementation takes from a teaching note`,
  },
  groundAlbedo: {
    value: [0.1, 0.1, 0.1],
    src: `Estimate: ${demo}, kGroundAlbedo; a land-like ground, standing in for the sea's albedo until the water shading feeds it`,
  },
}
