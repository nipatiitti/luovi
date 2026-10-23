import {
  ContractError,
  type ContractName,
  type EffectiveScenario,
  type EffectiveSeaBlock,
  type EffectiveEnvironment,
  type Scenario,
  type SeaBlock,
  type Wind,
} from '@luovi/core'
import { balticWater, jonswap, openSeaRoughnessLength, standardAir } from '@luovi/data'

// The empirical defaults and ranges a scenario may leave out (coordinator answer 2, ADR 0010): core's schema checks shape
// only, so every measured default and bound is applied here from data, and the effective scenario says what was simulated.

/** Where a block came from, so a refusal names the field in the document the person wrote: a scenario or an input. */
export interface BlockSource {
  readonly contract: ContractName
  readonly path: string
}

const SCENARIO_SEA: BlockSource = { contract: 'scenario', path: 'environment.sea' }

/** Fills gamma from data and range-checks it; a live sea input passes through here exactly as a loaded one does. */
export const effectiveSeaBlock = (sea: SeaBlock, source: BlockSource = SCENARIO_SEA): EffectiveSeaBlock => {
  const gamma = sea.gamma ?? jonswap.gammaDefault.value
  const low = jonswap.gammaMin.value
  const high = jonswap.gammaMax.value
  if (!(gamma >= low && gamma <= high)) {
    throw new ContractError(
      source.contract,
      `${source.path}.gamma`,
      `Expected the JONSWAP peak enhancement in [${String(low)}, ${String(high)}], got ${String(gamma)}`,
    )
  }
  return { ...sea, gamma }
}

export const effectiveWind = (wind: Wind): EffectiveEnvironment['wind'] => ({
  ...wind,
  z0: wind.z0 ?? openSeaRoughnessLength,
})

/** Fills water, air, the roughness length and gamma from data where the scenario gives none, and range-checks gamma. */
export const effectiveScenario = (scenario: Scenario): EffectiveScenario => {
  const { environment } = scenario
  const { sea, water, air, wind, ...rest } = environment
  return {
    ...scenario,
    environment: {
      ...rest,
      wind: effectiveWind(wind),
      ...(sea === undefined ? {} : { sea: effectiveSeaBlock(sea) }),
      water: water ?? { density: balticWater.density, kinematicViscosity: balticWater.kinematicViscosity },
      air: air ?? { density: standardAir.density },
    },
  }
}
