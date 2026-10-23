export { loadWorld, type World } from './world.ts'

// Every pure function a renderer or a benchmark needs is re-exported here, so nothing outside sim-world imports a model
// package (docs/intention/05). The tail generator, its cascade layout and its stream join this list with #30.
export { bandPhases, type WaveSpectrum, waveSpectrum } from '@luovi/sim-ocean'

export type {
  EffectiveScenario,
  EnvironmentQuery,
  SeaDescription,
  SpectrumParameters,
  StateLayout,
  WaveComponents,
} from '@luovi/core'
