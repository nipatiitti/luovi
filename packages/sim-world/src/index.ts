export { loadWorld, type World } from './world.ts'

// Every pure function a renderer or a benchmark needs is re-exported here, so nothing outside sim-world imports a model
// package (docs/intention/05).
export {
  bandPhases,
  type CascadeLayout,
  type CascadeRule,
  DEFAULT_CASCADE_RULE,
  defaultCascadeLayout,
  generateTail,
  type TailCascade,
  tailStream,
  type WaveSpectrum,
  waveSpectrum,
} from '@luovi/sim-ocean'

export type {
  EffectiveScenario,
  EnvironmentQuery,
  SeaDescription,
  SpectrumParameters,
  StateLayout,
  WaveComponents,
} from '@luovi/core'
