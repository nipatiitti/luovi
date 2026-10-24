// Earth's clear-sky atmosphere as Bruneton's 2017 reference implementation of precomputed atmospheric scattering
// defines it (github.com/ebruneton/precomputed_atmospheric_scattering, atmosphere/demo/demo.cc, Demo::InitModel),
// sampled at the three wavelengths its Model uses for RGB rendering (kLambdaR, kLambdaG, kLambdaB in model.cc).
// Spectral tables are binned in 10 nm steps there, so a wavelength's value is its bin's entry, not an interpolation.
// The 2008 paper (Bruneton and Neyret, Comput. Graph. Forum 27(4), EGSR 2008) was not read for this table. The
// implementation says the original used a constant solar spectrum (kConstantSolarIrradiance) and adds an ozone layer
// the original lacked (use_ozone_), so those values and the Mie values, which it derives from an Angstrom turbidity
// fit, are marked as estimates of the paper's atmosphere until its full text is checked.
import type { AtmosphereTable } from '@luovi/core'

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
