export { effectiveSeaBlock } from './effective.ts'
export { loadWorld, type World } from './world.ts'

// The state hash a benchmark compares across engines, so a benchmark reads sim-world's surface alone (ADR 0010).
export { hashState } from '@luovi/core'

// Every pure function a renderer or a benchmark needs is re-exported here, so nothing outside sim-world imports a model
// package (docs/intention/05).
export {
  bandPhases,
  breakingWeight,
  reworkedBreakingThreshold,
  type CascadeLayout,
  type CascadeRule,
  DEFAULT_CASCADE_RULE,
  defaultCascadeLayout,
  generateTail,
  type TailCascade,
  tailStream,
  type WaveSpectrum,
  waveSpectrum,
  windProfile,
} from '@luovi/sim-ocean'

export type {
  EffectiveScenario,
  EnvironmentQuery,
  SeaDescription,
  SpectrumParameters,
  StateLayout,
  WaveComponents,
} from '@luovi/core'
